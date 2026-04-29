import { ROLES } from '../config/constants.js';

/**
 * Role-based access control middleware.
 * Usage: authorize(ROLES.ADMIN, ROLES.ANALYST)
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions for this resource.',
      });
    }

    next();
  };
};

/**
 * Checks that the user owns the resource OR is an admin.
 */
export const ownerOrAdmin = (ownerField = 'userId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const isAdmin = [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(req.user.role);
    const isOwner =
      req.params[ownerField] === req.user._id.toString() ||
      req.body[ownerField] === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You do not own this resource.',
      });
    }

    next();
  };
};