const ONLINE_DISCOUNT_RATE = 0.15;
const DELIVERY_QUOTE_DEBOUNCE_MS = 500;

// Holds the result of the last /orders/delivery-quote lookup for the postcode currently in the
// field: null while nothing has been looked up yet (or the postcode was cleared), otherwise
// { valid: true, miles, deliveryFee, minOrder } or { valid: false, message }.
let deliveryQuote = null;
let deliveryQuoteTimer = null;
let deliveryQuoteRequestId = 0;

function currentOrderType() {
  const checked = document.querySelector('input[name="orderType"]:checked');
  return checked ? checked.value : 'Delivery';
}

// We're open 15:00–08:00, but Delivery only runs 19:00–08:00 — 15:00–19:00 is Pickup-only. This
// keeps the Delivery radio in sync with that, disabling it (and bumping the selection to Pickup if
// it was selected) whenever Delivery isn't currently available.
function applyDeliveryAvailability() {
  const deliveryRadio = document.querySelector('input[name="orderType"][value="Delivery"]');
  const pickupRadio = document.querySelector('input[name="orderType"][value="Pickup"]');
  const note = document.getElementById('delivery-hours-note');
  if (!deliveryRadio || !pickupRadio || !note) return;

  const available = isDeliveryAvailable();
  deliveryRadio.disabled = !available;

  if (!available) {
    note.textContent = 'Delivery is available from 7pm — Pickup only for now.';
    note.hidden = false;
    if (deliveryRadio.checked) {
      deliveryRadio.checked = false;
      pickupRadio.checked = true;
    }
  } else {
    note.hidden = true;
  }
}

function setDeliveryQuoteNote(text) {
  const note = document.getElementById('delivery-quote-note');
  if (note) note.textContent = text || '';
}

// Debounced postcode lookup — fires 500ms after the customer stops typing (or immediately on an
// order-type change), rather than on every keystroke.
function scheduleDeliveryQuote() {
  if (deliveryQuoteTimer) clearTimeout(deliveryQuoteTimer);
  deliveryQuoteTimer = setTimeout(fetchDeliveryQuote, DELIVERY_QUOTE_DEBOUNCE_MS);
}

async function fetchDeliveryQuote() {
  const postcodeInput = document.getElementById('postcode');
  const postcode = postcodeInput ? postcodeInput.value.trim() : '';

  if (currentOrderType() !== 'Delivery' || !postcode) {
    deliveryQuote = null;
    setDeliveryQuoteNote('');
    renderCheckoutSummary();
    return;
  }

  const branch = (getGuestDetails() || {}).branch;
  const requestId = ++deliveryQuoteRequestId;
  setDeliveryQuoteNote('Checking delivery fee for this postcode…');

  try {
    const quote = await apiRequest('/orders/delivery-quote', {
      method: 'POST',
      body: JSON.stringify({ branch, postcode }),
    });
    if (requestId !== deliveryQuoteRequestId) return; // a newer lookup superseded this one
    deliveryQuote = { valid: true, ...quote };
  } catch (err) {
    if (requestId !== deliveryQuoteRequestId) return;
    deliveryQuote = { valid: false, message: err.message };
  }
  renderCheckoutSummary();
}

function renderCheckoutSummary() {
  const cart = getCart();
  const itemsContainer = document.getElementById('checkout-items');
  const subtotal = getCartSubtotal();
  const discount = subtotal * ONLINE_DISCOUNT_RATE;
  const orderType = currentOrderType();

  itemsContainer.innerHTML = cart
    .map((item) => {
      const detail = describeCartLine(item);
      return `
      <div class="checkout-item-row">
        <span>${item.quantity} × ${escapeHtml(item.name)}${detail ? ` (${escapeHtml(detail)})` : ''}</span>
        <span>${formatCurrency(item.price * item.quantity)}</span>
      </div>
    `;
    })
    .join('');

  const deliveryFields = document.getElementById('delivery-fields');
  const addressInput = document.getElementById('address');
  const cityInput = document.getElementById('city');
  const postcodeInput = document.getElementById('postcode');
  if (orderType === 'Delivery') {
    deliveryFields.style.display = '';
    addressInput.required = true;
    cityInput.required = true;
    postcodeInput.required = true;
  } else {
    deliveryFields.style.display = 'none';
    addressInput.required = false;
    cityInput.required = false;
    postcodeInput.required = false;
  }

  let deliveryFee = 0;
  let blockReason = null;
  const minimumNote = document.getElementById('delivery-minimum-note');
  const quoteNote = document.getElementById('delivery-quote-note');

  if (orderType !== 'Delivery') {
    minimumNote.hidden = true;
    if (quoteNote) {
      quoteNote.textContent = '';
      quoteNote.classList.remove('form-hint-error');
    }
  } else if (!postcodeInput.value.trim()) {
    blockReason = 'Enter your postcode to see your delivery fee before continuing.';
    minimumNote.hidden = true;
    if (quoteNote) {
      quoteNote.textContent = '';
      quoteNote.classList.remove('form-hint-error');
    }
  } else if (!deliveryQuote) {
    blockReason = 'Checking your delivery fee for this postcode…';
    minimumNote.hidden = true;
  } else if (!deliveryQuote.valid) {
    blockReason = deliveryQuote.message;
    minimumNote.hidden = true;
    if (quoteNote) {
      quoteNote.textContent = deliveryQuote.message;
      quoteNote.classList.add('form-hint-error');
    }
  } else {
    deliveryFee = deliveryQuote.deliveryFee;
    if (quoteNote) {
      quoteNote.classList.remove('form-hint-error');
      quoteNote.textContent = `${deliveryQuote.miles.toFixed(1)} miles away — ${formatCurrency(deliveryQuote.deliveryFee)} delivery fee, ${formatCurrency(deliveryQuote.minOrder)} minimum order.`;
    }
    if (subtotal < deliveryQuote.minOrder) {
      blockReason = `Add ${formatCurrency(deliveryQuote.minOrder - subtotal)} more to reach the ${formatCurrency(deliveryQuote.minOrder)} minimum for delivery to this address, or switch to pickup.`;
      minimumNote.textContent = blockReason;
      minimumNote.hidden = false;
    } else {
      minimumNote.hidden = true;
    }
  }

  const total = subtotal - discount + deliveryFee;

  document.getElementById('checkout-subtotal').textContent = formatCurrency(subtotal);
  document.getElementById('checkout-discount').textContent = `− ${formatCurrency(discount)}`;
  document.getElementById('checkout-delivery').textContent = deliveryFee === 0 ? 'Free' : formatCurrency(deliveryFee);
  document.getElementById('checkout-total').textContent = formatCurrency(total);

  const placeOrderBtn = document.getElementById('place-order-btn');
  placeOrderBtn.disabled = !!blockReason;

  return { blockReason };
}

function showCheckoutFeedback(message, type) {
  const feedback = document.getElementById('checkout-feedback');
  feedback.textContent = message;
  feedback.className = `feedback ${type}`;
  feedback.hidden = false;
}

function prefillGuestDetails() {
  const saved = getGuestDetails();
  if (!saved) return;
  if (saved.customerName) document.getElementById('customerName').value = saved.customerName;
  if (saved.phone) document.getElementById('phone').value = saved.phone;
  if (saved.email) document.getElementById('email').value = saved.email;
}

document.addEventListener('DOMContentLoaded', () => {
  // Branch gate is enforced site-wide by nav.js (loaded before this script runs) — nothing extra
  // needed here.
  const cart = getCart();
  const form = document.getElementById('checkout-form');
  const placeOrderBtn = document.getElementById('place-order-btn');

  prefillGuestDetails();

  if (new URLSearchParams(window.location.search).get('cancelled') === '1') {
    showCheckoutFeedback('Payment was cancelled — your cart is still saved, try again when ready.', 'error');
  }

  if (!isShopOpen()) {
    showCheckoutFeedback("We're closed right now — online ordering runs 3pm–8am. Please come back after 3pm.", 'error');
    placeOrderBtn.disabled = true;
    form.querySelectorAll('input, textarea').forEach((el) => (el.disabled = true));
    return;
  }

  if (!cart.length) {
    showCheckoutFeedback('Your cart is empty. Add items from the menu before checking out.', 'error');
    placeOrderBtn.disabled = true;
    form.querySelectorAll('input, textarea').forEach((el) => (el.disabled = true));
    return;
  }

  applyDeliveryAvailability();
  renderCheckoutSummary();
  scheduleDeliveryQuote();
  // Re-checked every minute so a customer sitting on this page across the 3pm/7pm/8am boundaries
  // sees the order-type options and closed message update without needing to reload.
  setInterval(() => {
    applyDeliveryAvailability();
    renderCheckoutSummary();
  }, 60000);

  document.querySelectorAll('input[name="orderType"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      renderCheckoutSummary();
      scheduleDeliveryQuote();
    });
  });

  document.getElementById('postcode').addEventListener('input', () => {
    deliveryQuote = null;
    renderCheckoutSummary();
    scheduleDeliveryQuote();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (!isShopOpen()) {
      showCheckoutFeedback("We're closed right now — online ordering runs 3pm–8am. Please come back after 3pm.", 'error');
      return;
    }

    if (currentOrderType() === 'Delivery' && !isDeliveryAvailable()) {
      applyDeliveryAvailability();
      showCheckoutFeedback('Delivery just closed for now (available again from 7pm) — please switch to Pickup.', 'error');
      return;
    }

    const { blockReason } = renderCheckoutSummary();
    if (blockReason) {
      showCheckoutFeedback(blockReason, 'error');
      return;
    }

    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = 'Redirecting to payment…';

    const formData = new FormData(form);
    const guestDetails = {
      customerName: formData.get('customerName'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      branch: (getGuestDetails() || {}).branch,
    };
    const payload = {
      ...guestDetails,
      orderType: formData.get('orderType'),
      address: formData.get('address') || undefined,
      city: formData.get('city') || undefined,
      postcode: formData.get('postcode') || undefined,
      notes: formData.get('notes') || undefined,
      items: getCart().map((item) => ({
        menuItemId: item.menuItemId,
        variantLabel: item.variantLabel,
        quantity: item.quantity,
        selectedOptions: item.selectedOptions || [],
        removedToppings: item.removedToppings || [],
        addedToppings: item.addedToppings || [],
      })),
    };

    try {
      // Cart is intentionally left intact here — it's only cleared once payment is confirmed,
      // so a cancelled Stripe checkout returns the customer to a cart that's still there.
      const { checkoutUrl } = await apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      saveGuestDetails(guestDetails);
      window.location.href = checkoutUrl;
    } catch (err) {
      showCheckoutFeedback(err.message, 'error');
      placeOrderBtn.disabled = false;
      placeOrderBtn.textContent = 'Continue to Payment';
    }
  });
});
