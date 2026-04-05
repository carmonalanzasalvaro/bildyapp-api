import { Router } from 'express';
import {
  getMe,
  login,
  logout,
  refreshSession,
  register,
  updateCompany,
  updateProfile,
  uploadCompanyLogo,
  validateEmail
} from '../controllers/user.controller.js';
import auth from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.js';
import validate from '../middleware/validate.js';
import {
  companySchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  updateProfileSchema,
  validationCodeSchema
} from '../validators/user.validator.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.put('/validation', auth, validate(validationCodeSchema), validateEmail);
router.post('/login', validate(loginSchema), login);
router.put('/register', auth, validate(updateProfileSchema), updateProfile);
router.patch('/company', auth, validate(companySchema), updateCompany);
router.get('/', auth, getMe);
router.post('/refresh', validate(refreshTokenSchema), refreshSession);
router.post('/logout', auth, logout);
router.patch('/logo', auth, upload.single('logo'), uploadCompanyLogo);

export default router;