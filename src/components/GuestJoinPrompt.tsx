'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Logo, LoadingSpinner } from '@/components/common';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { api, ApiError } from '@/services/api.service';
import { useRoomStore } from '@/store/room.store';
import { generateGuestName } from '@/utils';

/** Shown when a guest opens /room/:id without a session token */
export function GuestJoinPrompt({ roomId }: { roomId: string }) {
  const router = useRouter();
  const setIdentity = useRoomStore((s) => s.setIdentity);
  const reset = useRoomStore((s) => s.reset);

  const [name, setName] = useState(generateGuestName());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');
    try {
      // Clear any stale host session before joining as guest
      reset();
      const res = await api.joinRoom(roomId, name.trim());
      setIdentity({
        roomId,
        token: res.guestToken,
        participantId: res.participantId,
        isHost: false,
        displayName: name.trim(),
      });
      useRoomStore.getState().setSessionStatus('waiting');
      useRoomStore.getState().setConnectionStatus('connecting');
      router.replace(`/room/${roomId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6"
      >
        <div className="text-center">
          <Logo />
          <h1 className="text-2xl font-bold mt-6 mb-1 text-white">Join mauknh.diaries</h1>
          <p className="text-white/50 text-sm">
            Room <span className="text-primary font-mono">{roomId}</span>
          </p>
        </div>

        <GlassCard className="p-6">
          {loading ? (
            <LoadingSpinner message="Joining room..." />
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <Input
                label="Your Name"
                placeholder="Enter your display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={32}
                autoFocus
              />
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" className="w-full" size="lg">
                Join Room
              </Button>
            </form>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}
