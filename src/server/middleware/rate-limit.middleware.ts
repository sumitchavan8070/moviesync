import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

export const globalRateLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

export const streamRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Stream rate limit exceeded' },
});

export const roomCreateRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many rooms created, please wait' },
});
