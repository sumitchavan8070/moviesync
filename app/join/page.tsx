import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/common';
import { JoinRoomPageClient } from './JoinRoomPageClient';

export default function JoinPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Loading..." />}>
      <JoinRoomPageClient />
    </Suspense>
  );
}
