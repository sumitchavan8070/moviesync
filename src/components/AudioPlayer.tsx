import { motion, AnimatePresence } from 'framer-motion';
import { useMediaPlayer } from '@/hooks/useMediaPlayer';
import { formatDuration } from '@/utils';

interface AudioPlayerProps {
  src: string | null;
  isHost: boolean;
  title?: string;
  onRegisterRef?: (el: HTMLMediaElement | null) => void;
  onError?: (message: string) => void;
  fullscreen?: boolean;
}

/** Spotify-style synced music player */
export function AudioPlayer({
  src,
  isHost,
  title,
  onRegisterRef,
  onError,
  fullscreen,
}: AudioPlayerProps) {
  const player = useMediaPlayer({ src, isHost, onRegisterRef, onError, mediaKind: 'audio' });

  const progress = player.duration > 0 ? (player.currentTime / player.duration) * 100 : 0;
  const bufferProgress =
    player.duration > 0 ? (player.buffered / player.duration) * 100 : 0;

  const displayTitle = title ?? 'Now Playing';

  return (
    <div
      ref={player.containerRef}
      className={`relative w-full overflow-hidden ${
        fullscreen
          ? 'min-h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-b from-[#1a1a2e] via-background to-background rounded-none'
          : 'glass rounded-[24px] p-8'
      }`}
      onMouseMove={player.resetHideTimer}
      onTouchStart={player.resetHideTimer}
    >
      <audio ref={player.mediaRef as React.RefObject<HTMLAudioElement>} preload={isHost ? 'metadata' : 'auto'} />

      {player.loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center z-10">
          <p className="text-danger text-sm mb-2">Failed to load audio</p>
          <p className="text-white/50 text-xs">{player.loadError}</p>
        </div>
      )}

      {!src && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4 opacity-40">🎵</div>
          <p className="text-text-muted">No song selected</p>
        </div>
      )}

      {src && (
        <div className={`flex flex-col items-center w-full max-w-lg mx-auto ${fullscreen ? 'px-6' : ''}`}>
          {/* Album art */}
          <motion.div
            animate={player.isPlaying ? { scale: [1, 1.03, 1] } : { scale: 1 }}
            transition={{ duration: 2, repeat: player.isPlaying ? Infinity : 0 }}
            className="relative mb-8"
          >
            <div
              className={`rounded-full bg-gradient-to-br from-primary via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl shadow-primary/30 ${
                fullscreen ? 'w-56 h-56 sm:w-72 sm:h-72' : 'w-40 h-40'
              }`}
            >
              <div className="absolute inset-2 rounded-full bg-black/20 backdrop-blur-sm" />
              <span className={`relative z-10 ${fullscreen ? 'text-7xl' : 'text-5xl'}`}>🎵</span>
            </div>
            {player.isPlaying && (
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-1 items-end h-6">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1 bg-primary rounded-full"
                    animate={{ height: ['8px', '24px', '8px'] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            )}
          </motion.div>

          {/* Track info */}
          <div className="text-center mb-8 w-full">
            <h2 className={`font-bold truncate ${fullscreen ? 'text-2xl' : 'text-lg'}`}>
              {displayTitle}
            </h2>
            <p className="text-text-muted text-sm mt-1">mauknh.diaries · Synced listening</p>
          </div>

          {/* Progress */}
          <div className="w-full mb-6">
            <div className="relative h-1.5 bg-white/10 rounded-full cursor-pointer">
              <div
                className="absolute h-full bg-white/20 rounded-full"
                style={{ width: `${bufferProgress}%` }}
              />
              <div
                className="absolute h-full bg-gradient-to-r from-primary to-pink-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
              <input
                type="range"
                min={0}
                max={player.duration || 100}
                step={0.1}
                value={player.currentTime}
                onChange={(e) => player.seek(parseFloat(e.target.value))}
                disabled={!isHost}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-default"
              />
            </div>
            <div className="flex justify-between text-xs text-text-muted mt-2">
              <span>{formatDuration(player.currentTime)}</span>
              <span>{formatDuration(player.duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <AnimatePresence>
            {(player.showControls || !player.isPlaying) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 sm:gap-6"
              >
                <ControlBtn onClick={() => player.skip(-10)} label="Back 10s" size="md">
                  ⏪
                </ControlBtn>
                <button
                  onClick={player.togglePlay}
                  aria-label={player.isPlaying ? 'Pause' : 'Play'}
                  className="w-16 h-16 rounded-full bg-primary hover:bg-primary-hover flex items-center justify-center text-2xl shadow-xl shadow-primary/40 transition-all hover:scale-105 active:scale-95"
                >
                  {player.isPlaying ? '⏸' : '▶️'}
                </button>
                <ControlBtn onClick={() => player.skip(10)} label="Forward 10s" size="md">
                  ⏩
                </ControlBtn>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Secondary controls */}
          <div className="flex items-center gap-4 mt-6 w-full justify-center">
            <ControlBtn onClick={player.toggleMute} label="Mute" size="sm">
              {player.isMuted ? '🔇' : '🔊'}
            </ControlBtn>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={player.isMuted ? 0 : player.volume}
              onChange={(e) => player.changeVolume(parseFloat(e.target.value))}
              className="w-24 h-1 accent-primary"
            />
            {isHost && (
              <select
                value={player.playbackRate}
                onChange={(e) => player.changeRate(parseFloat(e.target.value))}
                className="bg-white/10 text-sm rounded-xl px-2 py-1 border-none outline-none"
              >
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
                  <option key={r} value={r} className="bg-surface">
                    {r}x
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ControlBtn({
  children,
  onClick,
  label,
  size = 'md',
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  size?: 'sm' | 'md';
}) {
  const sizes = { sm: 'w-9 h-9 text-base', md: 'w-12 h-12 text-xl' };
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={`${sizes[size]} flex items-center justify-center rounded-full hover:bg-white/10 transition-colors touch-manipulation`}
    >
      {children}
    </button>
  );
}
