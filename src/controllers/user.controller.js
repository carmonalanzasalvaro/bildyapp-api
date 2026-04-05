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

export const validateEmail = async (req, res, next) => {
  try {
    const { code } = req.body;
    const user = req.user;

    if (user.status === 'verified') {
      return res.status(200).json({
        ok: true,
        message: 'Email already verified'
      });
    }

    if (user.verificationAttempts <= 0) {
      return next(AppError.tooManyRequests('Verification attempts exhausted'));
    }

    if (user.verificationCode !== code) {
      user.verificationAttempts -= 1;
      await user.save();

      if (user.verificationAttempts <= 0) {
        return next(AppError.tooManyRequests('Verification attempts exhausted'));
      }

      return next(
        AppError.badRequest('Invalid verification code', {
          remainingAttempts: user.verificationAttempts
        })
      );
    }

    user.status = 'verified';
    user.verificationCode = '';
    await user.save();

    notificationService.emit('user:verified', {
      userId: user._id.toString(),
      email: user.email
    });

    return res.status(200).json({
      ok: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    return next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({
      email,
      deleted: false
    }).select('+password +refreshTokens');

    if (!user) {
      return next(AppError.unauthorized('Invalid credentials'));
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return next(AppError.unauthorized('Invalid credentials'));
    }

    const accessToken = createAccessToken(user);
    const refreshToken = createRefreshToken(user);

    user.refreshTokens.push({
      token: refreshToken
    });

    await user.save();

    return res.status(200).json({
      ok: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          lastName: user.lastName,
          role: user.role,
          status: user.status,
          company: user.company
        },
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    return next(error);
  }
};