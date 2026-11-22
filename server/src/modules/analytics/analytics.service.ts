import mongoose from 'mongoose';
import { User } from '../users/user.model';
import { Course } from '../courses/course.model';
import { Category } from '../categories/category.model';
import { Enrollment } from '../enrollments/enrollment.model';
import { LessonProgress } from '../progress/progress.model';
import { QuizAttempt } from '../quizzes/quizAttempt.model';
import { Submission } from '../assignments/submission.model';
import { Certificate } from '../certificates/certificate.model';
import { Discussion } from '../discussions/discussion.model';
import { Comment } from '../discussions/comment.model';

export class AnalyticsService {
  async getStudentAnalytics(studentId: string) {
    const studentObjId = new mongoose.Types.ObjectId(studentId);

    const [enrollments, progressDocs, quizAttempts, certificatesCount] =
      await Promise.all([
        Enrollment.find({ student: studentObjId }).populate(
          'course',
          'title slug totalLessonsCount'
        ),
        LessonProgress.find({ student: studentObjId }).select(
          'isCompleted watchTimeSeconds'
        ),
        QuizAttempt.find({ student: studentObjId })
          .populate('quiz', 'title')
          .sort({ submittedAt: -1 })
          .limit(20),
        Certificate.countDocuments({ student: studentObjId }),
      ]);

    const enrolledCount = enrollments.length;
    const completedCoursesCount = enrollments.filter(
      (e) => e.status === 'completed'
    ).length;
    const averageCompletionPercentage =
      enrolledCount > 0
        ? Math.round(
            enrollments.reduce((sum, e) => sum + e.progressPercentage, 0) /
              enrolledCount
          )
        : 0;

    const completedLessonsCount = progressDocs.filter(
      (p) => p.isCompleted
    ).length;
    const totalWatchMinutes = Math.round(
      progressDocs.reduce((sum, p) => sum + (p.watchTimeSeconds || 0), 0) / 60
    );

    const totalQuizAttempts = quizAttempts.length;
    const averageQuizScore =
      totalQuizAttempts > 0
        ? Math.round(
            quizAttempts.reduce((sum, a) => sum + a.scorePercentage, 0) /
              totalQuizAttempts
          )
        : 0;
    const passedQuizzesCount = quizAttempts.filter((a) => a.passed).length;

    const courseProgressChart = enrollments.map((e) => {
      const courseObj = e.course as unknown as { title?: string };
      return {
        name: courseObj?.title || 'Course',
        progress: e.progressPercentage,
      };
    });

    const quizScoresChart = [...quizAttempts]
      .reverse()
      .slice(-8)
      .map((a) => {
        const quizObj = a.quiz as unknown as { title?: string };
        return {
          name: quizObj?.title || `Attempt #${a.attemptNumber}`,
          score: a.scorePercentage,
        };
      });

    return {
      summary: {
        enrolledCount,
        completedCoursesCount,
        averageCompletionPercentage,
        completedLessonsCount,
        totalWatchMinutes,
        totalQuizAttempts,
        averageQuizScore,
        passedQuizzesCount,
        certificatesCount,
      },
      charts: {
        courseProgress: courseProgressChart,
        quizScores: quizScoresChart,
      },
    };
  }

  async getInstructorAnalytics(instructorId: string) {
    const courses = await Course.find({
      instructor: new mongoose.Types.ObjectId(instructorId),
    }).select(
      'title status enrollmentCount averageRating reviewCount totalLessonsCount'
    );

    const courseIds = courses.map((c) => c._id);

    const [enrollments, quizAttempts, submissions] = await Promise.all([
      Enrollment.find({ course: { $in: courseIds } }).select(
        'course status progressPercentage'
      ),
      QuizAttempt.find({ course: { $in: courseIds } }).select(
        'scorePercentage passed'
      ),
      Submission.find({ course: { $in: courseIds } }).select('status grade'),
    ]);

    const totalEnrollments = enrollments.length;
    const completedEnrollments = enrollments.filter(
      (e) => e.status === 'completed'
    ).length;
    const completionRate =
      totalEnrollments > 0
        ? Math.round((completedEnrollments / totalEnrollments) * 100)
        : 0;

    const avgQuizScore =
      quizAttempts.length > 0
        ? Math.round(
            quizAttempts.reduce((sum, a) => sum + a.scorePercentage, 0) /
              quizAttempts.length
          )
        : 0;
    const quizPassRate =
      quizAttempts.length > 0
        ? Math.round(
            (quizAttempts.filter((a) => a.passed).length /
              quizAttempts.length) *
              100
          )
        : 0;

    const submissionStats = {
      total: submissions.length,
      pendingReview: submissions.filter((s) => s.status === 'submitted').length,
      graded: submissions.filter((s) => s.status === 'graded').length,
      returnedForRevision: submissions.filter(
        (s) => s.status === 'returned_for_revision'
      ).length,
    };

    const coursePerformanceChart = courses.map((c) => {
      const courseEnrollments = enrollments.filter(
        (e) => e.course.toString() === c._id.toString()
      );
      const avgProgress =
        courseEnrollments.length > 0
          ? Math.round(
              courseEnrollments.reduce(
                (sum, e) => sum + e.progressPercentage,
                0
              ) / courseEnrollments.length
            )
          : 0;

      return {
        name: c.title.length > 22 ? `${c.title.slice(0, 22)}...` : c.title,
        enrollments: courseEnrollments.length,
        avgProgress,
        rating: c.averageRating,
      };
    });

    return {
      summary: {
        totalCourses: courses.length,
        publishedCourses: courses.filter((c) => c.status === 'published').length,
        pendingReviewCourses: courses.filter(
          (c) => c.status === 'pending_review'
        ).length,
        totalEnrollments,
        completedEnrollments,
        completionRate,
        totalQuizAttempts: quizAttempts.length,
        avgQuizScore,
        quizPassRate,
      },
      submissionStats,
      charts: {
        coursePerformance: coursePerformanceChart,
      },
    };
  }

  async getAdminAnalytics() {
    const [
      usersByRole,
      usersByStatus,
      coursesByStatus,
      totalEnrollments,
      completedEnrollments,
      certificatesCount,
      discussionsCount,
      reportedDiscussionsCount,
      reportedCommentsCount,
      categories,
    ] = await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      User.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Course.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Enrollment.countDocuments(),
      Enrollment.countDocuments({ status: 'completed' }),
      Certificate.countDocuments(),
      Discussion.countDocuments(),
      Discussion.countDocuments({ isReported: true }),
      Comment.countDocuments({ isReported: true }),
      Category.find().select('name courseCount isActive').sort({ courseCount: -1 }),
    ]);

    const roleCounts: Record<string, number> = {
      student: 0,
      instructor: 0,
      admin: 0,
    };
    for (const item of usersByRole) {
      if (item._id) roleCounts[String(item._id)] = item.count;
    }

    const statusCounts: Record<string, number> = {
      active: 0,
      suspended: 0,
      pending: 0,
    };
    for (const item of usersByStatus) {
      if (item._id) statusCounts[String(item._id)] = item.count;
    }

    const courseStatusCounts: Record<string, number> = {
      draft: 0,
      pending_review: 0,
      published: 0,
      rejected: 0,
      archived: 0,
    };
    for (const item of coursesByStatus) {
      if (item._id) courseStatusCounts[String(item._id)] = item.count;
    }

    const totalUsers = Object.values(roleCounts).reduce((a, b) => a + b, 0);
    const totalCourses = Object.values(courseStatusCounts).reduce(
      (a, b) => a + b,
      0
    );

    return {
      summary: {
        totalUsers,
        activeUsers: statusCounts.active,
        suspendedUsers: statusCounts.suspended,
        totalCourses,
        publishedCourses: courseStatusCounts.published,
        pendingApprovalCourses: courseStatusCounts.pending_review,
        totalEnrollments,
        completedEnrollments,
        certificatesIssued: certificatesCount,
        discussionsCount,
        reportedContentCount: reportedDiscussionsCount + reportedCommentsCount,
      },
      breakdowns: {
        usersByRole: Object.entries(roleCounts).map(([name, value]) => ({
          name,
          value,
        })),
        coursesByStatus: Object.entries(courseStatusCounts).map(
          ([name, value]) => ({
            name: name.replace('_', ' '),
            value,
          })
        ),
        categoriesDistribution: categories.map((c) => ({
          name: c.name,
          courses: c.courseCount,
        })),
      },
    };
  }
}

export const analyticsService = new AnalyticsService();
