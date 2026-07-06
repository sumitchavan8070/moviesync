import { useCallback, useEffect, useRef, useState } from 'react';
import { socketService } from '@/services/socket.service';
import { useRoomStore } from '@/store/room.store';
import { clamp } from '@/utils';

interface UseMediaPlayerOptions {
  src: string | null;
  isHost: boolean;
  mediaKind: 'video' | 'audio';
  onRegisterRef?: (el: HTMLMediaElement | null) => void;
  onError?: (message: string) => void;
}

export function useMediaPlayer({
  src,
  isHost,
  mediaKind,
  onRegisterRef,
  onError,
}: UseMediaPlayerOptions) {
  const mediaRef = useRef<HTMLMediaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideControlsTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);

  const setPlayback = useRoomStore((s) => s.setPlayback);

  useEffect(() => {
    onRegisterRef?.(mediaRef.current);
  }, [onRegisterRef, src]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media || !src) return;

    setLoadError(null);
    media.src = src;
    media.load();
  }, [src]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const onMediaError = () => {
      const code = media.error?.code;
      const messages: Record<number, string> = {
        1: 'Playback aborted',
        2: 'Network error — check connection to host',
        3: 'Decode error',
        4: 'Format not supported',
      };
      const msg = code ? (messages[code] ?? `Error code ${code}`) : 'Unknown media error';
      setLoadError(msg);
      onError?.(msg);
    };

    media.addEventListener('error', onMediaError);
    return () => media.removeEventListener('error', onMediaError);
  }, [onError, src]);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideControlsTimer.current);
    if (isPlaying && mediaKind === 'video') {
      hideControlsTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying, mediaKind]);

  const togglePlay = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;

    if (media.paused) {
      media.play().catch(() => {});
      if (isHost) socketService.play(media.currentTime);
    } else {
      media.pause();
      if (isHost) socketService.pause(media.currentTime);
    }
  }, [isHost]);

  const seek = useCallback(
    (time: number) => {
      const media = mediaRef.current;
      if (!media) return;
      const t = clamp(time, 0, media.duration || 0);
      media.currentTime = t;
      setCurrentTime(t);
      if (isHost) socketService.seek(t);
    },
    [isHost],
  );

  const skip = useCallback(
    (delta: number) => {
      const media = mediaRef.current;
      if (!media) return;
      seek(media.currentTime + delta);
    },
    [seek],
  );

  const changeVolume = useCallback((v: number) => {
    const media = mediaRef.current;
    if (!media) return;
    const vol = clamp(v, 0, 1);
    media.volume = vol;
    setVolume(vol);
    setIsMuted(vol === 0);
  }, []);

  const toggleMute = useCallback(() => {
    const media = mediaRef.current;
    if (!media) return;
    media.muted = !media.muted;
    setIsMuted(media.muted);
  }, []);

  const changeRate = useCallback(
    (rate: number) => {
      const media = mediaRef.current;
      if (!media) return;
      media.playbackRate = rate;
      setPlaybackRate(rate);
      if (isHost) socketService.changePlaybackRate(rate);
    },
    [isHost],
  );

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      await container.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  const togglePiP = useCallback(async () => {
    const media = mediaRef.current as HTMLVideoElement | null;
    if (!media || !('requestPictureInPicture' in media)) return;

    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture().catch(() => {});
    } else {
      await media.requestPictureInPicture().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const onTimeUpdate = () => {
      setCurrentTime(media.currentTime);
      if (isHost) {
        socketService.playbackUpdate({
          currentTime: media.currentTime,
          duration: media.duration || 0,
          buffer: media.buffered.length ? media.buffered.end(media.buffered.length - 1) : 0,
          paused: media.paused,
          playbackRate: media.playbackRate,
        });
      }
    };

    const onDurationChange = () => setDuration(media.duration || 0);
    const onPlay = () => {
      setIsPlaying(true);
      resetHideTimer();
    };
    const onPause = () => {
      setIsPlaying(false);
      setShowControls(true);
    };
    const onProgress = () => {
      if (media.buffered.length > 0) {
        setBuffered(media.buffered.end(media.buffered.length - 1));
      }
    };
    const onVolumeChange = () => {
      setVolume(media.volume);
      setIsMuted(media.muted);
    };

    media.addEventListener('timeupdate', onTimeUpdate);
    media.addEventListener('durationchange', onDurationChange);
    media.addEventListener('play', onPlay);
    media.addEventListener('pause', onPause);
    media.addEventListener('progress', onProgress);
    media.addEventListener('volumechange', onVolumeChange);

    return () => {
      media.removeEventListener('timeupdate', onTimeUpdate);
      media.removeEventListener('durationchange', onDurationChange);
      media.removeEventListener('play', onPlay);
      media.removeEventListener('pause', onPause);
      media.removeEventListener('progress', onProgress);
      media.removeEventListener('volumechange', onVolumeChange);
    };
  }, [isHost, resetHideTimer]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          skip(-10);
          break;
        case 'ArrowRight':
          skip(10);
          break;
        case 'ArrowUp':
          changeVolume(volume + 0.1);
          break;
        case 'ArrowDown':
          changeVolume(volume - 0.1);
          break;
        case 'f':
        case 'F':
          if (mediaKind === 'video') toggleFullscreen();
          break;
        case 'm':
        case 'M':
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlay, skip, changeVolume, volume, toggleFullscreen, toggleMute, mediaKind]);

  useEffect(() => {
    setPlayback({ currentTime, paused: !isPlaying, duration, buffer: buffered, playbackRate });
  }, [currentTime, isPlaying, duration, buffered, playbackRate, setPlayback]);

  return {
    mediaRef,
    containerRef,
    isPlaying,
    currentTime,
    duration,
    buffered,
    volume,
    isMuted,
    isFullscreen,
    showControls,
    playbackRate,
    togglePlay,
    seek,
    skip,
    changeVolume,
    toggleMute,
    changeRate,
    toggleFullscreen,
    togglePiP,
    resetHideTimer,
    loadError,
  };
}

/** @deprecated use useMediaPlayer */
export const useVideoPlayer = (opts: Omit<UseMediaPlayerOptions, 'mediaKind'>) =>
  useMediaPlayer({ ...opts, mediaKind: 'video' });
