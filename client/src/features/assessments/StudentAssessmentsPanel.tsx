import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  Upload,
  Award,
  History,
} from 'lucide-react';
import { apiClient, extractErrorMessage } from '@/lib/api';
import {
  AssignmentItem,
  QuestionItem,
  QuizAttemptItem,
  QuizItem,
  QuizReviewEntry,
  SubmissionAttachment,
  SubmissionItem,
} from '@/types/assessment';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

export function StudentAssessmentsPanel({
  courseId,
}: {
  courseId: string;
}): React.ReactElement {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<'quizzes' | 'assignments'>(
    'quizzes'
  );

  // Active Quiz Runner state
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string[]>
  >({});
  const [quizStartedAt, setQuizStartedAt] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [latestResult, setLatestResult] = useState<{
    attempt: QuizAttemptItem;
    review: QuizReviewEntry[];
  } | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);

  // Assignment Submission state
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(
    null
  );
  const [textResponse, setTextResponse] = useState('');
  const [attachments, setAttachments] = useState<SubmissionAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [assignBanner, setAssignBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const { data: quizzes = [] } = useQuery<QuizItem[]>({
    queryKey: ['course-quizzes', courseId],
    queryFn: async () => {
      const res = await apiClient.get(`/quizzes/course/${courseId}`);
      return res.data.data.quizzes;
    },
  });

  const { data: quizDetail } = useQuery<{
    quiz: QuizItem;
    questions: QuestionItem[];
    attemptsUsed: number;
    remainingAttempts: number;
  }>({
    queryKey: ['quiz-detail', selectedQuizId],
    queryFn: async () => {
      const res = await apiClient.get(`/quizzes/${selectedQuizId}`);
      return res.data.data;
    },
    enabled: Boolean(selectedQuizId),
  });

  const { data: attemptHistory = [] } = useQuery<QuizAttemptItem[]>({
    queryKey: ['quiz-attempts', selectedQuizId],
    queryFn: async () => {
      const res = await apiClient.get(`/quizzes/${selectedQuizId}/attempts`);
      return res.data.data.attempts;
    },
    enabled: Boolean(selectedQuizId),
  });

  const { data: assignments = [] } = useQuery<AssignmentItem[]>({
    queryKey: ['course-assignments', courseId],
    queryFn: async () => {
      const res = await apiClient.get(`/assignments/course/${courseId}`);
      return res.data.data.assignments;
    },
  });

  const { data: mySubmission } = useQuery<SubmissionItem | null>({
    queryKey: ['my-submission', selectedAssignmentId],
    queryFn: async () => {
      const res = await apiClient.get(
        `/submissions/assignments/${selectedAssignmentId}/my-submission`
      );
      return res.data.data.submission;
    },
    enabled: Boolean(selectedAssignmentId),
  });

  // Countdown timer for timed quizzes
  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0) return;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [remainingSeconds]);

  // Sync existing submission text when switching assignments
  useEffect(() => {
    if (mySubmission) {
      setTextResponse(mySubmission.textResponse || '');
      setAttachments(mySubmission.attachments || []);
    } else {
      setTextResponse('');
      setAttachments([]);
    }
    setAssignBanner(null);
  }, [mySubmission, selectedAssignmentId]);

  const submitQuizMutation = useMutation({
    mutationFn: async () => {
      if (!selectedQuizId || !quizDetail) {
        throw new Error('No quiz selected');
      }
      const formattedAnswers = quizDetail.questions.map((q) => ({
        questionId: q._id,
        selectedOptionIds: selectedAnswers[q._id] || [],
      }));
      const res = await apiClient.post(`/quizzes/${selectedQuizId}/attempts`, {
        answers: formattedAnswers,
        startedAt: quizStartedAt || new Date().toISOString(),
      });
      return res.data.data as {
        attempt: QuizAttemptItem;
        review: QuizReviewEntry[];
      };
    },
    onSuccess: (data) => {
      setLatestResult(data);
      setRemainingSeconds(null);
      setQuizError(null);
      void queryClient.invalidateQueries({
        queryKey: ['quiz-detail', selectedQuizId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['quiz-attempts', selectedQuizId],
      });
    },
    onError: (err) => {
      setQuizError(extractErrorMessage(err));
    },
  });

  const submitAssignmentMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAssignmentId) return;
      const res = await apiClient.post(
        `/submissions/assignments/${selectedAssignmentId}`,
        {
          textResponse: textResponse.trim(),
          attachments,
        }
      );
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['my-submission', selectedAssignmentId],
      });
      setAssignBanner({
        type: 'success',
        message: 'Assignment submitted successfully!',
      });
    },
    onError: (err) => {
      setAssignBanner({
        type: 'error',
        message: extractErrorMessage(err),
      });
    },
  });

  const handleStartQuiz = (quiz: QuizItem) => {
    setSelectedQuizId(quiz._id);
    setSelectedAnswers({});
    setLatestResult(null);
    setQuizError(null);
    setQuizStartedAt(new Date().toISOString());
    setRemainingSeconds(
      quiz.timeLimitMinutes ? quiz.timeLimitMinutes * 60 : null
    );
  };

  const handleOptionSelect = (
    questionId: string,
    optionId: string,
    isMulti: boolean
  ) => {
    setSelectedAnswers((prev) => {
      const current = prev[questionId] || [];
      if (isMulti) {
        return {
          ...prev,
          [questionId]: current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId],
        };
      }
      return {
        ...prev,
        [questionId]: [optionId],
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAssignmentId) return;
    setIsUploading(true);
    setAssignBanner(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post(
        `/submissions/assignments/${selectedAssignmentId}/upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setAttachments((prev) => [...prev, res.data.data.file]);
    } catch (err) {
      setAssignBanner({ type: 'error', message: extractErrorMessage(err) });
    } finally {
      setIsUploading(false);
    }
  };

  const formatTimer = (secs: number): string => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <CardTitle className="text-lg">Course Assessments</CardTitle>
            <CardDescription>
              Complete graded quizzes and submit project assignments
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={activeSubTab === 'quizzes' ? 'primary' : 'outline'}
              onClick={() => setActiveSubTab('quizzes')}
            >
              <ClipboardCheck className="h-4 w-4" />
              Quizzes ({quizzes.length})
            </Button>
            <Button
              size="sm"
              variant={activeSubTab === 'assignments' ? 'primary' : 'outline'}
              onClick={() => setActiveSubTab('assignments')}
            >
              <FileText className="h-4 w-4" />
              Assignments ({assignments.length})
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {activeSubTab === 'quizzes' ? (
          quizzes.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No quizzes published for this course yet.
            </p>
          ) : (
            <div className="space-y-6">
              {/* Quiz Selector Cards */}
              <div className="grid gap-3 sm:grid-cols-2">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz._id}
                    className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${
                      selectedQuizId === quiz._id
                        ? 'border-indigo-600 bg-indigo-50/40'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-900">
                        {quiz.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {quiz.questionCount} questions • Pass{' '}
                        {quiz.passingScorePercentage}% • Max {quiz.maxAttempts}{' '}
                        attempts
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={
                        selectedQuizId === quiz._id ? 'secondary' : 'outline'
                      }
                      onClick={() => handleStartQuiz(quiz)}
                    >
                      {selectedQuizId === quiz._id ? 'Active' : 'Open Quiz'}
                    </Button>
                  </div>
                ))}
              </div>

              {/* Active Quiz Runner */}
              {quizDetail ? (
                <div className="space-y-5 rounded-xl border border-slate-200 bg-slate-50/70 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {quizDetail.quiz.title}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Attempts used: {quizDetail.attemptsUsed} /{' '}
                        {quizDetail.quiz.maxAttempts} (
                        {quizDetail.remainingAttempts} remaining)
                      </p>
                    </div>
                    {remainingSeconds !== null && !latestResult ? (
                      <Badge variant="warning">
                        <Clock className="mr-1 h-3.5 w-3.5" />
                        Time Remaining: {formatTimer(remainingSeconds)}
                      </Badge>
                    ) : null}
                  </div>

                  {quizError ? (
                    <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{quizError}</span>
                    </div>
                  ) : null}

                  {latestResult ? (
                    <div className="space-y-4">
                      <div
                        className={`rounded-xl border p-4 ${
                          latestResult.attempt.passed
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                            : 'border-amber-200 bg-amber-50 text-amber-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {latestResult.attempt.passed ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <XCircle className="h-5 w-5 text-amber-600" />
                            )}
                            <span className="font-bold">
                              {latestResult.attempt.passed
                                ? 'Quiz Passed!'
                                : 'Score Below Passing Threshold'}
                            </span>
                          </div>
                          <span className="text-lg font-bold">
                            {latestResult.attempt.scorePercentage}% (
                            {latestResult.attempt.earnedPoints}/
                            {latestResult.attempt.totalPoints} pts)
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {latestResult.review.map((rev, idx) => (
                          <div
                            key={rev.questionId}
                            className="rounded-lg border border-slate-200 bg-white p-4 text-sm space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-900">
                                Q{idx + 1}. {rev.prompt}
                              </span>
                              <Badge
                                variant={rev.isCorrect ? 'success' : 'danger'}
                              >
                                {rev.pointsAwarded}/{rev.maxPoints} pts
                              </Badge>
                            </div>
                            {rev.explanation ? (
                              <p className="text-xs text-slate-600">
                                <strong>Explanation:</strong> {rev.explanation}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : quizDetail.remainingAttempts === 0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      You have used all {quizDetail.quiz.maxAttempts} allowed
                      attempts for this quiz. Review your past attempts below.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {quizDetail.questions.map((q, idx) => {
                        const isMulti = q.type === 'multi_select';
                        const selectedForQ = selectedAnswers[q._id] || [];
                        return (
                          <div
                            key={q._id}
                            className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-slate-900">
                                {idx + 1}. {q.prompt}
                              </span>
                              <Badge variant="outline">{q.points} pts</Badge>
                            </div>
                            <p className="text-xs text-slate-500">
                              {isMulti
                                ? 'Select all correct options'
                                : 'Select one option'}
                            </p>
                            <div className="space-y-2">
                              {q.options.map((opt) => {
                                const checked = selectedForQ.includes(opt.id);
                                return (
                                  <label
                                    key={opt.id}
                                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm transition-colors ${
                                      checked
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                                        : 'border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    <input
                                      type={isMulti ? 'checkbox' : 'radio'}
                                      name={`question-${q._id}`}
                                      checked={checked}
                                      onChange={() =>
                                        handleOptionSelect(
                                          q._id,
                                          opt.id,
                                          isMulti
                                        )
                                      }
                                    />
                                    <span>{opt.text}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      <div className="flex justify-end">
                        <Button
                          onClick={() => submitQuizMutation.mutate()}
                          isLoading={submitQuizMutation.isPending}
                        >
                          <Send className="h-4 w-4" />
                          Submit Quiz Answers
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Attempt History */}
                  {attemptHistory.length > 0 ? (
                    <div className="border-t border-slate-200 pt-4 space-y-2">
                      <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                        <History className="h-3.5 w-3.5" />
                        Attempt History ({attemptHistory.length})
                      </h4>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {attemptHistory.map((att) => (
                          <div
                            key={att._id}
                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                          >
                            <span>Attempt #{att.attemptNumber}</span>
                            <Badge variant={att.passed ? 'success' : 'danger'}>
                              {att.scorePercentage}% (
                              {att.passed ? 'Passed' : 'Failed'})
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        ) : assignments.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No assignments published for this course yet.
          </p>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {assignments.map((assign) => (
                <div
                  key={assign._id}
                  className={`flex items-center justify-between rounded-xl border p-4 ${
                    selectedAssignmentId === assign._id
                      ? 'border-indigo-600 bg-indigo-50/40'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900">
                      {assign.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      Max {assign.maxScore} pts
                      {assign.dueDate
                        ? ` • Due ${new Date(
                            assign.dueDate
                          ).toLocaleDateString()}`
                        : ''}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={
                      selectedAssignmentId === assign._id
                        ? 'secondary'
                        : 'outline'
                    }
                    onClick={() => setSelectedAssignmentId(assign._id)}
                  >
                    Open Assignment
                  </Button>
                </div>
              ))}
            </div>

            {selectedAssignmentId ? (
              (() => {
                const activeAssign = assignments.find(
                  (a) => a._id === selectedAssignmentId
                );
                if (!activeAssign) return null;

                return (
                  <div className="space-y-5 rounded-xl border border-slate-200 bg-slate-50/70 p-5">
                    <div className="space-y-2 border-b border-slate-200 pb-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-900">
                          {activeAssign.title}
                        </h3>
                        <Badge variant="outline">
                          Max {activeAssign.maxScore} pts
                        </Badge>
                      </div>
                      <p className="whitespace-pre-line text-sm text-slate-700">
                        {activeAssign.instructions}
                      </p>
                    </div>

                    {assignBanner ? (
                      <div
                        className={`rounded-lg border p-3 text-xs ${
                          assignBanner.type === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-red-200 bg-red-50 text-red-700'
                        }`}
                      >
                        {assignBanner.message}
                      </div>
                    ) : null}

                    {mySubmission ? (
                      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                            <Award className="h-4 w-4 text-indigo-600" />
                            Submission Status (Attempt #
                            {mySubmission.submissionCount} /{' '}
                            {activeAssign.maxResubmissions})
                          </span>
                          <Badge
                            variant={
                              mySubmission.status === 'graded'
                                ? 'success'
                                : mySubmission.status ===
                                  'returned_for_revision'
                                ? 'warning'
                                : 'secondary'
                            }
                            className="capitalize"
                          >
                            {mySubmission.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>

                        {mySubmission.grade !== null ? (
                          <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
                            <p className="font-bold">
                              Grade: {mySubmission.grade} /{' '}
                              {activeAssign.maxScore}
                            </p>
                            {mySubmission.feedback ? (
                              <p className="mt-1 text-xs">
                                <strong>Instructor Feedback:</strong>{' '}
                                {mySubmission.feedback}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="space-y-3">
                      <label className="block text-sm font-medium text-slate-700">
                        Your Submission Response
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Write your solution notes, repository link, or summary..."
                        value={textResponse}
                        onChange={(e) => setTextResponse(e.target.value)}
                        className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                          <Upload className="h-3.5 w-3.5" />
                          {isUploading ? 'Uploading...' : 'Attach File'}
                          <input
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                          />
                        </label>

                        <Button
                          onClick={() => submitAssignmentMutation.mutate()}
                          isLoading={submitAssignmentMutation.isPending}
                        >
                          <Send className="h-4 w-4" />
                          {mySubmission
                            ? 'Resubmit Assignment'
                            : 'Submit Assignment'}
                        </Button>
                      </div>

                      {attachments.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {attachments.map((att, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-2 rounded bg-white px-2.5 py-1 text-xs border border-slate-200"
                            >
                              {att.fileName}
                              <button
                                type="button"
                                onClick={() =>
                                  setAttachments((prev) =>
                                    prev.filter((_, i) => i !== idx)
                                  )
                                }
                                className="text-red-500 hover:underline"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })()
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
