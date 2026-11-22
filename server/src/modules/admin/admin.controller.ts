import { Request, Response } from 'express';
import { adminService } from './admin.service';
import { CourseStatus } from '../courses/course.model';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess } from '../../utils/apiResponse';
import { AppError } from '../../utils/AppError';

export class AdminController {
  listUsers = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(String(req.query.page || '1'), 10) || 1;
    const limit = parseInt(String(req.query.limit || '20'), 10) || 20;
    const result = await adminService.listUsers({
      q: req.query.q as string | undefined,
      role: req.query.role as string | undefined,
      status: req.query.status as string | undefined,
      page,
      limit,
    });
    return sendSuccess(
      res,
      { users: result.users },
      'Users retrieved successfully',
      200,
      result.meta
    );
  });

  updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const user = await adminService.updateUserStatus(
      req.params.id,
      req.body.status,
      req.user,
      req.ip
    );
    return sendSuccess(res, { user }, `User account status updated to ${req.body.status}`);
  });

  updateUserRole = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const user = await adminService.updateUserRole(
      req.params.id,
      req.body.role,
      req.user,
      req.ip
    );
    return sendSuccess(res, { user }, `User role updated to ${req.body.role}`);
  });

  listPendingCourses = asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status as CourseStatus | undefined;
    const courses = await adminService.listCoursesForModeration(status);
    return sendSuccess(res, { courses }, 'Courses retrieved for moderation');
  });

  moderateCourse = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const course = await adminService.moderateCourse(
      req.params.id,
      req.body.action,
      req.body.rejectionReason || '',
      req.user,
      req.ip
    );
    return sendSuccess(
      res,
      { course },
      req.body.action === 'approve'
        ? 'Course approved and published'
        : 'Course rejected with feedback'
    );
  });

  listReported = asyncHandler(async (_req: Request, res: Response) => {
    const data = await adminService.listReportedContent();
    return sendSuccess(res, data, 'Reported content retrieved');
  });

  resolveReported = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const result = await adminService.resolveReportedContent(
      req.params.type as 'discussion' | 'comment',
      req.params.id,
      req.body.action,
      req.user,
      req.ip
    );
    return sendSuccess(res, result, 'Reported content moderated');
  });

  listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(String(req.query.page || '1'), 10) || 1;
    const limit = parseInt(String(req.query.limit || '25'), 10) || 25;
    const result = await adminService.listAuditLogs(page, limit);
    return sendSuccess(
      res,
      { logs: result.logs },
      'Audit logs retrieved',
      200,
      result.meta
    );
  });

  getSettings = asyncHandler(async (_req: Request, res: Response) => {
    const settings = await adminService.getPlatformSettings();
    return sendSuccess(res, { settings }, 'Platform settings retrieved');
  });

  updateSettings = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const settings = await adminService.updatePlatformSettings(
      req.body,
      req.user,
      req.ip
    );
    return sendSuccess(res, { settings }, 'Platform settings updated');
  });
}

export const adminController = new AdminController();
