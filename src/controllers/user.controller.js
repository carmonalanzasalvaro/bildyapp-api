import {
  getAuthenticatedUser,
  loginUser,
  onboardCompany,
  registerUser,
  softDeleteUser,
  updateUserProfile,
  validateUserEmail
} from '../services/user.service.js';

export const register = async (req, res, next) => {
  try {
    const result = await registerUser(req.validated.body);
    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
};

export const validation = async (req, res, next) => {
  try {
    const result = await validateUserEmail(req.user._id, req.validated.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const result = await loginUser(req.validated.body);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const user = await updateUserProfile(req.user._id, req.validated.body);
    return res.status(200).json({
      message: 'Datos personales actualizados',
      user
    });
  } catch (error) {
    return next(error);
  }
};

export const updateCompany = async (req, res, next) => {
  try {
    const user = await onboardCompany(req.user._id, req.validated.body);
    return res.status(200).json({
      message: 'Compañía actualizada',
      user
    });
  } catch (error) {
    return next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await getAuthenticatedUser(req.user._id);
    return res.status(200).json({ user });
  } catch (error) {
    return next(error);
  }
};

export const removeMe = async (req, res, next) => {
  try {
    const result = await softDeleteUser(req.user._id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};
