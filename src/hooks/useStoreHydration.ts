import { useEffect, useState } from 'react';
import { useRoomStore } from '@/store/room.store';

/** Wait for persisted auth state before gating room access */
export function useStoreHydration(): boolean {
  const [hydrated, setHydrated] = useState(
    () => useRoomStore.persist.hasHydrated(),
  );

  useEffect(() => {
    if (useRoomStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }

    return useRoomStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}
