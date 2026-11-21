import { Router } from 'express';
import { userController } from './user.controller';
import { updateProfileSchema, changePasswordSchema } from './user.validator';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/profile', userController.getProfile);
router.patch('/profile', validate(updateProfileSchema), userController.updateProfile);
router.patch(
  '/change-password',
  validate(changePasswordSchema),
  userController.changePassword
);
router.post(
  '/become-instructor',
  authorize('student'),
  userController.becomeInstructor
);

export default router;
