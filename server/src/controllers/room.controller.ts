import type { Request, Response } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service.js';
import { roomService } from '../services/room.service.js';

const createRoomSchema = z.object({
  hostName: z.string().min(1).max(32),
});

const joinRoomSchema = z.object({
  name: z.string().min(1).max(32),
  token: z.string().optional(),
});

export function createRoom(req: Request, res: Response): void {
  const parsed = createRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  const { room, hostToken, guestToken } = roomService.createRoom(parsed.data.hostName);

  res.status(201).json({
    roomId: room.id,
    hostToken,
    guestToken,
    participantId: room.hostParticipantId,
    room: roomService.toPublicInfo(room),
  });
}

export function getRoomInfo(req: Request, res: Response): void {
  const roomId = String(req.params.roomId);
  const room = roomService.getRoom(roomId);

  if (!room) {
    res.status(404).json({ error: 'Room not found or expired' });
    return;
  }

  res.json({
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

export function joinRoom(req: Request, res: Response): void {
  const roomId = String(req.params.roomId);
  const parsed = joinRoomSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  let participantId: string | undefined;
  if (parsed.data.token) {
    const payload = authService.verifyRoomToken(parsed.data.token);
    if (payload && payload.roomId === roomId) {
      participantId = payload.participantId;
    }
  }

  const result = roomService.joinRoom(roomId, parsed.data.name, participantId);

  if (!result) {
    const room = roomService.getRoom(roomId);
    if (room?.locked) {
      res.status(403).json({ error: 'Room is locked' });
      return;
    }
    res.status(404).json({ error: 'Room not found or expired' });
    return;
  }

  res.json({
    participantId: result.participant.id,
    guestToken: result.guestToken,
    room: roomService.toPublicInfo(result.room),
  });
}

export function healthCheck(_req: Request, res: Response): void {
  res.json({ status: 'ok', timestamp: Date.now(), service: 'mauknh.diaries' });
}
