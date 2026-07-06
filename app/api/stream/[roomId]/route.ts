import { handleStreamVideo } from '@/server/handlers/stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ roomId: string }> };

export async function GET(request: Request, { params }: Params) {
  const { roomId } = await params;
  return handleStreamVideo(roomId, request);
}
