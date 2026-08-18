const jwt = require('jsonwebtoken');

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Missing admin token' });
  }

  if (!process.env.ADMIN_SESSION_SECRET) {
    return res.status(500).json({ message: 'Admin auth is not configured on the server (missing ADMIN_SESSION_SECRET)' });
  }

  try {
    jwt.verify(token, process.env.ADMIN_SESSION_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired session — please log in again' });
  }
}

module.exports = requireAdmin;
