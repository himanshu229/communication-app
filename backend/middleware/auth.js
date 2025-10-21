const { verifyToken } = require('../utils/jwt');

function auth(req, res, next) {
  // Prefer Authorization header, fallback to httpOnly cookie
  const authHeader = req.headers.authorization || '';
  let token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token && req.cookies && req.cookies.authToken) {
    token = req.cookies.authToken;
  }
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