import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config/index.js';
import { errorHandler } from './middleware/auth.middleware.js';
import { globalRateLimiter } from './middleware/rate-limit.middleware.js';
import routes from './routes/index.js';

export function createApp(): express.Application {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: config.isProduction ? undefined : false,
    }),
  );

  app.use(
    cors({
      origin: config.isProduction ? config.corsOrigins : true,
      credentials: true,
    }),
  );

  app.use(
    compression({
      filter: (req, res) => {
        if (req.path.includes('/stream/')) return false;
        return compression.filter(req, res);
      },
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(globalRateLimiter);

  app.use('/api', routes);

  app.use(errorHandler);

  return app;
}
