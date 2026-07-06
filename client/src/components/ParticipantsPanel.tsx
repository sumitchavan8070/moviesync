import { motion } from 'framer-motion';
import { socketService } from '@/services/socket.service';
import { useRoomStore } from '@/store/room.store';
import { formatLatency } from '@/utils';

export function ParticipantsPanel() {
  const participants = useRoomStore((s) => s.participants);
  const isHost = useRoomStore((s) => s.isHost);
  const participantId = useRoomStore((s) => s.participantId);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/10">
        <h3 className="font-semibold">Participants ({participants.length})</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {participants.map((p) => (
          <motion.div
            key={p.id}
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 p-3 rounded-2xl glass"
          >
            <div className="relative">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  p.isHost ? 'bg-primary/30 text-primary' : 'bg-surface-elevated'
                }`}
              >
                {p.name.charAt(0).toUpperCase()}
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-surface ${
                  p.online ? 'bg-success' : 'bg-text-muted'
                }`}
              />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate text-sm">{p.name}</span>
                {p.isHost && (
                  <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-md shrink-0">
                    Host
                  </span>
                )}
              </div>
              <span className="text-xs text-text-muted">{formatLatency(p.latencyMs)}</span>
            </div>

            {isHost && !p.isHost && p.id !== participantId && (
              <button
                onClick={() => socketService.removeGuest(p.id)}
                className="p-2 rounded-xl hover:bg-danger/20 text-danger text-xs transition-colors"
                title="Remove guest"
              >
                ✕
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
