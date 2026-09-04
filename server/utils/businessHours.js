// Server-side source of truth for ordering hours — mirrors public/js/hours.js, but this is the copy
// that actually matters, since a direct API request could skip the frontend checks entirely.
//
//   08:00–15:00  Closed — no orders of any kind.
//   15:00–19:00  Open — Pickup only.
//   19:00–08:00  Open — Pickup and Delivery.
//
// Always computed from the UK wall-clock time via Intl, not the server's own timezone — Railway (and
// most hosts) run their containers in UTC regardless of where the business actually is.

function getUkDateTimeParts(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') };
}

function getUkMinutesSinceMidnight() {
  const { hour, minute } = getUkDateTimeParts(new Date());
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

// Groups orders into "business days" that start at 15:00 UK time (same boundary as isShopOpen) —
// used to number receipts 1, 2, 3... per shift instead of showing the long unique order ID. An order
// placed at 2am counts toward the business day that started at 3pm the previous calendar day.
function getBusinessDayKey(date = new Date()) {
  const { year, month, day, hour, minute } = getUkDateTimeParts(date);
  const businessDate = new Date(Date.UTC(year, month - 1, day));
  if (hour * 60 + minute < 15 * 60) {
    businessDate.setUTCDate(businessDate.getUTCDate() - 1);
  }
  return businessDate.toISOString().slice(0, 10);
}

module.exports = { isShopOpen, isDeliveryAvailable, getBusinessDayKey };
