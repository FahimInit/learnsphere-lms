import { Request, Response } from 'express';
import { courseService, CatalogQueryInput } from './course.service';
import { storageService } from '../../infrastructure/storage/storage.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendCreated } from '../../utils/apiResponse';
import { AppError } from '../../utils/AppError';

export class CourseController {
  listCatalog = asyncHandler(async (req: Request, res: Response) => {
    const result = await courseService.listPublishedCourses(
      req.query as unknown as CatalogQueryInput
    );
    return sendSuccess(
      res,
      { courses: result.courses },
      'Published courses retrieved successfully',
      200,
      result.meta
    );
  });

  getMyInstructorCourses = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const courses = await courseService.getInstructorCourses(req.user);
    return sendSuccess(res, { courses }, 'Instructor courses retrieved');
  });

  getEditorPayload = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const payload = await courseService.getCourseEditorPayload(
      req.params.id,
      req.user
    );
    return sendSuccess(res, payload, 'Course editor data retrieved');
  });

  getDetail = asyncHandler(async (req: Request, res: Response) => {
    const payload = await courseService.getCourseDetailBySlugOrId(
      req.params.slugOrId,
      req.user
    );
    return sendSuccess(res, payload, 'Course detail retrieved');
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const course = await courseService.createCourse(req.user, req.body);
    return sendCreated(res, { course }, 'Draft course created successfully');
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const course = await courseService.updateCourse(
      req.params.id,
      req.user,
      req.body
    );
    return sendSuccess(res, { course }, 'Course updated successfully');
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const result = await courseService.deleteOrArchiveCourse(
      req.params.id,
      req.user
    );
    return sendSuccess(
      res,
      result,
      result.archived
        ? 'Course has active enrollments and was archived'
        : 'Draft course deleted permanently'
    );
  });

  submitForReview = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const course = await courseService.submitCourseForReview(
      req.params.id,
      req.user
    );
    return sendSuccess(
      res,
      { course },
      'Course submitted for administrator review'
    );
  });

  moderate = asyncHandler(async (req: Request, res: Response) => {
    const course = await courseService.moderateCourse(req.params.id, req.body);
    return sendSuccess(
      res,
      { course },
      req.body.action === 'approve'
        ? 'Course approved and published'
        : 'Course rejected with feedback'
    );
  });

  createSection = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const section = await courseService.createSection(
      req.params.id,
      req.user,
      req.body
    );
    return sendCreated(res, { section }, 'Section created successfully');
  });

  updateSection = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const section = await courseService.updateSection(
      req.params.id,
      req.params.sectionId,
      req.user,
      req.body
    );
    return sendSuccess(res, { section }, 'Section updated successfully');
  });

  deleteSection = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    await courseService.deleteSection(
      req.params.id,
      req.params.sectionId,
      req.user
    );
    return sendSuccess(res, null, 'Section and its lessons deleted');
  });

  reorderSections = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const sections = await courseService.reorderSections(
      req.params.id,
      req.user,
      req.body.orderedSectionIds
    );
    return sendSuccess(res, { sections }, 'Sections reordered successfully');
  });

  createLesson = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const lesson = await courseService.createLesson(
      req.params.id,
      req.params.sectionId,
      req.user,
      req.body
    );
    return sendCreated(res, { lesson }, 'Lesson created successfully');
  });

  updateLesson = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const lesson = await courseService.updateLesson(
      req.params.id,
      req.params.lessonId,
      req.user,
      req.body
    );
    return sendSuccess(res, { lesson }, 'Lesson updated successfully');
  });

  deleteLesson = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    await courseService.deleteLesson(
      req.params.id,
      req.params.lessonId,
      req.user
    );
    return sendSuccess(res, null, 'Lesson deleted successfully');
  });

  reorderLessons = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const lessons = await courseService.reorderLessons(
      req.params.id,
      req.params.sectionId,
      req.user,
      req.body.orderedLessonIds
    );
    return sendSuccess(res, { lessons }, 'Lessons reordered successfully');
  });

  uploadAsset = asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw AppError.badRequest('No file provided in upload request');
    }

    const stored = await storageService.saveBuffer(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      'courses'
    );

    return sendCreated(res, { file: stored }, 'File uploaded successfully');
  });
}

export const courseController = new CourseController();
