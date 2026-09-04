// There's no password login. The only thing that gates browsing the menu/ordering is picking a
// branch once (saved to this browser's localStorage) — name/phone/email are collected just once,
// directly on the checkout form itself, not repeated here. Every page that needs to know "has this
// visitor picked a branch yet" uses these shared helpers, so there's exactly one place the storage
// key and shape are defined. customerName/phone/email are still stored alongside branch purely so
// checkout.html can prefill a returning customer's details — they're never required by the gate.
const GUEST_DETAILS_KEY = 'bunndough_guest_details';

function getGuestDetails() {
  try {
    return JSON.parse(localStorage.getItem(GUEST_DETAILS_KEY) || 'null');
  } catch (e) {
    return null;
  }
}

function hasGuestDetails() {
  const d = getGuestDetails();
  return !!(d && d.branch);
}

function saveGuestDetails({ customerName, phone, email, branch }) {
  localStorage.setItem(GUEST_DETAILS_KEY, JSON.stringify({ customerName, phone, email, branch }));
}

function redirectToGuestGate(redirectTarget) {
  const here = redirectTarget || window.location.pathname.split('/').pop() + window.location.search;
  window.location.href = `guest.html?redirect=${encodeURIComponent(here)}`;
}

function renderAuthNav() {
  const container = document.getElementById('auth-nav');
  if (!container) return;
  container.innerHTML = `<a href="orders.html">📦 Track Order</a>`;
}

document.addEventListener('DOMContentLoaded', renderAuthNav);
