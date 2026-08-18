const jwt = require('jsonwebtoken');

function requireCustomer(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Please log in to continue' });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: 'Customer auth is not configured on the server (missing JWT_SECRET)' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Your session has expired — please log in again' });
  }
}

module.exports = requireCustomer;
