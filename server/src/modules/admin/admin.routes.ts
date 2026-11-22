import { Router } from 'express';
import { adminController } from './admin.controller';
import {
  updateUserStatusSchema,
  updateUserRoleSchema,
  moderateReportedContentSchema,
  updatePlatformSettingsSchema,
} from './admin.validator';
import { moderateCourseSchema } from '../courses/course.validator';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/users', adminController.listUsers);
router.patch(
  '/users/:id/status',
  validate(updateUserStatusSchema),
  adminController.updateUserStatus
);
router.patch(
  '/users/:id/role',
  validate(updateUserRoleSchema),
  adminController.updateUserRole
);

router.get('/courses/pending', adminController.listPendingCourses);
router.patch(
  '/courses/:id/moderate',
  validate(moderateCourseSchema),
  adminController.moderateCourse
);

router.get('/moderation/reported', adminController.listReported);
router.patch(
  '/moderation/:type/:id',
  validate(moderateReportedContentSchema),
  adminController.resolveReported
);

router.get('/audit-logs', adminController.listAuditLogs);
router.get('/settings', adminController.getSettings);
router.patch(
  '/settings',
  validate(updatePlatformSettingsSchema),
  adminController.updateSettings
);

export default router;
