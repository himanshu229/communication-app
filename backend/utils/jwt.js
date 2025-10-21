const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_insecure_change_me';
const JWT_EXPIRES_IN = '12h';

function signUser(user) {
  return jwt.sign({ id: user.id, phoneNumber: user.phoneNumber }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

module.exports = { signUser, verifyToken };