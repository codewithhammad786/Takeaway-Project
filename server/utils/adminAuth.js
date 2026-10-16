const jwt = require('jsonwebtoken');

// Full session token — issued after the password checks out. Used by requireAdmin for every
// dashboard request.
function signAdminSessionToken() {
  return jwt.sign({ role: 'admin' }, process.env.ADMIN_SESSION_SECRET, { expiresIn: '12h' });
}

module.exports = { signAdminSessionToken };
