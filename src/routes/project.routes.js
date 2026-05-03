import { Router } from 'express';
import * as projectController from '../controllers/project.controller.js';
import { authenticate, requireCompany } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { sanitizeNoSql } from '../middleware/security.js';
import {
  createProjectSchema,
  deleteProjectSchema,
  getProjectSchema,
  listProjectSchema,
  restoreProjectSchema,
  updateProjectSchema
} from '../validators/project.validator.js';

const router = Router();

router.use(sanitizeNoSql);
router.use(authenticate, requireCompany);

router.post('/', validate(createProjectSchema), projectController.create);
router.put('/:id', validate(updateProjectSchema), projectController.update);
router.get('/', validate(listProjectSchema), projectController.list);
router.get('/archived', validate(listProjectSchema), projectController.listArchived);
router.get('/:id', validate(getProjectSchema), projectController.getById);
router.delete('/:id', validate(deleteProjectSchema), projectController.remove);
router.patch('/:id/restore', validate(restoreProjectSchema), projectController.restore);

export default router;
