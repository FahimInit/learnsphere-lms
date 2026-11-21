import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
  Video,
  FileText,
  Download,
  Code,
  Bookmark,
  Save,
  Award,
} from 'lucide-react';
import { apiClient, extractErrorMessage } from '@/lib/api';
import { LessonItem, LessonType } from '@/types/course';
import { LearningWorkspacePayload } from '@/types/learning';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StudentAssessmentsPanel } from '@/features/assessments/StudentAssessmentsPanel';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

function getLessonTypeIcon(type: LessonType): React.ReactElement {
  switch (type) {
    case 'video':
      return <Video className="h-4 w-4 shrink-0" />;
    case 'text':
      return <FileText className="h-4 w-4 shrink-0" />;
    case 'resource':
      return <Download className="h-4 w-4 shrink-0" />;
    case 'embed':
      return <Code className="h-4 w-4 shrink-0" />;
  }
}

export function CoursePlayerPage(): React.ReactElement {
  const { courseId } = useParams<{ courseId: string }>();
  const queryClient = useQueryClient();

  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState('');
  const [notesSavedToast, setNotesSavedToast] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const { data: workspace, isLoading, error } = useQuery<LearningWorkspacePayload>({
    queryKey: ['learning-workspace', courseId],
    queryFn: async () => {
      const res = await apiClient.get(`/enrollments/courses/${courseId}/learn`);
      return res.data.data;
    },
    enabled: Boolean(courseId),
  });

  const flatLessons = useMemo<LessonItem[]>(() => {
    if (!workspace?.sections) return [];
    const list: LessonItem[] = [];
    for (const sec of workspace.sections) {
      for (const lesson of sec.lessons) {
        list.push(lesson);
      }
    }
    return list;
  }, [workspace]);

  // Auto-select resumeLessonId on initial load
  useEffect(() => {
    if (!activeLessonId && workspace) {
      const targetId =
        workspace.resumeLessonId || flatLessons[0]?._id || null;
      if (targetId) {
        setActiveLessonId(targetId);
      }
    }
  }, [workspace, flatLessons, activeLessonId]);

  const activeLesson = useMemo<LessonItem | null>(() => {
    if (!activeLessonId) return flatLessons[0] || null;
    return (
      flatLessons.find((l) => l._id === activeLessonId) ||
      flatLessons[0] ||
      null
    );
  }, [flatLessons, activeLessonId]);

  // Sync personal notes when switching lessons
  useEffect(() => {
    if (activeLesson && workspace) {
      const progress = workspace.progressMap[activeLesson._id];
      setNotesInput(progress?.notes || '');
      setNotesSavedToast(null);
    }
  }, [activeLesson, workspace]);

  const toggleCompletionMutation = useMutation({
    mutationFn: async ({
      lessonId,
      isCompleted,
    }: {
      lessonId: string;
      isCompleted: boolean;
    }) => {
      const res = await apiClient.post(`/progress/lessons/${lessonId}/toggle`, {
        isCompleted,
      });
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['learning-workspace', courseId],
      });
      void queryClient.invalidateQueries({ queryKey: ['my-enrollments'] });
    },
    onError: (err) => {
      setErrorBanner(extractErrorMessage(err));
    },
  });

  const saveLessonStateMutation = useMutation({
    mutationFn: async ({
      lessonId,
      notes,
    }: {
      lessonId: string;
      notes?: string;
    }) => {
      const res = await apiClient.patch(`/progress/lessons/${lessonId}/state`, {
        ...(notes !== undefined ? { notes } : {}),
      });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['learning-workspace', courseId],
      });
      if (variables.notes !== undefined) {
        setNotesSavedToast('Personal notes saved.');
      }
    },
    onError: (err) => {
      setErrorBanner(extractErrorMessage(err));
    },
  });

  const handleSelectLesson = (lessonId: string) => {
    setActiveLessonId(lessonId);
    if (workspace?.enrollment) {
      saveLessonStateMutation.mutate({ lessonId });
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl p-10 text-center text-sm text-slate-500">
        Loading learning workspace...
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">
          Unable to Open Learning Workspace
        </h2>
        <p className="text-sm text-slate-500">
          {extractErrorMessage(error) ||
            'Please ensure you are enrolled in this course.'}
        </p>
        <Link to="/courses">
          <Button variant="outline">Browse Course Catalog</Button>
        </Link>
      </div>
    );
  }

  const { course, enrollment, sections, progressMap } = workspace;
  const currentIndex = activeLesson
    ? flatLessons.findIndex((l) => l._id === activeLesson._id)
    : -1;
  const prevLesson = currentIndex > 0 ? flatLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < flatLessons.length - 1
      ? flatLessons[currentIndex + 1]
      : null;

  const isCurrentLessonCompleted = activeLesson
    ? Boolean(progressMap[activeLesson._id]?.isCompleted)
    : false;
  const progressPercentage = enrollment?.progressPercentage ?? 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-100">
      {/* Top Learning Progress Bar */}
      <div className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <span className="text-slate-300">|</span>
            <h1 className="truncate text-sm font-bold text-slate-900 sm:text-base">
              {course.title}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-2 w-32 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full transition-all ${
                    progressPercentage === 100
                      ? 'bg-emerald-600'
                      : 'bg-indigo-600'
                  }`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span className="text-xs font-bold text-slate-700">
                {progressPercentage}% Complete
              </span>
            </div>

            {progressPercentage === 100 ? (
              <Badge variant="success">
                <Award className="mr-1 h-3.5 w-3.5" />
                Course Completed
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-12">
        {/* Curriculum Sidebar */}
        <aside className="lg:col-span-4 xl:col-span-3 space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-slate-50 py-3.5">
              <CardTitle className="text-sm">Course Curriculum</CardTitle>
              <CardDescription className="text-xs">
                {enrollment?.completedLessonsCount ?? 0} of {flatLessons.length}{' '}
                lessons completed
              </CardDescription>
            </CardHeader>

            <div className="max-h-[70vh] overflow-y-auto divide-y divide-slate-100">
              {sections.map((section, secIndex) => (
                <div key={section._id}>
                  <div className="bg-slate-50/70 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                    Section {secIndex + 1}: {section.title}
                  </div>
                  <div className="divide-y divide-slate-50">
                    {section.lessons.map((lesson, lesIndex) => {
                      const isCompleted = Boolean(
                        progressMap[lesson._id]?.isCompleted
                      );
                      const isActive = activeLesson?._id === lesson._id;

                      return (
                        <button
                          key={lesson._id}
                          type="button"
                          onClick={() => handleSelectLesson(lesson._id)}
                          className={`flex w-full items-start gap-2.5 px-4 py-3 text-left text-xs transition-colors ${
                            isActive
                              ? 'bg-indigo-50/90 font-semibold text-indigo-700'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          ) : (
                            <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                          )}

                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="line-clamp-2">
                              {lesIndex + 1}. {lesson.title}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                              <span className="inline-flex items-center gap-1 capitalize">
                                {getLessonTypeIcon(lesson.type)}
                                {lesson.type}
                              </span>
                              <span>•</span>
                              <span>
                                {Math.max(
                                  1,
                                  Math.ceil(
                                    (lesson.videoDurationSeconds || 60) / 60
                                  )
                                )}
                                m
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </aside>

        {/* Lesson Viewer Area */}
        <section className="lg:col-span-8 xl:col-span-9 space-y-6">
          {errorBanner ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {errorBanner}
            </div>
          ) : null}

          {!activeLesson ? (
            <Card className="p-12 text-center text-sm text-slate-500">
              Select a lesson from the curriculum sidebar to begin learning.
            </Card>
          ) : (
            <>
              <Card className="overflow-hidden">
                <CardHeader className="flex flex-col justify-between gap-3 border-b border-slate-100 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="uppercase">
                        {activeLesson.type}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        Lesson {currentIndex + 1} of {flatLessons.length}
                      </span>
                    </div>
                    <CardTitle className="mt-1 text-xl">
                      {activeLesson.title}
                    </CardTitle>
                  </div>

                  {enrollment ? (
                    <Button
                      variant={
                        isCurrentLessonCompleted ? 'secondary' : 'primary'
                      }
                      size="sm"
                      isLoading={toggleCompletionMutation.isPending}
                      onClick={() =>
                        toggleCompletionMutation.mutate({
                          lessonId: activeLesson._id,
                          isCompleted: !isCurrentLessonCompleted,
                        })
                      }
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {isCurrentLessonCompleted
                        ? 'Completed'
                        : 'Mark as Complete'}
                    </Button>
                  ) : null}
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                  {/* Video Player */}
                  {activeLesson.type === 'video' ? (
                    <div className="overflow-hidden rounded-xl bg-slate-950 shadow-inner">
                      <video
                        key={activeLesson._id}
                        controls
                        src={
                          activeLesson.videoUrl ||
                          'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
                        }
                        className="aspect-video w-full"
                      >
                        Your browser does not support HTML5 video playback.
                      </video>
                    </div>
                  ) : null}

                  {/* Embed Viewer */}
                  {activeLesson.type === 'embed' && activeLesson.videoUrl ? (
                    <div className="aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
                      <iframe
                        src={activeLesson.videoUrl}
                        title={activeLesson.title}
                        className="h-full w-full border-0"
                        allowFullScreen
                      />
                    </div>
                  ) : null}

                  {/* Markdown / Text Content */}
                  {activeLesson.content ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-6">
                      <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">
                        Lesson Study Notes & Transcript
                      </h3>
                      <div className="whitespace-pre-line text-sm leading-relaxed text-slate-800">
                        {activeLesson.content}
                      </div>
                    </div>
                  ) : null}

                  {/* Downloadable Resources */}
                  {activeLesson.resources &&
                  activeLesson.resources.length > 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5">
                      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                        <Download className="h-4 w-4 text-indigo-600" />
                        Downloadable Resources ({activeLesson.resources.length})
                      </h3>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {activeLesson.resources.map((resItem, idx) => (
                          <a
                            key={idx}
                            href={resItem.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            download
                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-800 hover:border-indigo-400 hover:text-indigo-600"
                          >
                            <span className="truncate">{resItem.title}</span>
                            <Download className="h-3.5 w-3.5 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Previous / Next Navigation Bar */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!prevLesson}
                      onClick={() =>
                        prevLesson && handleSelectLesson(prevLesson._id)
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous Lesson
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!nextLesson}
                      onClick={() =>
                        nextLesson && handleSelectLesson(nextLesson._id)
                      }
                    >
                      Next Lesson
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Personal Lesson Notes Card */}
              {enrollment ? (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bookmark className="h-4 w-4 text-indigo-600" />
                        <CardTitle className="text-base">
                          Personal Lesson Notes
                        </CardTitle>
                      </div>
                      {notesSavedToast ? (
                        <span className="text-xs font-medium text-emerald-600">
                          {notesSavedToast}
                        </span>
                      ) : null}
                    </div>
                    <CardDescription className="text-xs">
                      Private study notes saved automatically for &ldquo;
                      {activeLesson.title}&rdquo;
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <textarea
                      rows={4}
                      placeholder="Jot down key takeaways, code snippets, or questions for this lesson..."
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                      className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={saveLessonStateMutation.isPending}
                        onClick={() =>
                          saveLessonStateMutation.mutate({
                            lessonId: activeLesson._id,
                            notes: notesInput,
                          })
                        }
                      >
                        <Save className="h-3.5 w-3.5" />
                        Save Notes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}

          <StudentAssessmentsPanel courseId={course._id} />
        </section>
      </div>
    </div>
  );
}
