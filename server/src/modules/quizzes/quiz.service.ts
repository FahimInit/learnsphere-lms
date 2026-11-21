import mongoose from 'mongoose';
import { Quiz, IQuizDocument } from './quiz.model';
import { Question, IQuestionDocument } from './question.model';
import { QuizAttempt, IQuizAttemptDocument } from './quizAttempt.model';
import { Course } from '../courses/course.model';
import { Enrollment } from '../enrollments/enrollment.model';
import { courseService } from '../courses/course.service';
import { AppError } from '../../utils/AppError';
import { AuthenticatedUser } from '../../types/express';
import {
  CreateQuizInput,
  UpdateQuizInput,
  CreateQuestionInput,
  UpdateQuestionInput,
  SubmitQuizAttemptInput,
} from './quiz.validator';

export interface SanitizedQuestion {
  _id: string;
  quiz: string;
  type: string;
  prompt: string;
  options: Array<{ id: string; text: string }>;
  points: number;
  order: number;
  correctOptionIds?: string[];
  explanation?: string;
}

export class QuizService {
  private async recalculateQuizTotals(quizId: string): Promise<void> {
    const questions = await Question.find({ quiz: quizId }).select('points');
    const questionCount = questions.length;
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);
    await Quiz.findByIdAndUpdate(quizId, {
      $set: { questionCount, totalPoints },
    });
  }

  private async assertQuizCourseAccess(
    courseId: string,
    actor: AuthenticatedUser
  ): Promise<{ isPrivileged: boolean }> {
    const course = await Course.findById(courseId);
    if (!course) {
      throw AppError.notFound('Course not found');
    }

    const isPrivileged =
      actor.role === 'admin' || course.instructor.toString() === actor.id;

    if (isPrivileged) {
      return { isPrivileged: true };
    }

    const enrollment = await Enrollment.findOne({
      student: actor.id,
      course: course._id,
      status: { $in: ['active', 'completed'] },
    });

    if (!enrollment) {
      throw AppError.forbidden(
        'You must be enrolled in this course to access its quizzes'
      );
    }

    return { isPrivileged: false };
  }

  async listCourseQuizzes(
    courseId: string,
    actor: AuthenticatedUser
  ): Promise<IQuizDocument[]> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw AppError.badRequest('Invalid course ID');
    }

    const { isPrivileged } = await this.assertQuizCourseAccess(courseId, actor);
    const filter: Record<string, unknown> = { course: courseId };
    if (!isPrivileged) {
      filter.isPublished = true;
    }

    return Quiz.find(filter).sort({ createdAt: 1 });
  }

  async getQuizDetails(
    quizId: string,
    actor: AuthenticatedUser
  ): Promise<{
    quiz: IQuizDocument;
    questions: SanitizedQuestion[];
    attemptsUsed: number;
    remainingAttempts: number;
  }> {
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      throw AppError.badRequest('Invalid quiz ID');
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw AppError.notFound('Quiz not found');
    }

    const { isPrivileged } = await this.assertQuizCourseAccess(
      quiz.course.toString(),
      actor
    );

    if (!quiz.isPublished && !isPrivileged) {
      throw AppError.notFound('Quiz is not currently published');
    }

    const [questions, attemptsUsed] = await Promise.all([
      Question.find({ quiz: quiz._id }).sort({ order: 1, createdAt: 1 }),
      QuizAttempt.countDocuments({ quiz: quiz._id, student: actor.id }),
    ]);

    // Never expose correctOptionIds or explanation to students before submission
    const sanitizedQuestions: SanitizedQuestion[] = questions.map((q) => ({
      _id: q._id.toString(),
      quiz: q.quiz.toString(),
      type: q.type,
      prompt: q.prompt,
      options: q.options,
      points: q.points,
      order: q.order,
      ...(isPrivileged
        ? {
            correctOptionIds: q.correctOptionIds,
            explanation: q.explanation,
          }
        : {}),
    }));

    return {
      quiz,
      questions: sanitizedQuestions,
      attemptsUsed,
      remainingAttempts: Math.max(0, quiz.maxAttempts - attemptsUsed),
    };
  }

  async createQuiz(
    actor: AuthenticatedUser,
    input: CreateQuizInput
  ): Promise<IQuizDocument> {
    await courseService.assertCourseOwnership(input.courseId, actor);

    const quiz = await Quiz.create({
      course: input.courseId,
      section:
        input.sectionId && mongoose.Types.ObjectId.isValid(input.sectionId)
          ? input.sectionId
          : undefined,
      lesson:
        input.lessonId && mongoose.Types.ObjectId.isValid(input.lessonId)
          ? input.lessonId
          : undefined,
      title: input.title,
      description: input.description ?? '',
      timeLimitMinutes: input.timeLimitMinutes ?? null,
      maxAttempts: input.maxAttempts ?? 3,
      passingScorePercentage: input.passingScorePercentage ?? 70,
      isPublished: input.isPublished ?? true,
    });

    return quiz;
  }

  async updateQuiz(
    quizId: string,
    actor: AuthenticatedUser,
    input: UpdateQuizInput
  ): Promise<IQuizDocument> {
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      throw AppError.badRequest('Invalid quiz ID');
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw AppError.notFound('Quiz not found');
    }

    await courseService.assertCourseOwnership(quiz.course.toString(), actor);

    if (input.title !== undefined) quiz.title = input.title;
    if (input.description !== undefined) quiz.description = input.description;
    if (input.timeLimitMinutes !== undefined)
      quiz.timeLimitMinutes = input.timeLimitMinutes;
    if (input.maxAttempts !== undefined) quiz.maxAttempts = input.maxAttempts;
    if (input.passingScorePercentage !== undefined)
      quiz.passingScorePercentage = input.passingScorePercentage;
    if (input.isPublished !== undefined) quiz.isPublished = input.isPublished;

    await quiz.save();
    return quiz;
  }

  async deleteQuiz(quizId: string, actor: AuthenticatedUser): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      throw AppError.badRequest('Invalid quiz ID');
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw AppError.notFound('Quiz not found');
    }

    await courseService.assertCourseOwnership(quiz.course.toString(), actor);

    await Question.deleteMany({ quiz: quiz._id });
    await QuizAttempt.deleteMany({ quiz: quiz._id });
    await quiz.deleteOne();
  }

  async addQuestion(
    quizId: string,
    actor: AuthenticatedUser,
    input: CreateQuestionInput
  ): Promise<IQuestionDocument> {
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      throw AppError.badRequest('Invalid quiz ID');
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw AppError.notFound('Quiz not found');
    }

    await courseService.assertCourseOwnership(quiz.course.toString(), actor);

    const existingCount = await Question.countDocuments({ quiz: quiz._id });

    const question = await Question.create({
      quiz: quiz._id,
      type: input.type,
      prompt: input.prompt,
      options: input.options,
      correctOptionIds: Array.from(new Set(input.correctOptionIds)),
      points: input.points ?? 1,
      explanation: input.explanation ?? '',
      order: input.order !== undefined ? input.order : existingCount,
    });

    await this.recalculateQuizTotals(quiz._id.toString());
    return question;
  }

  async updateQuestion(
    quizId: string,
    questionId: string,
    actor: AuthenticatedUser,
    input: UpdateQuestionInput
  ): Promise<IQuestionDocument> {
    if (
      !mongoose.Types.ObjectId.isValid(quizId) ||
      !mongoose.Types.ObjectId.isValid(questionId)
    ) {
      throw AppError.badRequest('Invalid quiz or question ID');
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw AppError.notFound('Quiz not found');
    }

    await courseService.assertCourseOwnership(quiz.course.toString(), actor);

    const question = await Question.findOne({ _id: questionId, quiz: quiz._id });
    if (!question) {
      throw AppError.notFound('Question not found in this quiz');
    }

    if (input.type !== undefined) question.type = input.type;
    if (input.prompt !== undefined) question.prompt = input.prompt;
    if (input.options !== undefined) question.options = input.options;
    if (input.correctOptionIds !== undefined) {
      const optionSet = new Set(question.options.map((o) => o.id));
      for (const cid of input.correctOptionIds) {
        if (!optionSet.has(cid)) {
          throw AppError.badRequest(
            `Correct option ID '${cid}' does not match question options`
          );
        }
      }
      question.correctOptionIds = Array.from(new Set(input.correctOptionIds));
    }
    if (input.points !== undefined) question.points = input.points;
    if (input.explanation !== undefined) question.explanation = input.explanation;
    if (input.order !== undefined) question.order = input.order;

    await question.save();
    await this.recalculateQuizTotals(quiz._id.toString());
    return question;
  }

  async deleteQuestion(
    quizId: string,
    questionId: string,
    actor: AuthenticatedUser
  ): Promise<void> {
    if (
      !mongoose.Types.ObjectId.isValid(quizId) ||
      !mongoose.Types.ObjectId.isValid(questionId)
    ) {
      throw AppError.badRequest('Invalid quiz or question ID');
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw AppError.notFound('Quiz not found');
    }

    await courseService.assertCourseOwnership(quiz.course.toString(), actor);

    const question = await Question.findOne({ _id: questionId, quiz: quiz._id });
    if (!question) {
      throw AppError.notFound('Question not found in this quiz');
    }

    await question.deleteOne();
    await this.recalculateQuizTotals(quiz._id.toString());
  }

  async submitAttempt(
    quizId: string,
    actor: AuthenticatedUser,
    input: SubmitQuizAttemptInput
  ): Promise<{
    attempt: IQuizAttemptDocument;
    review: Array<{
      questionId: string;
      prompt: string;
      selectedOptionIds: string[];
      correctOptionIds: string[];
      isCorrect: boolean;
      pointsAwarded: number;
      maxPoints: number;
      explanation: string;
    }>;
  }> {
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      throw AppError.badRequest('Invalid quiz ID');
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw AppError.notFound('Quiz not found');
    }

    const { isPrivileged } = await this.assertQuizCourseAccess(
      quiz.course.toString(),
      actor
    );

    if (!quiz.isPublished && !isPrivileged) {
      throw AppError.badRequest('Cannot submit an unpublished quiz');
    }

    const existingAttemptsCount = await QuizAttempt.countDocuments({
      quiz: quiz._id,
      student: actor.id,
    });

    if (existingAttemptsCount >= quiz.maxAttempts) {
      throw AppError.badRequest(
        `Maximum attempt limit (${quiz.maxAttempts}) reached for this quiz`
      );
    }

    const questions = await Question.find({ quiz: quiz._id }).sort({
      order: 1,
      createdAt: 1,
    });

    if (questions.length === 0) {
      throw AppError.badRequest('This quiz does not contain any questions yet');
    }

    const submittedAnswerMap = new Map<string, string[]>();
    for (const ans of input.answers) {
      submittedAnswerMap.set(
        ans.questionId,
        Array.from(new Set(ans.selectedOptionIds))
      );
    }

    let earnedPoints = 0;
    let totalPoints = 0;
    const gradedAnswers: IQuizAttemptDocument['answers'] = [];
    const review: Array<{
      questionId: string;
      prompt: string;
      selectedOptionIds: string[];
      correctOptionIds: string[];
      isCorrect: boolean;
      pointsAwarded: number;
      maxPoints: number;
      explanation: string;
    }> = [];

    for (const q of questions) {
      const qId = q._id.toString();
      const selected = submittedAnswerMap.get(qId) || [];
      const correctSorted = [...q.correctOptionIds].sort();
      const selectedSorted = [...selected].sort();

      const isCorrect =
        correctSorted.length === selectedSorted.length &&
        correctSorted.every((val, idx) => val === selectedSorted[idx]);

      const pointsAwarded = isCorrect ? q.points : 0;
      earnedPoints += pointsAwarded;
      totalPoints += q.points;

      gradedAnswers.push({
        question: q._id,
        selectedOptionIds: selected,
        isCorrect,
        pointsAwarded,
      });

      review.push({
        questionId: qId,
        prompt: q.prompt,
        selectedOptionIds: selected,
        correctOptionIds: q.correctOptionIds,
        isCorrect,
        pointsAwarded,
        maxPoints: q.points,
        explanation: q.explanation || '',
      });
    }

    const scorePercentage =
      totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passed = scorePercentage >= quiz.passingScorePercentage;

    const submittedAt = new Date();
    const startedAt = input.startedAt ? new Date(input.startedAt) : submittedAt;
    const durationSeconds = Math.max(
      0,
      Math.round((submittedAt.getTime() - startedAt.getTime()) / 1000)
    );

    const attempt = await QuizAttempt.create({
      quiz: quiz._id,
      course: quiz.course,
      student: actor.id,
      attemptNumber: existingAttemptsCount + 1,
      answers: gradedAnswers,
      scorePercentage,
      earnedPoints,
      totalPoints,
      passed,
      startedAt,
      submittedAt,
      durationSeconds,
    });

    return { attempt, review };
  }

  async getAttemptHistory(
    quizId: string,
    actor: AuthenticatedUser
  ): Promise<IQuizAttemptDocument[]> {
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      throw AppError.badRequest('Invalid quiz ID');
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw AppError.notFound('Quiz not found');
    }

    const { isPrivileged } = await this.assertQuizCourseAccess(
      quiz.course.toString(),
      actor
    );

    const filter = isPrivileged
      ? { quiz: quiz._id }
      : { quiz: quiz._id, student: actor.id };

    return QuizAttempt.find(filter)
      .populate('student', 'name email avatarUrl')
      .sort({ submittedAt: -1 });
  }
}

export const quizService = new QuizService();
