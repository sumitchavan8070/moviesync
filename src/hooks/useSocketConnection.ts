import { useCallback, useEffect, useRef } from 'react';
import { socketService } from '@/services/socket.service';
import { useRoomStore } from '@/store/room.store';
import type { SyncResponsePayload } from '@/types';
import { getStreamUrl } from '@/utils';

/** Manages Socket.IO connection and room event handling */
export function useSocketConnection() {
  const token = useRoomStore((s) => s.token);
  const isHost = useRoomStore((s) => s.isHost);
  const roomId = useRoomStore((s) => s.roomId);

  const setConnectionStatus = useRoomStore((s) => s.setConnectionStatus);
  const setSessionStatus = useRoomStore((s) => s.setSessionStatus);
  const setRoom = useRoomStore((s) => s.setRoom);
  const setParticipants = useRoomStore((s) => s.setParticipants);
  const addParticipant = useRoomStore((s) => s.addParticipant);
  const removeParticipant = useRoomStore((s) => s.removeParticipant);
  const updateParticipant = useRoomStore((s) => s.updateParticipant);
  const setChatHistory = useRoomStore((s) => s.setChatHistory);
  const addChatMessage = useRoomStore((s) => s.addChatMessage);
  const setTyping = useRoomStore((s) => s.setTyping);
  const setPlayback = useRoomStore((s) => s.setPlayback);
  const setStreamUrl = useRoomStore((s) => s.setStreamUrl);
  const setMediaType = useRoomStore((s) => s.setMediaType);
  const setLocked = useRoomStore((s) => s.setLocked);

  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const latencyIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const registerVideoRef = useCallback((el: HTMLMediaElement | null) => {
    mediaRef.current = el;
  }, []);

  // Host: relay file chunks when guests request ranges
  const handleChunkRequest = useCallback(
    async (request: { requestId: string; start: number; end: number }) => {
      const file = useRoomStore.getState().mediaFile;
      if (!file) {
        console.warn('[Host] Chunk requested but no media file loaded');
        return;
      }

      try {
        const blob = file.slice(request.start, request.end + 1);
        const buffer = await blob.arrayBuffer();
        socketService.sendChunkResponse(request.requestId, buffer, request.start, request.end);
      } catch (err) {
        console.error('[Host] Chunk relay failed:', err);
      }
    },
    [],
  );

  // Host: respond to sync requests from guests
  const handleSyncRequest = useCallback(
    (data: { guestSocketId: string; participantId: string }) => {
      const media = mediaRef.current;
      if (!media) return;

      const response: SyncResponsePayload & { guestSocketId: string } = {
        guestSocketId: data.guestSocketId,
        currentTime: media.currentTime,
        paused: media.paused,
        duration: media.duration || 0,
        buffer: getBufferedEnd(media),
        playbackRate: media.playbackRate,
        serverTime: Date.now(),
      };

      socketService.respondSync(response);
    },
    [],
  );

  // Guest: apply sync response with latency compensation
  const applySync = useCallback(
    (data: SyncResponsePayload) => {
      const media = mediaRef.current;
      if (!media || isHost) return;

      const latency = (Date.now() - data.serverTime) / 2;
      let targetTime = data.currentTime;

      if (!data.paused) {
        targetTime += latency / 1000;
      }

      const drift = Math.abs(media.currentTime - targetTime);
      if (drift > 0.3) {
        media.currentTime = targetTime;
      }

      media.playbackRate = data.playbackRate;

      if (data.paused && !media.paused) {
        media.pause();
      } else if (!data.paused && media.paused) {
        media.play().catch(() => {});
      }

      setPlayback({
        currentTime: targetTime,
        paused: data.paused,
        duration: data.duration,
        buffer: data.buffer,
        playbackRate: data.playbackRate,
      });
    },
    [isHost, setPlayback],
  );

  useEffect(() => {
    if (!token) return;

    setConnectionStatus('connecting');

    const connectTimeout = setTimeout(() => {
      if (useRoomStore.getState().connectionStatus === 'connecting') {
        setConnectionStatus('error');
      }
    }, 15000);

    socketService.connect(token, {
      onConnect: () => {
        setConnectionStatus('connected');
        if (!isHost) {
          socketService.requestSync();
        }
      },
      onDisconnect: () => {
        setConnectionStatus('disconnected');
        // host-offline is set only by server 'host-disconnected' event
      },
      onError: (msg) => {
        console.error('Socket error:', msg);
        setConnectionStatus('error');
      },
      onRoomJoined: (data) => {
        setRoom(data.room);
        setParticipants(data.participants);
        setChatHistory(data.chatHistory);
        setPlayback(data.playback);

        if (data.room.streamActive && !isHost && roomId && token) {
          setStreamUrl(getStreamUrl(roomId, token));
          setMediaType(data.room.streamMetadata?.mediaType ?? 'video');
          setSessionStatus('streaming');
        } else if (!isHost) {
          setSessionStatus(data.room.streamActive ? 'streaming' : 'waiting');
          if (data.room.streamMetadata?.mediaType) {
            setMediaType(data.room.streamMetadata.mediaType);
          }
        }
      },
      onUserJoined: ({ participant }) => addParticipant(participant),
      onUserLeft: ({ participantId }) => removeParticipant(participantId),
      onStreamStarted: ({ metadata, playback }) => {
        setPlayback(playback);
        setMediaType(metadata.mediaType ?? 'video');
        setSessionStatus('streaming');
        if (!isHost && roomId && token) {
          setStreamUrl(getStreamUrl(roomId, token));
        }
        if (isHost) {
          const file = useRoomStore.getState().mediaFile;
          if (file) {
            setStreamUrl(URL.createObjectURL(file));
          }
        }
      },
      onStreamStopped: () => {
        setStreamUrl(null);
        setSessionStatus(isHost ? 'idle' : 'waiting');
      },
      onPlay: (playback) => {
        setPlayback(playback);
        if (!isHost && mediaRef.current) {
          const latency = playback.serverTime
            ? (Date.now() - playback.serverTime) / 2000
            : 0;
          mediaRef.current.currentTime = (playback.currentTime ?? 0) + latency;
          mediaRef.current.play().catch(() => {});
        }
      },
      onPause: (playback) => {
        setPlayback(playback);
        if (!isHost && mediaRef.current) {
          mediaRef.current.currentTime = playback.currentTime ?? mediaRef.current.currentTime;
          mediaRef.current.pause();
        }
      },
      onSeek: (playback) => {
        setPlayback(playback);
        if (!isHost && mediaRef.current) {
          mediaRef.current.currentTime = playback.currentTime ?? 0;
        }
      },
      onPlaybackRateChange: (playback) => {
        setPlayback(playback);
        if (!isHost && mediaRef.current) {
          mediaRef.current.playbackRate = playback.playbackRate;
        }
      },
      onSyncRequest: isHost ? handleSyncRequest : undefined,
      onSyncResponse: !isHost ? applySync : undefined,
      onChatMessage: addChatMessage,
      onTyping: setTyping,
      onHostEnded: () => setSessionStatus('host-ended'),
      onHostDisconnected: () => setSessionStatus('host-offline'),
      onHostReconnected: ({ metadata, playback }) => {
        setPlayback(playback);
        setMediaType(metadata.mediaType ?? 'video');
        setSessionStatus('streaming');
        if (!isHost && roomId && token) {
          setStreamUrl(getStreamUrl(roomId, token));
        }
      },
      onGuestRemoved: () => setSessionStatus('removed'),
      onRoomLocked: () => setLocked(true),
      onRoomUnlocked: () => setLocked(false),
      onParticipantUpdated: ({ id, latencyMs }) => updateParticipant(id, { latencyMs }),
      onStreamChunkRequest: isHost ? handleChunkRequest : undefined,
    });

    // Measure latency periodically
    latencyIntervalRef.current = setInterval(() => {
      const start = Date.now();
      socketService.updateLatency(0);
      const measured = Date.now() - start;
      socketService.updateLatency(measured);
    }, 5000);

    return () => {
      clearTimeout(connectTimeout);
      clearInterval(latencyIntervalRef.current);
      socketService.disconnect();
    };
  }, [
    token,
    isHost,
    roomId,
    setConnectionStatus,
    setSessionStatus,
    setRoom,
    setParticipants,
    addParticipant,
    removeParticipant,
    updateParticipant,
    setChatHistory,
    addChatMessage,
    setTyping,
    setPlayback,
    setStreamUrl,
    setLocked,
    setMediaType,
    handleChunkRequest,
    handleSyncRequest,
    applySync,
  ]);

  return { registerVideoRef, mediaRef };
}

function getBufferedEnd(media: HTMLMediaElement): number {
  if (media.buffered.length === 0) return 0;
  return media.buffered.end(media.buffered.length - 1);
}
