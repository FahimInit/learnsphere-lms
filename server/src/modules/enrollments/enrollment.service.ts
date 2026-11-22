import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import {
  Enrollment,
  IEnrollmentDocument,
  EnrollmentStatus,
} from './enrollment.model';
import { Course } from '../courses/course.model';
import { Section } from '../sections/section.model';
import { Lesson } from '../lessons/lesson.model';
import { LessonProgress } from '../progress/progress.model';
import { courseService, SectionWithLessons } from '../courses/course.service';
import { notificationService } from '../notifications/notification.service';
import { AppError } from '../../utils/AppError';
import { AuthenticatedUser } from '../../types/express';

export class EnrollmentService {
  async createCheckoutReceipt(
    courseId: string,
    actor: AuthenticatedUser
  ): Promise<{ paymentReceiptToken: string; amount: number; currency: string }> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw AppError.badRequest('Invalid course ID');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw AppError.notFound('Course not found');
    }

    if (course.status !== 'published') {
      throw AppError.badRequest('Cannot purchase a course that is not published');
    }

    const paymentReceiptToken = jwt.sign(
      {
        type: 'course_checkout',
        courseId: course._id.toString(),
        studentId: actor.id,
        amount: course.price,
      },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );

    return {
      paymentReceiptToken,
      amount: course.price,
      currency: 'USD',
    };
  }

  async enrollInCourse(
    courseId: string,
    actor: AuthenticatedUser,
    paymentReceiptToken?: string
  ): Promise<IEnrollmentDocument> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw AppError.badRequest('Invalid course ID');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw AppError.notFound('Course not found');
    }

    if (course.status !== 'published') {
      throw AppError.badRequest('Cannot enroll in a course that is not published');
    }

    if (course.price > 0) {
      if (!paymentReceiptToken) {
        throw AppError.badRequest(
          'Payment checkout verification is required to enroll in a paid course'
        );
      }
      try {
        const decoded = jwt.verify(
          paymentReceiptToken,
          env.JWT_ACCESS_SECRET
        ) as {
          type?: string;
          courseId?: string;
          studentId?: string;
        };
        if (
          decoded.type !== 'course_checkout' ||
          decoded.courseId !== course._id.toString() ||
          decoded.studentId !== actor.id
        ) {
          throw AppError.badRequest('Invalid payment receipt for this course');
        }
      } catch (err) {
        if (err instanceof AppError) throw err;
        throw AppError.badRequest('Invalid or expired payment receipt token');
      }
    }

    const existing = await Enrollment.findOne({
      student: actor.id,
      course: course._id,
    });

    if (existing) {
      if (existing.status === 'active' || existing.status === 'completed') {
        throw AppError.conflict('You are already enrolled in this course');
      }
      existing.status = 'active';
      existing.lastAccessedAt = new Date();
      await existing.save();
      await Course.findByIdAndUpdate(course._id, {
        $inc: { enrollmentCount: 1 },
      });
      return existing.populate([
        {
          path: 'course',
          populate: [
            { path: 'category', select: 'name slug icon' },
            { path: 'instructor', select: 'name headline avatarUrl' },
          ],
        },
        { path: 'lastAccessedLesson', select: 'title slug order' },
      ]);
    }

    // Find first ordered lesson in the course to initialize resume point
    const firstSection = await Section.findOne({ course: course._id }).sort({
      order: 1,
    });
    let firstLessonId: mongoose.Types.ObjectId | undefined;
    if (firstSection) {
      const firstLesson = await Lesson.findOne({
        section: firstSection._id,
      }).sort({ order: 1 });
      if (firstLesson) {
        firstLessonId = firstLesson._id;
      }
    }

    const enrollment = await Enrollment.create({
      student: actor.id,
      course: course._id,
      status: 'active',
      progressPercentage: 0,
      completedLessonsCount: 0,
      lastAccessedLesson: firstLessonId,
      lastAccessedAt: new Date(),
      enrolledAt: new Date(),
    });

    await Course.findByIdAndUpdate(course._id, {
      $inc: { enrollmentCount: 1 },
    });

    await notificationService.createAndDispatch({
      recipientId: actor.id,
      type: 'enrollment',
      title: 'Enrollment Confirmed',
      message: `You are now enrolled in "${course.title}". Start learning whenever you are ready!`,
      linkUrl: `/learn/${course._id.toString()}`,
    });

    return enrollment.populate([
      {
        path: 'course',
        populate: [
          { path: 'category', select: 'name slug icon' },
          { path: 'instructor', select: 'name headline avatarUrl' },
        ],
      },
      { path: 'lastAccessedLesson', select: 'title slug order' },
    ]);
  }

  async getMyEnrollments(
    studentId: string,
    statusFilter?: EnrollmentStatus
  ): Promise<IEnrollmentDocument[]> {
    const filter: Record<string, unknown> = { student: studentId };
    if (
      statusFilter &&
      ['active', 'completed', 'cancelled'].includes(statusFilter)
    ) {
      filter.status = statusFilter;
    }

    return Enrollment.find(filter)
      .populate({
        path: 'course',
        populate: [
          { path: 'category', select: 'name slug icon' },
          { path: 'instructor', select: 'name headline avatarUrl' },
        ],
      })
      .populate('lastAccessedLesson', 'title slug type order')
      .sort({ lastAccessedAt: -1 });
  }

  async getEnrollmentStatus(
    courseId: string,
    studentId: string
  ): Promise<{ isEnrolled: boolean; enrollment: IEnrollmentDocument | null }> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return { isEnrolled: false, enrollment: null };
    }

    const enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
      status: { $in: ['active', 'completed'] },
    }).populate('lastAccessedLesson', 'title slug order');

    return {
      isEnrolled: Boolean(enrollment),
      enrollment,
    };
  }

  async getLearningWorkspace(
    courseId: string,
    actor: AuthenticatedUser
  ): Promise<{
    course: unknown;
    enrollment: IEnrollmentDocument | null;
    sections: SectionWithLessons[];
    progressMap: Record<
      string,
      {
        isCompleted: boolean;
        notes: string;
        lastPositionSeconds: number;
        watchTimeSeconds: number;
      }
    >;
    resumeLessonId: string | null;
  }> {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw AppError.badRequest('Invalid course ID');
    }

    const course = await Course.findById(courseId)
      .populate('category', 'name slug icon')
      .populate('instructor', 'name email headline avatarUrl');

    if (!course) {
      throw AppError.notFound('Course not found');
    }

    const instructorObj = course.instructor as unknown as {
      _id?: mongoose.Types.ObjectId;
    };
    const instructorId = instructorObj._id
      ? instructorObj._id.toString()
      : String(course.instructor);

    const isPrivileged =
      actor.role === 'admin' || actor.id === instructorId;

    const enrollment = await Enrollment.findOne({
      student: actor.id,
      course: course._id,
      status: { $in: ['active', 'completed'] },
    });

    if (!enrollment && !isPrivileged) {
      throw AppError.forbidden(
        'You must be enrolled in this course to access the learning workspace'
      );
    }

    const [sections, lessons, progressDocs] = await Promise.all([
      Section.find({ course: course._id }).sort({ order: 1 }),
      Lesson.find({ course: course._id }).sort({ order: 1 }),
      LessonProgress.find({ student: actor.id, course: course._id }),
    ]);

    const progressMap: Record<
      string,
      {
        isCompleted: boolean;
        notes: string;
        lastPositionSeconds: number;
        watchTimeSeconds: number;
      }
    > = {};

    for (const p of progressDocs) {
      progressMap[p.lesson.toString()] = {
        isCompleted: p.isCompleted,
        notes: p.notes || '',
        lastPositionSeconds: p.lastPositionSeconds || 0,
        watchTimeSeconds: p.watchTimeSeconds || 0,
      };
    }

    const lessonsBySection = new Map<string, Array<Record<string, unknown>>>();
    const orderedFlatLessonIds: string[] = [];

    for (const sec of sections) {
      lessonsBySection.set(sec._id.toString(), []);
    }

    for (const lesson of lessons) {
      const secId = lesson.section.toString();
      if (!lessonsBySection.has(secId)) {
        lessonsBySection.set(secId, []);
      }
      lessonsBySection
        .get(secId)!
        .push(lesson.toObject() as unknown as Record<string, unknown>);
    }

    const structuredSections: SectionWithLessons[] = sections.map((sec) => {
      const secLessons = lessonsBySection.get(sec._id.toString()) || [];
      for (const l of secLessons) {
        orderedFlatLessonIds.push(String(l._id));
      }
      return {
        _id: sec._id.toString(),
        course: sec.course.toString(),
        title: sec.title,
        description: sec.description,
        order: sec.order,
        lessons: secLessons,
      };
    });

    let resumeLessonId: string | null = null;
    if (
      enrollment?.lastAccessedLesson &&
      orderedFlatLessonIds.includes(enrollment.lastAccessedLesson.toString())
    ) {
      resumeLessonId = enrollment.lastAccessedLesson.toString();
    } else {
      const firstIncomplete = orderedFlatLessonIds.find(
        (id) => !progressMap[id]?.isCompleted
      );
      resumeLessonId = firstIncomplete || orderedFlatLessonIds[0] || null;
    }

    return {
      course,
      enrollment,
      sections: structuredSections,
      progressMap,
      resumeLessonId,
    };
  }

  async getCourseEnrolledStudents(
    courseId: string,
    actor: AuthenticatedUser
  ): Promise<IEnrollmentDocument[]> {
    await courseService.assertCourseOwnership(courseId, actor);

    return Enrollment.find({ course: courseId })
      .populate('student', 'name email avatarUrl headline status')
      .populate('lastAccessedLesson', 'title slug order')
      .sort({ enrolledAt: -1 });
  }
}

export const enrollmentService = new EnrollmentService();
