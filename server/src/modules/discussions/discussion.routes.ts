import { Router } from 'express';
import { discussionController } from './discussion.controller';
import {
  createDiscussionSchema,
  createCommentSchema,
  updateDiscussionStatusSchema,
  reportContentSchema,
  createAnnouncementSchema,
} from './discussion.validator';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';

const router = Router();

router.use(authenticate);

router.get('/course/:courseId', discussionController.listCourseCommunity);

router.post(
  '/course/:courseId',
  validate(createDiscussionSchema),
  discussionController.createDiscussion
);

router.post(
  '/course/:courseId/announcements',
  authorize('instructor', 'admin'),
  validate(createAnnouncementSchema),
  discussionController.createAnnouncement
);

router.get('/:id', discussionController.getThread);

router.post(
  '/:id/comments',
  validate(createCommentSchema),
  discussionController.addComment
);

router.patch(
  '/:id/status',
  authorize('instructor', 'admin'),
  validate(updateDiscussionStatusSchema),
  discussionController.updateStatus
);

router.delete('/:id', discussionController.deleteDiscussion);

router.post(
  '/:id/report',
  validate(reportContentSchema),
  discussionController.reportDiscussion
);

router.post(
  '/comments/:id/report',
  validate(reportContentSchema),
  discussionController.reportComment
);

export default router;
