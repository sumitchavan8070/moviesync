import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function env(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
}

export const config = {
  nodeEnv: env('NODE_ENV', 'development'),
  port: envInt('PORT', 3000),
  host: env('HOST', '0.0.0.0'),
  clientUrl: env('CLIENT_URL', 'http://localhost:3000'),
  corsOrigins: env('CORS_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  jwtSecret: env('JWT_SECRET', 'dev-jwt-secret-change-in-production'),
  roomTokenSecret: env('ROOM_TOKEN_SECRET', 'dev-room-token-secret'),
  sessionExpiryHours: envInt('SESSION_EXPIRY_HOURS', 24),
  rateLimitWindowMs: envInt('RATE_LIMIT_WINDOW_MS', 900_000),
  rateLimitMax: envInt('RATE_LIMIT_MAX', 200),
  streamChunkTimeoutMs: envInt('STREAM_CHUNK_TIMEOUT_MS', 30_000),
  maxConcurrentStreamRequests: envInt('MAX_CONCURRENT_STREAM_REQUESTS', 50),
  redisUrl: process.env.REDIS_URL ?? '',
  isProduction: env('NODE_ENV', 'development') === 'production',
} as const;

export type AppConfig = typeof config;
