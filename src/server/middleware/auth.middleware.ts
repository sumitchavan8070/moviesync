import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { roomService } from '../services/room.service.js';
import type { TokenPayload } from '../types/index.js';

declare global {
  namespace Express {
    interface Request {
      roomAuth?: TokenPayload;
    }
  }
}

export function authenticateRoomToken(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  const queryToken = req.query.token as string | undefined;
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : queryToken;

  if (!token) {
    res.status(401).json({ error: 'Missing room token' });
    return;
  }

  const payload = authService.verifyRoomToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const room = roomService.getRoom(payload.roomId);
  if (!room) {
    res.status(404).json({ error: 'Room not found or expired' });
    return;
  }

  const participant = room.participants.get(payload.participantId);
  if (!participant) {
    res.status(403).json({ error: 'Participant not in room' });
    return;
  }

  if (room.removedParticipantIds.has(payload.participantId)) {
    res.status(403).json({ error: 'You have been removed from this room' });
    return;
  }

  req.roomAuth = payload;
  next();
}

export function requireHost(req: Request, res: Response, next: NextFunction): void {
  if (!req.roomAuth?.isHost) {
    res.status(403).json({ error: 'Host access required' });
    return;
  }
  next();
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error('[Error]', err.message);
  res.status(500).json({ error: 'Internal server error' });
}
