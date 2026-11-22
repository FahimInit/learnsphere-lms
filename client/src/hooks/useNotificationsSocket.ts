import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function useNotificationsSocket(): void {
  const { user, accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || !accessToken) return;

    const socket: Socket = io(SOCKET_URL, {
      auth: { token: accessToken },
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('notification:new', () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    socket.on('announcement:new', () => {
      void queryClient.invalidateQueries({ queryKey: ['course-community'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [user, accessToken, queryClient]);
}
