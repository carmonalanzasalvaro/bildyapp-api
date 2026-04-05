import { Router } from 'express';
import { register, validateEmail } from '../controllers/user.controller.js';
import auth from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.js';
import {
  registerSchema,
  validationCodeSchema
} from '../validators/user.validator.js';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.put('/validation', auth, validate(validationCodeSchema), validateEmail);

export default router;