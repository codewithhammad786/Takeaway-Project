function renderOrder(container, order) {
  const itemsHTML = order.items
    .map((item) => {
      const parts = [];
      if (item.variantLabel && item.variantLabel !== 'Regular') parts.push(item.variantLabel);
      if (item.selectedOptions && item.selectedOptions.length) parts.push(item.selectedOptions.join(', '));
      const detail = parts.length ? ` (${escapeHtml(parts.join(' • '))})` : '';
      return `
      <div class="summary-row">
        <span>${item.quantity} × ${escapeHtml(item.name)}${detail}</span>
        <span>${formatCurrency(item.price * item.quantity)}</span>
      </div>
    `;
    })
    .join('');

  container.innerHTML = `
    <div class="confirmation-box">
      <div class="confirmation-icon">🎉</div>
      <h1>Thank you, ${escapeHtml(order.customerName)}!</h1>
      <p>Payment confirmed — your order is being prepared.</p>
      <span class="order-number">Order #${escapeHtml(order.orderNumber)}</span>
      <p>${order.orderType === 'Delivery' ? `Delivering to ${escapeHtml(order.address)}, ${escapeHtml(order.city)}` : 'Ready for pickup in-store'} — estimated ${order.orderType === 'Delivery' ? '30-40 minutes' : '15-20 minutes'}.</p>
      <div class="confirmation-details">
        ${itemsHTML}
        <div class="summary-row">
          <span>Subtotal</span>
          <span>${formatCurrency(order.subtotal)}</span>
        </div>
        <div class="summary-row">
          <span>Online discount (15%)</span>
          <span>− ${formatCurrency(order.discount)}</span>
        </div>
        <div class="summary-row">
          <span>Delivery fee</span>
          <span>${order.deliveryFee === 0 ? 'Free' : formatCurrency(order.deliveryFee)}</span>
        </div>
        <div class="summary-row summary-total">
          <span>Total paid</span>
          <span>${formatCurrency(order.total)}</span>
        </div>
      </div>
      <a href="index.html" class="btn btn-primary" style="margin-top: 24px;">Back to Home</a>
    </div>
  `;
}

function renderConfirmationError(container, title, message) {
  container.innerHTML = `
    <div class="confirmation-box">
      <div class="confirmation-icon">⚠️</div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(message)}</p>
      <a href="index.html" class="btn btn-primary">Back to Home</a>
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('confirmation-content');
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId') || params.get('id');
  const sessionId = params.get('session_id');

  if (!orderId) {
    renderConfirmationError(
      container,
      'No order found',
      "We couldn't find an order to show. If you just placed one, check your email or contact us."
    );
    return;
  }

  try {
    if (sessionId) {
      // Just returned from Stripe Checkout — verify payment server-side before showing the order.
      const order = await apiRequest(`/orders/${orderId}/confirm-payment`, {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      });
      clearCart();
      renderOrder(container, order);
    } else {
      const order = await apiRequest(`/orders/${orderId}`);
      renderOrder(container, order);
    }
  } catch (err) {
    renderConfirmationError(container, 'Payment or order issue', err.message);
  }
});
