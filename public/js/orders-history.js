function statusPillClass(status) {
  return `status-${status.toLowerCase().replace(/\s+/g, '-')}`;
}

function describeHistoryItem(item) {
  const parts = [];
  if (item.variantLabel && item.variantLabel !== 'Regular') parts.push(item.variantLabel);
  if (item.selectedOptions && item.selectedOptions.length) parts.push(item.selectedOptions.join(', '));
  const detail = parts.length ? escapeHtml(parts.join(' • ')) : '';

  return `
    <li>
      <div>
        <div class="order-history-item-name">${item.quantity} × ${escapeHtml(item.name)}</div>
        ${detail ? `<div class="order-history-item-variant">${detail}</div>` : ''}
      </div>
      <span class="order-history-item-price">${formatCurrency(item.price * item.quantity)}</span>
    </li>
  `;
}

function renderOrdersSummary(orders) {
  const summary = document.getElementById('orders-summary');
  if (!orders.length) {
    summary.hidden = true;
    return;
  }

  const paidOrders = orders.filter((o) => o.paymentStatus === 'Paid');
  const totalSpent = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const lastOrder = orders[0];

  document.getElementById('stat-order-count').textContent = orders.length;
  document.getElementById('stat-order-spent').textContent = formatCurrency(totalSpent);
  document.getElementById('stat-order-last').textContent = new Date(lastOrder.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  summary.hidden = false;
}

let currentOrders = [];

function renderOrderHistory(orders) {
  currentOrders = orders;
  const container = document.getElementById('orders-list');

  renderOrdersSummary(orders);

  if (!orders.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>You haven't placed any orders yet.</p>
        <a href="menu.html" class="btn btn-primary">Browse Menu</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="order-history-list">
      ${orders
        .map((order) => {
          const metaParts = [`<strong>${escapeHtml(order.orderType)}</strong>`];
          if (order.orderType === 'Delivery') {
            metaParts.push(`${escapeHtml(order.address)}, ${escapeHtml(order.city)}`);
          }

          return `
      <article class="order-history-card" data-id="${escapeHtml(order._id)}">
        <div class="order-history-head">
          <div class="order-history-id">
            <span class="order-history-number">Order #${escapeHtml(order.orderNumber)}</span>
            <span class="order-history-date">${new Date(order.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</span>
          </div>
          <div class="order-history-badges">
            <span class="status-pill ${statusPillClass(order.status)}">${escapeHtml(order.status)}</span>
            <span class="admin-pay-badge ${order.paymentStatus === 'Paid' ? 'paid' : 'unpaid'}">${escapeHtml(order.paymentStatus)}</span>
          </div>
        </div>
        <div class="order-history-body">
          <ul class="order-history-items">${order.items.map(describeHistoryItem).join('')}</ul>
          <p class="order-history-meta">${metaParts.join(' — ')}</p>
          <div class="order-history-summary">
            <div class="order-history-summary-row">
              <span>Subtotal</span>
              <span>${formatCurrency(order.subtotal)}</span>
            </div>
            ${
              order.discount > 0
                ? `<div class="order-history-summary-row discount"><span>Discount</span><span>-${formatCurrency(order.discount)}</span></div>`
                : ''
            }
            ${
              order.deliveryFee > 0
                ? `<div class="order-history-summary-row"><span>Delivery Fee</span><span>${formatCurrency(order.deliveryFee)}</span></div>`
                : ''
            }
            <div class="order-history-summary-row total">
              <span>Total</span>
              <span>${formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>
        ${
          order.paymentStatus !== 'Paid'
            ? `<div class="order-history-footer"><button type="button" class="remove-btn" data-remove-order>Remove this unpaid order</button></div>`
            : ''
        }
      </article>
    `;
        })
        .join('')}
    </div>
  `;

  container.querySelectorAll('[data-remove-order]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.order-history-card');
      const id = card.getAttribute('data-id');
      if (!confirm('Remove this unpaid order from your history?')) return;

      btn.disabled = true;
      btn.textContent = 'Removing…';
      try {
        await apiRequest(`/orders/${id}`, { method: 'DELETE' });
        currentOrders = currentOrders.filter((o) => o._id !== id);
        renderOrderHistory(currentOrders);
        showToast('Order removed.', '🗑️');
      } catch (err) {
        alert(`Couldn't remove that order: ${err.message}`);
        btn.disabled = false;
        btn.textContent = 'Remove this unpaid order';
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('order-lookup-form');
  const feedback = document.getElementById('lookup-feedback');
  const submitBtn = document.getElementById('lookup-submit-btn');
  const resultsBox = document.getElementById('orders-results');

  const saved = getGuestDetails();
  if (saved) {
    if (saved.phone) document.getElementById('lookup-phone').value = saved.phone;
    if (saved.email) document.getElementById('lookup-email').value = saved.email;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    feedback.hidden = true;

    const phone = document.getElementById('lookup-phone').value.trim();
    const email = document.getElementById('lookup-email').value.trim();

    submitBtn.disabled = true;
    submitBtn.textContent = 'Searching…';

    try {
      const { orders } = await apiRequest('/customers/lookup-orders', {
        method: 'POST',
        body: JSON.stringify({ phone, email }),
      });

      resultsBox.hidden = false;
      if (!orders.length) {
        document.getElementById('orders-summary').hidden = true;
        document.getElementById('orders-list').innerHTML = `
          <div class="empty-state">
            <p>No orders found for that phone number and email. Double-check they match exactly what you used when ordering.</p>
            <a href="menu.html" class="btn btn-primary">Browse Menu</a>
          </div>
        `;
      } else {
        renderOrderHistory(orders);
      }
      resultsBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      feedback.textContent = err.message;
      feedback.hidden = false;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Find My Orders';
    }
  });
});
