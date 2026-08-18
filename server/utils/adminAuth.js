const jwt = require('jsonwebtoken');

// Full session token — issued only after password AND (if enabled) the authenticator code both
// check out. Used by requireAdmin for every dashboard request.
function signAdminSessionToken() {
  return jwt.sign({ role: 'admin' }, process.env.ADMIN_SESSION_SECRET, { expiresIn: '12h' });
}

// Short-lived token issued right after a correct password, before 2FA is checked. It can only be
// used to complete /verify-2fa (scope check below) and expires in 5 minutes, so it's useless for
// anything else if intercepted.
function signPendingTwoFactorToken() {
  return jwt.sign({ scope: 'admin-2fa-pending' }, process.env.ADMIN_SESSION_SECRET, { expiresIn: '5m' });
}

function verifyPendingTwoFactorToken(token) {
  const decoded = jwt.verify(token, process.env.ADMIN_SESSION_SECRET);
  if (decoded.scope !== 'admin-2fa-pending') {
    throw new Error('Invalid token scope');
  }
  return decoded;
}

module.exports = { signAdminSessionToken, signPendingTwoFactorToken, verifyPendingTwoFactorToken };
