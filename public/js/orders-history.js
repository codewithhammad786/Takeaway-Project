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
        await apiRequest(`/orders/${id}`, { method: 'DELETE', headers: authHeaders() });
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

document.addEventListener('DOMContentLoaded', async () => {
  if (!isLoggedIn()) {
    window.location.href = 'login.html?redirect=orders.html';
    return;
  }

  const container = document.getElementById('orders-list');
  try {
    const orders = await apiRequest('/auth/orders', { headers: authHeaders() });
    renderOrderHistory(orders);
  } catch (err) {
    if (err.status === 401) {
      clearCustomerSession();
      window.location.href = 'login.html?redirect=orders.html';
      return;
    }
    container.innerHTML = `<p class="empty-state">Couldn't load your orders: ${escapeHtml(err.message)}</p>`;
  }
});
