import { handleGetRoom } from '@/server/handlers/room';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ roomId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { roomId } = await params;
  return handleGetRoom(roomId);
}
