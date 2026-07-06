import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/index.js';
import { errorHandler } from './middleware/auth.middleware.js';
import { globalRateLimiter } from './middleware/rate-limit.middleware.js';
import routes from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

  // Serve frontend in production (single-container deployment)
  if (config.isProduction) {
    const clientDist = path.resolve(__dirname, '../../dist');
    app.use(express.static(clientDist));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}
