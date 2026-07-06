'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Logo, LoadingSpinner } from '@/components/common';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { api, ApiError } from '@/services/api.service';
import { useRoomStore } from '@/store/room.store';
import { generateGuestName, normalizeRoomId } from '@/utils';

const schema = z.object({
  roomId: z.string().trim().min(4, 'Room ID is required').max(12),
  guestName: z.string().trim().min(1, 'Name is required').max(32),
});

type FormData = z.infer<typeof schema>;

export function JoinRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setIdentity = useRoomStore((s) => s.setIdentity);
  const reset = useRoomStore((s) => s.reset);
  const storedToken = useRoomStore((s) => s.token);
  const storedRoomId = useRoomStore((s) => s.roomId);
  const storedIsHost = useRoomStore((s) => s.isHost);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      roomId: searchParams?.get('room')?.trim() || '',
      guestName: generateGuestName(),
    },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');

    const roomId = normalizeRoomId(data.roomId);
    const guestName = data.guestName.trim();

    try {
      if (storedIsHost || (storedRoomId && normalizeRoomId(storedRoomId) !== roomId)) {
        reset();
      }

      const rejoinToken =
        !storedIsHost &&
        storedToken &&
        storedRoomId &&
        normalizeRoomId(storedRoomId) === roomId
          ? storedToken
          : undefined;

      const res = await api.joinRoom(roomId, guestName, rejoinToken);

      setIdentity({
        roomId,
        token: res.guestToken,
        participantId: res.participantId,
        isHost: false,
        displayName: guestName,
      });

      router.push(`/room/${roomId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6"
      >
        <div className="text-center">
          <Logo />
          <h1 className="text-2xl font-bold mt-6 mb-2">Join a Room</h1>
          <p className="text-text-muted text-sm">Enter the room ID from your host</p>
        </div>

        <GlassCard className="p-6">
          {loading ? (
            <LoadingSpinner message="Joining room..." />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Room ID"
                placeholder="e.g. 9ghda81p"
                autoComplete="off"
                spellCheck={false}
                error={errors.roomId?.message}
                {...register('roomId')}
              />
              <Input
                label="Your Name"
                placeholder="Enter your display name"
                error={errors.guestName?.message}
                {...register('guestName')}
              />
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" className="w-full" loading={loading}>
                Join Room
              </Button>
            </form>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}
