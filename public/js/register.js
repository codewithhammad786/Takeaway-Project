const RESEND_COOLDOWN_SECONDS = 60;

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form');
  const feedback = document.getElementById('register-feedback');
  const detailsFields = document.getElementById('register-details-fields');
  const sendCodeBtn = document.getElementById('send-code-btn');
  const otpGroup = document.getElementById('otp-group');
  const otpInput = document.getElementById('otp');
  const otpPhoneDisplay = document.getElementById('otp-phone-display');
  const resendBtn = document.getElementById('resend-code-btn');
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

  let resendTimer = null;

  function startResendCooldown() {
    let secondsLeft = RESEND_COOLDOWN_SECONDS;
    resendBtn.disabled = true;
    resendBtn.textContent = `Resend code (${secondsLeft}s)`;
    clearInterval(resendTimer);
    resendTimer = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        clearInterval(resendTimer);
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend code';
      } else {
        resendBtn.textContent = `Resend code (${secondsLeft}s)`;
      }
    }, 1000);
  }

  async function requestCode() {
    const error = validateDetails();
    if (error) {
      showFeedback(error, 'error');
      return;
    }
    feedback.hidden = true;

    const phone = document.getElementById('phone').value.trim();
    sendCodeBtn.disabled = true;
    sendCodeBtn.textContent = 'Sending…';

    try {
      await apiRequest('/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });

      showFeedback('Verification code sent — check your phone.', 'success');

      Array.from(detailsFields.querySelectorAll('input')).forEach((input) => {
        if (input.id !== 'phone') return;
        input.readOnly = true;
      });

      otpPhoneDisplay.textContent = phone;
      otpGroup.hidden = false;
      sendCodeBtn.hidden = true;
      submitBtn.hidden = false;
      otpInput.focus();
      startResendCooldown();
    } catch (err) {
      showFeedback(err.message, 'error');
      sendCodeBtn.disabled = false;
      sendCodeBtn.textContent = 'Send Verification Code';
    }
  }

  sendCodeBtn.addEventListener('click', requestCode);
  resendBtn.addEventListener('click', () => {
    if (resendBtn.disabled) return;
    requestCode();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    feedback.hidden = true;

    const otp = otpInput.value.trim();
    if (!otp) {
      showFeedback('Enter the verification code sent to your phone', 'error');
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
          otp,
          password: formData.get('password'),
        }),
      });
      setCustomerSession(token, user);
      window.location.href = redirect;
    } catch (err) {
      showFeedback(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Verify & Create Account';
    }
  });
});
