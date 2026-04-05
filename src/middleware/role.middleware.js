import AppError from '../utils/AppError.js';

const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(AppError.unauthorized('Authentication required'));
  }

  if (!allowedRoles.includes(req.user.role)) {
    return next(AppError.forbidden('Insufficient permissions'));
  }

  next();
};

export default authorizeRoles;