import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const DEV_ACCESS_DEFAULT = 'dev_access_secret_replace_in_production_min_32_chars';
const DEV_REFRESH_DEFAULT = 'dev_refresh_secret_replace_in_production_min_32_chars';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/learnsphere'),
    JWT_ACCESS_SECRET: z.string().min(16).default(DEV_ACCESS_DEFAULT),
    JWT_REFRESH_SECRET: z.string().min(16).default(DEV_REFRESH_DEFAULT),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
    CLIENT_URL: z.string().default('http://localhost:5173'),
    STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
    UPLOAD_DIR: z.string().default('uploads'),
    MAX_FILE_SIZE_MB: z.coerce.number().positive().default(25),
    EMAIL_PROVIDER: z.enum(['console', 'smtp']).default('console'),
    EMAIL_FROM: z.string().default('no-reply@learnsphere.local'),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (
        data.JWT_ACCESS_SECRET === DEV_ACCESS_DEFAULT ||
        data.JWT_ACCESS_SECRET.length < 32
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_ACCESS_SECRET'],
          message:
            'Production requires a unique JWT_ACCESS_SECRET of at least 32 characters',
        });
      }
      if (
        data.JWT_REFRESH_SECRET === DEV_REFRESH_DEFAULT ||
        data.JWT_REFRESH_SECRET.length < 32
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_REFRESH_SECRET'],
          message:
            'Production requires a unique JWT_REFRESH_SECRET of at least 32 characters',
        });
      }
    }
  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Invalid environment configuration:', parsedEnv.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsedEnv.data;
