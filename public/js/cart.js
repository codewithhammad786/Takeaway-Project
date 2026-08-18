const CART_KEY = 'bunndough_cart';

function makeLineId(item) {
  const options = [...(item.selectedOptions || [])].sort().join(',');
  return `${item.menuItemId}::${item.variantLabel}::${options}`;
}

function describeCartLine(item) {
  const parts = [];
  if (item.variantLabel && item.variantLabel !== 'Regular') parts.push(item.variantLabel);
  if (item.selectedOptions && item.selectedOptions.length) parts.push(item.selectedOptions.join(', '));
  return parts.join(' • ');
}

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(item, quantity = 1) {
  const cart = getCart();
  const lineId = makeLineId(item);
  const existing = cart.find((i) => i.lineId === lineId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ ...item, lineId, quantity });
  }
  saveCart(cart);
}

function updateCartQuantity(lineId, quantity) {
  let cart = getCart();
  if (quantity < 1) {
    cart = cart.filter((i) => i.lineId !== lineId);
  } else {
    const existing = cart.find((i) => i.lineId === lineId);
    if (existing) existing.quantity = quantity;
  }
  saveCart(cart);
}

function removeFromCart(lineId) {
  const cart = getCart().filter((i) => i.lineId !== lineId);
  saveCart(cart);
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
}

function getCartCount() {
  return getCart().reduce((sum, i) => sum + i.quantity, 0);
}

function getCartSubtotal() {
  return getCart().reduce((sum, i) => sum + i.price * i.quantity, 0);
}

function updateCartBadge() {
  const badge = document.getElementById('cart-count');
  if (badge) badge.textContent = getCartCount();
}

document.addEventListener('DOMContentLoaded', updateCartBadge);

// Keep the cart in sync if it changes in another tab/window (e.g. removed there), and
// force a refresh if the browser restores this page from back/forward cache instead of
// re-running scripts, so a stale pre-navigation cart snapshot never lingers on screen.
window.addEventListener('storage', (e) => {
  if (e.key !== CART_KEY) return;
  updateCartBadge();
  if (typeof renderCartPage === 'function') renderCartPage();
  if (typeof renderCheckoutSummary === 'function') renderCheckoutSummary();
});

window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  updateCartBadge();
  if (typeof renderCartPage === 'function') renderCartPage();
  if (typeof renderCheckoutSummary === 'function') renderCheckoutSummary();
});
