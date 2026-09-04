const twilio = require('twilio');
const { generateReceiptPdf } = require('./receiptPdf');

function getClient() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) return null;
  return twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
}

function withPrefix(number) {
  return number.startsWith('whatsapp:') ? number : `whatsapp:${number}`;
}

// Short caption that goes alongside the attached PDF receipt — the PDF itself carries the full
// itemized detail, so this is just enough to identify the order at a glance in the chat list.
function formatCaption(order) {
  const branchLine = order.branch ? `\n${order.branch} branch` : '';
  return `🔔 New paid order — #${order.orderNumber}${branchLine}\n${order.customerName} — ${order.phone}\nTotal: £${order.total.toFixed(2)}`;
}

// Best-effort — a manager notification, not something a customer's checkout should ever fail over.
// Silently does nothing if Twilio/WhatsApp isn't configured, so this stays a no-op until set up.
// `origin` (e.g. "https://bunndough.com") is required to build a public URL for the generated PDF —
// Twilio's WhatsApp API fetches media by URL, it can't accept a file directly.
async function sendOrderPaidWhatsApp(order, origin) {
  const client = getClient();
  const from = process.env.TWILIO_WHATSAPP_FROM;
  const to = process.env.OWNER_WHATSAPP_TO;
  if (!client || !from || !to || !origin) return;

  const { publicPath } = await generateReceiptPdf(order);

  await client.messages.create({
    from: withPrefix(from),
    to: withPrefix(to),
    body: formatCaption(order),
    mediaUrl: [`${origin}${publicPath}`],
  });
}

module.exports = { sendOrderPaidWhatsApp };
