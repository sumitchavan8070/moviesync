'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Logo, LoadingSpinner } from '@/components/common';
import { Button } from '@/components/ui/Button';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/Input';
import { api, ApiError } from '@/services/api.service';
import { useRoomStore } from '@/store/room.store';

const schema = z.object({
  hostName: z.string().min(1, 'Name is required').max(32),
});

type FormData = z.infer<typeof schema>;

export function CreateRoomPage() {
  const router = useRouter();
  const setIdentity = useRoomStore((s) => s.setIdentity);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { hostName: '' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.createRoom(data.hostName);
      setIdentity({
        roomId: res.roomId,
        token: res.hostToken,
        participantId: res.participantId,
        isHost: true,
        displayName: data.hostName,
      });
      router.push(`/room/${res.roomId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create room');
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
          <h1 className="text-2xl font-bold mt-6 mb-2">Create a Room</h1>
          <p className="text-text-muted text-sm">Start streaming your local video to guests</p>
        </div>

        <GlassCard className="p-6">
          {loading ? (
            <LoadingSpinner message="Creating room..." />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Your Name"
                placeholder="Enter your display name"
                error={errors.hostName?.message}
                {...register('hostName')}
              />
              {error && <p className="text-sm text-danger">{error}</p>}
              <Button type="submit" className="w-full" loading={loading}>
                Create Room
              </Button>
            </form>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}
