import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  BookOpen,
  PlayCircle,
  CheckCircle2,
  Award,
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
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

export function StudentDashboardPage(): React.ReactElement {
  const { user } = useAuthStore();
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

  const filteredEnrollments = enrollments.filter((e) => {
    if (filterTab === 'all') return true;
    return e.status === filterTab;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
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

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Enrolled Courses</CardDescription>
            <CardTitle className="text-2xl">{enrollments.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>In Progress</CardDescription>
            <CardTitle className="text-2xl text-indigo-600">
              {activeCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completed Courses</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">
              {completedCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average Completion</CardDescription>
            <CardTitle className="text-2xl">{avgProgress}%</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Student Analytics & Earned Certificates */}
      {(studentAnalytics || certificates.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {studentAnalytics ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Learning Activity &amp; Quiz Performance
                </CardTitle>
                <CardDescription>
                  {studentAnalytics.summary.completedLessonsCount} lessons
                  completed • Avg Quiz Score:{' '}
                  {studentAnalytics.summary.averageQuizScore}%
                </CardDescription>
              </CardHeader>
              <CardContent className="h-56">
                {studentAnalytics.charts.courseProgress.length === 0 ? (
                  <p className="py-12 text-center text-xs text-slate-400">
                    Enroll in a course to track progress metrics.
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={studentAnalytics.charts.courseProgress}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Bar
                        dataKey="progress"
                        fill="#4f46e5"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  Earned Certificates ({certificates.length})
                </CardTitle>
                <CardDescription>
                  Verified credentials awarded upon 100% completion
                </CardDescription>
              </div>
              <Link to="/certificates/verify">
                <Button variant="outline" size="sm">
                  Verify Code
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {certificates.length === 0 ? (
                <p className="py-8 text-center text-xs text-slate-500">
                  Complete 100% of any enrolled course to earn your certificate.
                </p>
              ) : (
                certificates.map((cert) => (
                  <div
                    key={cert._id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2.5"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {cert.courseTitleSnapshot}
                      </p>
                      <p className="text-xs font-mono text-slate-500">
                        {cert.certificateCode}
                      </p>
                    </div>
                    <Link to={`/certificates/verify/${cert.certificateCode}`}>
                      <Button size="sm" variant="outline">
                        View <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
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
                className="flex flex-col justify-between transition-shadow hover:shadow-md"
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
                    <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-indigo-600" />
                      <span className="truncate">
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
                        <Award className="h-4 w-4 text-emerald-600" />
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
