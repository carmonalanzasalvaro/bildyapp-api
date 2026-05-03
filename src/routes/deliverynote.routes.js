import { Router } from 'express';
import * as deliveryNoteController from '../controllers/deliverynote.controller.js';
import { authenticate, requireCompany } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import {
  createDeliveryNoteSchema,
  deleteDeliveryNoteSchema,
  getDeliveryNoteSchema,
  listDeliveryNoteSchema
} from '../validators/deliverynote.validator.js';

const router = Router();

router.use(authenticate, requireCompany);

router.post('/', validate(createDeliveryNoteSchema), deliveryNoteController.create);
router.get('/', validate(listDeliveryNoteSchema), deliveryNoteController.list);
router.get('/:id', validate(getDeliveryNoteSchema), deliveryNoteController.getById);
router.delete('/:id', validate(deleteDeliveryNoteSchema), deliveryNoteController.remove);

export default router;
