const CUSTOMER_TOKEN_KEY = 'bunndough_customer_token';
const CUSTOMER_USER_KEY = 'bunndough_customer_user';

function getCustomerToken() {
  return localStorage.getItem(CUSTOMER_TOKEN_KEY);
}

function getCustomerUser() {
  try {
    const raw = localStorage.getItem(CUSTOMER_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setCustomerSession(token, user) {
  localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
  localStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify(user));
}

function clearCustomerSession() {
  localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  localStorage.removeItem(CUSTOMER_USER_KEY);
}

function isLoggedIn() {
  return !!getCustomerToken();
}

function authHeaders() {
  const token = getCustomerToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function renderAuthNav() {
  const container = document.getElementById('auth-nav');
  if (!container) return;

  const user = getCustomerUser();
  if (user) {
    container.innerHTML = `
      <span class="nav-greeting">Hi, ${escapeHtml(user.name.split(' ')[0])}</span>
      <a href="orders.html">My Orders</a>
      <button type="button" id="logout-btn" class="nav-logout-btn">Logout</button>
    `;
    document.getElementById('logout-btn').addEventListener('click', () => {
      clearCustomerSession();
      // Cart is scoped per browser via localStorage, not per account — clear it on logout so
      // the next person to log in on this device never sees a previous customer's selections.
      clearCart();
      window.location.href = 'index.html';
    });
  } else {
    container.innerHTML = `<a href="login.html">Login</a>`;
  }
}

document.addEventListener('DOMContentLoaded', renderAuthNav);
