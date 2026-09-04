const ADMIN_TOKEN_KEY = 'bunndough_admin_token';
const STATUS_OPTIONS = ['Pending', 'Preparing', 'Out for Delivery', 'Ready for Pickup', 'Completed'];

// Auto-print is a per-computer setting (localStorage, not tied to the manager account) — only the
// till/counter machine with a printer attached should have this on, so it can't follow a manager
// who logs in elsewhere.
const AUTO_PRINT_KEY = 'bunndough_admin_autoprint';
const AUTO_PRINT_SEEN_KEY = 'bunndough_admin_autoprint_seen';

let allOrders = [];
let pollTimer = null;

function getAdminToken() {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

function setAdminToken(token) {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
}

function clearAdminToken() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function adminRequest(path, options = {}) {
  const token = getAdminToken();
  const isFormData = options.body instanceof FormData;
  const res = await fetch(`/api/admin${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    throw new Error((data && data.message) || `Request failed (${res.status})`);
  }
  return data;
}

function showLogin() {
  document.getElementById('admin-login').hidden = false;
  document.getElementById('admin-panel').hidden = true;
  document.getElementById('admin-logout-wrap').hidden = true;
}

function showPanel() {
  document.getElementById('admin-login').hidden = true;
  document.getElementById('admin-panel').hidden = false;
  document.getElementById('admin-logout-wrap').hidden = false;
}

// Renders an item's modifiers grouped under their real menu headings (e.g. "Choose your salad",
// "Choose your sauces") when available, falling back to a flat bullet list for orders placed before
// selectedGroups existed, or for pizza topping customization (which has no groups).
function describeItemModifiers(item, { groupClass, listClass }) {
  if (item.selectedGroups && item.selectedGroups.length) {
    return item.selectedGroups
      .map(
        (g) => `
      <div class="${groupClass}">
        <span class="${groupClass}-label">${escapeHtml(g.label)}:</span> ${g.choices.map(escapeHtml).join(', ')}
      </div>
    `
      )
      .join('');
  }
  if (item.selectedOptions && item.selectedOptions.length) {
    return `<ul class="${listClass}">${item.selectedOptions.map((o) => `<li>${escapeHtml(o)}</li>`).join('')}</ul>`;
  }
  return '';
}

function describeOrderItems(order) {
  return `
    <ul class="admin-order-item-list">
      ${order.items
        .map((i) => {
          const variant = i.variantLabel && i.variantLabel !== 'Regular' ? ` (${escapeHtml(i.variantLabel)})` : '';
          const options = describeItemModifiers(i, {
            groupClass: 'admin-order-item-group',
            listClass: 'admin-order-item-options',
          });
          return `
        <li>
          <div class="admin-order-item-line">
            <span>${i.quantity}× ${escapeHtml(i.name)}${variant}</span>
            <span>${formatCurrency(i.price * i.quantity)}</span>
          </div>
          ${options}
        </li>
      `;
        })
        .join('')}
    </ul>
  `;
}

function receiptHtml(order) {
  const itemRows = order.items
    .map((i) => {
      const variant = i.variantLabel && i.variantLabel !== 'Regular' ? `<span class="r-variant">${escapeHtml(i.variantLabel)}</span>` : '';
      const options = describeItemModifiers(i, { groupClass: 'r-mod-group', listClass: 'r-mods' });
      return `
        <tr>
          <td class="r-item-cell">
            <div class="r-item-name">${escapeHtml(i.name)} ${variant}</div>
            ${options}
          </td>
          <td class="r-qty-cell">${i.quantity}</td>
          <td class="r-price-cell">${formatCurrency(i.price)}</td>
          <td class="r-price-cell r-line-total">${formatCurrency(i.price * i.quantity)}</td>
        </tr>
      `;
    })
    .join('');

  const isPaid = order.paymentStatus === 'Paid';

  // Sized for an 80mm thermal receipt printer (roughly 72mm printable width) — plain, single-column,
  // system fonts only (no web fonts to wait on), no color/shadow/radius since thermal printers are
  // monochrome and those effects only cause dithering/misalignment on that hardware.
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Receipt ${escapeHtml(order.orderNumber)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body {
    width: 72mm;
    margin: 0;
    padding: 0;
  }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #000;
    background: #fff;
    padding: 3mm 3mm 4mm;
    font-size: 12px;
    line-height: 1.4;
  }
  .r-frame { border-top: 3px double #000; border-bottom: 3px double #000; padding: 5px 0 8px; }
  .r-center { text-align: center; }
  .r-brand-name { font-size: 19px; font-weight: 800; letter-spacing: 0.03em; margin: 0; text-transform: uppercase; }
  .r-brand-tag { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: #333; margin: 3px 0 0; }
  .r-divider { border: none; border-top: 1px dashed #000; margin: 8px 0; }
  .r-receipt-label { font-size: 10px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; margin: 2px 0 0; }
  .r-order-number { font-size: 12px; font-weight: 700; margin: 3px 0 0; letter-spacing: 0.02em; }
  .r-order-date { font-size: 11px; margin-top: 1px; }
  .r-status { display: table; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; margin: 7px auto 0; padding: 3px 12px; border: 1px solid #000; }
  .r-receipt-no-box { display: table; border: 2px solid #000; padding: 5px 18px; margin: 8px auto 2px; }
  .r-receipt-no-box .r-receipt-no-label { font-size: 9px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; margin: 0; }
  .r-receipt-no-box .r-receipt-no-value { font-size: 26px; font-weight: 800; line-height: 1.1; margin: 1px 0 0; }
  .r-footer-brand { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; margin: 2px 0 0; }

  .r-section-title { font-size: 10px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; margin: 0 0 4px; border-bottom: 1px solid #000; padding-bottom: 2px; }
  .r-info-col { margin: 8px 0; }
  .r-info-col p { margin: 0 0 3px; font-size: 12px; }
  .r-info-col .r-label { font-weight: 600; display: inline-block; min-width: 46px; }

  table.r-items { width: 100%; border-collapse: collapse; margin: 4px 0; }
  table.r-items thead th {
    text-align: left;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 0 0 4px;
    border-bottom: 1px solid #000;
  }
  table.r-items thead th.r-qty-cell,
  table.r-items thead th.r-price-cell { text-align: right; }
  table.r-items td { padding: 5px 0; vertical-align: top; font-size: 12px; border-bottom: 1px dotted #999; }
  table.r-items tr:last-child td { border-bottom: none; }
  .r-item-cell { width: 52%; }
  .r-item-name { font-weight: 700; }
  .r-variant { font-weight: 500; font-size: 11px; }
  .r-mods { margin: 3px 0 0; padding-left: 12px; font-size: 11px; }
  .r-mods li { margin-bottom: 1px; }
  .r-mod-group { margin: 3px 0 0; font-size: 11px; }
  .r-mod-group-label { font-weight: 700; }
  .r-qty-cell { text-align: right; }
  .r-price-cell { text-align: right; white-space: nowrap; }
  .r-line-total { font-weight: 700; }

  .r-summary-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; }
  .r-summary-row.total { border-top: 2px solid #000; margin-top: 5px; padding-top: 7px; font-weight: 800; font-size: 15px; letter-spacing: 0.02em; }

  .r-notes-box { margin: 8px 0; padding: 6px 8px; border: 1px dashed #000; }
  .r-notes-box h4 { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 3px; }
  .r-notes-box p { margin: 0; font-size: 12px; font-style: italic; }

  .r-footer { text-align: center; margin-top: 4px; }
  .r-footer p { margin: 2px 0; font-size: 11px; }
  .r-thanks { font-weight: 700; font-size: 13px; margin-bottom: 6px !important; }
</style>
</head>
<body>
  <div class="r-center">
    <p class="r-brand-name">Bun 'n Dough</p>
    <p class="r-brand-tag">Pizza . Burger . Grill</p>
  </div>

  <div class="r-frame">
    <div class="r-center">
      <div class="r-receipt-label">Order Receipt</div>
      <div class="r-order-number">#${escapeHtml(order.orderNumber)}</div>
      <div class="r-order-date">${new Date(order.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</div>
      ${order.branch ? `<div class="r-order-date">${escapeHtml(order.branch)} branch</div>` : ''}
    </div>
  </div>

  <hr class="r-divider" />

  <div class="r-info-col">
    <div class="r-section-title">Customer</div>
    <p><span class="r-label">Name:</span> ${escapeHtml(order.customerName)}</p>
    <p><span class="r-label">Phone:</span> ${escapeHtml(order.phone)}</p>
    ${order.email ? `<p><span class="r-label">Email:</span> ${escapeHtml(order.email)}</p>` : ''}
  </div>
  <div class="r-info-col">
    <div class="r-section-title">${escapeHtml(order.orderType)}</div>
    ${
      order.orderType === 'Delivery'
        ? `
      <p><span class="r-label">Address:</span> ${escapeHtml(order.address)}</p>
      <p><span class="r-label">City:</span> ${escapeHtml(order.city)}</p>
      ${order.postcode ? `<p><span class="r-label">Postcode:</span> ${escapeHtml(order.postcode)}</p>` : ''}
    `
        : `<p>Collection in-store</p>`
    }
    <p><span class="r-label">Status:</span> ${escapeHtml(order.status)}</p>
  </div>

  <table class="r-items">
    <thead>
      <tr>
        <th>Item</th>
        <th class="r-qty-cell">Qty</th>
        <th class="r-price-cell">Price</th>
        <th class="r-price-cell">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <hr class="r-divider" />
  <div class="r-summary-row"><span>Subtotal</span><span>${formatCurrency(order.subtotal)}</span></div>
  ${order.discount > 0 ? `<div class="r-summary-row"><span>Online discount</span><span>-${formatCurrency(order.discount)}</span></div>` : ''}
  ${order.deliveryFee > 0 ? `<div class="r-summary-row"><span>Delivery fee</span><span>${formatCurrency(order.deliveryFee)}</span></div>` : ''}
  <div class="r-summary-row total"><span>Total</span><span>${formatCurrency(order.total)}</span></div>

  ${order.notes ? `<div class="r-notes-box"><div class="r-section-title">Special Instructions</div><p>${escapeHtml(order.notes)}</p></div>` : ''}

  <hr class="r-divider" />
  <div class="r-footer">
    ${order.dailyReceiptNo ? `<p>Receipt No: ${order.dailyReceiptNo}</p>` : ''}
    <p class="r-footer-brand">Bun 'n Dough</p>
  </div>

  <script>window.onload = () => window.print();</script>
</body>
</html>`;
}

function printReceipt(order) {
  const win = window.open('', '_blank', 'width=720,height=840');
  if (!win) {
    alert('Please allow pop-ups for this site to print receipts.');
    return;
  }
  win.document.write(receiptHtml(order));
  win.document.close();
}

// Prints a receipt via a throwaway hidden iframe instead of window.open() — used for auto-print so
// it can't be silently swallowed by the browser's pop-up blocker the way an unattended window.open()
// call from a polling loop (rather than a direct click) usually would be. The receipt's own
// `window.onload = () => window.print()` script still runs — inside the iframe, `window` refers to
// the iframe's own window, so it prints just that iframe's content.
function silentPrintReceipt(order) {
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.style.visibility = 'hidden';
  document.body.appendChild(frame);

  const doc = frame.contentDocument || frame.contentWindow.document;
  doc.open();
  doc.write(receiptHtml(order));
  doc.close();

  setTimeout(() => frame.remove(), 8000);
}

function isAutoPrintEnabled() {
  return localStorage.getItem(AUTO_PRINT_KEY) === 'true';
}

function getAutoPrintSeenIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(AUTO_PRINT_SEEN_KEY) || '[]'));
  } catch (err) {
    return new Set();
  }
}

function saveAutoPrintSeenIds(idsSet) {
  localStorage.setItem(AUTO_PRINT_SEEN_KEY, JSON.stringify([...idsSet].slice(-300)));
}

// Marks every currently-known paid order as "already handled" — called the moment auto-print is
// switched on, so turning it on doesn't blast-print the entire order history, only orders that
// become Paid from that point forward.
function markAllCurrentOrdersAsSeen() {
  saveAutoPrintSeenIds(new Set(allOrders.filter((o) => o.paymentStatus === 'Paid').map((o) => o._id)));
}

function autoPrintNewOrders() {
  if (!isAutoPrintEnabled()) return;

  const seen = getAutoPrintSeenIds();
  const newlyPaid = allOrders.filter((o) => o.paymentStatus === 'Paid' && !seen.has(o._id));
  if (!newlyPaid.length) return;

  newlyPaid.forEach((order) => {
    silentPrintReceipt(order);
    seen.add(order._id);
  });
  saveAutoPrintSeenIds(seen);
}

function renderOrders() {
  const filter = document.getElementById('payment-filter').value;
  const branchFilter = document.getElementById('branch-filter').value;
  const container = document.getElementById('admin-orders');
  let orders = filter === 'all' ? allOrders : allOrders.filter((o) => o.paymentStatus === filter);
  if (branchFilter !== 'all') orders = orders.filter((o) => o.branch === branchFilter);

  if (!orders.length) {
    container.innerHTML = '<p class="empty-state">No orders to show.</p>';
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
          ${order.branch ? `<span class="admin-branch-badge">${escapeHtml(order.branch)}</span>` : ''}
        </div>
        <span>${new Date(order.createdAt).toLocaleString('en-GB')}</span>
      </div>
      <div class="admin-order-body">
        <p><strong>${escapeHtml(order.customerName)}</strong> — ${escapeHtml(order.phone)} — ${escapeHtml(order.orderType)}${
        order.orderType === 'Delivery'
          ? ` (${escapeHtml(order.address)}, ${escapeHtml(order.city)}${order.postcode ? ' ' + escapeHtml(order.postcode) : ''})`
          : ''
      }</p>
        ${describeOrderItems(order)}
        ${order.notes ? `<p class="admin-order-notes">Notes: ${escapeHtml(order.notes)}</p>` : ''}
        <p><strong>Total: ${formatCurrency(order.total)}</strong></p>
      </div>
      <div class="admin-order-footer">
        <label>Status:
          <select data-status-select>
            ${STATUS_OPTIONS.map((s) => `<option value="${escapeHtml(s)}" ${s === order.status ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
          </select>
        </label>
        <div class="admin-order-actions">
          <button type="button" class="btn btn-outline admin-print-btn" data-print-receipt>🖨️ Print Receipt</button>
          <button type="button" class="btn btn-outline admin-delete-btn" data-delete-order>🗑️ Delete</button>
        </div>
      </div>
    </div>
  `
    )
    .join('');

  container.querySelectorAll('.admin-order-card').forEach((card) => {
    const id = card.getAttribute('data-id');
    card.querySelector('[data-status-select]').addEventListener('change', async (e) => {
      const select = e.target;
      const previous = allOrders.find((o) => o._id === id)?.status;
      try {
        await adminRequest(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: select.value }) });
        const order = allOrders.find((o) => o._id === id);
        if (order) order.status = select.value;
      } catch (err) {
        alert(`Failed to update status: ${err.message}`);
        if (previous) select.value = previous;
      }
    });
    card.querySelector('[data-print-receipt]').addEventListener('click', () => {
      const order = allOrders.find((o) => o._id === id);
      if (order) printReceipt(order);
    });
    card.querySelector('[data-delete-order]').addEventListener('click', async () => {
      const order = allOrders.find((o) => o._id === id);
      if (!confirm(`Delete order #${order ? order.orderNumber : ''}? This can't be undone.`)) return;

      try {
        await adminRequest(`/orders/${id}`, { method: 'DELETE' });
        allOrders = allOrders.filter((o) => o._id !== id);
        renderOrders();
      } catch (err) {
        alert(`Failed to delete order: ${err.message}`);
      }
    });
  });
}

async function loadOrders() {
  try {
    allOrders = await adminRequest('/orders');
    renderOrders();
    autoPrintNewOrders();
    document.getElementById('admin-last-updated').textContent = `Updated ${new Date().toLocaleTimeString('en-GB')}`;
  } catch (err) {
    if (pollTimer) clearInterval(pollTimer);
    clearAdminToken();
    showLogin();
  }
}

function startPolling() {
  loadOrders();
  pollTimer = setInterval(loadOrders, 15000);
  loadDashboard();
}

let allMenuItems = [];
let menuImagesLoaded = false;

function renderMenuImages() {
  const container = document.getElementById('admin-menu-images');
  const categoryFilter = document.getElementById('image-category-filter').value;
  const items = categoryFilter === 'all' ? allMenuItems : allMenuItems.filter((i) => i.category === categoryFilter);

  if (!items.length) {
    container.innerHTML = '<p class="empty-state">No menu items to show.</p>';
    return;
  }

  container.innerHTML = items
    .map(
      (item) => `
    <div class="admin-image-card" data-id="${escapeHtml(item._id)}">
      <img class="admin-image-preview" src="${escapeHtml(item.image || '')}" alt="${escapeHtml(item.name)}" />
      <div class="admin-image-info">
        <strong>${escapeHtml(item.name)}</strong>
        <span class="admin-image-category">${escapeHtml(item.category)}</span>
      </div>
      <div class="admin-image-actions">
        <label class="btn btn-outline admin-image-upload-btn">
          Upload Photo
          <input type="file" accept="image/jpeg,image/png,image/webp" data-image-input hidden />
        </label>
        <button type="button" class="btn btn-outline admin-delete-btn" data-delete-item>🗑️ Delete</button>
      </div>
      <span class="admin-image-status" data-image-status></span>
    </div>
  `
    )
    .join('');

  container.querySelectorAll('.admin-image-card').forEach((card) => {
    const id = card.getAttribute('data-id');
    const input = card.querySelector('[data-image-input]');
    const status = card.querySelector('[data-image-status]');
    const preview = card.querySelector('.admin-image-preview');
    if (preview) {
      preview.addEventListener('error', () => { preview.style.display = 'none'; }, { once: true });
    }

    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;

      status.textContent = 'Uploading…';
      try {
        const formData = new FormData();
        formData.append('image', file);
        const updated = await adminRequest(`/menu/${id}/image`, { method: 'POST', body: formData });

        const item = allMenuItems.find((i) => i._id === id);
        if (item) item.image = updated.image;

        const preview = card.querySelector('.admin-image-preview');
        preview.src = `${updated.image}?t=${Date.now()}`;
        preview.style.display = '';

        status.textContent = 'Saved ✓';
        setTimeout(() => {
          status.textContent = '';
        }, 2000);
      } catch (err) {
        status.textContent = `Failed: ${err.message}`;
      } finally {
        input.value = '';
      }
    });

    card.querySelector('[data-delete-item]').addEventListener('click', async () => {
      const item = allMenuItems.find((i) => i._id === id);
      if (!confirm(`Delete "${item ? item.name : 'this item'}" from the menu? This can't be undone.`)) return;

      try {
        await adminRequest(`/menu/${id}`, { method: 'DELETE' });
        allMenuItems = allMenuItems.filter((i) => i._id !== id);
        renderMenuImages();
      } catch (err) {
        alert(`Failed to delete menu item: ${err.message}`);
      }
    });
  });
}

function populateImageCategoryFilter() {
  const select = document.getElementById('image-category-filter');
  const categories = [...new Set(allMenuItems.map((i) => i.category))].sort();
  select.innerHTML =
    '<option value="all">All Categories</option>' +
    categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
}

async function loadMenuItems() {
  const container = document.getElementById('admin-menu-images');
  container.innerHTML = '<p class="loading">Loading menu items…</p>';
  try {
    allMenuItems = await adminRequest('/menu');
    populateImageCategoryFilter();
    renderMenuImages();
    menuImagesLoaded = true;
  } catch (err) {
    container.innerHTML = `<p class="empty-state">Failed to load menu items: ${escapeHtml(err.message)}</p>`;
  }
}

let allReviews = [];
let reviewsLoaded = false;

function renderReviews() {
  const filter = document.getElementById('review-filter').value;
  const container = document.getElementById('admin-reviews');
  const reviews =
    filter === 'all' ? allReviews : allReviews.filter((r) => (filter === 'approved' ? r.approved : !r.approved));

  if (!reviews.length) {
    container.innerHTML = '<p class="empty-state">No reviews to show.</p>';
    return;
  }

  container.innerHTML = reviews
    .map(
      (review) => `
    <div class="admin-review-card" data-id="${escapeHtml(review._id)}">
      <div class="admin-review-head">
        <div>
          <strong>${escapeHtml(review.name)}</strong>
          <span class="admin-review-stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span>
        </div>
        <span class="admin-pay-badge ${review.approved ? 'paid' : 'unpaid'}">${review.approved ? 'Approved' : 'Pending'}</span>
      </div>
      <p class="admin-review-comment">${escapeHtml(review.comment)}</p>
      <div class="admin-review-actions">
        ${!review.approved ? '<button type="button" class="btn btn-primary" data-approve-review>Approve</button>' : ''}
        <button type="button" class="btn btn-outline" data-delete-review>Delete</button>
      </div>
    </div>
  `
    )
    .join('');

  container.querySelectorAll('.admin-review-card').forEach((card) => {
    const id = card.getAttribute('data-id');

    const approveBtn = card.querySelector('[data-approve-review]');
    if (approveBtn) {
      approveBtn.addEventListener('click', async () => {
        try {
          await adminRequest(`/reviews/${id}/approve`, { method: 'PATCH' });
          const review = allReviews.find((r) => r._id === id);
          if (review) review.approved = true;
          renderReviews();
        } catch (err) {
          alert(`Failed to approve review: ${err.message}`);
        }
      });
    }

    card.querySelector('[data-delete-review]').addEventListener('click', async () => {
      if (!confirm('Delete this review?')) return;
      try {
        await adminRequest(`/reviews/${id}`, { method: 'DELETE' });
        allReviews = allReviews.filter((r) => r._id !== id);
        renderReviews();
      } catch (err) {
        alert(`Failed to delete review: ${err.message}`);
      }
    });
  });
}

async function loadReviews() {
  const container = document.getElementById('admin-reviews');
  container.innerHTML = '<p class="loading">Loading reviews…</p>';
  try {
    allReviews = await adminRequest('/reviews');
    renderReviews();
    reviewsLoaded = true;
  } catch (err) {
    container.innerHTML = `<p class="empty-state">Failed to load reviews: ${escapeHtml(err.message)}</p>`;
  }
}

let dashboardLoaded = false;
let dealsLoaded = false;

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// SVG line/area chart for the last 7 days of real earnings — no charting library needed. Gradient
// stops are styled via CSS classes rather than inline stop-color="var(...)" attributes, since plain
// SVG attributes don't evaluate CSS var() — only actual CSS property declarations do.
function renderEarningsChart(last7Days) {
  const container = document.getElementById('dashboard-chart');
  if (!container) return;

  if (!last7Days.length) {
    container.innerHTML = '<p class="empty-state">No earnings data yet.</p>';
    return;
  }

  const width = 600;
  const height = 220;
  const padX = 36;
  const padY = 28;
  const max = Math.max(...last7Days.map((d) => d.total), 1);
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const step = last7Days.length > 1 ? innerW / (last7Days.length - 1) : 0;

  const points = last7Days.map((d, i) => ({
    x: padX + step * i,
    y: padY + innerH - (d.total / max) * innerH,
    ...d,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${(padY + innerH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padY + innerH).toFixed(1)} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1]
    .map((t) => {
      const y = padY + innerH * t;
      return `<line class="chart-grid-line" x1="${padX}" y1="${y.toFixed(1)}" x2="${width - padX}" y2="${y.toFixed(1)}" />`;
    })
    .join('');

  const dots = points
    .map(
      (p) => `
      <g>
        <circle class="chart-dot" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" />
        <text class="chart-dot-label" x="${p.x.toFixed(1)}" y="${(p.y - 12).toFixed(1)}" text-anchor="middle">${escapeHtml(formatCurrency(p.total))}</text>
        <text class="chart-day-label" x="${p.x.toFixed(1)}" y="${height - 6}" text-anchor="middle">${WEEKDAY_LABELS[new Date(p.date).getDay()]}</text>
      </g>
    `
    )
    .join('');

  container.innerHTML = `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Earnings over the last 7 days">
      <defs>
        <linearGradient id="chart-area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop class="chart-gradient-start" offset="0%" />
          <stop class="chart-gradient-end" offset="100%" />
        </linearGradient>
      </defs>
      ${gridLines}
      <path class="chart-area" d="${areaPath}" fill="url(#chart-area-fill)" />
      <path class="chart-line" d="${linePath}" fill="none" />
      ${dots}
    </svg>
  `;
}

function renderDashboard(stats) {
  document.getElementById('stat-today').textContent = formatCurrency(stats.today);
  document.getElementById('stat-week').textContent = formatCurrency(stats.thisWeek);
  document.getElementById('stat-month').textContent = formatCurrency(stats.thisMonth);
  document.getElementById('stat-orders').textContent = stats.totalPaidOrders;

  renderEarningsChart(stats.last7Days);

  const topItemsList = document.getElementById('dashboard-top-items');
  if (!stats.topItems.length) {
    topItemsList.innerHTML = '<li class="empty-state">No sales yet.</li>';
  } else {
    topItemsList.innerHTML = stats.topItems
      .map(
        (item, i) => `
      <li>
        <span class="dashboard-top-rank">#${i + 1}</span>
        <span class="dashboard-top-name">${escapeHtml(item.name)}</span>
        <strong>${item.quantity} sold</strong>
      </li>
    `
      )
      .join('');
  }
}

async function loadDashboard() {
  try {
    const stats = await adminRequest('/stats');
    renderDashboard(stats);
    dashboardLoaded = true;
  } catch (err) {
    document.getElementById('dashboard-chart').innerHTML = `<p class="empty-state">Failed to load stats: ${escapeHtml(err.message)}</p>`;
  }
}

function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tab);
  });
  document.getElementById('admin-tab-dashboard').hidden = tab !== 'dashboard';
  document.getElementById('admin-tab-orders').hidden = tab !== 'orders';
  document.getElementById('admin-tab-images').hidden = tab !== 'images';
  document.getElementById('admin-tab-reviews').hidden = tab !== 'reviews';
  document.getElementById('admin-tab-deals').hidden = tab !== 'deals';
  document.getElementById('admin-tab-settings').hidden = tab !== 'settings';

  if (tab === 'dashboard' && !dashboardLoaded) {
    loadDashboard();
  }
  if (tab === 'images' && !menuImagesLoaded) {
    loadMenuItems();
  }
  if (tab === 'reviews' && !reviewsLoaded) {
    loadReviews();
  }
  if (tab === 'deals' && !dealsLoaded) {
    loadDealsRecipientCount();
  }
}

async function loadDealsRecipientCount() {
  const countEl = document.getElementById('deals-recipient-count');
  try {
    const { count } = await adminRequest('/campaigns/recipients-count');
    countEl.textContent = count;
    dealsLoaded = true;
  } catch (err) {
    countEl.textContent = '?';
  }
}

// Manager login is a two-step flow: password first, then an authenticator-app code (set up via QR
// on the very first login, just verified on every login after that). This state tracks which step
// we're on and the short-lived token the server issues after a correct password to bind step 2 to
// step 1 — see /api/admin/verify-2fa on the backend.
let loginStage = 'password';
let pendingTempToken = null;

function resetLoginForm() {
  loginStage = 'password';
  pendingTempToken = null;
  document.getElementById('admin-password-group').hidden = false;
  document.getElementById('admin-2fa-setup').hidden = true;
  document.getElementById('admin-2fa-group').hidden = true;
  document.getElementById('admin-login-submit').textContent = 'Log In';
  document.getElementById('admin-login-form').reset();
}

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('admin-login-form');
  const loginFeedback = document.getElementById('admin-login-feedback');
  const submitBtn = document.getElementById('admin-login-submit');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginFeedback.hidden = true;

    if (loginStage === 'password') {
      const password = document.getElementById('admin-password').value;
      submitBtn.disabled = true;
      try {
        const result = await adminRequest('/login', { method: 'POST', body: JSON.stringify({ password }) });
        pendingTempToken = result.tempToken;
        document.getElementById('admin-password-group').hidden = true;
        document.getElementById('admin-2fa-group').hidden = false;

        if (result.requiresSetup) {
          loginStage = '2fa-setup';
          document.getElementById('admin-2fa-qr').src = result.qrCode;
          document.getElementById('admin-2fa-secret').textContent = result.secret;
          document.getElementById('admin-2fa-setup').hidden = false;
          submitBtn.textContent = 'Enable 2FA & Log In';
        } else {
          loginStage = '2fa-verify';
          submitBtn.textContent = 'Verify & Log In';
        }
        document.getElementById('admin-2fa-code').focus();
      } catch (err) {
        loginFeedback.textContent = err.message;
        loginFeedback.hidden = false;
      } finally {
        submitBtn.disabled = false;
      }
      return;
    }

    // loginStage is '2fa-setup' or '2fa-verify' — either way, just checking the code.
    const code = document.getElementById('admin-2fa-code').value.trim();
    submitBtn.disabled = true;
    try {
      const { token } = await adminRequest('/verify-2fa', {
        method: 'POST',
        body: JSON.stringify({ tempToken: pendingTempToken, code }),
      });
      setAdminToken(token);
      resetLoginForm();
      showPanel();
      startPolling();
    } catch (err) {
      loginFeedback.textContent = err.message;
      loginFeedback.hidden = false;
      if (/session expired/i.test(err.message)) {
        resetLoginForm();
      }
    } finally {
      submitBtn.disabled = false;
    }
  });

  document.getElementById('admin-logout').addEventListener('click', () => {
    clearAdminToken();
    if (pollTimer) clearInterval(pollTimer);
    dashboardLoaded = false;
    menuImagesLoaded = false;
    reviewsLoaded = false;
    resetLoginForm();
    switchAdminTab('dashboard');
    showLogin();
  });

  document.getElementById('payment-filter').addEventListener('change', renderOrders);
  document.getElementById('branch-filter').addEventListener('change', renderOrders);

  const autoPrintToggle = document.getElementById('autoprint-toggle');
  autoPrintToggle.checked = isAutoPrintEnabled();
  autoPrintToggle.addEventListener('change', () => {
    localStorage.setItem(AUTO_PRINT_KEY, autoPrintToggle.checked ? 'true' : 'false');
    if (autoPrintToggle.checked) {
      markAllCurrentOrdersAsSeen();
    }
  });

  document.querySelectorAll('.admin-tab').forEach((btn) => {
    btn.addEventListener('click', () => switchAdminTab(btn.getAttribute('data-tab')));
  });

  document.getElementById('admin-footer-settings-link').addEventListener('click', () => {
    if (document.getElementById('admin-panel').hidden) return;
    switchAdminTab('settings');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.getElementById('image-category-filter').addEventListener('change', renderMenuImages);
  document.getElementById('review-filter').addEventListener('change', renderReviews);

  document.getElementById('admin-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const feedback = document.getElementById('admin-password-feedback');
    feedback.hidden = true;

    const currentPassword = document.getElementById('admin-current-password').value;
    const newPassword = document.getElementById('admin-new-password').value;
    const confirmPassword = document.getElementById('admin-confirm-password').value;

    if (newPassword !== confirmPassword) {
      feedback.textContent = 'New passwords do not match';
      feedback.className = 'feedback error';
      feedback.hidden = false;
      return;
    }

    try {
      await adminRequest('/settings/password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      feedback.textContent = 'Password updated successfully.';
      feedback.className = 'feedback success';
      feedback.hidden = false;
      e.target.reset();
    } catch (err) {
      feedback.textContent = err.message;
      feedback.className = 'feedback error';
      feedback.hidden = false;
    }
  });

  document.getElementById('deals-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const feedback = document.getElementById('deals-feedback');
    feedback.hidden = true;

    const subject = document.getElementById('deal-subject').value.trim();
    const message = document.getElementById('deal-message').value.trim();
    const recipientCount = document.getElementById('deals-recipient-count').textContent;

    if (!confirm(`Send "${subject}" to ${recipientCount} customer(s) by email now? This can't be undone.`)) {
      return;
    }

    const sendBtn = document.getElementById('deals-send-btn');
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending…';

    try {
      const result = await adminRequest('/campaigns/send', {
        method: 'POST',
        body: JSON.stringify({ subject, message }),
      });
      feedback.textContent = `Sent to ${result.sent} of ${result.total} customer(s)${result.failed ? ` — ${result.failed} failed to send` : ''}.`;
      feedback.className = `feedback ${result.failed ? 'error' : 'success'}`;
      feedback.hidden = false;
      if (!result.failed) e.target.reset();
    } catch (err) {
      feedback.textContent = err.message;
      feedback.className = 'feedback error';
      feedback.hidden = false;
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send to All Customers';
    }
  });

  document.getElementById('admin-2fa-reset-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const feedback = document.getElementById('admin-2fa-reset-feedback');
    feedback.hidden = true;

    const currentPassword = document.getElementById('admin-2fa-reset-password').value;

    try {
      const result = await adminRequest('/settings/2fa/reset', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword }),
      });
      feedback.textContent = result.message;
      feedback.className = 'feedback success';
      feedback.hidden = false;
      e.target.reset();
    } catch (err) {
      feedback.textContent = err.message;
      feedback.className = 'feedback error';
      feedback.hidden = false;
    }
  });

  if (getAdminToken()) {
    showPanel();
    startPolling();
  } else {
    showLogin();
  }
});
