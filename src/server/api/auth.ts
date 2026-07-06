import { authService } from '../services/auth.service';
import { roomService } from '../services/room.service';
import type { TokenPayload } from '../types/index';
import { normalizeRoomId } from '../utils/index';
import { apiError } from './response';

export function authenticateRoomToken(request: Request): TokenPayload | Response {
  const authHeader = request.headers.get('authorization');
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : (queryToken ?? undefined);

  if (!token) {
    return apiError('Missing room token', 401);
  }

  const payload = authService.verifyRoomToken(token);
  if (!payload) {
    return apiError('Invalid or expired token', 401);
  }

  const room = roomService.getRoom(normalizeRoomId(payload.roomId));
  if (!room) {
    return apiError('Room not found or expired', 404);
  }

  const participant = room.participants.get(payload.participantId);
  if (!participant) {
    return apiError('Participant not in room', 403);
  }

  if (room.removedParticipantIds.has(payload.participantId)) {
    return apiError('You have been removed from this room', 403);
  }

  return payload;
}
