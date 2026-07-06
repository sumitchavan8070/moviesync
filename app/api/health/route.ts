import { handleHealthCheck } from '@/server/handlers/room';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return handleHealthCheck();
}
