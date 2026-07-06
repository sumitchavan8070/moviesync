/** Shared domain types for mauknh.diaries server */

export type MediaType = 'video' | 'audio';

export interface StreamMetadata {
  mimeType: string;
  size: number;
  filename: string;
  mediaType: MediaType;
}

export interface PlaybackState {
  currentTime: number;
  paused: boolean;
  duration: number;
  buffer: number;
  playbackRate: number;
  quality?: string;
  updatedAt: number;
}

export interface Participant {
  id: string;
  socketId: string;
  name: string;
  isHost: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  latencyMs: number;
  joinedAt: number;
  lastSeenAt: number;
}

export interface ChatMessage {
  id: string;
  participantId: string;
  participantName: string;
  content: string;
  timestamp: number;
  isHost: boolean;
}

export interface Room {
  id: string;
  hostToken: string;
  hostParticipantId: string;
  hostSocketId: string | null;
  locked: boolean;
  createdAt: number;
  expiresAt: number;
  streamActive: boolean;
  streamMetadata: StreamMetadata | null;
  playback: PlaybackState;
  participants: Map<string, Participant>;
  chatHistory: ChatMessage[];
  removedParticipantIds: Set<string>;
}

export interface RoomPublicInfo {
  id: string;
  locked: boolean;
  streamActive: boolean;
  participantCount: number;
  streamMetadata: StreamMetadata | null;
  playback: Pick<PlaybackState, 'paused' | 'duration'>;
}

export interface TokenPayload {
  roomId: string;
  participantId: string;
  isHost: boolean;
  exp: number;
}

export interface StreamChunkRequest {
  requestId: string;
  roomId: string;
  start: number;
  end: number;
}

export interface StreamChunkResponse {
  requestId: string;
  /** Base64-encoded chunk for socket transport */
  data: string;
  start: number;
  end: number;
}

export interface SyncRequestPayload {
  roomId: string;
}

export interface SyncResponsePayload {
  currentTime: number;
  paused: boolean;
  duration: number;
  buffer: number;
  playbackRate: number;
  quality?: string;
  serverTime: number;
}

export interface PlayPausePayload {
  roomId: string;
  currentTime?: number;
}

export interface SeekPayload {
  roomId: string;
  currentTime: number;
}

export interface PlaybackRatePayload {
  roomId: string;
  playbackRate: number;
}

export interface QualityPayload {
  roomId: string;
  quality: string;
}

export interface ChatMessagePayload {
  roomId: string;
  content: string;
}

export interface TypingPayload {
  roomId: string;
  isTyping: boolean;
}

export interface JoinRoomPayload {
  roomId: string;
  name: string;
  token?: string;
}

export interface CreateRoomPayload {
  hostName: string;
}

export interface CreateRoomResponse {
  roomId: string;
  hostToken: string;
  participantId: string;
  guestToken: string;
}

export interface JoinRoomResponse {
  participantId: string;
  guestToken: string;
  room: RoomPublicInfo;
}

export type SocketUserEvent =
  | 'create-room'
  | 'join-room'
  | 'leave-room'
  | 'play'
  | 'pause'
  | 'seek'
  | 'change-playback-rate'
  | 'change-quality'
  | 'chat-message'
  | 'typing'
  | 'sync-request'
  | 'sync-response'
  | 'stream-chunk-request'
  | 'stream-chunk-response'
  | 'start-stream'
  | 'stop-stream'
  | 'lock-room'
  | 'unlock-room'
  | 'remove-guest'
  | 'end-session'
  | 'update-latency'
  | 'stream-metadata';

export type SocketServerEvent =
  | 'room-created'
  | 'room-joined'
  | 'user-joined'
  | 'user-left'
  | 'play'
  | 'pause'
  | 'seek'
  | 'change-playback-rate'
  | 'change-quality'
  | 'chat-message'
  | 'typing'
  | 'sync-request'
  | 'sync-response'
  | 'host-ended'
  | 'host-disconnected'
  | 'stream-started'
  | 'stream-stopped'
  | 'room-locked'
  | 'room-unlocked'
  | 'guest-removed'
  | 'error'
  | 'stream-chunk-request'
  | 'stream-chunk-response'
  | 'participant-updated';
