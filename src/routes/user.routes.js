import { Router } from 'express';
import {
  changePassword,
  deleteMe,
  getMe,
  inviteUser,
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
import authorizeRoles from '../middleware/role.middleware.js';
import upload from '../middleware/upload.js';
import validate from '../middleware/validate.js';
import {
  changePasswordSchema,
  companySchema,
  inviteUserSchema,
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  softDeleteQuerySchema,
  updateProfileSchema,
  validationCodeSchema
} from '../validators/user.validator.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.put('/validation', auth, validate(validationCodeSchema), validateEmail);
router.post('/login', validate(loginSchema), login);
router.put('/register', auth, validate(updateProfileSchema), updateProfile);
router.put('/password', auth, validate(changePasswordSchema), changePassword);
router.patch('/company', auth, validate(companySchema), updateCompany);
router.patch('/logo', auth, upload.single('logo'), uploadCompanyLogo);
router.get('/', auth, getMe);
router.post('/refresh', validate(refreshTokenSchema), refreshSession);
router.post('/logout', auth, logout);
router.delete('/', auth, validate(softDeleteQuerySchema, 'query'), deleteMe);
router.post(
  '/invite',
  auth,
  authorizeRoles('admin'),
  validate(inviteUserSchema),
  inviteUser
);

export default router;