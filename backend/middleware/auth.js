const { verifyToken } = require('../utils/jwt');

function auth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing token' });
  }
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
  req.user = decoded; // { id, phoneNumber, iat, exp }
  next();
}

module.exports = auth;