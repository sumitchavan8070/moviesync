import type {
  CreateRoomResponse,
  JoinRoomResponse,
  RoomPublicInfo,
  StreamMetadata,
} from '@/types';
import { getApiUrl, normalizeRoomId } from '@/utils';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      typeof data.error === 'string'
        ? data.error
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}

export const api = {
  health: () => request<{ status: string }>(getApiUrl('/health')),

  createRoom: (hostName: string) =>
    request<CreateRoomResponse>(getApiUrl('/rooms'), {
      method: 'POST',
      body: JSON.stringify({ hostName: hostName.trim() }),
    }),

  getRoom: (roomId: string) =>
    request<{
      room: RoomPublicInfo;
      participants: Array<{
        id: string;
        name: string;
        isHost: boolean;
        latencyMs: number;
        isMuted: boolean;
        isSpeaking: boolean;
        online: boolean;
      }>;
    }>(getApiUrl(`/rooms/${encodeURIComponent(normalizeRoomId(roomId))}`)),

  joinRoom: (roomId: string, name: string, token?: string) =>
    request<JoinRoomResponse>(
      getApiUrl(`/rooms/${encodeURIComponent(normalizeRoomId(roomId))}/join`),
      {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), token }),
      },
    ),

  getStreamMetadata: (roomId: string, token: string) =>
    request<StreamMetadata & { acceptRanges: boolean }>(
      getApiUrl(`/stream/${encodeURIComponent(normalizeRoomId(roomId))}/metadata`),
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
};

export { ApiError };
