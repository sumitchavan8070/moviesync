import { motion, AnimatePresence } from 'framer-motion';
import { useMediaPlayer } from '@/hooks/useMediaPlayer';
import { formatDuration } from '@/utils';

interface VideoPlayerProps {
  src: string | null;
  isHost: boolean;
  onRegisterRef?: (el: HTMLMediaElement | null) => void;
  fullscreen?: boolean;
  onError?: (message: string) => void;
}

export function VideoPlayer({ src, isHost, onRegisterRef, fullscreen, onError }: VideoPlayerProps) {
  const player = useMediaPlayer({ src, isHost, onRegisterRef, onError, mediaKind: 'video' });

  const progress = player.duration > 0 ? (player.currentTime / player.duration) * 100 : 0;
  const bufferProgress =
    player.duration > 0 ? (player.buffered / player.duration) * 100 : 0;

  return (
    <div
      ref={player.containerRef}
      className={`relative w-full bg-black overflow-hidden group ${
        fullscreen ? 'h-full min-h-[100dvh] rounded-none' : 'aspect-video rounded-[24px]'
      }`}
      onMouseMove={player.resetHideTimer}
      onTouchStart={player.resetHideTimer}
    >
      <video
        ref={player.mediaRef as React.RefObject<HTMLVideoElement>}
        className="w-full h-full object-contain"
        playsInline
        preload={isHost ? 'metadata' : 'auto'}
      />

      {player.loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center">
          <p className="text-danger text-sm mb-2">Failed to load video</p>
          <p className="text-white/50 text-xs">{player.loadError}</p>
        </div>
      )}

      {!src && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface/80">
          <p className="text-text-muted">No video selected</p>
        </div>
      )}

      <AnimatePresence>
        {player.showControls && src && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-transparent to-transparent"
          >
            <div className="px-4 pb-2">
              <div className="relative h-1.5 bg-white/20 rounded-full cursor-pointer group/timeline">
                <div
                  className="absolute h-full bg-white/30 rounded-full"
                  style={{ width: `${bufferProgress}%` }}
                />
                <div
                  className="absolute h-full bg-primary rounded-full"
                  style={{ width: `${progress}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={player.duration || 100}
                  step={0.1}
                  value={player.currentTime}
                  onChange={(e) => player.seek(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              <div className="flex justify-between text-xs text-white/70 mt-1">
                <span>{formatDuration(player.currentTime)}</span>
                <span>-{formatDuration(Math.max(0, player.duration - player.currentTime))}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-4 pb-4">
              <ControlBtn onClick={() => player.skip(-10)} label="−10s">
                ⏪
              </ControlBtn>
              <ControlBtn onClick={player.togglePlay} label={player.isPlaying ? 'Pause' : 'Play'}>
                {player.isPlaying ? '⏸' : '▶️'}
              </ControlBtn>
              <ControlBtn onClick={() => player.skip(10)} label="+10s">
                ⏩
              </ControlBtn>

              <div className="flex items-center gap-2 ml-2">
                <ControlBtn onClick={player.toggleMute} label="Mute">
                  {player.isMuted ? '🔇' : '🔊'}
                </ControlBtn>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={player.isMuted ? 0 : player.volume}
                  onChange={(e) => player.changeVolume(parseFloat(e.target.value))}
                  className="w-20 h-1 accent-primary hidden sm:block"
                />
              </div>

              <div className="flex-1" />

              <select
                value={player.playbackRate}
                onChange={(e) => player.changeRate(parseFloat(e.target.value))}
                className="bg-white/10 text-white text-sm rounded-xl px-2 py-1 border-none outline-none"
              >
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
                  <option key={r} value={r} className="bg-surface">
                    {r}x
                  </option>
                ))}
              </select>

              <ControlBtn onClick={player.togglePiP} label="PiP">
                ⧉
              </ControlBtn>
              <ControlBtn onClick={player.toggleFullscreen} label="Fullscreen">
                ⛶
              </ControlBtn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ControlBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/15 text-white text-lg transition-colors touch-manipulation"
    >
      {children}
    </button>
  );
}
