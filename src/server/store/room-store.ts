import { Redis } from '@upstash/redis';
import type { Room } from '../types/index';

export type StoredRoom = Omit<Room, 'participants' | 'removedParticipantIds'> & {
  participants: Record<string, Room['participants'] extends Map<string, infer P> ? P : never>;
  removedParticipantIds: string[];
};

let redisClient: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    redisClient = null;
    return null;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

export function isPersistentStoreEnabled(): boolean {
  return getRedis() !== null;
}

export function serializeRoom(room: Room): StoredRoom {
  return {
    ...room,
    participants: Object.fromEntries(room.participants.entries()),
    removedParticipantIds: [...room.removedParticipantIds],
  };
}

export function deserializeRoom(data: StoredRoom): Room {
  return {
    ...data,
    participants: new Map(Object.entries(data.participants)),
    removedParticipantIds: new Set(data.removedParticipantIds),
  };
}

function roomKey(roomId: string): string {
  return `mauknh:room:${roomId}`;
}

export async function loadRoomFromStore(roomId: string): Promise<Room | undefined> {
  const redis = getRedis();
  if (!redis) return undefined;

  const data = await redis.get<StoredRoom>(roomKey(roomId));
  if (!data) return undefined;
  return deserializeRoom(data);
}

export async function saveRoomToStore(room: Room): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const ttlSeconds = Math.max(60, Math.floor((room.expiresAt - Date.now()) / 1000));
  await redis.set(roomKey(room.id), serializeRoom(room), { ex: ttlSeconds });
}

export async function deleteRoomFromStore(roomId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(roomKey(roomId));
}
