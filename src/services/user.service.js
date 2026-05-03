import AppError from '../utils/AppError.js';
import Company from '../models/Company.js';
import User from '../models/User.js';
import { mailService } from './mail.service.js';
import { generateAccessToken } from '../utils/jwt.js';
import { comparePassword, hashPassword } from '../utils/password.js';

const MAX_VERIFICATION_ATTEMPTS = 3;

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const getUserByIdOrFail = async (userId) => {
  const user = await User.findById(userId).populate('company');

  if (!user || user.deleted) {
    throw AppError.notFound('Usuario no encontrado');
  }

  return user;
};

const buildAuthResponse = (user) => ({
  accessToken: generateAccessToken(user),
  user: user.toJSON()
});

export const registerUser = async ({ email, password }) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw AppError.conflict('El email ya está registrado', 'EMAIL_EXISTS');
  }

  const verificationCode = generateVerificationCode();
  const hashedPassword = await hashPassword(password);

  const user = await User.create({
    email,
    password: hashedPassword,
    status: 'pending',
    role: 'admin',
    verification: {
      code: verificationCode,
      attempts: MAX_VERIFICATION_ATTEMPTS
    }
  });

  await mailService.sendVerificationEmail({
    to: user.email,
    code: verificationCode
  });

  return buildAuthResponse(user);
};

export const validateUserEmail = async (userId, { code }) => {
  const user = await User.findById(userId).select('+password').populate('company');

  if (!user || user.deleted) {
    throw AppError.notFound('Usuario no encontrado');
  }

  if (user.verification.attempts <= 0) {
    throw AppError.tooManyRequests('Has agotado los intentos de validación', 'VALIDATION_ATTEMPTS_EXCEEDED');
  }

  if (user.verification.code !== code) {
    user.verification.attempts = Math.max(0, user.verification.attempts - 1);
    await user.save();

    if (user.verification.attempts <= 0) {
      throw AppError.tooManyRequests('Has agotado los intentos de validación', 'VALIDATION_ATTEMPTS_EXCEEDED');
    }

    throw AppError.badRequest('Código de verificación incorrecto', [
      {
        field: 'code',
        message: `Intentos restantes: ${user.verification.attempts}`
      }
    ]);
  }

  user.status = 'verified';
  user.verification.attempts = MAX_VERIFICATION_ATTEMPTS;
  await user.save();

  return {
    message: 'Email validado correctamente',
    user: user.toJSON()
  };
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password').populate('company');

  if (!user || user.deleted) {
    throw AppError.unauthorized('Credenciales inválidas', 'INVALID_CREDENTIALS');
  }

  const isValidPassword = await comparePassword(password, user.password);

  if (!isValidPassword) {
    throw AppError.unauthorized('Credenciales inválidas', 'INVALID_CREDENTIALS');
  }

  return buildAuthResponse(user);
};

export const updateUserProfile = async (userId, payload) => {
  const user = await getUserByIdOrFail(userId);

  user.name = payload.name;
  user.lastName = payload.lastName;
  user.nif = payload.nif;
  user.address = payload.address;

  await user.save();

  return user;
};

const resolveFreelanceCompanyData = (user, payload) => {
  const fullName = [user.name, user.lastName].filter(Boolean).join(' ').trim();

  return {
    name: payload.name || fullName,
    cif: payload.cif || user.nif,
    address: payload.address || user.address
  };
};

export const onboardCompany = async (userId, payload) => {
  const user = await getUserByIdOrFail(userId);

  const companyData = payload.isFreelance
    ? resolveFreelanceCompanyData(user, payload)
    : {
      name: payload.name,
      cif: payload.cif,
      address: payload.address
    };

  if (!companyData.name || !companyData.cif || !companyData.address) {
    throw AppError.badRequest('No se ha podido completar la compañía con los datos disponibles', [
      {
        field: 'company',
        message: 'Faltan datos para crear o asociar la compañía'
      }
    ]);
  }

  const existingCompany = await Company.findOne({
    cif: companyData.cif,
    deleted: false
  });

  let company = existingCompany;

  if (company) {
    user.company = company._id;
    user.role = 'guest';
  } else {
    company = await Company.create({
      owner: user._id,
      name: companyData.name,
      cif: companyData.cif,
      address: companyData.address,
      isFreelance: payload.isFreelance
    });

    user.company = company._id;
    user.role = 'admin';
  }

  await user.save();

  return getUserByIdOrFail(user._id);
};

export const getAuthenticatedUser = async (userId) => getUserByIdOrFail(userId);

export const softDeleteUser = async (userId) => {
  const user = await getUserByIdOrFail(userId);
  user.deleted = true;
  await user.save();

  return {
    message: 'Usuario eliminado correctamente'
  };
};
