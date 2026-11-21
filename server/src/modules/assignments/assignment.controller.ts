import { Request, Response } from 'express';
import { assignmentService } from './assignment.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendCreated } from '../../utils/apiResponse';
import { AppError } from '../../utils/AppError';

export class AssignmentController {
  listByCourse = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const assignments = await assignmentService.listCourseAssignments(
      req.params.courseId,
      req.user
    );
    return sendSuccess(res, { assignments }, 'Course assignments retrieved');
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const assignment = await assignmentService.createAssignment(
      req.user,
      req.body
    );
    return sendCreated(
      res,
      { assignment },
      'Assignment created successfully'
    );
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const assignment = await assignmentService.updateAssignment(
      req.params.id,
      req.user,
      req.body
    );
    return sendSuccess(
      res,
      { assignment },
      'Assignment updated successfully'
    );
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    await assignmentService.deleteAssignment(req.params.id, req.user);
    return sendSuccess(res, null, 'Assignment deleted successfully');
  });

  uploadAttachment = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    if (!req.file) {
      throw AppError.badRequest('No attachment file provided');
    }
    const file = await assignmentService.uploadSubmissionFile(
      req.params.assignmentId,
      req.user,
      req.file
    );
    return sendCreated(res, { file }, 'Attachment uploaded successfully');
  });

  submit = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const submission = await assignmentService.submitAssignment(
      req.params.assignmentId,
      req.user,
      req.body
    );
    return sendCreated(
      res,
      { submission },
      'Assignment submitted successfully'
    );
  });

  getMySubmission = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const submission = await assignmentService.getMySubmission(
      req.params.assignmentId,
      req.user
    );
    return sendSuccess(res, { submission }, 'Submission retrieved');
  });

  listSubmissions = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const submissions = await assignmentService.listAssignmentSubmissions(
      req.params.assignmentId,
      req.user
    );
    return sendSuccess(
      res,
      { submissions },
      'Assignment submissions retrieved'
    );
  });

  gradeSubmission = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const submission = await assignmentService.gradeSubmission(
      req.params.submissionId,
      req.user,
      req.body
    );
    return sendSuccess(
      res,
      { submission },
      'Submission graded successfully'
    );
  });
}

export const assignmentController = new AssignmentController();
