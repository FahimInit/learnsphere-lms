import { Request, Response } from 'express';
import { quizService } from './quiz.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { sendSuccess, sendCreated } from '../../utils/apiResponse';
import { AppError } from '../../utils/AppError';

export class QuizController {
  listByCourse = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const quizzes = await quizService.listCourseQuizzes(
      req.params.courseId,
      req.user
    );
    return sendSuccess(res, { quizzes }, 'Course quizzes retrieved');
  });

  getOne = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const result = await quizService.getQuizDetails(req.params.id, req.user);
    return sendSuccess(res, result, 'Quiz details retrieved');
  });

  create = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const quiz = await quizService.createQuiz(req.user, req.body);
    return sendCreated(res, { quiz }, 'Quiz created successfully');
  });

  update = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const quiz = await quizService.updateQuiz(
      req.params.id,
      req.user,
      req.body
    );
    return sendSuccess(res, { quiz }, 'Quiz updated successfully');
  });

  remove = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    await quizService.deleteQuiz(req.params.id, req.user);
    return sendSuccess(res, null, 'Quiz deleted successfully');
  });

  addQuestion = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const question = await quizService.addQuestion(
      req.params.id,
      req.user,
      req.body
    );
    return sendCreated(res, { question }, 'Question added to quiz');
  });

  updateQuestion = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const question = await quizService.updateQuestion(
      req.params.id,
      req.params.questionId,
      req.user,
      req.body
    );
    return sendSuccess(res, { question }, 'Question updated successfully');
  });

  deleteQuestion = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    await quizService.deleteQuestion(
      req.params.id,
      req.params.questionId,
      req.user
    );
    return sendSuccess(res, null, 'Question removed from quiz');
  });

  submitAttempt = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const result = await quizService.submitAttempt(
      req.params.id,
      req.user,
      req.body
    );
    return sendCreated(res, result, 'Quiz submitted and graded');
  });

  getAttempts = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const attempts = await quizService.getAttemptHistory(
      req.params.id,
      req.user
    );
    return sendSuccess(res, { attempts }, 'Quiz attempts retrieved');
  });
}

export const quizController = new QuizController();
