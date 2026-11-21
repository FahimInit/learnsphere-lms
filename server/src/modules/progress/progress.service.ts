import mongoose from 'mongoose';
import { LessonProgress, ILessonProgressDocument } from './progress.model';
import {
  Enrollment,
  IEnrollmentDocument,
} from '../enrollments/enrollment.model';
import { Lesson } from '../lessons/lesson.model';
import { AppError } from '../../utils/AppError';
import { AuthenticatedUser } from '../../types/express';
import { UpdateLessonStateInput } from './progress.validator';

export class ProgressService {
  async toggleLessonCompletion(
    lessonId: string,
    actor: AuthenticatedUser,
    explicitCompleted?: boolean
  ): Promise<{
    lessonProgress: ILessonProgressDocument;
    enrollment: IEnrollmentDocument;
  }> {
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      throw AppError.badRequest('Invalid lesson ID');
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      throw AppError.notFound('Lesson not found');
    }

    const enrollment = await Enrollment.findOne({
      student: actor.id,
      course: lesson.course,
      status: { $in: ['active', 'completed'] },
    });

    if (!enrollment) {
      throw AppError.forbidden(
        'You must be enrolled in this course to track lesson progress'
      );
    }

    let progressDoc = await LessonProgress.findOne({
      student: actor.id,
      lesson: lesson._id,
    });

    if (!progressDoc) {
      const nextCompleted = explicitCompleted !== undefined ? explicitCompleted : true;
      progressDoc = await LessonProgress.create({
        enrollment: enrollment._id,
        student: actor.id,
        course: lesson.course,
        lesson: lesson._id,
        isCompleted: nextCompleted,
        completedAt: nextCompleted ? new Date() : undefined,
      });
    } else {
      const nextCompleted =
        explicitCompleted !== undefined ? explicitCompleted : !progressDoc.isCompleted;
      progressDoc.isCompleted = nextCompleted;
      progressDoc.completedAt = nextCompleted ? new Date() : undefined;
      await progressDoc.save();
    }

    const [totalCourseLessons, completedLessonsCount] = await Promise.all([
      Lesson.countDocuments({ course: lesson.course }),
      LessonProgress.countDocuments({
        enrollment: enrollment._id,
        isCompleted: true,
      }),
    ]);

    const progressPercentage =
      totalCourseLessons > 0
        ? Math.min(100, Math.round((completedLessonsCount / totalCourseLessons) * 100))
        : 0;

    enrollment.completedLessonsCount = completedLessonsCount;
    enrollment.progressPercentage = progressPercentage;
    enrollment.lastAccessedLesson = lesson._id;
    enrollment.lastAccessedAt = new Date();

    if (progressPercentage === 100) {
      enrollment.status = 'completed';
      if (!enrollment.completedAt) {
        enrollment.completedAt = new Date();
      }
    } else if (enrollment.status === 'completed') {
      enrollment.status = 'active';
    }

    await enrollment.save();

    return {
      lessonProgress: progressDoc,
      enrollment,
    };
  }

  async updateLessonState(
    lessonId: string,
    actor: AuthenticatedUser,
    input: UpdateLessonStateInput
  ): Promise<{
    lessonProgress: ILessonProgressDocument;
    enrollment: IEnrollmentDocument;
  }> {
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      throw AppError.badRequest('Invalid lesson ID');
    }

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      throw AppError.notFound('Lesson not found');
    }

    const enrollment = await Enrollment.findOne({
      student: actor.id,
      course: lesson.course,
      status: { $in: ['active', 'completed'] },
    });

    if (!enrollment) {
      throw AppError.forbidden(
        'You must be enrolled in this course to save lesson notes or playback state'
      );
    }

    let progressDoc = await LessonProgress.findOne({
      student: actor.id,
      lesson: lesson._id,
    });

    if (!progressDoc) {
      progressDoc = new LessonProgress({
        enrollment: enrollment._id,
        student: actor.id,
        course: lesson.course,
        lesson: lesson._id,
        isCompleted: false,
      });
    }

    if (input.notes !== undefined) {
      progressDoc.notes = input.notes;
    }
    if (input.lastPositionSeconds !== undefined) {
      progressDoc.lastPositionSeconds = input.lastPositionSeconds;
    }
    if (input.watchTimeDeltaSeconds !== undefined && input.watchTimeDeltaSeconds > 0) {
      progressDoc.watchTimeSeconds =
        (progressDoc.watchTimeSeconds || 0) + input.watchTimeDeltaSeconds;
    }

    await progressDoc.save();

    enrollment.lastAccessedLesson = lesson._id;
    enrollment.lastAccessedAt = new Date();
    await enrollment.save();

    return {
      lessonProgress: progressDoc,
      enrollment,
    };
  }
}

export const progressService = new ProgressService();
