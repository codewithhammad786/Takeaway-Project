function describeHistoryItems(order) {
  return order.items
    .map((i) => `${i.quantity}× ${escapeHtml(i.name)}${i.variantLabel && i.variantLabel !== 'Regular' ? ` (${escapeHtml(i.variantLabel)})` : ''}`)
    .join(', ');
}

let currentOrders = [];

function renderOrderHistory(orders) {
  currentOrders = orders;
  const container = document.getElementById('orders-list');

  if (!orders.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>You haven't placed any orders yet.</p>
        <a href="menu.html" class="btn btn-primary">Browse Menu</a>
      </div>
    `;
    return;
  }

  container.innerHTML = orders
    .map(
      (order) => `
    <div class="admin-order-card" data-id="${escapeHtml(order._id)}">
      <div class="admin-order-head">
        <div>
          <strong>#${escapeHtml(order.orderNumber)}</strong>
          <span class="admin-pay-badge ${order.paymentStatus === 'Paid' ? 'paid' : 'unpaid'}">${escapeHtml(order.paymentStatus)}</span>
        </div>
        <span>${new Date(order.createdAt).toLocaleString('en-GB')}</span>
      </div>
      <div class="admin-order-body">
        <p class="admin-order-items">${describeHistoryItems(order)}</p>
        <p>${escapeHtml(order.orderType)}${order.orderType === 'Delivery' ? ` — ${escapeHtml(order.address)}, ${escapeHtml(order.city)}` : ''}</p>
        <p><strong>Total: ${formatCurrency(order.total)}</strong> &nbsp; Status: <strong>${escapeHtml(order.status)}</strong></p>
      </div>
      ${
        order.paymentStatus !== 'Paid'
          ? `<div class="admin-order-footer"><button type="button" class="remove-btn" data-remove-order>Remove this unpaid order</button></div>`
          : ''
      }
    </div>
  `
    )
    .join('');

  container.querySelectorAll('[data-remove-order]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const card = btn.closest('.admin-order-card');
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
