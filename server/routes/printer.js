const express = require('express');
const crypto = require('crypto');
const Order = require('../models/Order');
const { buildPrintRequest } = require('../utils/receiptEpos');
const { tidyKey, getAcceptedPrinterKeys } = require('../utils/printerKey');

// Epson "Server Direct Print": the receipt printer (Ethernet-connected) polls this URL every few
// seconds. If a recently paid order is waiting, we reply with its receipt as ePOS-Print XML; the
// printer prints it and then POSTs back a result, which marks the order printed. Nothing on the
// shop's side (phone, tablet, PC) needs to be open for this to work.
//
// Mounted in server.js BEFORE the global /api rate limiter — a printer polling every few seconds
// would otherwise burn through the shared per-IP limit that the shop's other devices also use.

const router = express.Router();

const MAX_ATTEMPTS = 2; // first send + one automatic retry if the printer never confirms
const RECLAIM_AFTER_MS = 2 * 60 * 1000; // wait this long for a confirmation before retrying
const LOOKBACK_MS = 3 * 60 * 60 * 1000; // never auto-print orders queued longer ago than this
const RESULT_WINDOW_MS = 10 * 60 * 1000;

router.use(express.urlencoded({ extended: false, limit: '64kb' }));
router.use(express.text({ type: ['text/*', 'application/xml'], limit: '64kb' }));

// The printer can't send headers, so the secret travels in the URL (?key=...). Constant-time
// compare so the key can't be guessed byte by byte from response timing.
async function keyMatches(provided) {
  const given = tidyKey(provided);
  if (!given) return false;
  const b = Buffer.from(given);
  let ok = false;
  for (const key of await getAcceptedPrinterKeys()) {
    const a = Buffer.from(key);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) ok = true;
  }
  return ok;
}

// Says why a request was refused — in the response only whether the feature has a key at all, and
// in the (private) server logs the key lengths, at most once a minute. Lengths are enough to spot a
// copy-paste mistake without ever writing a key anywhere.
let lastRejectLog = 0;
async function reject(req, res) {
  const accepted = await getAcceptedPrinterKeys();
  if (Date.now() - lastRejectLog > 60000) {
    lastRejectLog = Date.now();
    console.warn(
      accepted.length
        ? `🖨️  Printer request refused: key in the URL is ${tidyKey(req.query.key).length} characters, the saved key is ${accepted[0].length}.`
        : '🖨️  Printer request refused: no printer key has been created yet.'
    );
  }
  res
    .status(403)
    .type('text/plain')
    .send(accepted.length ? 'Forbidden' : 'Forbidden: no printer key has been created yet (create one in Admin → Settings)');
}

function readFields(req) {
  if (typeof req.body === 'string') return Object.fromEntries(new URLSearchParams(req.body));
  return req.body || {};
}

function queueFilter(now) {
  return {
    paymentStatus: 'Paid',
    receiptPrintedAt: null,
    receiptQueuedAt: { $gte: new Date(now.getTime() - LOOKBACK_MS) },
    $and: [
      { $or: [{ receiptPrintAttempts: { $exists: false } }, { receiptPrintAttempts: { $lt: MAX_ATTEMPTS } }] },
      { $or: [{ receiptPrintClaimedAt: null }, { receiptPrintClaimedAt: { $lt: new Date(now.getTime() - RECLAIM_AFTER_MS) } }] },
    ],
  };
}

// Atomic claim, so two polls arriving together can never both be handed the same order.
function claimNextOrder(now = new Date()) {
  return Order.findOneAndUpdate(
    queueFilter(now),
    { $set: { receiptPrintClaimedAt: now }, $inc: { receiptPrintAttempts: 1 } },
    { sort: { receiptQueuedAt: 1 }, new: true }
  );
}

async function recordPrintResult(fields, now = new Date()) {
  const result = String(fields.ResponseFile || '');
  const success = /success\s*=\s*"true"/i.test(result);
  if (!success) {
    console.warn(`🖨️  Printer reported a problem: ${result.slice(0, 300) || '(empty result)'}`);
    return false;
  }
  const order = await Order.findOneAndUpdate(
    {
      receiptPrintedAt: null,
      receiptPrintClaimedAt: { $gte: new Date(now.getTime() - RESULT_WINDOW_MS) },
    },
    { $set: { receiptPrintedAt: now } },
    { sort: { receiptPrintClaimedAt: -1 }, new: true }
  );
  if (order) console.log(`🖨️  Receipt printed for order ${order.orderNumber}`);
  return true;
}

// GET /api/printer/sdp?key=... — lets you open the URL in a browser to check the key works and see
// how many receipts are waiting. Claims nothing.
router.get('/sdp', async (req, res) => {
  if (!(await keyMatches(req.query.key))) return reject(req, res);
  const waiting = await Order.countDocuments(queueFilter(new Date()));
  res.json({ ok: true, receiptsWaiting: waiting });
});

router.post('/sdp', async (req, res) => {
  if (!(await keyMatches(req.query.key))) return reject(req, res);

  try {
    const fields = readFields(req);

    if (fields.ConnectionType === 'SetResponse' || fields.ResponseFile) {
      await recordPrintResult(fields);
      return res.status(200).end();
    }

    const order = await claimNextOrder();
    if (!order) return res.status(200).end();

    console.log(`🖨️  Sending receipt for order ${order.orderNumber} to the printer (attempt ${order.receiptPrintAttempts})`);
    res.status(200).set('Content-Type', 'text/xml; charset=utf-8').send(buildPrintRequest(order));
  } catch (err) {
    console.error('Printer endpoint error:', err.message);
    res.status(200).end();
  }
});

module.exports = router;
module.exports.queueFilter = queueFilter;
