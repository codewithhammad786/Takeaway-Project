document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const feedback = document.getElementById('login-feedback');
  const submitBtn = document.getElementById('login-submit');
  const registerLink = document.getElementById('register-link');

  const redirectParam = new URLSearchParams(window.location.search).get('redirect') || 'index.html';

  if (registerLink) {
    registerLink.href = `register.html?redirect=${encodeURIComponent(redirectParam)}`;
  }

  if (isLoggedIn()) {
    window.location.href = redirectParam;
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    feedback.hidden = true;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in…';

    const formData = new FormData(form);
    try {
      const { token, user } = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.get('email'),
          password: formData.get('password'),
        }),
      });
      setCustomerSession(token, user);
      window.location.href = redirectParam;
    } catch (err) {
      feedback.textContent = err.message;
      feedback.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Log In';
    }
  });
});
