// Bun 'n Dough receipt printer bridge.
//
// Runs on a PC at the shop (on the same network as the Epson printer). Every few seconds it asks the
// website whether a paid order is waiting, sends that receipt to the printer over the local network,
// then tells the website whether it printed. No extra software needed beyond Node.js.

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const SETTINGS_FILE = process.env.BRIDGE_SETTINGS || path.join(__dirname, 'bridge-settings.json');

if (typeof fetch !== 'function' || typeof AbortSignal.timeout !== 'function') {
  console.error('This needs Node.js version 18 or newer. Your version is ' + process.version + '.');
  console.error('Download the current version from nodejs.org, install it, then start this again.');
  process.exit(1);
}

function log(message) {
  console.log(`[${new Date().toLocaleTimeString('en-GB')}] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Settings come from the command line when given (node print-bridge.js "<website address>" <printer ip>),
// otherwise from bridge-settings.json next to this file.
function loadSettings() {
  const given = {};
  for (const arg of process.argv.slice(2)) {
    if (/^https?:\/\//i.test(arg)) given.serverAddress = arg;
    else if (arg.startsWith('--port=')) given.printerPort = Number(arg.slice(7));
    else if (!arg.startsWith('--') && !given.printerIp) given.printerIp = arg;
  }

  let s = {};
  if (!(given.serverAddress && given.printerIp) || process.argv.includes('--test')) {
    let raw = null;
    try {
      raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
    } catch (err) {
      if (!given.printerIp) {
        throw new Error(`Could not read ${SETTINGS_FILE}. Keep bridge-settings.json in the same folder as this program.`);
      }
    }
    if (raw !== null) {
      try {
        s = JSON.parse(raw);
      } catch (err) {
        throw new Error('bridge-settings.json is not valid. Keep the quotes and commas exactly as they were and only change the values.');
      }
    }
  }
  s = { ...s, ...given };
  s.printerIp = String(s.printerIp || '').trim();
  s.printerProtocol = s.printerProtocol === 'https' ? 'https' : 'http';
  s.intervalSeconds = Math.max(2, Number(s.intervalSeconds) || 5);
  s.serverAddress = String(s.serverAddress || '').trim();
  if (!s.printerIp) throw new Error('printerIp is empty in bridge-settings.json.');
  return s;
}

function requireServerAddress(s) {
  if (!s.serverAddress || /PASTE|YOUR_KEY/i.test(s.serverAddress) || !/^https?:\/\//i.test(s.serverAddress)) {
    throw new Error(
      'Put the printer web address from Admin > Settings > Receipt Printer into "serverAddress" in bridge-settings.json (keep the quotes around it).'
    );
  }
}

// Plain http/https request to the printer. The printer's own https certificate is self-signed, so it
// is not checked — this only ever talks to the printer's address on the shop's own network.
function postToPrinter(settings, eposXml) {
  const body =
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>' +
    eposXml +
    '</s:Body></s:Envelope>';
  const transport = settings.printerProtocol === 'https' ? https : http;
  const options = {
    hostname: settings.printerIp,
    port: settings.printerPort || (settings.printerProtocol === 'https' ? 443 : 80),
    path: '/cgi-bin/epos/service.cgi?devid=local_printer&timeout=10000',
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
      'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT',
    },
    rejectUnauthorized: false,
    timeout: 20000,
  };
  return new Promise((resolve, reject) => {
    const req = transport.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('timeout', () => req.destroy(new Error('The printer did not answer in time')));
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function printerSucceeded(reply) {
  return /success\s*=\s*"true"/i.test(reply);
}

function describePrinterFailure(reply) {
  const code = (reply.match(/code\s*=\s*"([^"]*)"/i) || [])[1];
  return code ? `the printer reported "${code}"` : 'the printer did not confirm the print';
}

async function printWithRetries(settings, eposXml) {
  let lastReply = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await postToPrinter(settings, eposXml);
      lastReply = res.body;
      if (res.status === 200 && printerSucceeded(res.body)) return { ok: true, reply: res.body };
      log(`Attempt ${attempt}/3: ${res.status === 200 ? describePrinterFailure(res.body) : 'the printer answered with status ' + res.status}.`);
    } catch (err) {
      log(`Attempt ${attempt}/3: could not reach the printer at ${settings.printerIp} (${err.message}).`);
    }
    if (attempt < 3) await sleep(Number(process.env.BRIDGE_RETRY_MS) || 8000);
  }
  return { ok: false, reply: lastReply || '<response success="false" code="BRIDGE_UNREACHABLE"/>' };
}

function formBody(fields) {
  return new URLSearchParams(fields).toString();
}

async function pollOnce(settings) {
  const res = await fetch(settings.serverAddress, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody({ ID: 'bridge', ConnectionType: 'GetRequest' }),
    signal: AbortSignal.timeout(20000),
  });
  if (res.status === 403) {
    throw new Error('The website refused the key (403). Copy the address again from Admin > Settings > Receipt Printer.');
  }
  if (!res.ok) throw new Error(`The website answered with status ${res.status}.`);

  const text = (await res.text()).trim();
  if (!text) return false;

  const job = text.match(/<epos-print[\s\S]*<\/epos-print>/);
  if (!job) {
    log('The website sent something unexpected, so it was skipped.');
    return false;
  }
  const orderMatch = job[0].match(/#(BD-[A-Z0-9-]+)/);
  log(`Receipt received${orderMatch ? ' for order ' + orderMatch[1] : ''}. Printing...`);

  const result = await printWithRetries(settings, job[0]);
  await fetch(settings.serverAddress, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formBody({ ID: 'bridge', ConnectionType: 'SetResponse', ResponseFile: result.reply }),
    signal: AbortSignal.timeout(20000),
  }).catch((err) => log(`Could not tell the website the result (${err.message}).`));

  log(result.ok ? 'Printed.' : 'NOT printed. Check the paper, the cover and the printer cable, then use "Send to Receipt Printer" on the order in the admin page.');
  return true;
}

function testReceipt() {
  return (
    '<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">' +
    '<text lang="en"/><text align="center"/><text width="2" height="2" em="true"/>' +
    '<text>BUN &apos;N DOUGH&#10;</text><text width="1" height="1" em="false"/>' +
    '<text>Printer test OK&#10;</text><text>Price test: £1.50&#10;</text>' +
    '<text>' + new Date().toLocaleString('en-GB') + '&#10;</text>' +
    '<feed line="3"/><cut type="feed"/></epos-print>'
  );
}

async function runTest(settings) {
  log(`Sending a test receipt to the printer at ${settings.printerIp}...`);
  const result = await printWithRetries(settings, testReceipt());
  if (result.ok) log('The printer confirmed. Check the paper: you should see "Printer test OK" and a price with a pound sign.');
  else log('The test did not print. See the messages above.');
  return result.ok;
}

async function main() {
  const settings = loadSettings();

  if (process.argv.includes('--test')) {
    process.exitCode = (await runTest(settings)) ? 0 : 1;
    return;
  }

  requireServerAddress(settings);
  log(`Receipt printer bridge started. Checking the website every ${settings.intervalSeconds} seconds; printer at ${settings.printerIp}.`);
  log('Leave this window open. Close it to stop.');

  let lastError = '';
  let lastErrorAt = 0;
  for (;;) {
    try {
      const didWork = await pollOnce(settings);
      lastError = '';
      if (didWork) continue;
    } catch (err) {
      if (err.message !== lastError || Date.now() - lastErrorAt > 60000) {
        log(`Problem: ${err.message}`);
        lastError = err.message;
        lastErrorAt = Date.now();
      }
    }
    await sleep(settings.intervalSeconds * 1000);
  }
}

main().catch((err) => {
  console.error('\nCould not start: ' + err.message);
  process.exit(1);
});
