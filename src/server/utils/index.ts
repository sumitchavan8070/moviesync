import { customAlphabet } from 'nanoid';

/** URL-safe room IDs — 8 lowercase chars for easy sharing */
const generateRoomId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);

const generateToken = customAlphabet(
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  32,
);

export function createRoomId(): string {
  return generateRoomId();
}

export function createSecureToken(): string {
  return generateToken();
}

export function createMessageId(): string {
  return customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 16)();
}

export function createRequestId(): string {
  return customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12)();
}

/** Parse HTTP Range header — returns inclusive byte range */
export function parseRangeHeader(
  rangeHeader: string | undefined,
  fileSize: number,
): { start: number; end: number } | null {
  if (!rangeHeader || !rangeHeader.startsWith('bytes=')) {
    return null;
  }

  const parts = rangeHeader.replace(/bytes=/, '').split('-');
  let start = parts[0] ? parseInt(parts[0], 10) : NaN;
  let end = parts[1] ? parseInt(parts[1], 10) : NaN;

  if (Number.isNaN(start) && Number.isNaN(end)) {
    return null;
  }

  if (Number.isNaN(start)) {
    // Suffix range: bytes=-500
    const suffixLength = end;
    start = Math.max(0, fileSize - suffixLength);
    end = fileSize - 1;
  } else if (Number.isNaN(end)) {
    end = fileSize - 1;
  }

  start = Math.max(0, start);
  end = Math.min(fileSize - 1, end);

  if (start > end || start >= fileSize) {
    return null;
  }

  return { start, end };
}

export function sanitizeDisplayName(name: string): string {
  return name.trim().slice(0, 32).replace(/[<>]/g, '');
}

export function sanitizeChatContent(content: string): string {
  return content.trim().slice(0, 2000);
}

export function normalizeRoomId(roomId: string): string {
  return roomId.trim().toLowerCase();
}

export function defaultPlaybackState(): import('../types/index').PlaybackState {
  return {
    currentTime: 0,
    paused: true,
    duration: 0,
    buffer: 0,
    playbackRate: 1,
    updatedAt: Date.now(),
  };
}
