const DELIVERY_FEE = 2.99;
const FREE_DELIVERY_THRESHOLD = 25;
const ONLINE_DISCOUNT_RATE = 0.15;

function currentOrderType() {
  const checked = document.querySelector('input[name="orderType"]:checked');
  return checked ? checked.value : 'Delivery';
}

function renderCheckoutSummary() {
  const cart = getCart();
  const itemsContainer = document.getElementById('checkout-items');
  const subtotal = getCartSubtotal();
  const discount = subtotal * ONLINE_DISCOUNT_RATE;
  const orderType = currentOrderType();
  const deliveryFee = orderType === 'Delivery' && subtotal < FREE_DELIVERY_THRESHOLD ? DELIVERY_FEE : 0;
  const total = subtotal - discount + deliveryFee;

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

  document.getElementById('checkout-subtotal').textContent = formatCurrency(subtotal);
  document.getElementById('checkout-discount').textContent = `− ${formatCurrency(discount)}`;
  document.getElementById('checkout-delivery').textContent = deliveryFee === 0 ? 'Free' : formatCurrency(deliveryFee);
  document.getElementById('checkout-total').textContent = formatCurrency(total);

  const deliveryFields = document.getElementById('delivery-fields');
  const addressInput = document.getElementById('address');
  const cityInput = document.getElementById('city');
  if (orderType === 'Delivery') {
    deliveryFields.style.display = '';
    addressInput.required = true;
    cityInput.required = true;
  } else {
    deliveryFields.style.display = 'none';
    addressInput.required = false;
    cityInput.required = false;
  }
}

function showCheckoutFeedback(message, type) {
  const feedback = document.getElementById('checkout-feedback');
  feedback.textContent = message;
  feedback.className = `feedback ${type}`;
  feedback.hidden = false;
}

document.addEventListener('DOMContentLoaded', () => {
  if (!isLoggedIn()) {
    window.location.href = 'login.html?redirect=checkout.html';
    return;
  }

  const cart = getCart();
  const form = document.getElementById('checkout-form');
  const placeOrderBtn = document.getElementById('place-order-btn');

  const user = getCustomerUser();
  if (user) {
    document.getElementById('customerName').value = user.name;
    document.getElementById('email').value = user.email;
  }

  if (new URLSearchParams(window.location.search).get('cancelled') === '1') {
    showCheckoutFeedback('Payment was cancelled — your cart is still saved, try again when ready.', 'error');
  }

  if (!cart.length) {
    showCheckoutFeedback('Your cart is empty. Add items from the menu before checking out.', 'error');
    placeOrderBtn.disabled = true;
    form.querySelectorAll('input, textarea').forEach((el) => (el.disabled = true));
    return;
  }

  renderCheckoutSummary();

  document.querySelectorAll('input[name="orderType"]').forEach((radio) => {
    radio.addEventListener('change', renderCheckoutSummary);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = 'Redirecting to payment…';

    const formData = new FormData(form);
    const payload = {
      customerName: formData.get('customerName'),
      phone: formData.get('phone'),
      email: formData.get('email') || undefined,
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
        headers: authHeaders(),
      });
      window.location.href = checkoutUrl;
    } catch (err) {
      if (err.status === 401) {
        window.location.href = 'login.html?redirect=checkout.html';
        return;
      }
      showCheckoutFeedback(err.message, 'error');
      placeOrderBtn.disabled = false;
      placeOrderBtn.textContent = 'Continue to Payment';
    }
  });
});
