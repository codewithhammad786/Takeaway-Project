const ADMIN_TOKEN_KEY = 'bunndough_admin_token';
const STATUS_OPTIONS = ['Pending', 'Preparing', 'Out for Delivery', 'Ready for Pickup', 'Completed'];

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

function describeOrderItems(order) {
  return order.items
    .map((i) => `${i.quantity}× ${escapeHtml(i.name)}${i.variantLabel && i.variantLabel !== 'Regular' ? ` (${escapeHtml(i.variantLabel)})` : ''}`)
    .join(', ');
}

function renderOrders() {
  const filter = document.getElementById('payment-filter').value;
  const container = document.getElementById('admin-orders');
  const orders = filter === 'all' ? allOrders : allOrders.filter((o) => o.paymentStatus === filter);

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
        </div>
        <span>${new Date(order.createdAt).toLocaleString('en-GB')}</span>
      </div>
      <div class="admin-order-body">
        <p><strong>${escapeHtml(order.customerName)}</strong> — ${escapeHtml(order.phone)} — ${escapeHtml(order.orderType)}${
        order.orderType === 'Delivery'
          ? ` (${escapeHtml(order.address)}, ${escapeHtml(order.city)}${order.postcode ? ' ' + escapeHtml(order.postcode) : ''})`
          : ''
      }</p>
        <p class="admin-order-items">${describeOrderItems(order)}</p>
        ${order.notes ? `<p class="admin-order-notes">Notes: ${escapeHtml(order.notes)}</p>` : ''}
        <p><strong>Total: ${formatCurrency(order.total)}</strong></p>
      </div>
      <div class="admin-order-footer">
        <label>Status:
          <select data-status-select>
            ${STATUS_OPTIONS.map((s) => `<option value="${escapeHtml(s)}" ${s === order.status ? 'selected' : ''}>${escapeHtml(s)}</option>`).join('')}
          </select>
        </label>
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
  });
}

async function loadOrders() {
  try {
    allOrders = await adminRequest('/orders');
    renderOrders();
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
      <label class="btn btn-outline admin-image-upload-btn">
        Upload Photo
        <input type="file" accept="image/jpeg,image/png,image/webp" data-image-input hidden />
      </label>
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
