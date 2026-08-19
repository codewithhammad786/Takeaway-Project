document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form');
  const feedback = document.getElementById('register-feedback');
  const submitBtn = document.getElementById('register-submit');
  const loginLink = document.getElementById('login-link');

  const redirect = new URLSearchParams(window.location.search).get('redirect') || 'index.html';

  if (isLoggedIn()) {
    window.location.href = redirect;
    return;
  }

  if (loginLink) {
    loginLink.href = `login.html?redirect=${encodeURIComponent(redirect)}`;
  }

  function showFeedback(message, type) {
    feedback.textContent = message;
    feedback.className = `feedback ${type || 'error'}`;
    feedback.hidden = false;
  }

  function validateDetails() {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!name) return 'Please enter your name';
    if (!email) return 'Please enter your email';
    if (!phone) return 'Please enter your phone number';
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    feedback.hidden = true;

    const error = validateDetails();
    if (error) {
      showFeedback(error, 'error');
      return;
    }

    const formData = new FormData(form);
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating account…';

    try {
      const { token, user } = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          password: formData.get('password'),
        }),
      });
      setCustomerSession(token, user);
      window.location.href = redirect;
    } catch (err) {
      showFeedback(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
  });
});
