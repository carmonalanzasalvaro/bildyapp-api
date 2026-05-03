import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';

export const extractAccessToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw AppError.unauthorized('Token no proporcionado', 'NO_TOKEN');
  }

  return authHeader.split(' ')[1];
};

export const resolveAuthenticatedUser = async (token) => {
  if (!token) {
    throw AppError.unauthorized('Token no proporcionado', 'NO_TOKEN');
  }

  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch {
    throw AppError.unauthorized('Token inválido o expirado', 'INVALID_TOKEN');
  }

  const user = await User.findById(payload.sub).populate('company');

  if (!user || user.deleted) {
    throw AppError.unauthorized('Usuario no disponible', 'USER_NOT_FOUND');
  }

  return user;
};

export const authenticate = async (req, _res, next) => {
  try {
    req.user = await resolveAuthenticatedUser(extractAccessToken(req.headers.authorization));
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
