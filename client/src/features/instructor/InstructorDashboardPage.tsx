import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  BookOpen,
  Users,
  Clock,
  Send,
  Edit3,
  Trash2,
  AlertCircle,
  CheckCircle2,
  FileText,
  X,
} from 'lucide-react';
import { apiClient, extractErrorMessage } from '@/lib/api';
import { formatCurrency, formatDuration } from '@/lib/utils';
import { CategoryItem, CourseItem, CourseLevel, CourseStatus } from '@/types/course';
import { InstructorAnalyticsPayload } from '@/types/phase7';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  CompactKpiCard,
  SemiCircleGaugeCard,
  GroupedBarChartCard,
  DonutBreakdownCard,
  SplitBarComparisonCard,
} from '@/components/charts/AnalyticsWidgets';

function getStatusBadge(status: CourseStatus): React.ReactElement {
  switch (status) {
    case 'published':
      return <Badge variant="success">Published</Badge>;
    case 'pending_review':
      return <Badge variant="warning">Pending Review</Badge>;
    case 'rejected':
      return <Badge variant="danger">Rejected</Badge>;
    case 'archived':
      return <Badge variant="outline">Archived</Badge>;
    default:
      return <Badge variant="secondary">Draft</Badge>;
  }
}

export function InstructorDashboardPage(): React.ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Course Creation Wizard form state
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [level, setLevel] = useState<CourseLevel>('beginner');
  const [price, setPrice] = useState('0');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [objectivesInput, setObjectivesInput] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const { data: categories = [] } = useQuery<CategoryItem[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get('/categories');
      return res.data.data.categories;
    },
  });

  const { data: courses = [], isLoading } = useQuery<CourseItem[]>({
    queryKey: ['instructor-courses'],
    queryFn: async () => {
      const res = await apiClient.get('/courses/instructor/my-courses');
      return res.data.data.courses;
    },
  });

  const { data: instructorAnalytics } = useQuery<InstructorAnalyticsPayload>({
    queryKey: ['instructor-analytics'],
    queryFn: async () => {
      const res = await apiClient.get('/analytics/instructor');
      return res.data.data;
    },
  });

  const createCourseMutation = useMutation({
    mutationFn: async () => {
      const selectedCat = categoryId || categories[0]?._id;
      if (!selectedCat) {
        throw new Error('Please select a course category');
      }
      const res = await apiClient.post('/courses', {
        title: title.trim(),
        shortDescription: shortDescription.trim(),
        fullDescription: fullDescription.trim(),
        category: selectedCat,
        level,
        price: Number(price) || 0,
        thumbnailUrl: thumbnailUrl.trim(),
        tags: tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        learningObjectives: objectivesInput
          .split('\n')
          .map((o) => o.trim())
          .filter(Boolean),
      });
      return res.data.data.course as CourseItem;
    },
    onSuccess: (createdCourse) => {
      void queryClient.invalidateQueries({ queryKey: ['instructor-courses'] });
      setIsCreateModalOpen(false);
      navigate(`/instructor/courses/${createdCourse._id}/edit`);
    },
    onError: (err) => {
      setCreateError(extractErrorMessage(err));
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const res = await apiClient.post(`/courses/${courseId}/submit-review`);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['instructor-courses'] });
      setFeedbackBanner({
        type: 'success',
        message: 'Course submitted for administrator review.',
      });
    },
    onError: (err) => {
      setFeedbackBanner({
        type: 'error',
        message: extractErrorMessage(err),
      });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const res = await apiClient.delete(`/courses/${courseId}`);
      return res.data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['instructor-courses'] });
      setConfirmDeleteId(null);
      setFeedbackBanner({
        type: 'success',
        message: data.message || 'Course removed.',
      });
    },
    onError: (err) => {
      setFeedbackBanner({
        type: 'error',
        message: extractErrorMessage(err),
      });
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (title.trim().length < 3) {
      setCreateError('Course title must be at least 3 characters');
      return;
    }
    if (shortDescription.trim().length < 10) {
      setCreateError('Short description must be at least 10 characters');
      return;
    }
    createCourseMutation.mutate();
  };

  const totalEnrollments = courses.reduce(
    (sum, c) => sum + (c.enrollmentCount || 0),
    0
  );
  const publishedCount = courses.filter((c) => c.status === 'published').length;
  const pendingCount = courses.filter((c) => c.status === 'pending_review').length;

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Instructor Studio
          </h1>
          <p className="text-sm text-slate-500">
            Create courses, structure sections & lessons, and manage curriculum publication
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4" />
          New Course
        </Button>
      </div>

      {feedbackBanner ? (
        <div
          className={`flex items-center justify-between rounded-lg border p-3.5 text-sm ${
            feedbackBanner.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackBanner.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedbackBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-xs font-medium underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* SmartLedger-Style Instructor Studio Analytics Suite */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-4 lg:col-span-9">
          <CompactKpiCard
            label="Total Courses"
            value={courses.length}
            trendText={`${publishedCount} live in catalog`}
            trendDirection="up"
          />
          <CompactKpiCard
            label="Published Tracks"
            value={publishedCount}
            trendText="Approved & active"
            trendDirection="up"
          />
          <CompactKpiCard
            label="Pending Review"
            value={pendingCount}
            trendText="In moderation queue"
            trendDirection="neutral"
          />
          <CompactKpiCard
            label="Total Enrollments"
            value={totalEnrollments}
            trendText={`${instructorAnalytics?.summary.completedEnrollments ?? 0} completed`}
            trendDirection="up"
          />
          <CompactKpiCard
            label="Completion Rate"
            value={`${instructorAnalytics?.summary.completionRate ?? 0}%`}
            trendText="Student finish ratio"
            trendDirection="up"
          />
          <CompactKpiCard
            label="Quiz Pass Rate"
            value={`${instructorAnalytics?.summary.quizPassRate ?? 0}%`}
            trendText={`Avg Score: ${instructorAnalytics?.summary.avgQuizScore ?? 0}%`}
            trendDirection="up"
          />
          <CompactKpiCard
            label="Submissions Graded"
            value={instructorAnalytics?.submissionStats.graded ?? 0}
            trendText={`${instructorAnalytics?.submissionStats.pendingReview ?? 0} awaiting review`}
            trendDirection="up"
          />
          <CompactKpiCard
            label="Total Quiz Attempts"
            value={instructorAnalytics?.summary.totalQuizAttempts ?? 0}
            trendText="Across all assessments"
            trendDirection="up"
          />
        </div>

        <div className="lg:col-span-3">
          <SemiCircleGaugeCard
            title="Studio Health"
            score={
              instructorAnalytics
                ? Math.round(
                    (instructorAnalytics.summary.completionRate || 75) * 0.5 +
                      (instructorAnalytics.summary.quizPassRate || 85) * 0.5
                  )
                : 82
            }
            actionLabel="Launch Course Wizard"
            onAction={() => setIsCreateModalOpen(true)}
          />
        </div>
      </div>

      {instructorAnalytics ? (
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <GroupedBarChartCard
              title="Enrollments vs Avg Completion (%)"
              data={
                instructorAnalytics.charts.coursePerformance.length > 0
                  ? instructorAnalytics.charts.coursePerformance
                  : [{ name: 'No Courses', enrollments: 0, avgProgress: 0 }]
              }
              xKey="name"
              primaryKey="enrollments"
              primaryLabel="Enrollments"
              secondaryKey="avgProgress"
              secondaryLabel="Avg Progress (%)"
            />
          </div>

          <div className="lg:col-span-4">
            <DonutBreakdownCard
              title="Curriculum & Assessment Mix"
              data={[
                { name: 'Published Courses', value: publishedCount },
                { name: 'Pending Review', value: pendingCount },
                {
                  name: 'Completed Learners',
                  value: instructorAnalytics.summary.completedEnrollments,
                },
                {
                  name: 'Graded Submissions',
                  value: instructorAnalytics.submissionStats.graded,
                },
                {
                  name: 'Quiz Attempts',
                  value: instructorAnalytics.summary.totalQuizAttempts,
                },
              ]}
            />
          </div>

          <div className="flex flex-col justify-between gap-4 lg:col-span-3">
            <SplitBarComparisonCard
              title="All Enrollments"
              badgeText={`Total: ${totalEnrollments}`}
              primaryLabel="Completed"
              primaryValue={instructorAnalytics.summary.completedEnrollments}
              primaryDisplay={`${instructorAnalytics.summary.completedEnrollments} learners`}
              secondaryLabel="In Progress"
              secondaryValue={Math.max(
                0,
                totalEnrollments -
                  instructorAnalytics.summary.completedEnrollments
              )}
              secondaryDisplay={`${Math.max(
                0,
                totalEnrollments -
                  instructorAnalytics.summary.completedEnrollments
              )} learners`}
              detailsTitle="Cohort Metrics:"
              details={[
                {
                  label: 'Completion Rate',
                  value: `${instructorAnalytics.summary.completionRate}%`,
                },
                {
                  label: 'Quiz Pass Rate',
                  value: `${instructorAnalytics.summary.quizPassRate}%`,
                },
                {
                  label: 'Avg Quiz Score',
                  value: `${instructorAnalytics.summary.avgQuizScore}%`,
                },
              ]}
            />

            <SplitBarComparisonCard
              title="All Submissions"
              badgeText={`Pending: ${instructorAnalytics.submissionStats.pendingReview}`}
              primaryLabel="Graded"
              primaryValue={instructorAnalytics.submissionStats.graded}
              primaryDisplay={`${instructorAnalytics.submissionStats.graded} graded`}
              secondaryLabel="Pending / Revision"
              secondaryValue={
                instructorAnalytics.submissionStats.pendingReview +
                instructorAnalytics.submissionStats.returnedForRevision
              }
              secondaryDisplay={`${
                instructorAnalytics.submissionStats.pendingReview +
                instructorAnalytics.submissionStats.returnedForRevision
              } open`}
              detailsTitle="Queue Details:"
              details={[
                {
                  label: 'Awaiting Review',
                  value: instructorAnalytics.submissionStats.pendingReview,
                },
                {
                  label: 'Needs Revision',
                  value:
                    instructorAnalytics.submissionStats.returnedForRevision,
                },
                {
                  label: 'Total Submitted',
                  value: instructorAnalytics.submissionStats.total,
                },
              ]}
            />
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent className="space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-slate-900">
                No courses created yet
              </h3>
              <p className="mx-auto max-w-md text-sm text-slate-500">
                Start building your first course with structured sections, video & text
                lessons, quizzes, and assignments.
              </p>
            </div>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Your First Course
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Card key={course._id} className="flex flex-col justify-between">
              <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  {getStatusBadge(course.status)}
                  <span className="text-sm font-semibold text-slate-900">
                    {formatCurrency(course.price)}
                  </span>
                </div>
                <div>
                  <CardTitle className="line-clamp-1 text-lg">
                    {course.title}
                  </CardTitle>
                  <p className="mt-1 text-xs font-medium text-indigo-600">
                    {course.category?.name || 'Uncategorized'} •{' '}
                    <span className="capitalize">{course.level}</span>
                  </p>
                </div>
                <CardDescription className="line-clamp-2">
                  {course.shortDescription}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {course.status === 'rejected' && course.rejectionReason ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                    <span className="font-semibold">Admin Feedback: </span>
                    {course.rejectionReason}
                  </div>
                ) : null}

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {course.totalLessonsCount} lessons
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDuration(course.estimatedDurationMinutes)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {course.enrollmentCount} students
                  </span>
                </div>
              </CardContent>

              <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                <Link
                  to={`/instructor/courses/${course._id}/edit`}
                  className="flex-1"
                >
                  <Button variant="outline" size="sm" className="w-full">
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit Curriculum
                  </Button>
                </Link>

                {(course.status === 'draft' || course.status === 'rejected') && (
                  <Button
                    size="sm"
                    onClick={() => submitReviewMutation.mutate(course._id)}
                    isLoading={submitReviewMutation.isPending}
                    title="Submit course for administrator approval"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Submit
                  </Button>
                )}

                {confirmDeleteId === course._id ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => deleteCourseMutation.mutate(course._id)}
                      isLoading={deleteCourseMutation.isPending}
                    >
                      Confirm
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDeleteId(course._id)}
                    aria-label="Delete course"
                  >
                    <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Course Creation Wizard Modal */}
      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100">
              <div>
                <CardTitle>Create New Course</CardTitle>
                <CardDescription>
                  Start as a draft and add sections & lessons in the curriculum editor
                </CardDescription>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>

            <form onSubmit={handleCreateSubmit}>
              <CardContent className="space-y-4 pt-6">
                {createError ? (
                  <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{createError}</span>
                  </div>
                ) : null}

                <Input
                  label="Course Title"
                  placeholder="e.g., Production Microservices with Node.js & TypeScript"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />

                <Input
                  label="Short Description (10–300 chars)"
                  placeholder="A concise summary displayed on course catalog cards"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  required
                />

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="course-category"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Category
                    </label>
                    <select
                      id="course-category"
                      value={categoryId || categories[0]?._id || ''}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                    >
                      {categories.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="course-level"
                      className="block text-sm font-medium text-slate-700"
                    >
                      Difficulty Level
                    </label>
                    <select
                      id="course-level"
                      value={level}
                      onChange={(e) => setLevel(e.target.value as CourseLevel)}
                      className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>

                  <Input
                    label="Price (USD, 0 = Free)"
                    type="number"
                    min="0"
                    step="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>

                <Input
                  label="Thumbnail Image URL (Optional)"
                  placeholder="https://images.unsplash.com/..."
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                />

                <Input
                  label="Tags (Comma separated)"
                  placeholder="typescript, nodejs, architecture"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />

                <div className="space-y-1.5">
                  <label
                    htmlFor="course-objectives"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Learning Objectives (One per line)
                  </label>
                  <textarea
                    id="course-objectives"
                    rows={3}
                    placeholder="Design scalable REST APIs&#10;Implement role-based access control"
                    value={objectivesInput}
                    onChange={(e) => setObjectivesInput(e.target.value)}
                    className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="course-full-description"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Full Course Description
                  </label>
                  <textarea
                    id="course-full-description"
                    rows={4}
                    placeholder="Detailed overview of the syllabus, target audience, and projects..."
                    value={fullDescription}
                    onChange={(e) => setFullDescription(e.target.value)}
                    className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </CardContent>

              <CardFooter className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  isLoading={createCourseMutation.isPending}
                >
                  Create Draft & Open Editor
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
