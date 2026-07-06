import { handleJoinRoom } from '@/server/handlers/room';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ roomId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { roomId } = await params;
  return handleJoinRoom(roomId, request);
}
