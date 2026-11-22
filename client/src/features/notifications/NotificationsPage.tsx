import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CheckCheck,
  Check,
  ExternalLink,
  Megaphone,
  Award,
  BookOpen,
  ClipboardCheck,
  MessageSquare,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { NotificationItem, NotificationType } from '@/types/engagement';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';

function getNotificationIcon(type: NotificationType): React.ReactElement {
  switch (type) {
    case 'announcement':
      return <Megaphone className="h-4 w-4 text-amber-600" />;
    case 'certificate_issued':
    case 'assignment_graded':
      return <Award className="h-4 w-4 text-emerald-600" />;
    case 'quiz_result':
      return <ClipboardCheck className="h-4 w-4 text-indigo-600" />;
    case 'discussion_reply':
      return <MessageSquare className="h-4 w-4 text-purple-600" />;
    case 'enrollment':
    case 'course_status':
      return <BookOpen className="h-4 w-4 text-indigo-600" />;
    default:
      return <Bell className="h-4 w-4 text-slate-600" />;
  }
}

export function NotificationsPage(): React.ReactElement {
  const queryClient = useQueryClient();
  const [filterTab, setFilterTab] = useState<'all' | 'unread'>('all');

  const { data, isLoading } = useQuery<{
    notifications: NotificationItem[];
    unreadCount: number;
  }>({
    queryKey: ['notifications', filterTab],
    queryFn: async () => {
      const unreadParam = filterTab === 'unread' ? '&unreadOnly=true' : '';
      const res = await apiClient.get(`/notifications?limit=40${unreadParam}`);
      return {
        notifications: res.data.data.notifications,
        unreadCount: res.data.data.unreadCount,
      };
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiClient.patch(`/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch('/notifications/read-all');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Notification Center
            </h1>
            {unreadCount > 0 ? (
              <Badge variant="default">{unreadCount} unread</Badge>
            ) : null}
          </div>
          <p className="text-sm text-slate-500">
            Stay updated on course enrollments, announcements, grades, and replies
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={unreadCount === 0}
          isLoading={markAllReadMutation.isPending}
          onClick={() => markAllReadMutation.mutate()}
        >
          <CheckCheck className="h-4 w-4" />
          Mark All Read
        </Button>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setFilterTab('all')}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            filterTab === 'all'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          All Notifications
        </button>
        <button
          type="button"
          onClick={() => setFilterTab('unread')}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            filterTab === 'unread'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent className="space-y-2">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <Bell className="h-5 w-5" />
            </div>
            <CardTitle className="text-base">
              {filterTab === 'unread'
                ? 'You are all caught up!'
                : 'No notifications yet'}
            </CardTitle>
            <p className="text-sm text-slate-500">
              Course announcements, quiz grades, and enrollment updates will appear
              here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <Card
              key={notif._id}
              className={
                notif.isRead
                  ? 'border-slate-200 bg-white'
                  : 'border-indigo-200 bg-indigo-50/40'
              }
            >
              <CardHeader className="flex flex-row items-start justify-between gap-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200">
                    {getNotificationIcon(notif.type)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">
                        {notif.title}
                      </span>
                      {!notif.isRead ? (
                        <Badge variant="default">New</Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-slate-600">{notif.message}</p>
                    <div className="flex items-center gap-4 pt-1 text-xs text-slate-400">
                      <span>{new Date(notif.createdAt).toLocaleString()}</span>
                      {notif.linkUrl ? (
                        <Link
                          to={notif.linkUrl}
                          className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline"
                        >
                          Open <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>

                {!notif.isRead ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markReadMutation.mutate(notif._id)}
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4 text-indigo-600" />
                  </Button>
                ) : null}
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
