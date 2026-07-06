import { getClientIp, rateLimit } from '../api/rate-limit';
import { authenticateRoomToken } from '../api/auth';
import { apiError, json } from '../api/response';
import { roomService } from '../services/room.service';
import { streamRelayService } from '../services/stream-relay.service';
import { parseRangeHeader, normalizeRoomId } from '../utils/index';

const MAX_CHUNK_BYTES = 512 * 1024;

export function handleStreamMetadata(roomId: string, request: Request): Promise<Response> {
  return handleStreamMetadataAsync(roomId, request);
}

async function handleStreamMetadataAsync(roomId: string, request: Request): Promise<Response> {
  const id = normalizeRoomId(roomId);
  const ip = getClientIp(request);
  if (!rateLimit(`stream:${ip}`, 2000, 60_000)) {
    return apiError('Stream rate limit exceeded', 429);
  }

  const auth = await authenticateRoomToken(request);
  if (auth instanceof Response) return auth;

  const room = await roomService.getRoom(id);
  if (!room) {
    return apiError('Room not found', 404);
  }

  if (!room.streamActive || !room.streamMetadata) {
    return apiError('Stream not available', 503);
  }

  return json({
    ...room.streamMetadata,
    acceptRanges: true,
  });
}

export async function handleStreamVideo(roomId: string, request: Request): Promise<Response> {
  const id = normalizeRoomId(roomId);
  const ip = getClientIp(request);
  if (!rateLimit(`stream:${ip}`, 2000, 60_000)) {
    return apiError('Stream rate limit exceeded', 429);
  }

  const auth = await authenticateRoomToken(request);
  if (auth instanceof Response) return auth;

  const room = await roomService.getRoom(id);
  if (!room) {
    return apiError('Room not found', 404);
  }

  if (!room.streamActive || !room.streamMetadata) {
    return apiError('Stream not available', 503);
  }

  if (!room.hostSocketId) {
    return apiError('Host is offline', 503);
  }

  const { mimeType, size, filename } = room.streamMetadata;
  const range = parseRangeHeader(request.headers.get('range') ?? undefined, size);

  const baseHeaders: Record<string, string> = {
    'Accept-Ranges': 'bytes',
    'Content-Type': mimeType,
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
  };

  try {
    if (!range) {
      const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
          let offset = 0;
          try {
            while (offset < size) {
              const end = Math.min(offset + MAX_CHUNK_BYTES - 1, size - 1);
              const chunk = await streamRelayService.createChunkRequest(id, offset, end);
              offset = end + 1;
              controller.enqueue(new Uint8Array(chunk));
            }
            controller.close();
          } catch (err) {
            controller.error(err);
          }
        },
      });

      return new Response(stream, {
        status: 200,
        headers: {
          ...baseHeaders,
          'Content-Length': String(size),
        },
      });
    }

    let { start, end } = range;
    if (end - start + 1 > MAX_CHUNK_BYTES) {
      end = start + MAX_CHUNK_BYTES - 1;
    }
    const contentLength = end - start + 1;

    const chunk = await streamRelayService.createChunkRequest(id, start, end);

    return new Response(new Uint8Array(chunk), {
      status: 206,
      headers: {
        ...baseHeaders,
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Content-Length': String(contentLength),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Stream error';
    if (message.includes('timed out') || message.includes('offline')) {
      return apiError(message, 503);
    }
    return apiError('Failed to stream video chunk', 500);
  }
}
