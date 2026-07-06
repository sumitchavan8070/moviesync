import type { MediaType } from '@/types';
import { AudioPlayer } from './AudioPlayer';
import { VideoPlayer } from './VideoPlayer';

interface MediaPlayerProps {
  src: string | null;
  isHost: boolean;
  mediaType: MediaType;
  title?: string;
  onRegisterRef?: (el: HTMLMediaElement | null) => void;
  onError?: (message: string) => void;
  fullscreen?: boolean;
}

/** Renders the correct player for video or audio streams */
export function MediaPlayer({
  src,
  isHost,
  mediaType,
  title,
  onRegisterRef,
  onError,
  fullscreen,
}: MediaPlayerProps) {
  if (mediaType === 'audio') {
    return (
      <AudioPlayer
        src={src}
        isHost={isHost}
        title={title}
        onRegisterRef={onRegisterRef}
        onError={onError}
        fullscreen={fullscreen}
      />
    );
  }

  return (
    <VideoPlayer
      src={src}
      isHost={isHost}
      onRegisterRef={onRegisterRef}
      onError={onError}
      fullscreen={fullscreen}
    />
  );
}
