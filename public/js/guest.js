document.addEventListener('DOMContentLoaded', () => {
  const redirect = new URLSearchParams(window.location.search).get('redirect') || 'menu.html';

  if (hasGuestDetails()) {
    window.location.href = redirect;
    return;
  }

  const saved = getGuestDetails();
  if (saved) {
    if (saved.customerName) document.getElementById('guest-name').value = saved.customerName;
    if (saved.phone) document.getElementById('guest-phone').value = saved.phone;
    if (saved.email) document.getElementById('guest-email').value = saved.email;
  }

  const form = document.getElementById('guest-form');
  const feedback = document.getElementById('guest-feedback');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    feedback.hidden = true;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const customerName = document.getElementById('guest-name').value.trim();
    const phone = document.getElementById('guest-phone').value.trim();
    const email = document.getElementById('guest-email').value.trim();

    saveGuestDetails({ customerName, phone, email });
    window.location.href = redirect;
  });
});
