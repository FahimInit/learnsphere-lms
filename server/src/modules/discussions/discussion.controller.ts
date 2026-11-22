import { Request, Response } from 'express';
import { discussionService } from './discussion.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendCreated } from '../../utils/apiResponse';
import { AppError } from '../../utils/AppError';

export class DiscussionController {
  listCourseCommunity = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const data = await discussionService.listCourseCommunity(
      req.params.courseId,
      req.user
    );
    return sendSuccess(res, data, 'Course discussions and announcements retrieved');
  });

  getThread = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const data = await discussionService.getDiscussionThread(
      req.params.id,
      req.user
    );
    return sendSuccess(res, data, 'Discussion thread retrieved');
  });

  createDiscussion = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const discussion = await discussionService.createDiscussion(
      req.params.courseId,
      req.user,
      req.body
    );
    return sendCreated(res, { discussion }, 'Discussion thread created');
  });

  addComment = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const comment = await discussionService.addComment(
      req.params.id,
      req.user,
      req.body
    );
    return sendCreated(res, { comment }, 'Reply posted successfully');
  });

  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const discussion = await discussionService.updateDiscussionStatus(
      req.params.id,
      req.user,
      req.body
    );
    return sendSuccess(res, { discussion }, 'Discussion status updated');
  });

  deleteDiscussion = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    await discussionService.deleteDiscussion(req.params.id, req.user);
    return sendSuccess(res, null, 'Discussion thread deleted');
  });

  reportDiscussion = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const discussion = await discussionService.reportDiscussion(
      req.params.id,
      req.user,
      req.body
    );
    return sendSuccess(
      res,
      { discussion },
      'Discussion reported for moderator review'
    );
  });

  reportComment = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const comment = await discussionService.reportComment(
      req.params.id,
      req.user,
      req.body
    );
    return sendSuccess(
      res,
      { comment },
      'Comment reported for moderator review'
    );
  });

  createAnnouncement = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const announcement = await discussionService.createAnnouncement(
      req.params.courseId,
      req.user,
      req.body
    );
    return sendCreated(
      res,
      { announcement },
      'Course announcement published'
    );
  });
}

export const discussionController = new DiscussionController();
