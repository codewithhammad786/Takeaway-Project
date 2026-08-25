// Single source of truth (frontend side) for Bun 'n Dough's ordering hours — shared by the navbar's
// live status badge and the checkout page's order-type gating, so the two can never disagree.
//
// Always reads the UK wall-clock time via Intl (not the device's own clock/timezone) so it stays
// correct even for a customer whose phone is set to a different timezone.
//
//   08:00–15:00  Closed — no orders of any kind.
//   15:00–19:00  Open — Pickup only.
//   19:00–08:00  Open — Pickup and Delivery.

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
