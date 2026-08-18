const Stripe = require('stripe');

// Strip anything that isn't a plain printable ASCII character, anywhere in the string — not just
// at the edges. A Stripe key is always plain ASCII; whitespace, newlines, or smart-quote/control
// characters picked up from copy-pasting into .env (even mid-string) produce an invalid HTTP
// header and a confusing StripeConnectionError with no useful message for where it came from.
function sanitizeKey(raw) {
  return (raw || '').replace(/[^\x21-\x7E]/g, '');
}

const rawKey = process.env.STRIPE_SECRET_KEY || '';
const secretKey = sanitizeKey(rawKey);

if (!secretKey) {
  console.warn('⚠️  STRIPE_SECRET_KEY is not set — checkout/payment endpoints will fail until it is configured in .env');
} else {
  if (secretKey.length !== rawKey.length) {
    console.warn(
      `⚠️  STRIPE_SECRET_KEY contained ${rawKey.length - secretKey.length} invalid character(s) (whitespace/newline/etc.) that were stripped out. Check your .env file for a stray space or line break in that value.`
    );
  }
  if (!/^sk_(test|live)_/.test(secretKey)) {
    console.warn('⚠️  STRIPE_SECRET_KEY does not look like a real Stripe secret key (should start with sk_test_ or sk_live_) — double-check the value in .env.');
  }
}

const stripe = new Stripe(secretKey || 'sk_test_missing_key');

module.exports = stripe;
