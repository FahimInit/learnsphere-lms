import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  PlayCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { EnrollmentItem } from '@/types/learning';
import { CertificateItem, StudentAnalyticsPayload } from '@/types/phase7';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  CompactKpiCard,
  SemiCircleGaugeCard,
  GroupedBarChartCard,
  DonutBreakdownCard,
  SplitBarComparisonCard,
  DualMetricAreaTrendCard,
} from '@/components/charts/AnalyticsWidgets';

export function StudentDashboardPage(): React.ReactElement {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'completed'>('all');

  const { data: enrollments = [], isLoading } = useQuery<EnrollmentItem[]>({
    queryKey: ['my-enrollments'],
    queryFn: async () => {
      const res = await apiClient.get('/enrollments/my-enrollments');
      return res.data.data.enrollments;
    },
  });

  const { data: studentAnalytics } = useQuery<StudentAnalyticsPayload>({
    queryKey: ['student-analytics'],
    queryFn: async () => {
      const res = await apiClient.get('/analytics/student');
      return res.data.data;
    },
  });

  const { data: certificates = [] } = useQuery<CertificateItem[]>({
    queryKey: ['my-certificates'],
    queryFn: async () => {
      const res = await apiClient.get('/certificates/my-certificates');
      return res.data.data.certificates;
    },
  });

  const activeCount = enrollments.filter((e) => e.status === 'active').length;
  const completedCount = enrollments.filter(
    (e) => e.status === 'completed'
  ).length;
  const avgProgress =
    enrollments.length > 0
      ? Math.round(
          enrollments.reduce((acc, e) => acc + (e.progressPercentage || 0), 0) /
            enrollments.length
        )
      : 0;

  const totalLessonsAcrossEnrolled = enrollments.reduce(
    (sum, e) => sum + (e.course?.totalLessonsCount || 0),
    0
  );
  const completedLessonsCount =
    studentAnalytics?.summary.completedLessonsCount ??
    enrollments.reduce((sum, e) => sum + (e.completedLessonsCount || 0), 0);
  const remainingLessonsCount = Math.max(
    0,
    totalLessonsAcrossEnrolled - completedLessonsCount
  );

  const avgQuizScore = studentAnalytics?.summary.averageQuizScore ?? 0;
  const totalQuizAttempts = studentAnalytics?.summary.totalQuizAttempts ?? 0;
  const passedQuizzesCount = studentAnalytics?.summary.passedQuizzesCount ?? 0;
  const totalWatchMinutes = studentAnalytics?.summary.totalWatchMinutes ?? 0;

  const healthScore =
    enrollments.length > 0
      ? Math.round(
          avgQuizScore > 0 ? avgProgress * 0.6 + avgQuizScore * 0.4 : avgProgress
        )
      : 75;

  // Grouped Bar Chart Data (Progress % vs Mastery Target %)
  const groupedBarData =
    enrollments.length > 0
      ? enrollments.map((e, idx) => {
          const title = e.course?.title || `Track ${idx + 1}`;
          const shortName =
            title.length > 14 ? `${title.slice(0, 14)}..` : title;
          return {
            name: shortName,
            progress: e.progressPercentage || 0,
            benchmark:
              studentAnalytics?.charts.quizScores[idx]?.score ??
              Math.min(100, Math.max(60, (e.progressPercentage || 50) + 15)),
          };
        })
      : [
          { name: 'Module 1', progress: 0, benchmark: 80 },
          { name: 'Module 2', progress: 0, benchmark: 80 },
        ];

  // Donut Chart Data (Curriculum & Activity Distribution)
  const donutData = [
    { name: 'Completed Lessons', value: Math.max(1, completedLessonsCount) },
    { name: 'Remaining Lessons', value: remainingLessonsCount },
    { name: 'Quizzes Passed', value: passedQuizzesCount },
    { name: 'Active Courses', value: activeCount },
    { name: 'Certificates', value: certificates.length },
  ];

  // Area / Line Trend Data
  const trendData =
    studentAnalytics && studentAnalytics.charts.quizScores.length > 0
      ? studentAnalytics.charts.quizScores.map((q, idx) => ({
          label: q.name.length > 10 ? `${q.name.slice(0, 10)}..` : q.name,
          score: q.score,
          step: idx + 1,
        }))
      : enrollments.length > 0
      ? enrollments.map((e, idx) => ({
          label:
            (e.course?.title || `Course ${idx + 1}`).slice(0, 10) + '..',
          score: e.progressPercentage || 0,
        }))
      : [
          { label: 'Week 1', score: 25 },
          { label: 'Week 2', score: 50 },
          { label: 'Week 3', score: 75 },
          { label: 'Week 4', score: avgProgress || 85 },
        ];

  const filteredEnrollments = enrollments.filter((e) => {
    if (filterTab === 'all') return true;
    return e.status === filterTab;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {user?.name || 'Learner'}
          </h1>
          <p className="text-sm text-slate-500">
            Track your enrolled courses, resume lessons, and monitor completion
            progress
          </p>
        </div>
        <Link to="/courses">
          <Button variant="outline">
            <BookOpen className="h-4 w-4" />
            Browse Catalog
          </Button>
        </Link>
      </div>

      {/* ROW 1: 8-Card KPI Grid + Semi-Circular Learning Health Gauge */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-4 lg:col-span-9">
          <CompactKpiCard
            label="Enrolled Courses"
            value={enrollments.length}
            trendText={`${activeCount} active tracks`}
            trendDirection="up"
          />
          <CompactKpiCard
            label="In Progress"
            value={activeCount}
            trendText={`${remainingLessonsCount} lessons remaining`}
            trendDirection="up"
          />
          <CompactKpiCard
            label="Completed Courses"
            value={completedCount}
            trendText={`${certificates.length} certificates earned`}
            trendDirection="up"
          />
          <CompactKpiCard
            label="Average Completion"
            value={`${avgProgress}%`}
            trendText="Across enrolled curriculum"
            trendDirection="up"
          />
          <CompactKpiCard
            label="Lessons Completed"
            value={`${completedLessonsCount} / ${totalLessonsAcrossEnrolled || completedLessonsCount}`}
            trendText="Verified lesson progress"
            trendDirection="up"
          />
          <CompactKpiCard
            label="Average Quiz Score"
            value={`${avgQuizScore}%`}
            trendText={`${passedQuizzesCount} of ${totalQuizAttempts} quizzes passed`}
            trendDirection="up"
          />
          <CompactKpiCard
            label="Study Watch Time"
            value={`${totalWatchMinutes} mins`}
            trendText="Active learning duration"
            trendDirection="up"
          />
          <CompactKpiCard
            label="Earned Certificates"
            value={certificates.length}
            trendText="100% verifiable credentials"
            trendDirection="up"
          />
        </div>

        <div className="lg:col-span-3">
          <SemiCircleGaugeCard
            title="Learning Health"
            score={healthScore}
            actionLabel="Browse Courses"
            onAction={() => navigate('/courses')}
          />
        </div>
      </div>

      {/* ROW 2: Grouped Bar Chart + Donut Breakdown + Two Stacked Split-Bar Cards */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <GroupedBarChartCard
            title="Course Progress vs Mastery Target"
            data={groupedBarData}
            xKey="name"
            primaryKey="progress"
            primaryLabel="Completion %"
            secondaryKey="benchmark"
            secondaryLabel="Target / Quiz %"
          />
        </div>

        <div className="lg:col-span-4">
          <DonutBreakdownCard
            title="Learning Activity Breakdown"
            data={donutData}
          />
        </div>

        <div className="flex flex-col justify-between gap-4 lg:col-span-3">
          <SplitBarComparisonCard
            title="All Lessons"
            badgeText={`Remaining: ${remainingLessonsCount}`}
            primaryLabel="Completed"
            primaryValue={completedLessonsCount}
            primaryDisplay={`${completedLessonsCount} lessons`}
            secondaryLabel="Remaining"
            secondaryValue={remainingLessonsCount}
            secondaryDisplay={`${remainingLessonsCount} lessons`}
            detailsTitle="Progress Details:"
            details={[
              { label: 'Active Tracks', value: activeCount },
              { label: 'Completed Tracks', value: completedCount },
              { label: 'Avg Completion', value: `${avgProgress}%` },
            ]}
          />

          <SplitBarComparisonCard
            title="Quiz Assessments"
            badgeText={`Attempts: ${totalQuizAttempts}`}
            primaryLabel="Passed"
            primaryValue={passedQuizzesCount}
            primaryDisplay={`${passedQuizzesCount} passed`}
            secondaryLabel="Pending / Retry"
            secondaryValue={Math.max(0, totalQuizAttempts - passedQuizzesCount)}
            secondaryDisplay={`${Math.max(0, totalQuizAttempts - passedQuizzesCount)} attempts`}
            detailsTitle="Score Details:"
            details={[
              { label: 'Avg Score', value: `${avgQuizScore}%` },
              { label: 'Total Attempts', value: totalQuizAttempts },
              { label: 'Certificates', value: certificates.length },
            ]}
          />
        </div>
      </div>

      {/* ROW 3: Area Trend Chart + Active Tracks Table + Earned Certificates Stack */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <DualMetricAreaTrendCard
            title="Performance & Completion Velocity"
            leftMetricLabel="Completed Lessons"
            leftMetricValue={`${completedLessonsCount} Lessons`}
            rightMetricLabel="Quiz Mastery Avg"
            rightMetricValue={`${avgQuizScore}%`}
            data={trendData}
            xKey="label"
            yKey="score"
            yLabel="Score / Progress (%)"
          />
        </div>

        {/* Middle: Projects-style Status Table */}
        <Card className="border-slate-200/90 shadow-sm lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-bold text-slate-900">
              Enrolled Tracks
            </CardTitle>
            <span className="text-xs font-medium text-slate-400">
              1 / {Math.max(1, enrollments.length)}
            </span>
          </CardHeader>
          <CardContent className="px-5 pb-4 pt-1">
            {enrollments.length === 0 ? (
              <p className="py-10 text-center text-xs text-slate-400">
                No enrolled courses yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                      <th className="pb-2 pr-2">Course</th>
                      <th className="pb-2 px-2">Category</th>
                      <th className="pb-2 px-2">Status</th>
                      <th className="pb-2 pl-2 text-right">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {enrollments.slice(0, 5).map((e) => (
                      <tr key={e._id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 pr-2 font-semibold text-slate-800 max-w-[130px] truncate">
                          {e.course?.title || 'Course'}
                        </td>
                        <td className="py-2.5 px-2 text-slate-500 truncate max-w-[90px]">
                          {e.course?.category?.name || 'General'}
                        </td>
                        <td className="py-2.5 px-2">
                          <span
                            className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                              e.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-teal-100 text-teal-700'
                            }`}
                          >
                            {e.status === 'completed' ? 'COMPLETED' : 'ACTIVE'}
                          </span>
                        </td>
                        <td className="py-2.5 pl-2 text-right font-bold text-emerald-600">
                          {e.progressPercentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Accounts & Balances style Stacked Cards for Earned Certificates */}
        <Card className="border-slate-200/90 shadow-sm lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-bold text-slate-900">
              Earned Certificates ({certificates.length})
            </CardTitle>
            <Link
              to="/certificates/verify"
              className="text-[11px] font-semibold text-indigo-600 hover:underline"
            >
              Verify Code
            </Link>
          </CardHeader>
          <CardContent className="space-y-2.5 px-5 pb-4 pt-1">
            {certificates.length === 0 ? (
              <div className="rounded-lg border border-slate-200/80 bg-slate-50/60 p-3.5">
                <p className="text-xs font-medium text-slate-500">
                  Next Certificate Milestone
                </p>
                <p className="mt-1 text-lg font-extrabold text-slate-900">
                  {avgProgress}% Complete
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Reach 100% in any course to claim
                </p>
              </div>
            ) : (
              certificates.map((cert) => (
                <div
                  key={cert._id}
                  className="rounded-lg border border-slate-200/80 bg-slate-50/50 p-3 space-y-1.5"
                >
                  <p className="text-xs font-medium text-slate-500 truncate">
                    {cert.courseTitleSnapshot}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-extrabold font-mono text-slate-900 truncate">
                      {cert.certificateCode}
                    </p>
                    <Link to={`/certificates/verify/${cert.certificateCode}`}>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                        View <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs for Course Cards */}
      <div className="flex items-center gap-2 border-b border-slate-200 pt-2">
        {(['all', 'active', 'completed'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilterTab(tab)}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium capitalize transition-colors ${
              filterTab === tab
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab === 'all'
              ? `All Courses (${enrollments.length})`
              : tab === 'active'
              ? `In Progress (${activeCount})`
              : `Completed (${completedCount})`}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredEnrollments.length === 0 ? (
        <Card className="py-14 text-center">
          <CardContent className="space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-slate-900">
                No courses in this view yet
              </h3>
              <p className="mx-auto max-w-md text-sm text-slate-500">
                Explore the course catalog to enroll in structured learning tracks and
                start building new skills.
              </p>
            </div>
            <Link to="/courses" className="inline-block">
              <Button>
                Explore Course Catalog
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEnrollments.map((enrollment) => {
            const course = enrollment.course;
            if (!course) return null;

            return (
              <Card
                key={enrollment._id}
                className="flex min-w-0 flex-col justify-between overflow-hidden transition-shadow hover:shadow-md"
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="default">
                      {course.category?.name || 'Course'}
                    </Badge>
                    {enrollment.status === 'completed' ? (
                      <Badge variant="success">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Completed
                      </Badge>
                    ) : (
                      <Badge variant="secondary">In Progress</Badge>
                    )}
                  </div>

                  <div>
                    <CardTitle className="line-clamp-2 text-lg">
                      {course.title}
                    </CardTitle>
                    <p className="mt-1 text-xs text-slate-500">
                      Instructor:{' '}
                      {course.instructor?.name || 'LearnSphere Instructor'}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                      <span>
                        {enrollment.completedLessonsCount} /{' '}
                        {course.totalLessonsCount || 0} lessons
                      </span>
                      <span className="font-bold text-indigo-600">
                        {enrollment.progressPercentage}%
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full transition-all ${
                          enrollment.status === 'completed'
                            ? 'bg-emerald-600'
                            : 'bg-indigo-600'
                        }`}
                        style={{ width: `${enrollment.progressPercentage}%` }}
                      />
                    </div>
                  </div>

                  {enrollment.lastAccessedLesson ? (
                    <div className="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                      <span className="min-w-0 truncate">
                        Resume: <strong>{enrollment.lastAccessedLesson.title}</strong>
                      </span>
                    </div>
                  ) : null}
                </CardContent>

                <CardFooter className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
                  <Link to={`/learn/${course._id}`} className="flex-1">
                    <Button className="w-full" size="sm">
                      <PlayCircle className="h-4 w-4" />
                      {enrollment.progressPercentage === 0
                        ? 'Start Course'
                        : enrollment.status === 'completed'
                        ? 'Review Lessons'
                        : 'Resume Learning'}
                    </Button>
                  </Link>
                  {enrollment.status === 'completed' ? (
                    <Link to="/dashboard">
                      <Button
                        variant="outline"
                        size="sm"
                        title="Course Completed"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </Button>
                    </Link>
                  ) : null}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
