const API_URL = import.meta.env.VITE_API_URL || '';

/** Use same-origin in dev so Vite proxies /api and /socket.io (port 5173 only — no firewall issues) */
export function getBackendUrl(): string {
  return API_URL;
}

export function getSocketUrl(): string | undefined {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  return undefined;
}

export function getApiUrl(path: string): string {
  const base = getBackendUrl();
  return base ? `${base}/api${path}` : `/api${path}`;
}

export function getStreamUrl(roomId: string, token: string): string {
  const base = getBackendUrl();
  const path = `/api/stream/${roomId}?token=${encodeURIComponent(token)}&_=${Date.now()}`;
  return base ? `${base}${path}` : path;
}

export function getRoomUrl(roomId: string): string {
  return `${window.location.origin}/room/${roomId}`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatLatency(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

export function supportsTouch(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/** Convert ArrayBuffer to base64 without loading entire file at once for large chunks */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function generateGuestName(): string {
  const adjectives = ['Swift', 'Cosmic', 'Neon', 'Silent', 'Golden', 'Crystal'];
  const nouns = ['Viewer', 'Watcher', 'Guest', 'Fan', 'Critic', 'Fanatic'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}${noun}${Math.floor(Math.random() * 99)}`;
}

const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'flac', 'aac', 'm4a', 'ogg', 'wma', 'opus', 'aiff', 'webm']);

export function detectMediaType(file: File): import('@/types').MediaType {
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('video/')) return 'video';
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext && AUDIO_EXTENSIONS.has(ext)) return 'audio';
  return 'video';
}

export function getMimeType(file: File, mediaType: import('@/types').MediaType): string {
  if (file.type) return file.type;
  return mediaType === 'audio' ? 'audio/mpeg' : 'video/mp4';
}

export function isMediaFile(file: File): boolean {
  const type = detectMediaType(file);
  if (file.type.startsWith('audio/') || file.type.startsWith('video/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext) return false;
  if (type === 'audio') return AUDIO_EXTENSIONS.has(ext);
  return ['mp4', 'webm', 'mkv', 'mov', 'avi', 'm4v', 'ogv'].includes(ext);
}
