import { Router } from 'express';
import * as deliveryNoteController from '../controllers/deliverynote.controller.js';
import { authenticate, requireCompany } from '../middleware/auth.js';
import { uploadSignature } from '../middleware/upload.js';
import validate from '../middleware/validate.js';
import { sanitizeNoSql } from '../middleware/security.js';
import {
  createDeliveryNoteSchema,
  deleteDeliveryNoteSchema,
  getDeliveryNotePdfSchema,
  getDeliveryNoteSchema,
  listDeliveryNoteSchema,
  signDeliveryNoteSchema
} from '../validators/deliverynote.validator.js';

const router = Router();

router.use(sanitizeNoSql);
router.use(authenticate, requireCompany);

router.post('/', validate(createDeliveryNoteSchema), deliveryNoteController.create);
router.get('/', validate(listDeliveryNoteSchema), deliveryNoteController.list);
router.get('/pdf/:id', validate(getDeliveryNotePdfSchema), deliveryNoteController.getPdf);
router.get('/:id', validate(getDeliveryNoteSchema), deliveryNoteController.getById);
router.patch('/:id/sign', validate(signDeliveryNoteSchema), uploadSignature.single('signature'), deliveryNoteController.sign);
router.delete('/:id', validate(deleteDeliveryNoteSchema), deliveryNoteController.remove);

export default router;
