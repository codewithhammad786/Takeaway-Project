const API_BASE = '/api';

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    const message = (data && data.message) || `Request failed (${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  return data;
}

function formatCurrency(amount) {
  return `£${Number(amount).toFixed(2)}`;
}

// Escapes text/attribute values before embedding in HTML strings — required because things like
// pizza size labels contain a literal " (e.g. 8" Regular), which otherwise breaks attribute quoting.
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Shows a small dismissible confirmation toast (e.g. "Item added to cart!") in the corner of the screen.
function showToast(message, icon) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span class="toast-icon">${icon || '✅'}</span>
    <span class="toast-message">${escapeHtml(message)}</span>
    <button type="button" class="toast-close" aria-label="Dismiss">&times;</button>
  `;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  const remove = () => {
    toast.classList.remove('toast-visible');
    setTimeout(() => toast.remove(), 250);
  };

  const timer = setTimeout(remove, 3000);
  toast.querySelector('.toast-close').addEventListener('click', () => {
    clearTimeout(timer);
    remove();
  });
}
