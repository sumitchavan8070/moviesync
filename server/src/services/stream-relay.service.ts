import { EventEmitter } from 'events';
import { config } from '../config/index.js';
import { createRequestId } from '../utils/index.js';

interface PendingChunk {
  resolve: (buffer: Buffer) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Coordinates HTTP range requests with the host browser.
 * Chunks are relayed in-memory only for the duration of each request —
 * the full file is never stored on the server.
 */
export class StreamRelayService extends EventEmitter {
  private pending = new Map<string, PendingChunk>();
  private activeRequests = 0;

  createChunkRequest(roomId: string, start: number, end: number): Promise<Buffer> {
    if (this.activeRequests >= config.maxConcurrentStreamRequests) {
      return Promise.reject(new Error('Too many concurrent stream requests'));
    }

    const requestId = createRequestId();
    this.activeRequests++;

    return new Promise<Buffer>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        this.activeRequests = Math.max(0, this.activeRequests - 1);
        reject(new Error('Stream chunk request timed out'));
      }, config.streamChunkTimeoutMs);

      this.pending.set(requestId, { resolve, reject, timer });

      this.emit('chunk-request', { requestId, roomId, start, end });
    });
  }

  fulfillChunk(requestId: string, data: Buffer, start: number, end: number): void {
    const pending = this.pending.get(requestId);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pending.delete(requestId);
    this.activeRequests = Math.max(0, this.activeRequests - 1);

    const expectedSize = end - start + 1;
    if (data.length !== expectedSize) {
      pending.reject(
        new Error(`Chunk size mismatch: expected ${expectedSize}, got ${data.length}`),
      );
      return;
    }

    pending.resolve(data);
  }

  rejectChunk(requestId: string, message: string): void {
    const pending = this.pending.get(requestId);
    if (!pending) return;

    clearTimeout(pending.timer);
    this.pending.delete(requestId);
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    pending.reject(new Error(message));
  }

  cancelAllForRoom(_roomId: string): void {
    for (const [requestId, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Stream session ended'));
      this.pending.delete(requestId);
    }
    this.activeRequests = 0;
  }
}

export const streamRelayService = new StreamRelayService();
