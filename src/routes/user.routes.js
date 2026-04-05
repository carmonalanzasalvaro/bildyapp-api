import { Router } from 'express';
import {
  login,
  register,
  updateCompany,
  updateProfile,
  validateEmail
} from '../controllers/user.controller.js';
import auth from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.js';
import {
  companySchema,
  loginSchema,
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

export default router;