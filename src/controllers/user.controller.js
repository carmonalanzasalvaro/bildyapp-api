import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import {
  createAccessToken,
  createRefreshToken,
  generateVerificationCode
} from '../utils/auth.js';
import notificationService from '../services/notification.service.js';

export const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({
      email,
      deleted: false
    });

    if (existingUser) {
      return next(AppError.conflict('Email already registered'));
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = generateVerificationCode();

    const user = new User({
      email,
      password: hashedPassword,
      role: 'admin',
      status: 'pending',
      verificationCode,
      verificationAttempts: 3
    });

    const refreshToken = createRefreshToken(user);

    user.refreshTokens.push({
      token: refreshToken
    });

    await user.save();

    const accessToken = createAccessToken(user);

    notificationService.emit('user:registered', {
      userId: user._id.toString(),
      email: user.email
    });

    return res.status(201).json({
      ok: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          status: user.status,
          role: user.role
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    return next(error);
  }
};