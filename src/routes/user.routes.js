import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { sanitizeNoSql } from '../middleware/security.js';
import {
  loginSchema,
  onboardCompanySchema,
  registerUserSchema,
  updateProfileSchema,
  validateEmailSchema
} from '../validators/user.validator.js';

const router = Router();

router.use(sanitizeNoSql);

router.post('/register', validate(registerUserSchema), userController.register);
router.put('/validation', authenticate, validate(validateEmailSchema), userController.validation);
router.post('/login', validate(loginSchema), userController.login);
router.put('/register', authenticate, validate(updateProfileSchema), userController.updateProfile);
router.patch('/company', authenticate, validate(onboardCompanySchema), userController.updateCompany);
router.get('/', authenticate, userController.getMe);
router.delete('/', authenticate, userController.removeMe);

export default router;
