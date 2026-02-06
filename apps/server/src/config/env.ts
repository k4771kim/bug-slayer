import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Environment variable schema validation
 * Ensures all required environment variables are present and valid
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_SIZE: z.string().default('10'),

  // JWT Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Server Configuration
  PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
});

// Parse and validate environment variables
export const env = envSchema.parse(process.env);

// Export typed environment for use throughout the app
export type Env = z.infer<typeof envSchema>;
