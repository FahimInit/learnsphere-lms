import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { Enrollment } from '../../modules/enrollments/enrollment.model';
import { Course } from '../../modules/courses/course.model';

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
      return next(new Error('Authentication required for real-time connection'));
    }

    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as {
        sub?: string;
        role?: string;
      };
      if (!decoded.sub) {
        return next(new Error('Invalid access token'));
      }
      socket.data.userId = decoded.sub;
      socket.data.role = decoded.role;
      return next();
    } catch {
      return next(new Error('Invalid or expired access token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string | undefined;
    const role = socket.data.role as string | undefined;

    if (userId) {
      socket.join(`user:${userId}`);
      logger.debug('Socket joined personal room', { userId, socketId: socket.id });
    }

    socket.on('join:course', async (courseId: string) => {
      if (!userId || typeof courseId !== 'string' || !mongoose.Types.ObjectId.isValid(courseId)) {
        return;
      }

      try {
        if (role === 'admin') {
          socket.join(`course:${courseId}`);
          return;
        }

        const [enrollment, course] = await Promise.all([
          Enrollment.findOne({
            student: userId,
            course: courseId,
            status: { $in: ['active', 'completed'] },
          }).select('_id'),
          Course.findOne({ _id: courseId, instructor: userId }).select('_id'),
        ]);

        if (enrollment || course) {
          socket.join(`course:${courseId}`);
        }
      } catch {
        // Ignore authorization lookup failures on socket join
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
