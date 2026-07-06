import { Readable } from 'stream';
import type { Request, Response } from 'express';
import { roomService } from '../services/room.service.js';
import { streamRelayService } from '../services/stream-relay.service.js';
import { parseRangeHeader } from '../utils/index.js';

/** Max bytes per single range request — keeps socket payloads reliable */
const MAX_CHUNK_BYTES = 512 * 1024;

/**
 * HTTP Range streaming endpoint.
 * Relays byte ranges from the host browser — never stores the full file.
 */
export async function streamVideo(req: Request, res: Response): Promise<void> {
  const roomId = String(req.params.roomId);
  const room = roomService.getRoom(roomId);

  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  if (!room.streamActive || !room.streamMetadata) {
    res.status(503).json({ error: 'Stream not available' });
    return;
  }

  if (!room.hostSocketId) {
    res.status(503).json({ error: 'Host is offline' });
    return;
  }

  const { mimeType, size, filename } = room.streamMetadata;
  const range = parseRangeHeader(req.headers.range, size);

  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${encodeURIComponent(filename)}"`,
  );

  try {
    if (!range) {
      // Full file request — stream in chunks without loading into memory
      res.status(200);
      res.setHeader('Content-Length', size);

      const chunkSize = MAX_CHUNK_BYTES;
      let offset = 0;

      const stream = new Readable({
        read() {
          // Backpressure handled via async chunk fetching
        },
      });

      stream.pipe(res);

      const pump = async (): Promise<void> => {
        while (offset < size) {
          const end = Math.min(offset + chunkSize - 1, size - 1);
          try {
            const chunk = await streamRelayService.createChunkRequest(roomId, offset, end);
            offset = end + 1;
            if (!stream.push(chunk)) {
              await new Promise<void>((resolve) => stream.once('drain', resolve));
            }
          } catch (err) {
            stream.destroy(err as Error);
            return;
          }
        }
        stream.push(null);
      };

      req.on('close', () => {
        stream.destroy();
      });

      await pump();
      return;
    }

    // Partial content — 206
    let { start, end } = range;
    if (end - start + 1 > MAX_CHUNK_BYTES) {
      end = start + MAX_CHUNK_BYTES - 1;
    }
    const contentLength = end - start + 1;

    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
    res.setHeader('Content-Length', contentLength);

    const chunk = await streamRelayService.createChunkRequest(roomId, start, end);

    const stream = Readable.from(chunk);
    req.on('close', () => {
      stream.destroy();
    });

    stream.pipe(res);
  } catch (err) {
    if (!res.headersSent) {
      const message = err instanceof Error ? err.message : 'Stream error';
      if (message.includes('timed out') || message.includes('offline')) {
        res.status(503).json({ error: message });
      } else {
        res.status(500).json({ error: 'Failed to stream video chunk' });
      }
    }
  }
}

export function getStreamMetadata(req: Request, res: Response): void {
  const roomId = String(req.params.roomId);
  const room = roomService.getRoom(roomId);

  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  if (!room.streamActive || !room.streamMetadata) {
    res.status(503).json({ error: 'Stream not available' });
    return;
  }

  res.json({
    ...room.streamMetadata,
    acceptRanges: true,
  });
}
