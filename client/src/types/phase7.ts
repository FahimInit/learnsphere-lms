export interface CertificateItem {
  _id: string;
  certificateCode: string;
  student: string;
  course:
    | string
    | {
        _id: string;
        title: string;
        slug: string;
        level?: string;
        estimatedDurationMinutes?: number;
      };
  enrollment: string;
  studentNameSnapshot: string;
  courseTitleSnapshot: string;
  instructorNameSnapshot: string;
  issuedAt: string;
}

export interface StudentAnalyticsPayload {
  summary: {
    enrolledCount: number;
    completedCoursesCount: number;
    averageCompletionPercentage: number;
    completedLessonsCount: number;
    totalWatchMinutes: number;
    totalQuizAttempts: number;
    averageQuizScore: number;
    passedQuizzesCount: number;
    certificatesCount: number;
  };
  charts: {
    courseProgress: Array<{ name: string; progress: number }>;
    quizScores: Array<{ name: string; score: number }>;
  };
}

export interface InstructorAnalyticsPayload {
  summary: {
    totalCourses: number;
    publishedCourses: number;
    pendingReviewCourses: number;
    totalEnrollments: number;
    completedEnrollments: number;
    completionRate: number;
    totalQuizAttempts: number;
    avgQuizScore: number;
    quizPassRate: number;
  };
  submissionStats: {
    total: number;
    pendingReview: number;
    graded: number;
    returnedForRevision: number;
  };
  charts: {
    coursePerformance: Array<{
      name: string;
      enrollments: number;
      avgProgress: number;
      rating: number;
    }>;
  };
}

export interface AdminAnalyticsPayload {
  summary: {
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    totalCourses: number;
    publishedCourses: number;
    pendingApprovalCourses: number;
    totalEnrollments: number;
    completedEnrollments: number;
    certificatesIssued: number;
    discussionsCount: number;
    reportedContentCount: number;
  };
  breakdowns: {
    usersByRole: Array<{ name: string; value: number }>;
    coursesByStatus: Array<{ name: string; value: number }>;
    categoriesDistribution: Array<{ name: string; courses: number }>;
  };
}

export interface AuditLogItem {
  _id: string;
  actor: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown>;
  ipAddress: string;
  createdAt: string;
}

export interface PlatformSettingsItem {
  _id: string;
  platformName: string;
  supportEmail: string;
  allowInstructorSignup: boolean;
  requireCourseApproval: boolean;
  announcementBanner: string;
}
