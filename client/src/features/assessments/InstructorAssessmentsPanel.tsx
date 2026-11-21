import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  ClipboardCheck,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Award,
  Send,
} from 'lucide-react';
import { apiClient, extractErrorMessage } from '@/lib/api';
import {
  AssignmentItem,
  QuestionItem,
  QuestionType,
  QuizItem,
  SubmissionItem,
} from '@/types/assessment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

export function InstructorAssessmentsPanel({
  courseId,
}: {
  courseId: string;
}): React.ReactElement {
  const queryClient = useQueryClient();
  const [banner, setBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Quiz creator state
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDesc, setQuizDesc] = useState('');
  const [quizTimeLimit, setQuizTimeLimit] = useState('15');
  const [quizMaxAttempts, setQuizMaxAttempts] = useState('3');
  const [quizPassScore, setQuizPassScore] = useState('70');
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);

  // New question state
  const [qType, setQType] = useState<QuestionType>('mcq');
  const [qPrompt, setQPrompt] = useState('');
  const [qPoints, setQPoints] = useState('1');
  const [qExplanation, setQExplanation] = useState('');
  const [qOptions, setQOptions] = useState([
    { id: 'a', text: '' },
    { id: 'b', text: '' },
    { id: 'c', text: '' },
    { id: 'd', text: '' },
  ]);
  const [qCorrectIds, setQCorrectIds] = useState<string[]>(['a']);

  // Assignment creator state
  const [assignTitle, setAssignTitle] = useState('');
  const [assignInstructions, setAssignInstructions] = useState('');
  const [assignMaxScore, setAssignMaxScore] = useState('100');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignMaxResub, setAssignMaxResub] = useState('3');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(
    null
  );

  // Grading draft state keyed by submissionId
  const [gradeInputs, setGradeInputs] = useState<
    Record<string, { grade: string; feedback: string; status: 'graded' | 'returned_for_revision' }>
  >({});

  const { data: quizzes = [] } = useQuery<QuizItem[]>({
    queryKey: ['course-quizzes', courseId],
    queryFn: async () => {
      const res = await apiClient.get(`/quizzes/course/${courseId}`);
      return res.data.data.quizzes;
    },
  });

  const { data: expandedQuizData } = useQuery<{
    quiz: QuizItem;
    questions: QuestionItem[];
  }>({
    queryKey: ['quiz-detail', expandedQuizId],
    queryFn: async () => {
      const res = await apiClient.get(`/quizzes/${expandedQuizId}`);
      return res.data.data;
    },
    enabled: Boolean(expandedQuizId),
  });

  const { data: assignments = [] } = useQuery<AssignmentItem[]>({
    queryKey: ['course-assignments', courseId],
    queryFn: async () => {
      const res = await apiClient.get(`/assignments/course/${courseId}`);
      return res.data.data.assignments;
    },
  });

  const { data: submissions = [] } = useQuery<SubmissionItem[]>({
    queryKey: ['assignment-submissions', selectedAssignmentId],
    queryFn: async () => {
      const res = await apiClient.get(
        `/submissions/assignments/${selectedAssignmentId}`
      );
      return res.data.data.submissions;
    },
    enabled: Boolean(selectedAssignmentId),
  });

  const createQuizMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/quizzes', {
        courseId,
        title: quizTitle.trim(),
        description: quizDesc.trim(),
        timeLimitMinutes: quizTimeLimit ? Number(quizTimeLimit) : null,
        maxAttempts: Number(quizMaxAttempts) || 3,
        passingScorePercentage: Number(quizPassScore) || 70,
      });
      return res.data.data.quiz as QuizItem;
    },
    onSuccess: (created) => {
      setQuizTitle('');
      setQuizDesc('');
      setExpandedQuizId(created._id);
      void queryClient.invalidateQueries({ queryKey: ['course-quizzes', courseId] });
      setBanner({ type: 'success', message: 'Quiz created. Now add questions below.' });
    },
    onError: (err) => {
      setBanner({ type: 'error', message: extractErrorMessage(err) });
    },
  });

  const deleteQuizMutation = useMutation({
    mutationFn: async (quizId: string) => {
      await apiClient.delete(`/quizzes/${quizId}`);
    },
    onSuccess: () => {
      setExpandedQuizId(null);
      void queryClient.invalidateQueries({ queryKey: ['course-quizzes', courseId] });
      setBanner({ type: 'success', message: 'Quiz deleted.' });
    },
  });

  const addQuestionMutation = useMutation({
    mutationFn: async (quizId: string) => {
      const effectiveOptions =
        qType === 'true_false'
          ? [
              { id: 'true', text: 'True' },
              { id: 'false', text: 'False' },
            ]
          : qOptions.filter((o) => o.text.trim().length > 0);

      const res = await apiClient.post(`/quizzes/${quizId}/questions`, {
        type: qType,
        prompt: qPrompt.trim(),
        options: effectiveOptions,
        correctOptionIds: qCorrectIds,
        points: Number(qPoints) || 1,
        explanation: qExplanation.trim(),
      });
      return res.data;
    },
    onSuccess: () => {
      setQPrompt('');
      setQExplanation('');
      setQOptions([
        { id: 'a', text: '' },
        { id: 'b', text: '' },
        { id: 'c', text: '' },
        { id: 'd', text: '' },
      ]);
      setQCorrectIds(qType === 'true_false' ? ['true'] : ['a']);
      void queryClient.invalidateQueries({ queryKey: ['quiz-detail', expandedQuizId] });
      void queryClient.invalidateQueries({ queryKey: ['course-quizzes', courseId] });
      setBanner({ type: 'success', message: 'Question added to quiz.' });
    },
    onError: (err) => {
      setBanner({ type: 'error', message: extractErrorMessage(err) });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async ({
      quizId,
      questionId,
    }: {
      quizId: string;
      questionId: string;
    }) => {
      await apiClient.delete(`/quizzes/${quizId}/questions/${questionId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['quiz-detail', expandedQuizId] });
      void queryClient.invalidateQueries({ queryKey: ['course-quizzes', courseId] });
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/assignments', {
        courseId,
        title: assignTitle.trim(),
        instructions: assignInstructions.trim(),
        maxScore: Number(assignMaxScore) || 100,
        dueDate: assignDueDate ? new Date(assignDueDate).toISOString() : null,
        allowResubmission: true,
        maxResubmissions: Number(assignMaxResub) || 3,
      });
      return res.data;
    },
    onSuccess: () => {
      setAssignTitle('');
      setAssignInstructions('');
      setAssignDueDate('');
      void queryClient.invalidateQueries({
        queryKey: ['course-assignments', courseId],
      });
      setBanner({ type: 'success', message: 'Assignment published to course.' });
    },
    onError: (err) => {
      setBanner({ type: 'error', message: extractErrorMessage(err) });
    },
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      await apiClient.delete(`/assignments/${assignmentId}`);
    },
    onSuccess: () => {
      setSelectedAssignmentId(null);
      void queryClient.invalidateQueries({
        queryKey: ['course-assignments', courseId],
      });
    },
  });

  const gradeSubmissionMutation = useMutation({
    mutationFn: async (submissionId: string) => {
      const draft = gradeInputs[submissionId] || {
        grade: '100',
        feedback: '',
        status: 'graded' as const,
      };
      const res = await apiClient.patch(`/submissions/${submissionId}/grade`, {
        grade: Number(draft.grade),
        feedback: draft.feedback,
        status: draft.status,
      });
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['assignment-submissions', selectedAssignmentId],
      });
      setBanner({
        type: 'success',
        message: 'Submission grade & feedback saved.',
      });
    },
    onError: (err) => {
      setBanner({ type: 'error', message: extractErrorMessage(err) });
    },
  });

  const handleQuestionTypeChange = (nextType: QuestionType) => {
    setQType(nextType);
    if (nextType === 'true_false') {
      setQCorrectIds(['true']);
    } else {
      setQCorrectIds(['a']);
    }
  };

  const toggleCorrectOption = (optionId: string) => {
    if (qType === 'multi_select') {
      setQCorrectIds((prev) =>
        prev.includes(optionId)
          ? prev.length > 1
            ? prev.filter((id) => id !== optionId)
            : prev
          : [...prev, optionId]
      );
    } else {
      setQCorrectIds([optionId]);
    }
  };

  return (
    <div className="space-y-8">
      {banner ? (
        <div
          className={`flex items-center justify-between rounded-lg border p-3 text-sm ${
            banner.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {banner.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{banner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-xs underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* QUIZ BUILDER SECTION */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-indigo-600" />
            <CardTitle>Quizzes & Question Bank ({quizzes.length})</CardTitle>
          </div>
          <CardDescription>
            Author auto-graded MCQ, Multi-Select, and True/False quizzes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (quizTitle.trim().length < 2) return;
              createQuizMutation.mutate();
            }}
            className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4 sm:grid-cols-6"
          >
            <div className="sm:col-span-2">
              <Input
                label="Quiz Title"
                placeholder="e.g., Module 1 Knowledge Check"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
              />
            </div>
            <div className="sm:col-span-1">
              <Input
                label="Time (min)"
                type="number"
                min="1"
                value={quizTimeLimit}
                onChange={(e) => setQuizTimeLimit(e.target.value)}
              />
            </div>
            <div className="sm:col-span-1">
              <Input
                label="Max Attempts"
                type="number"
                min="1"
                value={quizMaxAttempts}
                onChange={(e) => setQuizMaxAttempts(e.target.value)}
              />
            </div>
            <div className="sm:col-span-1">
              <Input
                label="Pass (%)"
                type="number"
                min="0"
                max="100"
                value={quizPassScore}
                onChange={(e) => setQuizPassScore(e.target.value)}
              />
            </div>
            <div className="flex items-end sm:col-span-1">
              <Button
                type="submit"
                className="w-full"
                isLoading={createQuizMutation.isPending}
              >
                <Plus className="h-4 w-4" />
                Create Quiz
              </Button>
            </div>
          </form>

          {quizzes.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-4">
              No quizzes created for this course yet.
            </p>
          ) : (
            <div className="space-y-3">
              {quizzes.map((quiz) => {
                const isExpanded = expandedQuizId === quiz._id;
                return (
                  <div
                    key={quiz._id}
                    className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                  >
                    <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {quiz.title}
                          </span>
                          <Badge variant="default">
                            {quiz.questionCount} questions • {quiz.totalPoints} pts
                          </Badge>
                          <Badge variant="outline">
                            Pass {quiz.passingScorePercentage}%
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">
                          Max {quiz.maxAttempts} attempts •{' '}
                          {quiz.timeLimitMinutes
                            ? `${quiz.timeLimitMinutes} min limit`
                            : 'Untimed'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setExpandedQuizId(isExpanded ? null : quiz._id)
                          }
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4" />
                              Hide Questions
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4" />
                              Manage Questions
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteQuizMutation.mutate(quiz._id)}
                        >
                          <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
                        </Button>
                      </div>
                    </div>

                    {isExpanded ? (
                      <div className="space-y-5 border-t border-slate-100 p-5">
                        {/* Existing Questions */}
                        {expandedQuizData?.questions?.length ? (
                          <div className="space-y-2.5">
                            {expandedQuizData.questions.map((q, idx) => (
                              <div
                                key={q._id}
                                className="flex items-start justify-between rounded-lg border border-slate-200 p-3.5 text-sm"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-slate-900">
                                      Q{idx + 1}. {q.prompt}
                                    </span>
                                    <Badge variant="secondary" className="uppercase">
                                      {q.type}
                                    </Badge>
                                    <Badge variant="outline">{q.points} pts</Badge>
                                  </div>
                                  <p className="text-xs text-emerald-700">
                                    Correct:{' '}
                                    {q.options
                                      .filter((o) =>
                                        q.correctOptionIds?.includes(o.id)
                                      )
                                      .map((o) => o.text)
                                      .join(', ')}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    deleteQuestionMutation.mutate({
                                      quizId: quiz._id,
                                      questionId: q._id,
                                    })
                                  }
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-600" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {/* Add Question Form */}
                        <div className="space-y-3 rounded-lg border border-indigo-100 bg-indigo-50/30 p-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                            Add New Question
                          </h4>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="space-y-1.5">
                              <label className="block text-xs font-medium text-slate-700">
                                Question Type
                              </label>
                              <select
                                value={qType}
                                onChange={(e) =>
                                  handleQuestionTypeChange(
                                    e.target.value as QuestionType
                                  )
                                }
                                className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                              >
                                <option value="mcq">Multiple Choice (Single)</option>
                                <option value="multi_select">
                                  Multiple Select
                                </option>
                                <option value="true_false">True / False</option>
                              </select>
                            </div>
                            <Input
                              label="Points"
                              type="number"
                              min="1"
                              value={qPoints}
                              onChange={(e) => setQPoints(e.target.value)}
                            />
                            <Input
                              label="Explanation (Shown after submission)"
                              placeholder="Optional rationale"
                              value={qExplanation}
                              onChange={(e) => setQExplanation(e.target.value)}
                            />
                          </div>

                          <Input
                            label="Question Prompt"
                            placeholder="Enter your question..."
                            value={qPrompt}
                            onChange={(e) => setQPrompt(e.target.value)}
                          />

                          {qType === 'true_false' ? (
                            <div className="flex items-center gap-4 text-sm">
                              <span className="font-medium text-slate-700">
                                Correct Answer:
                              </span>
                              {['true', 'false'].map((val) => (
                                <label
                                  key={val}
                                  className="flex items-center gap-1.5 capitalize"
                                >
                                  <input
                                    type="radio"
                                    checked={qCorrectIds.includes(val)}
                                    onChange={() => setQCorrectIds([val])}
                                  />
                                  {val}
                                </label>
                              ))}
                            </div>
                          ) : (
                            <div className="grid gap-2 sm:grid-cols-2">
                              {qOptions.map((opt, idx) => (
                                <div
                                  key={opt.id}
                                  className="flex items-center gap-2"
                                >
                                  <input
                                    type={
                                      qType === 'multi_select'
                                        ? 'checkbox'
                                        : 'radio'
                                    }
                                    checked={qCorrectIds.includes(opt.id)}
                                    onChange={() => toggleCorrectOption(opt.id)}
                                    title="Mark as correct answer"
                                  />
                                  <Input
                                    placeholder={`Option ${opt.id.toUpperCase()}`}
                                    value={opt.text}
                                    onChange={(e) =>
                                      setQOptions((prev) =>
                                        prev.map((item, i) =>
                                          i === idx
                                            ? { ...item, text: e.target.value }
                                            : item
                                        )
                                      )
                                    }
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          <Button
                            type="button"
                            size="sm"
                            isLoading={addQuestionMutation.isPending}
                            onClick={() => addQuestionMutation.mutate(quiz._id)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Question to Quiz
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ASSIGNMENTS & SUBMISSION GRADING SECTION */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-indigo-600" />
            <CardTitle>
              Assignments & Student Submissions ({assignments.length})
            </CardTitle>
          </div>
          <CardDescription>
            Create project assignments and grade student submissions with feedback
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (
                assignTitle.trim().length < 2 ||
                assignInstructions.trim().length < 5
              )
                return;
              createAssignmentMutation.mutate();
            }}
            className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4"
          >
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <Input
                  label="Assignment Title"
                  placeholder="e.g., Build a Rate-Limited REST API"
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                />
              </div>
              <Input
                label="Max Score"
                type="number"
                min="1"
                value={assignMaxScore}
                onChange={(e) => setAssignMaxScore(e.target.value)}
              />
              <Input
                label="Max Attempts"
                type="number"
                min="1"
                value={assignMaxResub}
                onChange={(e) => setAssignMaxResub(e.target.value)}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Assignment Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe deliverables, acceptance criteria, and submission format..."
                  value={assignInstructions}
                  onChange={(e) => setAssignInstructions(e.target.value)}
                  className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-col justify-between gap-2">
                <Input
                  label="Due Date (Optional)"
                  type="datetime-local"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                />
                <Button
                  type="submit"
                  isLoading={createAssignmentMutation.isPending}
                >
                  <Plus className="h-4 w-4" />
                  Create Assignment
                </Button>
              </div>
            </div>
          </form>

          {assignments.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-4">
              No assignments created for this course yet.
            </p>
          ) : (
            <div className="space-y-3">
              {assignments.map((assign) => {
                const isSelected = selectedAssignmentId === assign._id;
                return (
                  <div
                    key={assign._id}
                    className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                  >
                    <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {assign.title}
                          </span>
                          <Badge variant="outline">
                            Max {assign.maxScore} pts
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {assign.instructions}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setSelectedAssignmentId(
                              isSelected ? null : assign._id
                            )
                          }
                        >
                          <Award className="h-4 w-4" />
                          {isSelected ? 'Close Submissions' : 'Review Submissions'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            deleteAssignmentMutation.mutate(assign._id)
                          }
                        >
                          <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
                        </Button>
                      </div>
                    </div>

                    {isSelected ? (
                      <div className="space-y-4 border-t border-slate-100 p-5">
                        {submissions.length === 0 ? (
                          <p className="text-center text-xs text-slate-500">
                            No student submissions received yet for this
                            assignment.
                          </p>
                        ) : (
                          submissions.map((sub) => {
                            const studentObj =
                              typeof sub.student === 'object'
                                ? sub.student
                                : null;
                            const draft = gradeInputs[sub._id] || {
                              grade:
                                sub.grade !== null
                                  ? String(sub.grade)
                                  : String(assign.maxScore),
                              feedback: sub.feedback || '',
                              status:
                                sub.status === 'returned_for_revision'
                                  ? 'returned_for_revision'
                                  : 'graded',
                            };

                            return (
                              <div
                                key={sub._id}
                                className="space-y-3 rounded-lg border border-slate-200 p-4"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">
                                      {studentObj?.name || 'Student'} (
                                      {studentObj?.email})
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      Attempt #{sub.submissionCount} • Submitted{' '}
                                      {new Date(
                                        sub.submittedAt
                                      ).toLocaleString()}
                                    </p>
                                  </div>
                                  <Badge
                                    variant={
                                      sub.status === 'graded'
                                        ? 'success'
                                        : sub.status === 'returned_for_revision'
                                        ? 'warning'
                                        : 'secondary'
                                    }
                                    className="capitalize"
                                  >
                                    {sub.status.replace(/_/g, ' ')}
                                  </Badge>
                                </div>

                                {sub.textResponse ? (
                                  <div className="rounded bg-slate-50 p-3 text-xs text-slate-800 whitespace-pre-line">
                                    {sub.textResponse}
                                  </div>
                                ) : null}

                                {sub.attachments.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {sub.attachments.map((att, idx) => (
                                      <a
                                        key={idx}
                                        href={att.fileUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-indigo-600 hover:underline"
                                      >
                                        {att.fileName}
                                      </a>
                                    ))}
                                  </div>
                                ) : null}

                                <div className="grid gap-3 border-t border-slate-100 pt-3 sm:grid-cols-4">
                                  <Input
                                    label={`Score (/${assign.maxScore})`}
                                    type="number"
                                    min="0"
                                    max={assign.maxScore}
                                    value={draft.grade}
                                    onChange={(e) =>
                                      setGradeInputs((prev) => ({
                                        ...prev,
                                        [sub._id]: {
                                          ...draft,
                                          grade: e.target.value,
                                        },
                                      }))
                                    }
                                  />
                                  <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-slate-700">
                                      Decision
                                    </label>
                                    <select
                                      value={draft.status}
                                      onChange={(e) =>
                                        setGradeInputs((prev) => ({
                                          ...prev,
                                          [sub._id]: {
                                            ...draft,
                                            status: e.target.value as
                                              | 'graded'
                                              | 'returned_for_revision',
                                          },
                                        }))
                                      }
                                      className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                                    >
                                      <option value="graded">Graded</option>
                                      <option value="returned_for_revision">
                                        Return for Revision
                                      </option>
                                    </select>
                                  </div>
                                  <Input
                                    label="Feedback"
                                    placeholder="Constructive grading notes..."
                                    value={draft.feedback}
                                    onChange={(e) =>
                                      setGradeInputs((prev) => ({
                                        ...prev,
                                        [sub._id]: {
                                          ...draft,
                                          feedback: e.target.value,
                                        },
                                      }))
                                    }
                                  />
                                  <div className="flex items-end">
                                    <Button
                                      size="sm"
                                      className="w-full"
                                      isLoading={gradeSubmissionMutation.isPending}
                                      onClick={() =>
                                        gradeSubmissionMutation.mutate(sub._id)
                                      }
                                    >
                                      <Send className="h-3.5 w-3.5" />
                                      Save Grade
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
