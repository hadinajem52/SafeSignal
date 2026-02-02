/**
 * Role-based access control middleware
 * Ensures the authenticated user has one of the required roles.
 * Must be placed AFTER the main authentication middleware.
 * 
 * @param {string|string[]} roles - Allowed role(s) (e.g., 'admin', 'moderator')
 */
const requireRole = (roles) => {
  return (req, res, next) => {
    // Ensure user is authenticated first
    if (!req.user) {
      return res.status(401).json({
        status: 'ERROR',
        message: 'Unauthorized: User context missing',
      });
    }

    const authorizedRoles = Array.isArray(roles) ? roles : [roles];

    if (!authorizedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'ERROR',
        message: 'Forbidden: Insufficient permissions',
      });
    }

    next();
  };
};

module.exports = requireRole;
