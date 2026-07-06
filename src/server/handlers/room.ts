import { z } from 'zod';
import { getClientIp, rateLimit } from '../api/rate-limit';
import { apiError, json } from '../api/response';
import { authService } from '../services/auth.service';
import { roomService } from '../services/room.service';
import { normalizeRoomId } from '../utils/index';

const createRoomSchema = z.object({
  hostName: z.string().min(1).max(32),
});

const joinRoomSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(32),
  token: z.string().optional(),
});

export function handleHealthCheck(): Response {
  return json({ status: 'ok', timestamp: Date.now(), service: 'mauknh.diaries' });
}

export async function handleCreateRoom(request: Request): Promise<Response> {
  const ip = getClientIp(request);
  if (!rateLimit(`room-create:${ip}`, 10, 60_000)) {
    return apiError('Too many rooms created, please wait', 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  const parsed = createRoomSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid request', 400, parsed.error.flatten());
  }

  const { room, hostToken, guestToken } = roomService.createRoom(parsed.data.hostName);

  return json(
    {
      roomId: room.id,
      hostToken,
      guestToken,
      participantId: room.hostParticipantId,
      room: roomService.toPublicInfo(room),
    },
    201,
  );
}

export function handleGetRoom(roomId: string): Response {
  const normalizedRoomId = roomId.trim().toLowerCase();
  const room = roomService.getRoom(normalizedRoomId);

  if (!room) {
    return apiError('Room not found or expired', 404);
  }

  return json({
    room: roomService.toPublicInfo(room),
    participants: roomService.getParticipantsList(room).map((p) => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      latencyMs: p.latencyMs,
      isMuted: p.isMuted,
      isSpeaking: p.isSpeaking,
      online: Boolean(p.socketId),
    })),
  });
}

export async function handleJoinRoom(roomId: string, request: Request): Promise<Response> {
  const normalizedRoomId = roomId.trim().toLowerCase();

  if (!normalizedRoomId || normalizedRoomId.length < 4) {
    return apiError('Invalid room ID', 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400);
  }

  const parsed = joinRoomSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('Invalid request', 400, parsed.error.flatten());
  }

  let participantId: string | undefined;
  if (parsed.data.token) {
    const payload = authService.verifyRoomToken(parsed.data.token);
    if (payload && normalizeRoomId(payload.roomId) === normalizedRoomId) {
      participantId = payload.participantId;
    }
  }

  const result = roomService.joinRoom(normalizedRoomId, parsed.data.name.trim(), participantId);

  if (!result) {
    const room = roomService.getRoom(normalizedRoomId);
    if (room?.locked) {
      return apiError('Room is locked', 403);
    }
    return apiError(
      'Room not found. Ask the host to confirm the room ID and that their session is still open.',
      404,
    );
  }

  return json({
    participantId: result.participant.id,
    guestToken: result.guestToken,
    room: roomService.toPublicInfo(result.room),
  });
}
