import { createServer } from 'http';
import { parse } from 'url';
import express from 'express';
import next from 'next';
import { createApp } from './src/server/app.js';
import { config } from './src/server/config/index.js';
import { setupSocketIO } from './src/server/socket/index.js';

const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev, dir: '.' });
const handle = nextApp.getRequestHandler();
const apiApp = createApp();

async function main() {
  await nextApp.prepare();

  const app = express();
  app.use(apiApp);
  app.use((req, res) => {
    const parsedUrl = parse(req.url!, true);
    void handle(req, res, parsedUrl);
  });

  const httpServer = createServer(app);
  setupSocketIO(httpServer);

  httpServer.listen(config.port, config.host, () => {
    console.log(`mauknh.diaries running on http://${config.host}:${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`CORS origins: ${config.corsOrigins.join(', ')}`);
  });

  const shutdown = () => {
    console.log('Shutting down gracefully');
    httpServer.close(() => process.exit(0));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
