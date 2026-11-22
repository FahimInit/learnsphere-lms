import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { openApiSpec } from './config/swagger';
import { apiRateLimiter } from './middleware/rateLimiter';
import { authenticate } from './middleware/auth';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';
import { AppError } from './utils/AppError';
import v1Router from './routes';

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  app.use(
    cors({
      origin: env.CLIENT_URL.split(',').map((origin) => origin.trim()),
      credentials: true,
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  const uploadsPath = path.resolve(process.cwd(), env.UPLOAD_DIR);

  // Protected file download handler preventing path traversal & unauthenticated access to submissions
  app.get(
    '/uploads/:folder/:filename',
    (req: Request, res: Response, next: NextFunction) => {
      const folder = req.params.folder;
      if (folder === 'submissions') {
        return authenticate(req, res, next);
      }
      return next();
    },
    (req: Request, res: Response, next: NextFunction) => {
      const folder = path.basename(req.params.folder || '');
      const filename = path.basename(req.params.filename || '');

      if (!/^[a-zA-Z0-9_-]+$/.test(folder) || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
        return next(AppError.badRequest('Invalid file path'));
      }

      const fullPath = path.resolve(uploadsPath, folder, filename);
      if (!fullPath.startsWith(uploadsPath) || !fs.existsSync(fullPath)) {
        return next(AppError.notFound('File not found'));
      }

      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.sendFile(fullPath);
    }
  );

  app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
  app.use('/api/v1', apiRateLimiter, v1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
