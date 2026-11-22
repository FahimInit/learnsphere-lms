import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit3,
  Video,
  FileText,
  Download,
  Code,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
} from 'lucide-react';
import { apiClient, extractErrorMessage } from '@/lib/api';
import {
  CategoryItem,
  CourseItem,
  CourseLevel,
  LessonItem,
  LessonResourceItem,
  LessonType,
  SectionItem,
} from '@/types/course';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { InstructorAssessmentsPanel } from '@/features/assessments/InstructorAssessmentsPanel';
import { CourseCommunityPanel } from '@/features/discussions/CourseCommunityPanel';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

function getLessonIcon(type: LessonType): React.ReactElement {
  switch (type) {
    case 'video':
      return <Video className="h-4 w-4 text-indigo-600" />;
    case 'text':
      return <FileText className="h-4 w-4 text-emerald-600" />;
    case 'resource':
      return <Download className="h-4 w-4 text-amber-600" />;
    case 'embed':
      return <Code className="h-4 w-4 text-purple-600" />;
  }
}

export function CourseEditorPage(): React.ReactElement {
  const { courseId } = useParams<{ courseId: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'curriculum' | 'assessments' | 'community' | 'settings'>('curriculum');
  const [statusBanner, setStatusBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // New section input
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionDesc, setNewSectionDesc] = useState('');

  // Lesson modal state
  const [lessonModal, setLessonModal] = useState<{
    sectionId: string;
    editingLesson?: LessonItem;
  } | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonType, setLessonType] = useState<LessonType>('video');
  const [lessonVideoUrl, setLessonVideoUrl] = useState('');
  const [lessonDurationSec, setLessonDurationSec] = useState('300');
  const [lessonContent, setLessonContent] = useState('');
  const [lessonIsPreview, setLessonIsPreview] = useState(false);
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceUrl, setResourceUrl] = useState('');
  const [lessonResources, setLessonResources] = useState<LessonResourceItem[]>([]);

  // Course metadata state
  const [metaTitle, setMetaTitle] = useState('');
  const [metaShortDesc, setMetaShortDesc] = useState('');
  const [metaFullDesc, setMetaFullDesc] = useState('');
  const [metaCategory, setMetaCategory] = useState('');
  const [metaLevel, setMetaLevel] = useState<CourseLevel>('beginner');
  const [metaPrice, setMetaPrice] = useState('0');
  const [metaThumbnail, setMetaThumbnail] = useState('');
  const [metaTags, setMetaTags] = useState('');
  const [metaObjectives, setMetaObjectives] = useState('');
  const [metaPrerequisites, setMetaPrerequisites] = useState('');

  const { data: categories = [] } = useQuery<CategoryItem[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await apiClient.get('/categories');
      return res.data.data.categories;
    },
  });

  const { data: editorData, isLoading } = useQuery<{
    course: CourseItem;
    sections: SectionItem[];
  }>({
    queryKey: ['course-editor', courseId],
    queryFn: async () => {
      const res = await apiClient.get(`/courses/${courseId}/editor`);
      return res.data.data;
    },
    enabled: Boolean(courseId),
  });

  useEffect(() => {
    if (editorData?.course) {
      const c = editorData.course;
      setMetaTitle(c.title);
      setMetaShortDesc(c.shortDescription);
      setMetaFullDesc(c.fullDescription || '');
      setMetaCategory(c.category?._id || '');
      setMetaLevel(c.level);
      setMetaPrice(String(c.price ?? 0));
      setMetaThumbnail(c.thumbnailUrl || '');
      setMetaTags((c.tags || []).join(', '));
      setMetaObjectives((c.learningObjectives || []).join('\n'));
      setMetaPrerequisites((c.prerequisites || []).join('\n'));
    }
  }, [editorData]);

  const invalidateEditor = () => {
    void queryClient.invalidateQueries({ queryKey: ['course-editor', courseId] });
    void queryClient.invalidateQueries({ queryKey: ['instructor-courses'] });
  };

  const updateMetadataMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.patch(`/courses/${courseId}`, {
        title: metaTitle.trim(),
        shortDescription: metaShortDesc.trim(),
        fullDescription: metaFullDesc.trim(),
        category: metaCategory,
        level: metaLevel,
        price: Number(metaPrice) || 0,
        thumbnailUrl: metaThumbnail.trim(),
        tags: metaTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        learningObjectives: metaObjectives
          .split('\n')
          .map((o) => o.trim())
          .filter(Boolean),
        prerequisites: metaPrerequisites
          .split('\n')
          .map((p) => p.trim())
          .filter(Boolean),
      });
      return res.data;
    },
    onSuccess: () => {
      invalidateEditor();
      setStatusBanner({
        type: 'success',
        message: 'Course settings saved successfully.',
      });
    },
    onError: (err) => {
      setStatusBanner({ type: 'error', message: extractErrorMessage(err) });
    },
  });

  const addSectionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/courses/${courseId}/sections`, {
        title: newSectionTitle.trim(),
        description: newSectionDesc.trim(),
      });
      return res.data;
    },
    onSuccess: () => {
      setNewSectionTitle('');
      setNewSectionDesc('');
      invalidateEditor();
      setStatusBanner({ type: 'success', message: 'Section added to curriculum.' });
    },
    onError: (err) => {
      setStatusBanner({ type: 'error', message: extractErrorMessage(err) });
    },
  });

  const deleteSectionMutation = useMutation({
    mutationFn: async (sectionId: string) => {
      await apiClient.delete(`/courses/${courseId}/sections/${sectionId}`);
    },
    onSuccess: () => {
      invalidateEditor();
      setStatusBanner({ type: 'success', message: 'Section removed.' });
    },
    onError: (err) => {
      setStatusBanner({ type: 'error', message: extractErrorMessage(err) });
    },
  });

  const reorderSectionsMutation = useMutation({
    mutationFn: async (orderedSectionIds: string[]) => {
      await apiClient.patch(`/courses/${courseId}/sections/reorder`, {
        orderedSectionIds,
      });
    },
    onSuccess: () => {
      invalidateEditor();
    },
  });

  const saveLessonMutation = useMutation({
    mutationFn: async () => {
      if (!lessonModal) return;
      const payload = {
        title: lessonTitle.trim(),
        type: lessonType,
        videoUrl: lessonVideoUrl.trim(),
        videoDurationSeconds: Number(lessonDurationSec) || 0,
        content: lessonContent,
        resources: lessonResources,
        isPreview: lessonIsPreview,
      };

      if (lessonModal.editingLesson) {
        await apiClient.patch(
          `/courses/${courseId}/lessons/${lessonModal.editingLesson._id}`,
          payload
        );
      } else {
        await apiClient.post(
          `/courses/${courseId}/sections/${lessonModal.sectionId}/lessons`,
          payload
        );
      }
    },
    onSuccess: () => {
      setLessonModal(null);
      invalidateEditor();
      setStatusBanner({ type: 'success', message: 'Lesson saved to curriculum.' });
    },
    onError: (err) => {
      setStatusBanner({ type: 'error', message: extractErrorMessage(err) });
    },
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      await apiClient.delete(`/courses/${courseId}/lessons/${lessonId}`);
    },
    onSuccess: () => {
      invalidateEditor();
      setStatusBanner({ type: 'success', message: 'Lesson deleted.' });
    },
  });

  const reorderLessonsMutation = useMutation({
    mutationFn: async ({
      sectionId,
      orderedLessonIds,
    }: {
      sectionId: string;
      orderedLessonIds: string[];
    }) => {
      await apiClient.patch(
        `/courses/${courseId}/sections/${sectionId}/lessons/reorder`,
        { orderedLessonIds }
      );
    },
    onSuccess: () => {
      invalidateEditor();
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/courses/${courseId}/submit-review`);
      return res.data;
    },
    onSuccess: () => {
      invalidateEditor();
      setStatusBanner({
        type: 'success',
        message: 'Course submitted for administrator review!',
      });
    },
    onError: (err) => {
      setStatusBanner({ type: 'error', message: extractErrorMessage(err) });
    },
  });

  const openAddLessonModal = (sectionId: string) => {
    setLessonTitle('');
    setLessonType('video');
    setLessonVideoUrl('');
    setLessonDurationSec('300');
    setLessonContent('');
    setLessonIsPreview(false);
    setLessonResources([]);
    setResourceTitle('');
    setResourceUrl('');
    setLessonModal({ sectionId });
  };

  const openEditLessonModal = (sectionId: string, lesson: LessonItem) => {
    setLessonTitle(lesson.title);
    setLessonType(lesson.type);
    setLessonVideoUrl(lesson.videoUrl || '');
    setLessonDurationSec(String(lesson.videoDurationSeconds || 0));
    setLessonContent(lesson.content || '');
    setLessonIsPreview(lesson.isPreview);
    setLessonResources(lesson.resources || []);
    setResourceTitle('');
    setResourceUrl('');
    setLessonModal({ sectionId, editingLesson: lesson });
  };

  const handleMoveSection = (index: number, direction: -1 | 1) => {
    if (!editorData) return;
    const ids = editorData.sections.map((s) => s._id);
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= ids.length) return;
    const swapped = [...ids];
    [swapped[index], swapped[targetIndex]] = [swapped[targetIndex], swapped[index]];
    reorderSectionsMutation.mutate(swapped);
  };

  const handleMoveLesson = (
    section: SectionItem,
    lessonIndex: number,
    direction: -1 | 1
  ) => {
    const ids = section.lessons.map((l) => l._id);
    const targetIndex = lessonIndex + direction;
    if (targetIndex < 0 || targetIndex >= ids.length) return;
    const swapped = [...ids];
    [swapped[lessonIndex], swapped[targetIndex]] = [
      swapped[targetIndex],
      swapped[lessonIndex],
    ];
    reorderLessonsMutation.mutate({
      sectionId: section._id,
      orderedLessonIds: swapped,
    });
  };

  const handleAddResourceItem = () => {
    if (!resourceTitle.trim() || !resourceUrl.trim()) return;
    setLessonResources((prev) => [
      ...prev,
      {
        title: resourceTitle.trim(),
        fileUrl: resourceUrl.trim(),
        fileSize: 0,
        mimeType: 'application/octet-stream',
      },
    ]);
    setResourceTitle('');
    setResourceUrl('');
  };

  if (isLoading || !editorData) {
    return (
      <div className="mx-auto max-w-6xl p-8 text-center text-slate-500">
        Loading course studio...
      </div>
    );
  }

  const { course, sections } = editorData;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <Link
            to="/instructor"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Instructor Studio
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {course.title}
            </h1>
            <Badge
              variant={
                course.status === 'published'
                  ? 'success'
                  : course.status === 'pending_review'
                  ? 'warning'
                  : course.status === 'rejected'
                  ? 'danger'
                  : 'secondary'
              }
              className="capitalize"
            >
              {course.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            {sections.length} sections • {course.totalLessonsCount} lessons
          </p>
        </div>

        <div className="flex items-center gap-3">
          {(course.status === 'draft' || course.status === 'rejected') && (
            <Button
              onClick={() => submitReviewMutation.mutate()}
              isLoading={submitReviewMutation.isPending}
            >
              <Send className="h-4 w-4" />
              Submit for Review
            </Button>
          )}
        </div>
      </div>

      {statusBanner ? (
        <div
          className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
            statusBanner.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{statusBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-xs underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('curriculum')}
          className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'curriculum'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Curriculum Builder ({sections.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('assessments')}
          className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'assessments'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Assessments &amp; Grading
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('community')}
          className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'community'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Community &amp; Announcements
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'settings'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Course Details &amp; Metadata
        </button>
      </div>

      {activeTab === 'curriculum' ? (
        <div className="space-y-6">
          {/* Add New Section Form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Add Course Section / Module</CardTitle>
              <CardDescription>
                Group related lessons into logical learning modules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newSectionTitle.trim().length < 2) return;
                  addSectionMutation.mutate();
                }}
                className="flex flex-col gap-3 sm:flex-row sm:items-end"
              >
                <div className="flex-1">
                  <Input
                    label="Section Title"
                    placeholder="e.g., Module 1: System Architecture & Fundamentals"
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    label="Objective / Summary (Optional)"
                    placeholder="Core concepts covered in this module"
                    value={newSectionDesc}
                    onChange={(e) => setNewSectionDesc(e.target.value)}
                  />
                </div>
                <Button type="submit" isLoading={addSectionMutation.isPending}>
                  <Plus className="h-4 w-4" />
                  Add Section
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Sections & Lessons List */}
          {sections.length === 0 ? (
            <Card className="py-10 text-center text-sm text-slate-500">
              No sections added yet. Create your first section above to start adding
              lessons.
            </Card>
          ) : (
            <div className="space-y-4">
              {sections.map((section, secIndex) => (
                <Card key={section._id}>
                  <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/70 py-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                          Section {secIndex + 1}
                        </span>
                        <CardTitle className="text-base">{section.title}</CardTitle>
                      </div>
                      {section.description ? (
                        <CardDescription className="mt-0.5 text-xs">
                          {section.description}
                        </CardDescription>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={secIndex === 0}
                        onClick={() => handleMoveSection(secIndex, -1)}
                        title="Move section up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={secIndex === sections.length - 1}
                        onClick={() => handleMoveSection(secIndex, 1)}
                        title="Move section down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAddLessonModal(section._id)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Lesson
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSectionMutation.mutate(section._id)}
                        title="Delete section"
                      >
                        <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="divide-y divide-slate-100 p-0">
                    {section.lessons.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No lessons in this section yet. Click &ldquo;Add Lesson&rdquo; to
                        author video, text, or downloadable resource content.
                      </div>
                    ) : (
                      section.lessons.map((lesson, lesIndex) => (
                        <div
                          key={lesson._id}
                          className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50/80"
                        >
                          <div className="flex items-center gap-3">
                            {getLessonIcon(lesson.type)}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-900">
                                  {lesIndex + 1}. {lesson.title}
                                </span>
                                <Badge variant="outline" className="uppercase">
                                  {lesson.type}
                                </Badge>
                                {lesson.isPreview ? (
                                  <Badge variant="success">
                                    <Eye className="mr-1 h-3 w-3" />
                                    Free Preview
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="text-xs text-slate-500">
                                {Math.ceil((lesson.videoDurationSeconds || 0) / 60)} min
                                {lesson.resources && lesson.resources.length > 0
                                  ? ` • ${lesson.resources.length} resource(s)`
                                  : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={lesIndex === 0}
                              onClick={() =>
                                handleMoveLesson(section, lesIndex, -1)
                              }
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={lesIndex === section.lessons.length - 1}
                              onClick={() =>
                                handleMoveLesson(section, lesIndex, 1)
                              }
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                openEditLessonModal(section._id, lesson)
                              }
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteLessonMutation.mutate(lesson._id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-600" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'assessments' ? (
        <InstructorAssessmentsPanel courseId={course._id} />
      ) : activeTab === 'community' ? (
        <CourseCommunityPanel courseId={course._id} canManage />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Course Metadata & Configuration</CardTitle>
            <CardDescription>
              Update course title, description, pricing, category, and learning
              objectives
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Course Title"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
            />
            <Input
              label="Short Description"
              value={metaShortDesc}
              onChange={(e) => setMetaShortDesc(e.target.value)}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Category
                </label>
                <select
                  value={metaCategory}
                  onChange={(e) => setMetaCategory(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Level
                </label>
                <select
                  value={metaLevel}
                  onChange={(e) => setMetaLevel(e.target.value as CourseLevel)}
                  className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <Input
                label="Price (USD)"
                type="number"
                min="0"
                value={metaPrice}
                onChange={(e) => setMetaPrice(e.target.value)}
              />
            </div>
            <Input
              label="Thumbnail URL"
              value={metaThumbnail}
              onChange={(e) => setMetaThumbnail(e.target.value)}
            />
            <Input
              label="Tags (Comma separated)"
              value={metaTags}
              onChange={(e) => setMetaTags(e.target.value)}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Learning Objectives (One per line)
              </label>
              <textarea
                rows={4}
                value={metaObjectives}
                onChange={(e) => setMetaObjectives(e.target.value)}
                className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Prerequisites (One per line)
              </label>
              <textarea
                rows={3}
                value={metaPrerequisites}
                onChange={(e) => setMetaPrerequisites(e.target.value)}
                className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">
                Full Description
              </label>
              <textarea
                rows={5}
                value={metaFullDesc}
                onChange={(e) => setMetaFullDesc(e.target.value)}
                className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
          </CardContent>
          <CardFooter className="border-t border-slate-100 pt-4">
            <Button
              onClick={() => updateMetadataMutation.mutate()}
              isLoading={updateMetadataMutation.isPending}
            >
              <Save className="h-4 w-4" />
              Save Course Settings
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Add / Edit Lesson Modal */}
      {lessonModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100">
              <div>
                <CardTitle>
                  {lessonModal.editingLesson ? 'Edit Lesson' : 'Add New Lesson'}
                </CardTitle>
                <CardDescription>
                  Configure video stream, text/markdown notes, or downloadable resources
                </CardDescription>
              </div>
              <button
                type="button"
                onClick={() => setLessonModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>

            <CardContent className="space-y-4 pt-6">
              <Input
                label="Lesson Title"
                placeholder="e.g., Understanding Event-Driven Architecture"
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">
                    Lesson Type
                  </label>
                  <select
                    value={lessonType}
                    onChange={(e) => setLessonType(e.target.value as LessonType)}
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="video">Video Lesson</option>
                    <option value="text">Text / Article Lesson</option>
                    <option value="resource">Downloadable Resource Lesson</option>
                    <option value="embed">Embedded Interactive Content</option>
                  </select>
                </div>

                <Input
                  label="Estimated Duration (Seconds)"
                  type="number"
                  min="0"
                  value={lessonDurationSec}
                  onChange={(e) => setLessonDurationSec(e.target.value)}
                />
              </div>

              {(lessonType === 'video' || lessonType === 'embed') && (
                <Input
                  label={
                    lessonType === 'video'
                      ? 'Video Stream / MP4 URL'
                      : 'Embed Source URL'
                  }
                  placeholder="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
                  value={lessonVideoUrl}
                  onChange={(e) => setLessonVideoUrl(e.target.value)}
                />
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Lesson Content / Transcript (Markdown supported)
                </label>
                <textarea
                  rows={5}
                  placeholder="Write detailed lesson notes, code snippets, or instructions..."
                  value={lessonContent}
                  onChange={(e) => setLessonContent(e.target.value)}
                  className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
                />
              </div>

              {/* Downloadable Resources Attachment */}
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Downloadable Lesson Resources ({lessonResources.length})
                </p>
                {lessonResources.map((resItem, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded bg-white px-3 py-1.5 text-xs shadow-sm"
                  >
                    <span className="font-medium text-slate-800">
                      {resItem.title} ({resItem.fileUrl})
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setLessonResources((prev) =>
                          prev.filter((_, i) => i !== idx)
                        )
                      }
                      className="text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                  <Input
                    placeholder="Resource title (e.g., Slides PDF)"
                    value={resourceTitle}
                    onChange={(e) => setResourceTitle(e.target.value)}
                  />
                  <Input
                    placeholder="File URL (e.g., /uploads/slides.pdf)"
                    value={resourceUrl}
                    onChange={(e) => setResourceUrl(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddResourceItem}
                  >
                    Add
                  </Button>
                </div>
              </div>

              <label className="flex items-center gap-2.5 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={lessonIsPreview}
                  onChange={(e) => setLessonIsPreview(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Allow Free Preview (Unenrolled visitors can watch/read this lesson)
              </label>
            </CardContent>

            <CardFooter className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setLessonModal(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => saveLessonMutation.mutate()}
                isLoading={saveLessonMutation.isPending}
              >
                Save Lesson
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
