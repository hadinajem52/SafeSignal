const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      status: 'ERROR',
      message: 'Access token required',
    });
  }

  const JWT_SECRET = process.env.JWT_SECRET || 'safesignal-jwt-secret-change-in-production';

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        status: 'ERROR',
        message: 'Invalid or expired token',
      });
    }

    req.user = user;
    next();
  });
};

module.exports = authenticateToken;
