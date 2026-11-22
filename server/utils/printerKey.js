const Admin = require('../models/Admin');

// Hosting dashboards make it easy to save a value with a stray space, line break or pair of quotes
// around it, so keys are tidied before they are compared.
function tidyKey(value) {
  return String(value == null ? '' : value)
    .trim()
    .replace(/^["']+|["']+$/g, '')
    .trim();
}

const CACHE_MS = 10 * 1000;
let cache = { at: 0, key: '' };

// The key saved from Admin → Settings. Cached for a few seconds because the printer asks for
// jobs every few seconds and the key almost never changes.
async function getSavedPrinterKey() {
  if (Date.now() - cache.at < CACHE_MS) return cache.key;
  const admin = await Admin.findOne().select('printerKey');
  cache = { at: Date.now(), key: tidyKey(admin && admin.printerKey) };
  return cache.key;
}

function clearPrinterKeyCache() {
  cache = { at: 0, key: '' };
}

// Every key that currently opens the printer endpoint: the one saved in the database and, if set,
// a PRINTER_KEY hosting variable.
async function getAcceptedPrinterKeys() {
  const keys = [await getSavedPrinterKey(), tidyKey(process.env.PRINTER_KEY)];
  return keys.filter(Boolean);
}

module.exports = { tidyKey, getAcceptedPrinterKeys, clearPrinterKeyCache };
