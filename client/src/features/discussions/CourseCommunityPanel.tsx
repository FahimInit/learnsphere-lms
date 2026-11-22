import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare,
  Megaphone,
  Pin,
  CheckCircle2,
  Flag,
  Send,
  Plus,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react';
import { apiClient, extractErrorMessage } from '@/lib/api';
import {
  AnnouncementItem,
  CommentItem,
  DiscussionItem,
} from '@/types/engagement';
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

export function CourseCommunityPanel({
  courseId,
  canManage = false,
}: {
  courseId: string;
  canManage?: boolean;
}): React.ReactElement {
  const queryClient = useQueryClient();
  const [subTab, setSubTab] = useState<'discussions' | 'announcements'>(
    'discussions'
  );
  const [banner, setBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // New discussion thread state
  const [threadTitle, setThreadTitle] = useState('');
  const [threadContent, setThreadContent] = useState('');

  // Expanded thread & reply state
  const [expandedThreadId, setExpandedThreadId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [reportingTarget, setReportingTarget] = useState<{
    type: 'discussion' | 'comment';
    id: string;
  } | null>(null);
  const [reportReason, setReportReason] = useState('');

  // New announcement state (Instructor/Admin)
  const [announceTitle, setAnnounceTitle] = useState('');
  const [announceContent, setAnnounceContent] = useState('');

  const { data: communityData } = useQuery<{
    discussions: DiscussionItem[];
    announcements: AnnouncementItem[];
  }>({
    queryKey: ['course-community', courseId],
    queryFn: async () => {
      const res = await apiClient.get(`/discussions/course/${courseId}`);
      return res.data.data;
    },
  });

  const { data: activeThreadData } = useQuery<{
    discussion: DiscussionItem;
    comments: CommentItem[];
  }>({
    queryKey: ['discussion-thread', expandedThreadId],
    queryFn: async () => {
      const res = await apiClient.get(`/discussions/${expandedThreadId}`);
      return res.data.data;
    },
    enabled: Boolean(expandedThreadId),
  });

  const createThreadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/discussions/course/${courseId}`, {
        title: threadTitle.trim(),
        content: threadContent.trim(),
      });
      return res.data.data.discussion as DiscussionItem;
    },
    onSuccess: (created) => {
      setThreadTitle('');
      setThreadContent('');
      setExpandedThreadId(created._id);
      void queryClient.invalidateQueries({
        queryKey: ['course-community', courseId],
      });
      setBanner({
        type: 'success',
        message: 'Discussion thread posted.',
      });
    },
    onError: (err) => {
      setBanner({ type: 'error', message: extractErrorMessage(err) });
    },
  });

  const addReplyMutation = useMutation({
    mutationFn: async (discussionId: string) => {
      await apiClient.post(`/discussions/${discussionId}/comments`, {
        content: replyContent.trim(),
      });
    },
    onSuccess: () => {
      setReplyContent('');
      void queryClient.invalidateQueries({
        queryKey: ['discussion-thread', expandedThreadId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['course-community', courseId],
      });
    },
    onError: (err) => {
      setBanner({ type: 'error', message: extractErrorMessage(err) });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      discussionId,
      isPinned,
      isResolved,
    }: {
      discussionId: string;
      isPinned?: boolean;
      isResolved?: boolean;
    }) => {
      await apiClient.patch(`/discussions/${discussionId}/status`, {
        isPinned,
        isResolved,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['course-community', courseId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['discussion-thread', expandedThreadId],
      });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      if (!reportingTarget) return;
      const endpoint =
        reportingTarget.type === 'discussion'
          ? `/discussions/${reportingTarget.id}/report`
          : `/discussions/comments/${reportingTarget.id}/report`;
      await apiClient.post(endpoint, { reason: reportReason.trim() });
    },
    onSuccess: () => {
      setReportingTarget(null);
      setReportReason('');
      setBanner({
        type: 'success',
        message: 'Content flagged for moderator review.',
      });
    },
    onError: (err) => {
      setBanner({ type: 'error', message: extractErrorMessage(err) });
    },
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post(`/discussions/course/${courseId}/announcements`, {
        title: announceTitle.trim(),
        content: announceContent.trim(),
      });
    },
    onSuccess: () => {
      setAnnounceTitle('');
      setAnnounceContent('');
      void queryClient.invalidateQueries({
        queryKey: ['course-community', courseId],
      });
      setBanner({
        type: 'success',
        message: 'Announcement broadcast to all enrolled students.',
      });
    },
    onError: (err) => {
      setBanner({ type: 'error', message: extractErrorMessage(err) });
    },
  });

  const discussions = communityData?.discussions ?? [];
  const announcements = communityData?.announcements ?? [];

  return (
    <Card>
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <CardTitle className="text-lg">
              Course Discussions &amp; Announcements
            </CardTitle>
            <CardDescription>
              Ask questions, collaborate with peers, and read instructor updates
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={subTab === 'discussions' ? 'primary' : 'outline'}
              onClick={() => setSubTab('discussions')}
            >
              <MessageSquare className="h-4 w-4" />
              Discussions ({discussions.length})
            </Button>
            <Button
              size="sm"
              variant={subTab === 'announcements' ? 'primary' : 'outline'}
              onClick={() => setSubTab('announcements')}
            >
              <Megaphone className="h-4 w-4" />
              Announcements ({announcements.length})
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 pt-6">
        {banner ? (
          <div
            className={`flex items-center justify-between rounded-lg border p-3 text-xs ${
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
              className="underline"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {subTab === 'discussions' ? (
          <div className="space-y-6">
            {/* Start New Discussion Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (
                  threadTitle.trim().length < 3 ||
                  threadContent.trim().length < 3
                )
                  return;
                createThreadMutation.mutate();
              }}
              className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4"
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Start a Discussion Thread
              </h4>
              <Input
                placeholder="Topic or question title..."
                value={threadTitle}
                onChange={(e) => setThreadTitle(e.target.value)}
              />
              <textarea
                rows={3}
                placeholder="Provide context, code snippets, or details..."
                value={threadContent}
                onChange={(e) => setThreadContent(e.target.value)}
                className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  isLoading={createThreadMutation.isPending}
                >
                  <Plus className="h-4 w-4" />
                  Post Thread
                </Button>
              </div>
            </form>

            {/* Threads List */}
            {discussions.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No discussion threads yet. Start the conversation above!
              </p>
            ) : (
              <div className="space-y-3">
                {discussions.map((thread) => {
                  const isExpanded = expandedThreadId === thread._id;
                  return (
                    <div
                      key={thread._id}
                      className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                    >
                      <div className="p-4 space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {thread.isPinned ? (
                                <Badge variant="warning">
                                  <Pin className="mr-1 h-3 w-3" />
                                  Pinned
                                </Badge>
                              ) : null}
                              {thread.isResolved ? (
                                <Badge variant="success">
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Resolved
                                </Badge>
                              ) : null}
                              <span className="font-semibold text-slate-900">
                                {thread.title}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              By <strong>{thread.author?.name}</strong> •{' '}
                              {new Date(thread.createdAt).toLocaleString()} •{' '}
                              {thread.replyCount} replies
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {canManage ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      discussionId: thread._id,
                                      isPinned: !thread.isPinned,
                                    })
                                  }
                                  title="Toggle pin"
                                >
                                  <Pin className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    updateStatusMutation.mutate({
                                      discussionId: thread._id,
                                      isResolved: !thread.isResolved,
                                    })
                                  }
                                  title="Toggle resolved"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            ) : null}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setReportingTarget({
                                  type: 'discussion',
                                  id: thread._id,
                                })
                              }
                              title="Report thread"
                            >
                              <Flag className="h-3.5 w-3.5 text-slate-400 hover:text-red-600" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setExpandedThreadId(
                                  isExpanded ? null : thread._id
                                )
                              }
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="h-3.5 w-3.5" />
                                  Close
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3.5 w-3.5" />
                                  Replies ({thread.replyCount})
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        <p className="text-sm text-slate-700 whitespace-pre-line">
                          {thread.content}
                        </p>
                      </div>

                      {isExpanded ? (
                        <div className="border-t border-slate-100 bg-slate-50/70 p-4 space-y-4">
                          {activeThreadData?.comments?.length ? (
                            <div className="space-y-2.5">
                              {activeThreadData.comments.map((comment) => (
                                <div
                                  key={comment._id}
                                  className={`rounded-lg border p-3 text-sm ${
                                    comment.isInstructorReply
                                      ? 'border-indigo-200 bg-indigo-50/50'
                                      : 'border-slate-200 bg-white'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-slate-900 text-xs">
                                        {comment.author?.name}
                                      </span>
                                      {comment.isInstructorReply ? (
                                        <Badge variant="default">
                                          Instructor
                                        </Badge>
                                      ) : null}
                                      <span className="text-[11px] text-slate-400">
                                        {new Date(
                                          comment.createdAt
                                        ).toLocaleString()}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setReportingTarget({
                                          type: 'comment',
                                          id: comment._id,
                                        })
                                      }
                                      className="text-slate-400 hover:text-red-600"
                                      title="Report reply"
                                    >
                                      <Flag className="h-3 w-3" />
                                    </button>
                                  </div>
                                  <p className="mt-1.5 text-slate-700 whitespace-pre-line">
                                    {comment.content}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500">
                              No replies yet. Be the first to respond.
                            </p>
                          )}

                          <div className="flex gap-2">
                            <Input
                              placeholder="Write a reply..."
                              value={replyContent}
                              onChange={(e) => setReplyContent(e.target.value)}
                            />
                            <Button
                              size="sm"
                              isLoading={addReplyMutation.isPending}
                              onClick={() => {
                                if (!replyContent.trim()) return;
                                addReplyMutation.mutate(thread._id);
                              }}
                            >
                              <Send className="h-3.5 w-3.5" />
                              Reply
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {canManage ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (
                    announceTitle.trim().length < 3 ||
                    announceContent.trim().length < 5
                  )
                    return;
                  createAnnouncementMutation.mutate();
                }}
                className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4"
              >
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                  Broadcast Course Announcement
                </h4>
                <Input
                  placeholder="Announcement title..."
                  value={announceTitle}
                  onChange={(e) => setAnnounceTitle(e.target.value)}
                />
                <textarea
                  rows={3}
                  placeholder="Share schedule updates, new modules, or reminders with all enrolled students..."
                  value={announceContent}
                  onChange={(e) => setAnnounceContent(e.target.value)}
                  className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    isLoading={createAnnouncementMutation.isPending}
                  >
                    <Megaphone className="h-4 w-4" />
                    Publish Announcement
                  </Button>
                </div>
              </form>
            ) : null}

            {announcements.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No instructor announcements posted yet.
              </p>
            ) : (
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <div
                    key={ann._id}
                    className="rounded-xl border border-slate-200 bg-white p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">
                        {ann.title}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(ann.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-line">
                      {ann.content}
                    </p>
                    <p className="text-xs text-slate-500">
                      Posted by {ann.instructor?.name || 'Course Instructor'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Inline Report Content Modal */}
        {reportingTarget ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
            <p className="text-xs font-bold uppercase text-amber-800">
              Report Inappropriate Content
            </p>
            <Input
              placeholder="Explain why this content violates guidelines (min 5 chars)..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setReportingTarget(null);
                  setReportReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={reportMutation.isPending}
                onClick={() => reportMutation.mutate()}
              >
                Submit Report
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
