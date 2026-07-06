import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { config } from '../config/index.js';
import { authService } from '../services/auth.service.js';
import { roomService } from '../services/room.service.js';
import { streamRelayService } from '../services/stream-relay.service.js';
import type {
  ChatMessagePayload,
  PlaybackRatePayload,
  PlayPausePayload,
  QualityPayload,
  SeekPayload,
  StreamChunkResponse,
  StreamMetadata,
  SyncRequestPayload,
  SyncResponsePayload,
  TypingPayload,
} from '../types/index.js';
import { sanitizeChatContent } from '../utils/index.js';

interface AuthenticatedSocket extends Socket {
  roomId?: string;
  participantId?: string;
  isHost?: boolean;
}

export function setupSocketIO(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: config.isProduction ? config.corsOrigins : true,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    maxHttpBufferSize: 50e6, // 50MB for binary chunk transfer
    pingTimeout: 60_000,
    pingInterval: 25_000,
  });

  // Wire stream relay to host sockets
  streamRelayService.on('chunk-request', ({ requestId, roomId, start, end }) => {
    const room = roomService.getRoom(roomId);
    if (!room?.hostSocketId) {
      streamRelayService.rejectChunk(requestId, 'Host offline');
      return;
    }
    io.to(room.hostSocketId).emit('stream-chunk-request', { requestId, roomId, start, end });
  });

  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error('Authentication required'));
      return;
    }

    const payload = authService.verifyRoomToken(token);
    if (!payload) {
      next(new Error('Invalid token'));
      return;
    }

    const room = roomService.getRoom(payload.roomId);
    if (!room) {
      next(new Error('Room not found'));
      return;
    }

    if (room.removedParticipantIds.has(payload.participantId)) {
      next(new Error('Removed from room'));
      return;
    }

    socket.roomId = payload.roomId;
    socket.participantId = payload.participantId;
    socket.isHost = payload.isHost;
    next();
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const roomId = socket.roomId!;
    const participantId = socket.participantId!;
    const isHost = socket.isHost!;

    const room = roomService.getRoom(roomId);
    if (!room) {
      socket.disconnect(true);
      return;
    }

    const participant = roomService.bindSocket(room, participantId, socket.id);
    if (!participant) {
      socket.disconnect(true);
      return;
    }

    socket.join(roomId);

    // Notify others of join (skip if reconnecting with same name)
    socket.to(roomId).emit('user-joined', {
      participant: {
        id: participant.id,
        name: participant.name,
        isHost: participant.isHost,
        latencyMs: participant.latencyMs,
        isMuted: participant.isMuted,
        isSpeaking: participant.isSpeaking,
        online: true,
      },
    });

    // Send current room state to joining user
    socket.emit('room-joined', {
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
      chatHistory: room.chatHistory,
      playback: room.playback,
    });

    // Notify guests when host reconnects with an active stream
    if (participant.isHost && room.streamActive && room.streamMetadata) {
      socket.to(roomId).emit('host-reconnected', {
        metadata: room.streamMetadata,
        playback: room.playback,
      });
    }

    // --- Host-only events ---

    socket.on('start-stream', (metadata: StreamMetadata) => {
      if (!isHost) return;
      if (!metadata?.mimeType || !metadata?.size || !metadata?.filename) return;

      const enriched: StreamMetadata = {
        ...metadata,
        mediaType:
          metadata.mediaType ??
          (metadata.mimeType.startsWith('audio/') ? 'audio' : 'video'),
      };

      roomService.setStreamMetadata(room, enriched);
      io.to(roomId).emit('stream-started', {
        metadata: enriched,
        playback: room.playback,
      });
    });

    socket.on('stop-stream', () => {
      if (!isHost) return;
      streamRelayService.cancelAllForRoom(roomId);
      roomService.setStreamActive(room, false);
      io.to(roomId).emit('stream-stopped');
    });

    socket.on('stream-chunk-response', (response: StreamChunkResponse, binaryChunk?: Buffer) => {
      if (!isHost) return;
      try {
        let buffer: Buffer;
        if (binaryChunk && Buffer.isBuffer(binaryChunk)) {
          buffer = binaryChunk;
        } else if (response.data) {
          buffer = Buffer.from(response.data, 'base64');
        } else {
          streamRelayService.rejectChunk(response.requestId, 'Empty chunk data');
          return;
        }
        streamRelayService.fulfillChunk(
          response.requestId,
          buffer,
          response.start,
          response.end,
        );
      } catch {
        streamRelayService.rejectChunk(response.requestId, 'Invalid chunk data');
      }
    });

    socket.on('lock-room', () => {
      if (!isHost) return;
      roomService.setLocked(room, true);
      io.to(roomId).emit('room-locked');
    });

    socket.on('unlock-room', () => {
      if (!isHost) return;
      roomService.setLocked(room, false);
      io.to(roomId).emit('room-unlocked');
    });

    socket.on('remove-guest', (targetParticipantId: string) => {
      if (!isHost) return;
      const removed = roomService.removeParticipant(room, targetParticipantId);
      if (!removed) return;

      const targetSocketId = removed.socketId;
      if (targetSocketId) {
        io.to(targetSocketId).emit('guest-removed', { participantId: targetParticipantId });
        io.sockets.sockets.get(targetSocketId)?.disconnect(true);
      }

      io.to(roomId).emit('user-left', {
        participantId: targetParticipantId,
        name: removed.name,
      });
    });

    socket.on('end-session', () => {
      if (!isHost) return;
      streamRelayService.cancelAllForRoom(roomId);
      io.to(roomId).emit('host-ended');
      roomService.deleteRoom(roomId);
      io.in(roomId).disconnectSockets(true);
    });

    // --- Playback sync (host authoritative) ---

    socket.on('play', (payload: PlayPausePayload) => {
      if (!isHost) return;
      const playback = roomService.updatePlayback(room, {
        paused: false,
        currentTime: payload.currentTime ?? room.playback.currentTime,
      });
      socket.to(roomId).emit('play', { ...playback, serverTime: Date.now() });
    });

    socket.on('pause', (payload: PlayPausePayload) => {
      if (!isHost) return;
      const playback = roomService.updatePlayback(room, {
        paused: true,
        currentTime: payload.currentTime ?? room.playback.currentTime,
      });
      socket.to(roomId).emit('pause', { ...playback, serverTime: Date.now() });
    });

    socket.on('seek', (payload: SeekPayload) => {
      if (!isHost) return;
      const playback = roomService.updatePlayback(room, {
        currentTime: payload.currentTime,
      });
      socket.to(roomId).emit('seek', { ...playback, serverTime: Date.now() });
    });

    socket.on('change-playback-rate', (payload: PlaybackRatePayload) => {
      if (!isHost) return;
      const playback = roomService.updatePlayback(room, {
        playbackRate: payload.playbackRate,
      });
      socket.to(roomId).emit('change-playback-rate', playback);
    });

    socket.on('change-quality', (payload: QualityPayload) => {
      if (!isHost) return;
      const playback = roomService.updatePlayback(room, {
        quality: payload.quality,
      });
      socket.to(roomId).emit('change-quality', playback);
    });

    // Host updates duration/buffer from their player
    socket.on('playback-update', (partial: Partial<typeof room.playback>) => {
      if (!isHost) return;
      roomService.updatePlayback(room, partial);
    });

    // --- Sync ---

    socket.on('sync-request', (_payload: SyncRequestPayload) => {
      if (isHost) return;
      // Forward to host
      if (room.hostSocketId) {
        io.to(room.hostSocketId).emit('sync-request', {
          guestSocketId: socket.id,
          participantId,
        });
      } else {
        socket.emit('host-disconnected');
      }
    });

    socket.on(
      'sync-response',
      (payload: SyncResponsePayload & { guestSocketId?: string }) => {
        if (!isHost) return;
        const target = payload.guestSocketId ?? roomId;
        io.to(target).emit('sync-response', {
          ...payload,
          serverTime: Date.now(),
        });
        roomService.updatePlayback(room, {
          currentTime: payload.currentTime,
          paused: payload.paused,
          duration: payload.duration,
          buffer: payload.buffer,
          playbackRate: payload.playbackRate,
          quality: payload.quality,
        });
      },
    );

    // --- Chat ---

    socket.on('chat-message', (payload: ChatMessagePayload) => {
      const content = sanitizeChatContent(payload.content);
      if (!content) return;

      const message = roomService.addChatMessage(room, participant, content);
      io.to(roomId).emit('chat-message', message);
    });

    socket.on('typing', (payload: TypingPayload) => {
      socket.to(roomId).emit('typing', {
        participantId,
        participantName: participant.name,
        isTyping: payload.isTyping,
      });
    });

    socket.on('update-latency', (latencyMs: number) => {
      roomService.updateLatency(room, participantId, latencyMs);
      socket.to(roomId).emit('participant-updated', {
        id: participantId,
        latencyMs,
      });
    });

    // --- Disconnect ---

    socket.on('disconnect', () => {
      const disconnected = roomService.unbindSocket(room, socket.id);
      if (!disconnected) return;

      if (disconnected.isHost) {
        streamRelayService.cancelAllForRoom(roomId);
        io.to(roomId).emit('host-disconnected');
      } else {
        socket.to(roomId).emit('user-left', {
          participantId: disconnected.id,
          name: disconnected.name,
        });
      }
    });

    socket.on('leave-room', () => {
      socket.disconnect(true);
    });
  });

  return io;
}
