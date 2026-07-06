import { createServer } from 'http';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { setupSocketIO } from './socket/index.js';

const app = createApp();
const httpServer = createServer(app);

setupSocketIO(httpServer);

httpServer.listen(config.port, config.host, () => {
  console.log(`mauknh.diaries server running on ${config.host}:${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`CORS origins: ${config.corsOrigins.join(', ')}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  httpServer.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  httpServer.close(() => process.exit(0));
});
