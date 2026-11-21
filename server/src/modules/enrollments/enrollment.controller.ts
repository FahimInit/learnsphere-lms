import { Request, Response } from 'express';
import { enrollmentService } from './enrollment.service';
import { EnrollmentStatus } from './enrollment.model';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendCreated } from '../../utils/apiResponse';
import { AppError } from '../../utils/AppError';

export class EnrollmentController {
  enroll = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const enrollment = await enrollmentService.enrollInCourse(
      req.params.courseId,
      req.user
    );
    return sendCreated(
      res,
      { enrollment },
      'Enrolled in course successfully'
    );
  });

  getMyEnrollments = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const statusFilter = req.query.status as EnrollmentStatus | undefined;
    const enrollments = await enrollmentService.getMyEnrollments(
      req.user.id,
      statusFilter
    );
    return sendSuccess(
      res,
      { enrollments },
      'Enrolled courses retrieved successfully'
    );
  });

  checkStatus = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const result = await enrollmentService.getEnrollmentStatus(
      req.params.courseId,
      req.user.id
    );
    return sendSuccess(res, result, 'Enrollment status checked');
  });

  getLearningWorkspace = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const workspace = await enrollmentService.getLearningWorkspace(
      req.params.courseId,
      req.user
    );
    return sendSuccess(
      res,
      workspace,
      'Learning workspace loaded successfully'
    );
  });

  getCourseStudents = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const enrollments = await enrollmentService.getCourseEnrolledStudents(
      req.params.courseId,
      req.user
    );
    return sendSuccess(
      res,
      { enrollments },
      'Enrolled students retrieved successfully'
    );
  });
}

export const enrollmentController = new EnrollmentController();
