'use client';

import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { FilePicker } from '@/components/FilePicker';
import { GuestJoinPrompt } from '@/components/GuestJoinPrompt';
import { GuestRoomView } from '@/components/GuestRoomView';
import { LoadingSpinner, StatusScreen } from '@/components/common';
import { TopBar } from '@/components/RoomLinkBar';
import { Sidebar } from '@/components/Sidebar';
import { MediaPlayer } from '@/components/MediaPlayer';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { useSocketConnection } from '@/hooks/useSocketConnection';
import { socketService } from '@/services/socket.service';
import { useRoomStore } from '@/store/room.store';
import { useUiStore } from '@/store/room.store';
import { detectMediaType, getMimeType } from '@/utils';

export function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params?.roomId;
  const router = useRouter();
  const isMobile = useIsMobile();

  const isHost = useRoomStore((s) => s.isHost);
  const token = useRoomStore((s) => s.token);
  const storedRoomId = useRoomStore((s) => s.roomId);
  const mediaFile = useRoomStore((s) => s.mediaFile);
  const mediaType = useRoomStore((s) => s.mediaType);
  const room = useRoomStore((s) => s.room);
  const streamUrl = useRoomStore((s) => s.streamUrl);
  const sessionStatus = useRoomStore((s) => s.sessionStatus);
  const connectionStatus = useRoomStore((s) => s.connectionStatus);
  const isLocked = useRoomStore((s) => s.isLocked);
  const showSettings = useRoomStore((s) => s.showSettings);
  const setMediaFile = useRoomStore((s) => s.setMediaFile);
  const setShowSettings = useRoomStore((s) => s.setShowSettings);
  const setSessionStatus = useRoomStore((s) => s.setSessionStatus);
  const setStreamUrl = useRoomStore((s) => s.setStreamUrl);
  const reset = useRoomStore((s) => s.reset);

  const isSidebarOpen = useUiStore((s) => s.isSidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setIsMobile = useUiStore((s) => s.setIsMobile);

  const [streaming, setStreaming] = useState(false);

  const { registerVideoRef } = useSocketConnection();

  useEffect(() => {
    setIsMobile(isMobile);
  }, [isMobile, setIsMobile]);

  const handleStartStream = useCallback(() => {
    if (!mediaFile) return;
    const type = detectMediaType(mediaFile);
    setStreamUrl(URL.createObjectURL(mediaFile));
    socketService.startStream({
      mimeType: getMimeType(mediaFile, type),
      size: mediaFile.size,
      filename: mediaFile.name,
      mediaType: type,
    });
    setStreaming(true);
    setSessionStatus('streaming');
  }, [mediaFile, setSessionStatus, setStreamUrl]);

  const handleStopStream = useCallback(() => {
    socketService.stopStream();
    setStreaming(false);
    setSessionStatus('idle');
  }, [setSessionStatus]);

  const handleEndSession = useCallback(() => {
    socketService.endSession();
    reset();
    router.push('/');
  }, [reset, router]);

  if (!roomId) {
    router.push('/');
    return null;
  }

  // Must be a valid session for THIS room
  const isHostForRoom = isHost && token && storedRoomId === roomId;
  const isGuestForRoom = !isHost && token && storedRoomId === roomId;

  if (!isHostForRoom && !isGuestForRoom) {
    return <GuestJoinPrompt roomId={roomId} />;
  }

  // Host without token
  if (isHostForRoom && !token) {
    router.push('/create');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="Redirecting..." />
      </div>
    );
  }

  // ── Guest views ──
  if (isGuestForRoom) {
    if (sessionStatus === 'host-ended') {
      return (
        <StatusScreen
          icon="👋"
          title="Session Ended"
          description="The host has ended this session."
          action={<Button onClick={() => router.push('/')}>Go Home</Button>}
        />
      );
    }
    if (sessionStatus === 'removed') {
      return (
        <StatusScreen
          icon="🚫"
          title="Removed"
          description="You have been removed from this room by the host."
          action={<Button onClick={() => router.push('/')}>Go Home</Button>}
        />
      );
    }

    return (
      <GuestRoomView
        roomId={roomId}
        streamUrl={streamUrl ?? ''}
        registerVideoRef={registerVideoRef}
        sessionStatus={sessionStatus}
        connectionStatus={connectionStatus}
      />
    );
  }

  // ── Host view ──
  if (connectionStatus === 'connecting') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="Connecting to room..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar roomId={roomId} onSettings={() => setShowSettings(true)} />

      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-[1600px] mx-auto w-full">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col gap-4 min-w-0"
        >
          <MediaPlayer
            src={streamUrl}
            isHost={isHost}
            mediaType={mediaType ?? 'video'}
            title={mediaFile?.name ?? room?.streamMetadata?.filename}
            onRegisterRef={registerVideoRef}
          />

          <div className="glass rounded-[24px] p-4 space-y-4">
            <FilePicker
              selectedFile={mediaFile}
              onFileSelect={setMediaFile}
              disabled={streaming}
            />
            <div className="flex flex-wrap gap-3">
              {!streaming ? (
                <Button
                  onClick={handleStartStream}
                  disabled={!mediaFile}
                  className="flex-1 sm:flex-none"
                >
                  {mediaType === 'audio' ? 'Start Listening' : 'Start Streaming'}
                </Button>
              ) : (
                <Button variant="danger" onClick={handleStopStream}>
                  Stop Streaming
                </Button>
              )}
              <Button
                variant="secondary"
                onClick={() => (isLocked ? socketService.unlockRoom() : socketService.lockRoom())}
              >
                {isLocked ? '🔒 Locked' : '🔓 Lock Room'}
              </Button>
              <Button variant="danger" onClick={handleEndSession}>
                End Session
              </Button>
            </div>
          </div>
        </motion.div>

        {(isSidebarOpen || !isMobile) && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full lg:w-80 xl:w-96 shrink-0 h-[400px] lg:h-auto lg:min-h-[500px]"
          >
            <Sidebar />
          </motion.div>
        )}

        {isMobile && (
          <button
            onClick={toggleSidebar}
            className="fixed bottom-4 right-4 w-14 h-14 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center text-xl z-40"
          >
            💬
          </button>
        )}
      </div>

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onEndSession={handleEndSession}
      />
    </div>
  );
}

function SettingsModal({
  open,
  onClose,
  onEndSession,
}: {
  open: boolean;
  onClose: () => void;
  onEndSession: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Settings">
      <div className="space-y-4">
        <div className="text-sm text-text-muted space-y-2">
          <p>Keyboard shortcuts:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Space — Play/Pause</li>
            <li>← / → — Skip 10s</li>
            <li>F — Fullscreen</li>
            <li>M — Mute</li>
          </ul>
        </div>
        <Button variant="danger" className="w-full" onClick={onEndSession}>
          End Session
        </Button>
      </div>
    </Modal>
  );
}
