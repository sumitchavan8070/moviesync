import { io, type Socket } from 'socket.io-client';
import type {
  ChatMessage,
  Participant,
  PlaybackState,
  RoomPublicInfo,
  StreamMetadata,
  SyncResponsePayload,
  TypingIndicator,
} from '@/types';
import type { StreamChunkRequest } from '@/types';

import { getSocketUrl } from '@/utils';

export type SocketEventHandlers = {
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (message: string) => void;
  onRoomJoined?: (data: {
    room: RoomPublicInfo;
    participants: Participant[];
    chatHistory: ChatMessage[];
    playback: PlaybackState;
  }) => void;
  onUserJoined?: (data: { participant: Participant }) => void;
  onUserLeft?: (data: { participantId: string; name: string }) => void;
  onStreamStarted?: (data: { metadata: StreamMetadata; playback: PlaybackState }) => void;
  onStreamStopped?: () => void;
  onPlay?: (playback: PlaybackState & { serverTime: number }) => void;
  onPause?: (playback: PlaybackState & { serverTime: number }) => void;
  onSeek?: (playback: PlaybackState & { serverTime: number }) => void;
  onPlaybackRateChange?: (playback: PlaybackState) => void;
  onQualityChange?: (playback: PlaybackState) => void;
  onSyncRequest?: (data: { guestSocketId: string; participantId: string }) => void;
  onSyncResponse?: (data: SyncResponsePayload) => void;
  onChatMessage?: (message: ChatMessage) => void;
  onTyping?: (data: TypingIndicator) => void;
  onHostEnded?: () => void;
  onHostDisconnected?: () => void;
  onHostReconnected?: (data: { metadata: StreamMetadata; playback: PlaybackState }) => void;
  onGuestRemoved?: () => void;
  onRoomLocked?: () => void;
  onRoomUnlocked?: () => void;
  onParticipantUpdated?: (data: { id: string; latencyMs: number }) => void;
  onStreamChunkRequest?: (request: StreamChunkRequest) => void;
};

class SocketService {
  private socket: Socket | null = null;
  private handlers: SocketEventHandlers = {};

  connect(token: string, handlers: SocketEventHandlers): Socket {
    this.handlers = handlers;

    if (this.socket?.connected) {
      this.socket.disconnect();
    }

    this.socket = io(getSocketUrl(), {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    this.bindEvents();
    return this.socket;
  }

  private bindEvents(): void {
    if (!this.socket) return;
    const s = this.socket;

    s.on('connect', () => this.handlers.onConnect?.());
    s.on('disconnect', (reason) => this.handlers.onDisconnect?.(reason));
    s.on('connect_error', (err) => this.handlers.onError?.(err.message));

    s.on('room-joined', (data) => this.handlers.onRoomJoined?.(data));
    s.on('user-joined', (data) => this.handlers.onUserJoined?.(data));
    s.on('user-left', (data) => this.handlers.onUserLeft?.(data));

    s.on('stream-started', (data) => this.handlers.onStreamStarted?.(data));
    s.on('stream-stopped', () => this.handlers.onStreamStopped?.());

    s.on('play', (data) => this.handlers.onPlay?.(data));
    s.on('pause', (data) => this.handlers.onPause?.(data));
    s.on('seek', (data) => this.handlers.onSeek?.(data));
    s.on('change-playback-rate', (data) => this.handlers.onPlaybackRateChange?.(data));
    s.on('change-quality', (data) => this.handlers.onQualityChange?.(data));

    s.on('sync-request', (data) => this.handlers.onSyncRequest?.(data));
    s.on('sync-response', (data) => this.handlers.onSyncResponse?.(data));

    s.on('chat-message', (msg) => this.handlers.onChatMessage?.(msg));
    s.on('typing', (data) => this.handlers.onTyping?.(data));

    s.on('host-ended', () => this.handlers.onHostEnded?.());
    s.on('host-disconnected', () => this.handlers.onHostDisconnected?.());
    s.on('host-reconnected', (data) => this.handlers.onHostReconnected?.(data));
    s.on('guest-removed', () => this.handlers.onGuestRemoved?.());
    s.on('room-locked', () => this.handlers.onRoomLocked?.());
    s.on('room-unlocked', () => this.handlers.onRoomUnlocked?.());
    s.on('participant-updated', (data) => this.handlers.onParticipantUpdated?.(data));
    s.on('stream-chunk-request', (req) => this.handlers.onStreamChunkRequest?.(req));
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  // Host actions
  startStream(metadata: StreamMetadata): void {
    this.socket?.emit('start-stream', metadata);
  }

  stopStream(): void {
    this.socket?.emit('stop-stream');
  }

  sendChunkResponse(requestId: string, data: ArrayBuffer | string, start: number, end: number): void {
    if (data instanceof ArrayBuffer) {
      this.socket?.emit('stream-chunk-response', { requestId, start, end }, data);
    } else {
      this.socket?.emit('stream-chunk-response', { requestId, data, start, end });
    }
  }

  play(currentTime?: number): void {
    this.socket?.emit('play', { roomId: '', currentTime });
  }

  pause(currentTime?: number): void {
    this.socket?.emit('pause', { roomId: '', currentTime });
  }

  seek(currentTime: number): void {
    this.socket?.emit('seek', { roomId: '', currentTime });
  }

  changePlaybackRate(rate: number): void {
    this.socket?.emit('change-playback-rate', { roomId: '', playbackRate: rate });
  }

  changeQuality(quality: string): void {
    this.socket?.emit('change-quality', { roomId: '', quality });
  }

  playbackUpdate(partial: Partial<PlaybackState>): void {
    this.socket?.emit('playback-update', partial);
  }

  lockRoom(): void {
    this.socket?.emit('lock-room');
  }

  unlockRoom(): void {
    this.socket?.emit('unlock-room');
  }

  removeGuest(participantId: string): void {
    this.socket?.emit('remove-guest', participantId);
  }

  endSession(): void {
    this.socket?.emit('end-session');
  }

  // Guest actions
  requestSync(): void {
    this.socket?.emit('sync-request', { roomId: '' });
  }

  respondSync(data: SyncResponsePayload & { guestSocketId?: string }): void {
    this.socket?.emit('sync-response', data);
  }

  sendChat(content: string): void {
    this.socket?.emit('chat-message', { roomId: '', content });
  }

  setTyping(isTyping: boolean): void {
    this.socket?.emit('typing', { roomId: '', isTyping });
  }

  updateLatency(latencyMs: number): void {
    this.socket?.emit('update-latency', latencyMs);
  }

  leaveRoom(): void {
    this.socket?.emit('leave-room');
    this.disconnect();
  }
}

export const socketService = new SocketService();
