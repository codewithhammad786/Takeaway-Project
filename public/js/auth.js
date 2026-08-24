// There's no password login — instead, a guest gives their name, phone, and email once (saved to
// this browser's localStorage) before they can browse the menu or order. Every page that needs to
// know "do we have this guest's details yet" uses these shared helpers, so there's exactly one
// place the storage key and shape are defined.
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
  return !!(d && d.customerName && d.phone && d.email);
}

function saveGuestDetails({ customerName, phone, email }) {
  localStorage.setItem(GUEST_DETAILS_KEY, JSON.stringify({ customerName, phone, email }));
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
