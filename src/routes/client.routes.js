import { Router } from 'express';
import * as clientController from '../controllers/client.controller.js';
import { authenticate, requireCompany } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import {
  createClientSchema,
  deleteClientSchema,
  getClientSchema,
  listClientSchema,
  restoreClientSchema,
  updateClientSchema
} from '../validators/client.validator.js';

const router = Router();

router.use(authenticate, requireCompany);

router.post('/', validate(createClientSchema), clientController.create);
router.put('/:id', validate(updateClientSchema), clientController.update);
router.get('/', validate(listClientSchema), clientController.list);
router.get('/archived', validate(listClientSchema), clientController.listArchived);
router.get('/:id', validate(getClientSchema), clientController.getById);
router.delete('/:id', validate(deleteClientSchema), clientController.remove);
router.patch('/:id/restore', validate(restoreClientSchema), clientController.restore);

export default router;
