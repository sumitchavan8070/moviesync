import { Router } from 'express';
import {
  createRoom,
  getRoomInfo,
  joinRoom,
  healthCheck,
} from '../controllers/room.controller.js';
import { getStreamMetadata, streamVideo } from '../controllers/stream.controller.js';
import { authenticateRoomToken } from '../middleware/auth.middleware.js';
import {
  roomCreateRateLimiter,
  streamRateLimiter,
} from '../middleware/rate-limit.middleware.js';

const router = Router();

router.get('/health', healthCheck);

router.post('/rooms', roomCreateRateLimiter, createRoom);
router.get('/rooms/:roomId', getRoomInfo);
router.post('/rooms/:roomId/join', joinRoom);

router.get(
  '/stream/:roomId/metadata',
  authenticateRoomToken,
  streamRateLimiter,
  getStreamMetadata,
);

router.get(
  '/stream/:roomId',
  authenticateRoomToken,
  streamRateLimiter,
  streamVideo,
);

export default router;
