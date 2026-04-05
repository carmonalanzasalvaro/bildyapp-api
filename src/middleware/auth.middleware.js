import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import config from '../config/index.js';
import AppError from '../utils/AppError.js';

const auth = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith('Bearer ')) {
      return next(AppError.unauthorized('Authorization token is required'));
    }

    const token = authorization.split(' ')[1];

    const payload = jwt.verify(token, config.jwtAccessSecret);

    if (payload.type !== 'access') {
      return next(AppError.unauthorized('Invalid token type'));
    }

    const user = await User.findOne({
      _id: payload.sub,
      deleted: false
    });

    if (!user) {
      return next(AppError.unauthorized('User not found'));
    }

    req.user = user;
    next();
  } catch (error) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError'
    ) {
      return next(AppError.unauthorized('Invalid or expired token'));
    }

    return next(error);
  }
};

export default auth;