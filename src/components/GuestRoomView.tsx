import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Logo, LoadingSpinner, StatusScreen } from '@/components/common';
import { Sidebar } from '@/components/Sidebar';
import { MediaPlayer } from '@/components/MediaPlayer';
import { Button } from '@/components/ui/Button';
import { socketService } from '@/services/socket.service';
import { useRoomStore } from '@/store/room.store';

interface GuestRoomViewProps {
  roomId: string;
  streamUrl: string;
  registerVideoRef: (el: HTMLMediaElement | null) => void;
  sessionStatus: string;
  connectionStatus: string;
}

/** Cinema-focused layout for guests — full-screen video, minimal chrome */
export function GuestRoomView({
  roomId,
  streamUrl,
  registerVideoRef,
  sessionStatus,
  connectionStatus,
}: GuestRoomViewProps) {
  const [showPanel, setShowPanel] = useState(false);
  const mediaType = useRoomStore((s) => s.mediaType);
  const room = useRoomStore((s) => s.room);
  const participants = useRoomStore((s) => s.participants);
  const unreadCount = useRoomStore((s) => s.unreadCount);
  const token = useRoomStore((s) => s.token);
  const setConnectionStatus = useRoomStore((s) => s.setConnectionStatus);

  const isAudio = (mediaType ?? room?.streamMetadata?.mediaType) === 'audio';
  const streamTitle = room?.streamMetadata?.filename;

  const handleRetry = () => {
    if (!token) return;
    setConnectionStatus('connecting');
    socketService.disconnect();
    window.location.reload();
  };

  if (connectionStatus === 'error') {
    return (
      <StatusScreen
        icon="⚠️"
        title="Connection Failed"
        description="Could not connect to the room. Make sure you're on the same Wi-Fi as the host."
        action={
          <Button onClick={handleRetry} size="lg">
            Retry Connection
          </Button>
        }
      />
    );
  }

  if (sessionStatus === 'host-offline') {
    return (
      <StatusScreen
        icon="📡"
        title="Host Offline"
        description="The host disconnected. Reconnecting automatically..."
        action={<LoadingSpinner message="Waiting for host..." />}
      />
    );
  }

  if (connectionStatus === 'connecting' || connectionStatus === 'disconnected') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <LoadingSpinner message="Connecting to room..." />
        <p className="text-white/40 text-sm mt-4">Room {roomId}</p>
      </div>
    );
  }

  if (sessionStatus === 'waiting' || !streamUrl) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6 max-w-sm"
        >
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="text-4xl"
            >
              ⏳
            </motion.div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Waiting for Host</h2>
            <p className="text-white/60 text-sm">
              Room <span className="text-primary font-mono">{roomId}</span>
            </p>
            <p className="text-white/50 text-sm mt-2">
              Connected! {isAudio ? 'Music' : 'Video'} will appear here when the host starts{' '}
              {isAudio ? 'listening' : 'streaming'}.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col relative">
      <header className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-none">
        <div className="pointer-events-auto">
          <Logo size="sm" />
        </div>
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="text-xs text-white/60 bg-white/10 px-3 py-1.5 rounded-full">
            {participants.length} {isAudio ? 'listening' : 'watching'}
          </span>
          <button
            onClick={() => setShowPanel(!showPanel)}
            className="relative w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg transition-colors"
            aria-label="Toggle chat"
          >
            💬
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[10px] rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center min-h-0 w-full">
        <MediaPlayer
          src={streamUrl}
          isHost={false}
          mediaType={mediaType ?? room?.streamMetadata?.mediaType ?? 'video'}
          title={streamTitle}
          onRegisterRef={registerVideoRef}
          fullscreen
        />
      </main>

      <AnimatePresence>
        {showPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={() => setShowPanel(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="fixed inset-y-0 right-0 w-full sm:w-[380px] z-50 flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-3 glass border-b border-white/10">
                <span className="font-semibold">Room Chat</span>
                <Button variant="ghost" size="sm" onClick={() => setShowPanel(false)}>
                  ✕
                </Button>
              </div>
              <div className="flex-1 min-h-0 glass-strong rounded-none">
                <Sidebar />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
