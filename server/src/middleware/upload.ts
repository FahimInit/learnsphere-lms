import multer from 'multer';
import path from 'path';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

const ALLOWED_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.pdf',
  '.zip',
  '.txt',
  '.md',
  '.doc',
  '.docx',
  '.mp4',
  '.webm',
]);

export const uploadSingleFile = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(
        AppError.badRequest(
          `File type '${ext}' is not supported. Allowed types: ${Array.from(
            ALLOWED_EXTENSIONS
          ).join(', ')}`
        )
      );
    }
    return cb(null, true);
  },
}).single('file');
