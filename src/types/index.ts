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
  updatedAt?: number;
  serverTime?: number;
}

export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  latencyMs: number;
  isMuted: boolean;
  isSpeaking: boolean;
  online: boolean;
}

export interface ChatMessage {
  id: string;
  participantId: string;
  participantName: string;
  content: string;
  timestamp: number;
  isHost: boolean;
}

export interface RoomPublicInfo {
  id: string;
  locked: boolean;
  streamActive: boolean;
  participantCount: number;
  streamMetadata: StreamMetadata | null;
  playback: Pick<PlaybackState, 'paused' | 'duration'>;
}

export interface CreateRoomResponse {
  roomId: string;
  hostToken: string;
  guestToken: string;
  participantId: string;
  room: RoomPublicInfo;
}

export interface JoinRoomResponse {
  participantId: string;
  guestToken: string;
  room: RoomPublicInfo;
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

export interface TypingIndicator {
  participantId: string;
  participantName: string;
  isTyping: boolean;
}

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export type SessionStatus =
  | 'idle'
  | 'waiting'
  | 'streaming'
  | 'host-offline'
  | 'host-ended'
  | 'removed';

export interface StreamChunkRequest {
  requestId: string;
  roomId: string;
  start: number;
  end: number;
}
