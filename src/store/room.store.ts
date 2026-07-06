import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ChatMessage,
  ConnectionStatus,
  MediaType,
  Participant,
  PlaybackState,
  RoomPublicInfo,
  SessionStatus,
  TypingIndicator,
} from '@/types';
import { detectMediaType } from '@/utils';

interface RoomStore {
  roomId: string | null;
  token: string | null;
  participantId: string | null;
  isHost: boolean;
  displayName: string;

  room: RoomPublicInfo | null;
  participants: Participant[];
  chatMessages: ChatMessage[];
  unreadCount: number;
  typingUsers: TypingIndicator[];

  connectionStatus: ConnectionStatus;
  sessionStatus: SessionStatus;

  playback: PlaybackState;
  mediaFile: File | null;
  mediaType: MediaType | null;
  streamUrl: string | null;

  sidebarTab: 'participants' | 'chat' | 'activity';
  isLocked: boolean;
  showSettings: boolean;

  setIdentity: (data: {
    roomId: string;
    token: string;
    participantId: string;
    isHost: boolean;
    displayName: string;
  }) => void;

  setRoom: (room: RoomPublicInfo) => void;
  setParticipants: (participants: Participant[]) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (id: string, partial: Partial<Participant>) => void;

  addChatMessage: (message: ChatMessage) => void;
  setChatHistory: (messages: ChatMessage[]) => void;
  markChatRead: () => void;
  setTyping: (indicator: TypingIndicator) => void;

  setConnectionStatus: (status: ConnectionStatus) => void;
  setSessionStatus: (status: SessionStatus) => void;
  setPlayback: (playback: Partial<PlaybackState>) => void;

  setMediaFile: (file: File | null) => void;
  setStreamUrl: (url: string | null) => void;
  setMediaType: (mediaType: MediaType | null) => void;

  setSidebarTab: (tab: 'participants' | 'chat' | 'activity') => void;
  setLocked: (locked: boolean) => void;
  setShowSettings: (show: boolean) => void;

  reset: () => void;
}

const defaultPlayback: PlaybackState = {
  currentTime: 0,
  paused: true,
  duration: 0,
  buffer: 0,
  playbackRate: 1,
};

export const useRoomStore = create<RoomStore>()(
  persist(
    (set, get) => ({
      roomId: null,
      token: null,
      participantId: null,
      isHost: false,
      displayName: '',

      room: null,
      participants: [],
      chatMessages: [],
      unreadCount: 0,
      typingUsers: [],

      connectionStatus: 'disconnected',
      sessionStatus: 'idle',

      playback: { ...defaultPlayback },
      mediaFile: null,
      mediaType: null,
      streamUrl: null,

      sidebarTab: 'chat',
      isLocked: false,
      showSettings: false,

      setIdentity: (data) =>
        set({
          roomId: data.roomId.trim().toLowerCase(),
          token: data.token,
          participantId: data.participantId,
          isHost: data.isHost,
          displayName: data.displayName.trim(),
          connectionStatus: 'connecting',
          sessionStatus: data.isHost ? 'idle' : 'waiting',
        }),

      setRoom: (room) => set({ room, isLocked: room.locked }),

      setParticipants: (participants) => set({ participants }),

      addParticipant: (participant) =>
        set((s) => ({
          participants: s.participants.some((p) => p.id === participant.id)
            ? s.participants.map((p) => (p.id === participant.id ? participant : p))
            : [...s.participants, participant],
        })),

      removeParticipant: (participantId) =>
        set((s) => ({
          participants: s.participants.filter((p) => p.id !== participantId),
        })),

      updateParticipant: (id, partial) =>
        set((s) => ({
          participants: s.participants.map((p) => (p.id === id ? { ...p, ...partial } : p)),
        })),

      addChatMessage: (message) =>
        set((s) => ({
          chatMessages: [...s.chatMessages, message],
          unreadCount: s.sidebarTab === 'chat' ? s.unreadCount : s.unreadCount + 1,
        })),

      setChatHistory: (messages) => set({ chatMessages: messages, unreadCount: 0 }),

      markChatRead: () => set({ unreadCount: 0 }),

      setTyping: (indicator) =>
        set((s) => {
          const filtered = s.typingUsers.filter((t) => t.participantId !== indicator.participantId);
          return {
            typingUsers: indicator.isTyping ? [...filtered, indicator] : filtered,
          };
        }),

      setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

      setSessionStatus: (sessionStatus) => set({ sessionStatus }),

      setPlayback: (partial) =>
        set((s) => ({ playback: { ...s.playback, ...partial } })),

      setMediaFile: (mediaFile) =>
        set({
          mediaFile,
          mediaType: mediaFile ? detectMediaType(mediaFile) : null,
        }),

      setMediaType: (mediaType) => set({ mediaType }),

      setStreamUrl: (streamUrl) => set({ streamUrl }),

      setSidebarTab: (sidebarTab) => {
        set({ sidebarTab });
        if (sidebarTab === 'chat') get().markChatRead();
      },

      setLocked: (isLocked) => set({ isLocked }),

      setShowSettings: (showSettings) => set({ showSettings }),

      reset: () =>
        set({
          roomId: null,
          token: null,
          participantId: null,
          isHost: false,
          room: null,
          participants: [],
          chatMessages: [],
          unreadCount: 0,
          typingUsers: [],
          connectionStatus: 'disconnected',
          sessionStatus: 'idle',
          playback: { ...defaultPlayback },
          mediaFile: null,
          mediaType: null,
          streamUrl: null,
          isLocked: false,
          showSettings: false,
        }),
    }),
    {
      name: 'mauknh-diaries-session',
      partialize: (state) => ({
        roomId: state.roomId,
        token: state.token,
        participantId: state.participantId,
        isHost: state.isHost,
        displayName: state.displayName,
      }),
    },
  ),
);

interface UiStore {
  isMobile: boolean;
  isSidebarOpen: boolean;
  setIsMobile: (v: boolean) => void;
  setSidebarOpen: (v: boolean) => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  isMobile: false,
  isSidebarOpen: true,
  setIsMobile: (isMobile) => set({ isMobile, isSidebarOpen: !isMobile }),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
}));
