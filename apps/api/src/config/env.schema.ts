import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url(),
  WEB_ORIGIN: z.string().url().default('http://localhost:4200'),
});

export type Environment = z.infer<typeof envSchema>;
