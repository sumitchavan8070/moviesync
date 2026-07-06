import { handleCreateRoom } from '@/server/handlers/room';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(request: Request) {
  return handleCreateRoom(request);
}
