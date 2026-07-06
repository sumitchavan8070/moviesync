import { config } from '../config/index';
import type {
  ChatMessage,
  Participant,
  PlaybackState,
  Room,
  RoomPublicInfo,
  StreamMetadata,
} from '../types/index';
import {
  createMessageId,
  createRoomId,
  createSecureToken,
  defaultPlaybackState,
  sanitizeDisplayName,
} from '../utils/index';
import { authService } from './auth.service';

export class RoomService {
  private rooms = new Map<string, Room>();

  createRoom(hostName: string): {
    room: Room;
    hostToken: string;
    guestToken: string;
  } {
    const roomId = createRoomId();
    const hostParticipantId = createSecureToken();
    const hostToken = authService.signHostToken(roomId, hostParticipantId);
    const guestToken = authService.signGuestToken(roomId, hostParticipantId);

    const now = Date.now();
    const hostParticipant: Participant = {
      id: hostParticipantId,
      socketId: '',
      name: sanitizeDisplayName(hostName) || 'Host',
      isHost: true,
      isMuted: false,
      isSpeaking: false,
      latencyMs: 0,
      joinedAt: now,
      lastSeenAt: now,
    };

    const room: Room = {
      id: roomId,
      hostToken,
      hostParticipantId,
      hostSocketId: null,
      locked: false,
      createdAt: now,
      expiresAt: now + config.sessionExpiryHours * 3600 * 1000,
      streamActive: false,
      streamMetadata: null,
      playback: defaultPlaybackState(),
      participants: new Map([[hostParticipantId, hostParticipant]]),
      chatHistory: [],
      removedParticipantIds: new Set(),
    };

    this.rooms.set(roomId, room);
    return { room, hostToken, guestToken };
  }

  getRoom(roomId: string): Room | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    if (Date.now() > room.expiresAt) {
      this.rooms.delete(roomId);
      return undefined;
    }
    return room;
  }

  deleteRoom(roomId: string): void {
    this.rooms.delete(roomId);
  }

  toPublicInfo(room: Room): RoomPublicInfo {
    return {
      id: room.id,
      locked: room.locked,
      streamActive: room.streamActive,
      participantCount: room.participants.size,
      streamMetadata: room.streamMetadata,
      playback: {
        paused: room.playback.paused,
        duration: room.playback.duration,
      },
    };
  }

  joinRoom(
    roomId: string,
    name: string,
    participantId?: string,
  ): { room: Room; participant: Participant; guestToken: string } | null {
    const room = this.getRoom(roomId);
    if (!room) return null;
    if (room.locked) return null;

    if (participantId) {
      if (room.removedParticipantIds.has(participantId)) return null;
      const existing = room.participants.get(participantId);
      if (existing && !existing.isHost) {
        return {
          room,
          participant: existing,
          guestToken: authService.signGuestToken(roomId, participantId),
        };
      }
    }

    const id = createSecureToken();
    const now = Date.now();
    const participant: Participant = {
      id,
      socketId: '',
      name: sanitizeDisplayName(name) || 'Guest',
      isHost: false,
      isMuted: false,
      isSpeaking: false,
      latencyMs: 0,
      joinedAt: now,
      lastSeenAt: now,
    };

    room.participants.set(id, participant);
    const guestToken = authService.signGuestToken(roomId, id);
    return { room, participant, guestToken };
  }

  bindSocket(room: Room, participantId: string, socketId: string): Participant | null {
    const participant = room.participants.get(participantId);
    if (!participant) return null;

    participant.socketId = socketId;
    participant.lastSeenAt = Date.now();

    if (participant.isHost) {
      room.hostSocketId = socketId;
    }

    return participant;
  }

  unbindSocket(room: Room, socketId: string): Participant | null {
    for (const participant of room.participants.values()) {
      if (participant.socketId === socketId) {
        participant.socketId = '';
        participant.lastSeenAt = Date.now();
        if (participant.isHost) {
          room.hostSocketId = null;
        }
        return participant;
      }
    }
    return null;
  }

  removeParticipant(room: Room, participantId: string): Participant | null {
    const participant = room.participants.get(participantId);
    if (!participant || participant.isHost) return null;
    room.participants.delete(participantId);
    room.removedParticipantIds.add(participantId);
    return participant;
  }

  setStreamMetadata(room: Room, metadata: StreamMetadata): void {
    room.streamMetadata = metadata;
    room.streamActive = true;
    room.playback.duration = metadata.size > 0 ? 0 : 0;
  }

  setStreamActive(room: Room, active: boolean): void {
    room.streamActive = active;
    if (!active) {
      room.streamMetadata = null;
      room.playback = defaultPlaybackState();
    }
  }

  updatePlayback(room: Room, partial: Partial<PlaybackState>): PlaybackState {
    room.playback = {
      ...room.playback,
      ...partial,
      updatedAt: Date.now(),
    };
    return room.playback;
  }

  addChatMessage(
    room: Room,
    participant: Participant,
    content: string,
  ): ChatMessage {
    const message: ChatMessage = {
      id: createMessageId(),
      participantId: participant.id,
      participantName: participant.name,
      content,
      timestamp: Date.now(),
      isHost: participant.isHost,
    };
    room.chatHistory.push(message);
    if (room.chatHistory.length > 200) {
      room.chatHistory = room.chatHistory.slice(-200);
    }
    return message;
  }

  setLocked(room: Room, locked: boolean): void {
    room.locked = locked;
  }

  updateLatency(room: Room, participantId: string, latencyMs: number): void {
    const participant = room.participants.get(participantId);
    if (participant) {
      participant.latencyMs = latencyMs;
      participant.lastSeenAt = Date.now();
    }
  }

  getParticipantsList(room: Room): Participant[] {
    return Array.from(room.participants.values());
  }

  /** Cleanup expired rooms periodically */
  purgeExpired(): number {
    const now = Date.now();
    let count = 0;
    for (const [id, room] of this.rooms) {
      if (now > room.expiresAt) {
        this.rooms.delete(id);
        count++;
      }
    }
    return count;
  }
}

const globalForRoom = globalThis as unknown as { roomService?: RoomService };

export const roomService = globalForRoom.roomService ?? new RoomService();
globalForRoom.roomService = roomService;

// Purge expired rooms every hour
setInterval(() => roomService.purgeExpired(), 3600_000);
