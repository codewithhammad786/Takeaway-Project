const twilio = require('twilio');

// Uses Twilio's Verify API (not raw SMS) — it generates, expires, and rate-limits the codes itself,
// so this app never stores or compares OTPs directly.
function getVerifyService() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_VERIFY_SERVICE_SID) {
    return null;
  }
  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  return client.verify.v2.services(TWILIO_VERIFY_SERVICE_SID);
}

// Normalizes a UK-style number (e.g. "07123 456789") to E.164 (+447123456789). Leaves already-
// international numbers (starting with +) untouched.
function normalizePhone(rawPhone) {
  const digitsAndPlus = String(rawPhone || '').trim().replace(/[^\d+]/g, '');
  if (!digitsAndPlus) return '';
  if (digitsAndPlus.startsWith('+')) return digitsAndPlus;
  if (digitsAndPlus.startsWith('0')) return `+44${digitsAndPlus.slice(1)}`;
  return `+44${digitsAndPlus}`;
}

async function sendOtp(phone) {
  const service = getVerifyService();
  if (!service) {
    const err = new Error('Phone verification is not configured on the server (missing Twilio settings)');
    err.status = 500;
    throw err;
  }
  await service.verifications.create({ to: phone, channel: 'sms' });
}

async function checkOtp(phone, code) {
  const service = getVerifyService();
  if (!service) {
    const err = new Error('Phone verification is not configured on the server (missing Twilio settings)');
    err.status = 500;
    throw err;
  }
  const result = await service.verificationChecks.create({ to: phone, code });
  return result.status === 'approved';
}

module.exports = { normalizePhone, sendOtp, checkOtp };
