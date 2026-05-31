const jwt = require('jsonwebtoken');
const db = require('../config/database');

const optionalAuth = async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || 'safesignal-jwt-secret-change-in-production';
    const decoded = jwt.verify(token, JWT_SECRET);
    const dbUser = await db.oneOrNone(
      'SELECT role, is_suspended FROM users WHERE user_id = $1',
      [decoded.userId]
    );

    if (dbUser && !dbUser.is_suspended) {
      req.user = {
        ...decoded,
        role: dbUser.role,
      };
    }
  } catch {
    // Public routes should stay public even when an optional token is stale.
  }

  return next();
};

module.exports = optionalAuth;
