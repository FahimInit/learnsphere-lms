import http from 'http';
import { app } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/db';
import { initializeSocketServer } from './infrastructure/socket/socket.service';
import { logger } from './utils/logger';

async function bootstrap(): Promise<void> {
  await connectDatabase();

  const httpServer = http.createServer(app);
  initializeSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    logger.info(`LearnSphere API listening on port ${env.PORT}`, {
      environment: env.NODE_ENV,
      docsUrl: `http://localhost:${env.PORT}/api/v1/docs`,
    });
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    httpServer.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

if (require.main === module) {
  bootstrap().catch((error) => {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  });
}
