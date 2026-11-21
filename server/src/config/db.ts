import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

mongoose.set('strictQuery', true);

export async function connectDatabase(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  try {
    const connection = await mongoose.connect(uri);
    logger.info('MongoDB connected successfully', {
      host: connection.connection.host,
      name: connection.connection.name,
    });
    return connection;
  } catch (error) {
    logger.error('MongoDB connection failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected cleanly');
  }
}

export function getDatabaseHealth(): { status: string; readyState: number } {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const readyState = mongoose.connection.readyState;
  return {
    status: states[readyState] ?? 'unknown',
    readyState,
  };
}
