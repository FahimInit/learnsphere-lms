import { Router } from 'express';
import { courseController } from './course.controller';
import {
  createCourseSchema,
  updateCourseSchema,
  createSectionSchema,
  updateSectionSchema,
  reorderSectionsSchema,
  createLessonSchema,
  updateLessonSchema,
  reorderLessonsSchema,
  moderateCourseSchema,
} from './course.validator';
import {
  authenticate,
  optionalAuthenticate,
  authorize,
} from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { uploadSingleFile } from '../../middleware/upload';

const router = Router();

// Public catalog & course details
router.get('/', courseController.listCatalog);

// Instructor studio endpoints
router.get(
  '/instructor/my-courses',
  authenticate,
  authorize('instructor', 'admin'),
  courseController.getMyInstructorCourses
);

router.post(
  '/upload',
  authenticate,
  authorize('instructor', 'admin'),
  uploadSingleFile,
  courseController.uploadAsset
);

router.get(
  '/:id/editor',
  authenticate,
  authorize('instructor', 'admin'),
  courseController.getEditorPayload
);

router.get('/:slugOrId', optionalAuthenticate, courseController.getDetail);

router.post(
  '/',
  authenticate,
  authorize('instructor', 'admin'),
  validate(createCourseSchema),
  courseController.create
);

router.patch(
  '/:id',
  authenticate,
  authorize('instructor', 'admin'),
  validate(updateCourseSchema),
  courseController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize('instructor', 'admin'),
  courseController.remove
);

router.post(
  '/:id/submit-review',
  authenticate,
  authorize('instructor', 'admin'),
  courseController.submitForReview
);

router.patch(
  '/:id/moderate',
  authenticate,
  authorize('admin'),
  validate(moderateCourseSchema),
  courseController.moderate
);

// Section management
router.post(
  '/:id/sections',
  authenticate,
  authorize('instructor', 'admin'),
  validate(createSectionSchema),
  courseController.createSection
);

router.patch(
  '/:id/sections/reorder',
  authenticate,
  authorize('instructor', 'admin'),
  validate(reorderSectionsSchema),
  courseController.reorderSections
);

router.patch(
  '/:id/sections/:sectionId',
  authenticate,
  authorize('instructor', 'admin'),
  validate(updateSectionSchema),
  courseController.updateSection
);

router.delete(
  '/:id/sections/:sectionId',
  authenticate,
  authorize('instructor', 'admin'),
  courseController.deleteSection
);

// Lesson management
router.post(
  '/:id/sections/:sectionId/lessons',
  authenticate,
  authorize('instructor', 'admin'),
  validate(createLessonSchema),
  courseController.createLesson
);

router.patch(
  '/:id/sections/:sectionId/lessons/reorder',
  authenticate,
  authorize('instructor', 'admin'),
  validate(reorderLessonsSchema),
  courseController.reorderLessons
);

router.patch(
  '/:id/lessons/:lessonId',
  authenticate,
  authorize('instructor', 'admin'),
  validate(updateLessonSchema),
  courseController.updateLesson
);

router.delete(
  '/:id/lessons/:lessonId',
  authenticate,
  authorize('instructor', 'admin'),
  courseController.deleteLesson
);

export default router;
