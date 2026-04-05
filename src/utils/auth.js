import jwt from 'jsonwebtoken';
import config from '../config/index.js';

export const generateVerificationCode = () => {
  return String(Math.floor(100000 + Math.random() * 900000));
};

export const createAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      type: 'access'
    },
    config.jwtAccessSecret,
    {
      expiresIn: config.accessTokenExpiresIn
    }
  );
};

export const createRefreshToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      type: 'refresh'
    },
    config.jwtRefreshSecret,
    {
      expiresIn: config.refreshTokenExpiresIn
    }
  );
};