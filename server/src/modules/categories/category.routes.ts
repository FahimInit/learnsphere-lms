import { Router } from 'express';
import { categoryController } from './category.controller';
import { createCategorySchema, updateCategorySchema } from './category.validator';
import {
  authenticate,
  optionalAuthenticate,
  authorize,
} from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const router = Router();

router.get('/', optionalAuthenticate, categoryController.list);

router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(createCategorySchema),
  categoryController.create
);

router.patch(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(updateCategorySchema),
  categoryController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  categoryController.remove
);

export default router;
