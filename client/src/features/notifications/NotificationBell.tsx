import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationsSocket } from '@/hooks/useNotificationsSocket';

export function NotificationBell(): React.ReactElement | null {
  const { user, accessToken } = useAuthStore();
  useNotificationsSocket();

  const { data } = useQuery<{ unreadCount: number }>({
    queryKey: ['notifications', 'summary'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications?limit=1');
      return { unreadCount: res.data.data.unreadCount ?? 0 };
    },
    enabled: Boolean(user && accessToken),
    staleTime: 30000,
  });

  if (!user) return null;

  const unreadCount = data?.unreadCount ?? 0;

  return (
    <Link
      to="/notifications"
      aria-label="Notifications"
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
