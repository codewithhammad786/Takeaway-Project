// Server-side source of truth for ordering hours — mirrors public/js/hours.js, but this is the copy
// that actually matters, since a direct API request could skip the frontend checks entirely.
//
//   08:00–15:00  Closed — no orders of any kind.
//   15:00–19:00  Open — Pickup only.
//   19:00–08:00  Open — Pickup and Delivery.
//
// Always computed from the UK wall-clock time via Intl, not the server's own timezone — Railway (and
// most hosts) run their containers in UTC regardless of where the business actually is.

function getUkMinutesSinceMidnight() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === 'hour').value);
  const minute = Number(parts.find((p) => p.type === 'minute').value);
  return hour * 60 + minute;
}

function isShopOpen() {
  const t = getUkMinutesSinceMidnight();
  return t >= 15 * 60 || t < 8 * 60;
}

function isDeliveryAvailable() {
  const t = getUkMinutesSinceMidnight();
  return t >= 19 * 60 || t < 8 * 60;
}

module.exports = { isShopOpen, isDeliveryAvailable };
