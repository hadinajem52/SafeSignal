const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      status: 'ERROR',
      message: 'Access token required',
    });
  }

  const JWT_SECRET = process.env.JWT_SECRET || 'safesignal-jwt-secret-change-in-production';

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const dbUser = await db.oneOrNone(
      'SELECT role, is_suspended FROM users WHERE user_id = $1',
      [decoded.userId]
    );

    if (!dbUser) {
      return res.status(401).json({
        status: 'ERROR',
        message: 'User account no longer exists',
      });
    }

    if (dbUser.is_suspended) {
      return res.status(403).json({
        status: 'ERROR',
        message: 'Account suspended',
      });
    }

    req.user = {
      ...decoded,
      role: dbUser.role,
    };
    next();
  } catch (_error) {
    return res.status(403).json({
      status: 'ERROR',
      message: 'Invalid or expired token',
    });
  }
};

module.exports = authenticateToken;
