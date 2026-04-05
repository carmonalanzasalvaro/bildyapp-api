import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Company from '../models/Company.js';
import AppError from '../utils/AppError.js';
import config from '../config/index.js';
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

export const updateProfile = async (req, res, next) => {
  try {
    const { name, lastName, nif, address } = req.body;
    const user = req.user;

    user.name = name;
    user.lastName = lastName;
    user.nif = nif;
    user.address = {
      street: address?.street ?? '',
      number: address?.number ?? '',
      postal: address?.postal ?? '',
      city: address?.city ?? '',
      province: address?.province ?? ''
    };

    await user.save();

    return res.status(200).json({
      ok: true,
      message: 'User profile updated successfully',
      data: {
        user
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const updateCompany = async (req, res, next) => {
  try {
    const user = req.user;

    let companyData;

    if (req.body.isFreelance) {
      if (!user.nif || !user.name) {
        return next(
          AppError.badRequest(
            'User personal data is required before creating a freelance company'
          )
        );
      }

      companyData = {
        name: user.fullName || user.name,
        cif: user.nif,
        address: {
          street: user.address?.street ?? '',
          number: user.address?.number ?? '',
          postal: user.address?.postal ?? '',
          city: user.address?.city ?? '',
          province: user.address?.province ?? ''
        },
        isFreelance: true
      };
    } else {
      companyData = {
        name: req.body.name,
        cif: req.body.cif,
        address: req.body.address,
        isFreelance: false
      };
    }

    let company = await Company.findOne({
      cif: companyData.cif,
      deleted: false
    });

    if (!company) {
      company = await Company.create({
        owner: user._id,
        name: companyData.name,
        cif: companyData.cif,
        address: companyData.address,
        isFreelance: companyData.isFreelance
      });

      user.company = company._id;
      user.role = 'admin';
    } else {
      user.company = company._id;
      user.role =
        company.owner?.toString() === user._id.toString() ? 'admin' : 'guest';
    }

    await user.save();

    return res.status(200).json({
      ok: true,
      message: 'Company assigned successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          role: user.role,
          company: user.company
        },
        company
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findOne({
      _id: req.user._id,
      deleted: false
    }).populate('company');

    if (!user) {
      return next(AppError.notFound('User not found'));
    }

    return res.status(200).json({
      ok: true,
      data: {
        user
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const refreshSession = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    let payload;

    try {
      payload = jwt.verify(refreshToken, config.jwtRefreshSecret);
    } catch (error) {
      return next(AppError.unauthorized('Invalid or expired refresh token'));
    }

    if (payload.type !== 'refresh') {
      return next(AppError.unauthorized('Invalid token type'));
    }

    const user = await User.findOne({
      _id: payload.sub,
      deleted: false,
      'refreshTokens.token': refreshToken
    }).select('+refreshTokens.token');

    if (!user) {
      return next(AppError.unauthorized('Invalid or expired refresh token'));
    }

    const accessToken = createAccessToken(user);

    return res.status(200).json({
      ok: true,
      message: 'Access token refreshed successfully',
      data: {
        accessToken
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+refreshTokens.token');

    if (!user) {
      return next(AppError.notFound('User not found'));
    }

    user.refreshTokens = [];
    await user.save();

    return res.status(200).json({
      ok: true,
      message: 'Logout successful'
    });
  } catch (error) {
    return next(error);
  }
};

export const uploadCompanyLogo = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user.company) {
      return next(AppError.badRequest('User must have a company associated'));
    }

    if (!req.file) {
      return next(AppError.badRequest('Logo file is required'));
    }

    const company = await Company.findOne({
      _id: user.company,
      deleted: false
    });

    if (!company) {
      return next(AppError.notFound('Company not found'));
    }

    company.logo = `/uploads/${req.file.filename}`;
    await company.save();

    return res.status(200).json({
      ok: true,
      message: 'Company logo uploaded successfully',
      data: {
        company
      }
    });
  } catch (error) {
    return next(error);
  }
};