document.addEventListener('DOMContentLoaded', () => {
  const redirect = new URLSearchParams(window.location.search).get('redirect') || 'menu.html';

  if (hasGuestDetails()) {
    window.location.href = redirect;
    return;
  }

  const saved = getGuestDetails();
  if (saved && saved.branch) {
    const branchInput = document.querySelector(`input[name="branch"][value="${saved.branch}"]`);
    if (branchInput) branchInput.checked = true;
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

    const branch = (document.querySelector('input[name="branch"]:checked') || {}).value;

    // Keeps any name/phone/email already saved from a past order (so checkout can still prefill
    // them) — this page only ever collects the branch.
    saveGuestDetails({ ...(saved || {}), branch });
    window.location.href = redirect;
  });
});
