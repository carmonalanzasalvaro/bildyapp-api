import jwt from 'jsonwebtoken';
import config from '../config/index.js';

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      company: user.company?._id?.toString?.() || user.company?.toString?.() || null
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
};

export const verifyAccessToken = (token) => jwt.verify(token, config.jwtSecret);
