import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

let ioInstance: SocketIOServer | null = null;

export function initializeSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as { sub?: string };
      if (decoded.sub) {
        socket.data.userId = decoded.sub;
      }
    } catch {
      // Allow connection even if unauthenticated; user room join requires valid userId
    }
    return next();
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string | undefined;
    if (userId) {
      socket.join(`user:${userId}`);
      logger.debug('Socket joined personal room', { userId, socketId: socket.id });
    }

    socket.on('join:course', (courseId: string) => {
      if (typeof courseId === 'string' && courseId.trim()) {
        socket.join(`course:${courseId}`);
      }
    });

    socket.on('leave:course', (courseId: string) => {
      if (typeof courseId === 'string' && courseId.trim()) {
        socket.leave(`course:${courseId}`);
      }
    });
  });

  ioInstance = io;
  return io;
}

export function emitToUser(userId: string, event: string, payload: unknown): void {
  if (!ioInstance) return;
  ioInstance.to(`user:${userId}`).emit(event, payload);
}

export function emitToCourse(courseId: string, event: string, payload: unknown): void {
  if (!ioInstance) return;
  ioInstance.to(`course:${courseId}`).emit(event, payload);
}
