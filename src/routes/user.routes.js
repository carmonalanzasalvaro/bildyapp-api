import { Router } from 'express';
import { login, register, validateEmail } from '../controllers/user.controller.js';
import auth from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.js';
import {
  loginSchema,
  registerSchema,
  validationCodeSchema
} from '../validators/user.validator.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.put('/validation', auth, validate(validationCodeSchema), validateEmail);
router.post('/login', validate(loginSchema), login);

export default router;