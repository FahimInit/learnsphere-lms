import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';

export interface StoredFileResult {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export interface StorageProvider {
  saveBuffer(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder?: string
  ): Promise<StoredFileResult>;
}

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

export class LocalStorageProvider implements StorageProvider {
  private readonly baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async saveBuffer(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    folder = 'general'
  ): Promise<StoredFileResult> {
    const ext = path.extname(originalName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw AppError.badRequest(`File extension '${ext}' is not permitted`);
    }

    const maxBytes = env.MAX_FILE_SIZE_MB * 1024 * 1024;
    if (buffer.byteLength > maxBytes) {
      throw AppError.badRequest(
        `File exceeds maximum size of ${env.MAX_FILE_SIZE_MB}MB`
      );
    }

    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, '');
    const targetDir = path.join(this.baseDir, safeFolder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const uniqueName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
    const fullPath = path.join(targetDir, uniqueName);
    await fs.promises.writeFile(fullPath, buffer);

    return {
      fileName: originalName,
      fileUrl: `/uploads/${safeFolder}/${uniqueName}`,
      fileSize: buffer.byteLength,
      mimeType,
    };
  }
}

export const storageService: StorageProvider = new LocalStorageProvider();
