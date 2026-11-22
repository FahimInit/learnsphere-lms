import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Star,
  Clock,
  Users,
  FileText,
  CheckCircle2,
  PlayCircle,
  Lock,
  BookOpen,
  AlertCircle,
  X,
} from 'lucide-react';
import { apiClient, extractErrorMessage } from '@/lib/api';
import { formatCurrency, formatDuration } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { CourseItem, LessonItem, SectionItem } from '@/types/course';
import { CourseReviewItem, EnrollmentItem } from '@/types/learning';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

export function CourseDetailsPage(): React.ReactElement {
  const { slugOrId } = useParams<{ slugOrId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [previewLesson, setPreviewLesson] = useState<LessonItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewStatus, setReviewStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const { data, isLoading, error } = useQuery<{
    course: CourseItem;
    sections: SectionItem[];
    reviews: CourseReviewItem[];
    viewerEnrollment: EnrollmentItem | null;
  }>({
    queryKey: ['course-detail', slugOrId],
    queryFn: async () => {
      const res = await apiClient.get(`/courses/${slugOrId}`);
      return res.data.data;
    },
    enabled: Boolean(slugOrId),
  });

  const enrollMutation = useMutation({
    mutationFn: async (courseId: string) => {
      let paymentReceiptToken: string | undefined;
      if (data?.course && data.course.price > 0) {
        const checkoutRes = await apiClient.post(
          `/enrollments/courses/${courseId}/checkout`
        );
        paymentReceiptToken = checkoutRes.data.data.paymentReceiptToken;
      }
      const res = await apiClient.post(`/enrollments/courses/${courseId}`, {
        ...(paymentReceiptToken ? { paymentReceiptToken } : {}),
      });
      return res.data.data.enrollment as EnrollmentItem;
    },
    onSuccess: (_enrollment, courseId) => {
      void queryClient.invalidateQueries({ queryKey: ['course-detail', slugOrId] });
      void queryClient.invalidateQueries({ queryKey: ['my-enrollments'] });
      navigate(`/learn/${courseId}`);
    },
    onError: (err) => {
      setActionError(extractErrorMessage(err));
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const res = await apiClient.post(`/courses/${courseId}/reviews`, {
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      return res.data;
    },
    onSuccess: () => {
      setReviewComment('');
      setReviewStatus({
        type: 'success',
        message: 'Thank you! Your review has been published.',
      });
      void queryClient.invalidateQueries({ queryKey: ['course-detail', slugOrId] });
    },
    onError: (err) => {
      setReviewStatus({
        type: 'error',
        message: extractErrorMessage(err),
      });
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <div className="grid gap-8 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data?.course) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-900">Course Not Found</h2>
        <p className="text-sm text-slate-500">
          This course may not exist or is not currently published.
        </p>
        <Link to="/courses">
          <Button variant="outline">Back to Catalog</Button>
        </Link>
      </div>
    );
  }

  const { course, sections, reviews = [], viewerEnrollment } = data;
  const isOwnerOrAdmin =
    user?.role === 'admin' || user?.id === course.instructor?._id;
  const isEnrolled = Boolean(viewerEnrollment);

  const handleEnrollClick = () => {
    if (!user) {
      navigate('/login', { state: { from: `/courses/${slugOrId}` } });
      return;
    }
    setActionError(null);
    enrollMutation.mutate(course._id);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-10 sm:px-6 lg:px-8">
      {/* Top Course Hero & Enrollment Card */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="default">{course.category?.name || 'General'}</Badge>
            <Badge variant="outline" className="capitalize">
              {course.level}
            </Badge>
            {course.tags?.map((tag) => (
              <Badge key={tag} variant="secondary">
                #{tag}
              </Badge>
            ))}
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            {course.title}
          </h1>

          <p className="text-base text-slate-600 leading-relaxed">
            {course.shortDescription}
          </p>

          <div className="flex flex-wrap items-center gap-5 text-sm text-slate-600">
            <span className="flex items-center gap-1.5 font-semibold text-amber-600">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {course.averageRating > 0 ? course.averageRating.toFixed(1) : 'New'}
              <span className="font-normal text-slate-500">
                ({course.reviewCount} reviews)
              </span>
            </span>

            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4 text-slate-400" />
              {course.enrollmentCount} enrolled students
            </span>

            <span className="flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-slate-400" />
              {course.totalLessonsCount} lessons
            </span>

            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-400" />
              {formatDuration(course.estimatedDurationMinutes)}
            </span>
          </div>

          <div className="flex items-center gap-3 border-t border-slate-200 pt-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
              {(course.instructor?.name || 'I')[0].toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Created by {course.instructor?.name || 'LearnSphere Instructor'}
              </p>
              {course.instructor?.headline ? (
                <p className="text-xs text-slate-500">
                  {course.instructor.headline}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Sticky Enrollment Card */}
        <div>
          <Card className="border-slate-200 shadow-md">
            <CardHeader className="space-y-2 border-b border-slate-100">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-bold text-slate-900">
                  {formatCurrency(course.price)}
                </span>
                <Badge variant="success">Full Lifetime Access</Badge>
              </div>
              <CardDescription>
                Includes {course.totalLessonsCount} structured lessons, quizzes,
                assignments, and completion certificate
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-6">
              {actionError ? (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              ) : null}

              {isEnrolled && viewerEnrollment ? (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-700">
                      <span>Your Progress</span>
                      <span>{viewerEnrollment.progressPercentage}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full bg-indigo-600 transition-all"
                        style={{
                          width: `${viewerEnrollment.progressPercentage}%`,
                        }}
                      />
                    </div>
                  </div>
                  <Link to={`/learn/${course._id}`} className="block">
                    <Button className="w-full" size="lg">
                      <PlayCircle className="h-4 w-4" />
                      {viewerEnrollment.progressPercentage > 0
                        ? 'Resume Learning'
                        : 'Start Learning'}
                    </Button>
                  </Link>
                </div>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleEnrollClick}
                  isLoading={enrollMutation.isPending}
                >
                  {course.price === 0
                    ? 'Enroll for Free'
                    : `Enroll Now • ${formatCurrency(course.price)}`}
                </Button>
              )}

              {isOwnerOrAdmin ? (
                <div className="flex gap-2 pt-2">
                  <Link to={`/learn/${course._id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Preview Player
                    </Button>
                  </Link>
                  <Link
                    to={`/instructor/courses/${course._id}/edit`}
                    className="flex-1"
                  >
                    <Button variant="outline" size="sm" className="w-full">
                      Edit Studio
                    </Button>
                  </Link>
                </div>
              ) : null}

              <ul className="space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Self-paced lessons with auto-resume tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Interactive quizzes & instructor-graded assignments
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Verifiable completion certificate upon 100% progress
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Objectives, Description & Curriculum */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {course.learningObjectives && course.learningObjectives.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>What You Will Learn</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {course.learningObjectives.map((obj, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 text-sm text-slate-700"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                      <span>{obj}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {course.fullDescription ? (
            <Card>
              <CardHeader>
                <CardTitle>Course Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                  {course.fullDescription}
                </p>
              </CardContent>
            </Card>
          ) : null}

          {/* Curriculum Breakdown */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                Course Curriculum
              </h2>
              <span className="text-xs font-medium text-slate-500">
                {sections.length} sections • {course.totalLessonsCount} lessons
              </span>
            </div>

            {sections.length === 0 ? (
              <Card className="p-6 text-center text-sm text-slate-500">
                Curriculum modules are currently being prepared by the instructor.
              </Card>
            ) : (
              <div className="space-y-3">
                {sections.map((section, secIndex) => (
                  <Card key={section._id}>
                    <CardHeader className="border-b border-slate-100 bg-slate-50/70 py-3.5">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          Section {secIndex + 1}: {section.title}
                        </CardTitle>
                        <span className="text-xs text-slate-500">
                          {section.lessons.length} lessons
                        </span>
                      </div>
                      {section.description ? (
                        <CardDescription className="text-xs">
                          {section.description}
                        </CardDescription>
                      ) : null}
                    </CardHeader>
                    <CardContent className="divide-y divide-slate-100 p-0">
                      {section.lessons.map((lesson, lesIndex) => (
                        <div
                          key={lesson._id}
                          className="flex items-center justify-between px-5 py-3 text-sm"
                        >
                          <div className="flex items-center gap-3">
                            {lesson.isPreview || isEnrolled ? (
                              <PlayCircle className="h-4 w-4 text-indigo-600" />
                            ) : (
                              <Lock className="h-4 w-4 text-slate-400" />
                            )}
                            <span className="font-medium text-slate-800">
                              {lesIndex + 1}. {lesson.title}
                            </span>
                            <Badge variant="outline" className="uppercase">
                              {lesson.type}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3">
                            {lesson.isPreview ? (
                              <button
                                type="button"
                                onClick={() => setPreviewLesson(lesson)}
                                className="text-xs font-semibold text-indigo-600 hover:underline"
                              >
                                Free Preview
                              </button>
                            ) : null}
                            <span className="text-xs text-slate-400">
                              {Math.max(
                                1,
                                Math.ceil((lesson.videoDurationSeconds || 60) / 60)
                              )}{' '}
                              min
                            </span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Student Reviews Section */}
          <div className="space-y-4 pt-4">
            <h2 className="text-xl font-bold text-slate-900">
              Student Reviews ({course.reviewCount})
            </h2>

            {isEnrolled ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Rate & Review This Course
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {reviewStatus ? (
                    <div
                      className={`rounded-lg border p-3 text-xs ${
                        reviewStatus.type === 'success'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-red-200 bg-red-50 text-red-700'
                      }`}
                    >
                      {reviewStatus.message}
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-700">
                      Rating:
                    </span>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="p-1"
                        aria-label={`Rate ${star} stars`}
                      >
                        <Star
                          className={`h-5 w-5 ${
                            star <= reviewRating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={3}
                    placeholder="Share your learning experience with this course..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />

                  <Button
                    size="sm"
                    disabled={reviewComment.trim().length < 3}
                    isLoading={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate(course._id)}
                  >
                    Submit Review
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {reviews.length === 0 ? (
              <Card className="p-6 text-center text-sm text-slate-500">
                No student reviews yet. Enroll to be the first to review!
              </Card>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <Card key={rev._id}>
                    <CardContent className="pt-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-900">
                          {rev.student?.name || 'Enrolled Student'}
                        </span>
                        <div className="flex items-center gap-1 text-amber-500">
                          {Array.from({ length: rev.rating }).map((_, idx) => (
                            <Star
                              key={idx}
                              className="h-3.5 w-3.5 fill-amber-400"
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600">{rev.comment}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Prerequisites & Instructor Bio */}
        <div className="space-y-6">
          {course.prerequisites && course.prerequisites.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Prerequisites</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1.5 pl-4 text-xs text-slate-600">
                  {course.prerequisites.map((reqItem, i) => (
                    <li key={i}>{reqItem}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">About the Instructor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">
                {course.instructor?.name || 'LearnSphere Instructor'}
              </p>
              {course.instructor?.headline ? (
                <p className="text-xs font-medium text-indigo-600">
                  {course.instructor.headline}
                </p>
              ) : null}
              <p className="text-xs leading-relaxed text-slate-600">
                {course.instructor?.bio ||
                  'Experienced software practitioner dedicated to practical, project-based engineering education.'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Free Preview Lesson Modal */}
      {previewLesson ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100">
              <div>
                <Badge variant="success" className="mb-1">
                  Free Preview Lesson
                </Badge>
                <CardTitle>{previewLesson.title}</CardTitle>
              </div>
              <button
                type="button"
                onClick={() => setPreviewLesson(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {previewLesson.videoUrl ? (
                <div className="overflow-hidden rounded-xl bg-slate-950">
                  <video
                    controls
                    src={previewLesson.videoUrl}
                    className="aspect-video w-full"
                  >
                    Your browser does not support HTML5 video playback.
                  </video>
                </div>
              ) : null}
              {previewLesson.content ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 whitespace-pre-line text-sm text-slate-800">
                  {previewLesson.content}
                </div>
              ) : null}
              {!previewLesson.videoUrl && !previewLesson.content ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <BookOpen className="h-4 w-4" />
                  <span>Enroll in the course to access full interactive resources.</span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
