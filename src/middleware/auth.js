import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';

export const authenticate = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(AppError.unauthorized('Token no proporcionado', 'NO_TOKEN'));
    }

    const token = authHeader.split(' ')[1];
    let payload;

    try {
      payload = verifyAccessToken(token);
    } catch {
      return next(AppError.unauthorized('Token inválido o expirado', 'INVALID_TOKEN'));
    }

    const user = await User.findById(payload.sub).populate('company');

    if (!user || user.deleted) {
      return next(AppError.unauthorized('Usuario no disponible', 'USER_NOT_FOUND'));
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

export const requireCompany = (req, _res, next) => {
  if (!req.user?.company) {
    return next(AppError.forbidden('Debes completar la compañía antes de continuar', 'NO_COMPANY'));
  }

  return next();
};
