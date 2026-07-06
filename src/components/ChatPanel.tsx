import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState, useCallback } from 'react';
import { socketService } from '@/services/socket.service';
import { useRoomStore } from '@/store/room.store';

export function ChatPanel() {
  const messages = useRoomStore((s) => s.chatMessages);
  const typingUsers = useRoomStore((s) => s.typingUsers);
  const participantId = useRoomStore((s) => s.participantId);
  const unreadCount = useRoomStore((s) => s.unreadCount);
  const markChatRead = useRoomStore((s) => s.markChatRead);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    markChatRead();
  }, [markChatRead]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleTyping = useCallback(
    (value: string) => {
      setInput(value);
      if (!isTyping && value.length > 0) {
        setIsTyping(true);
        socketService.setTyping(true);
      }
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        setIsTyping(false);
        socketService.setTyping(false);
      }, 2000);
    },
    [isTyping],
  );

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;
    socketService.sendChat(content);
    setInput('');
    setIsTyping(false);
    socketService.setTyping(false);
  };

  const othersTyping = typingUsers.filter((t) => t.participantId !== participantId && t.isTyping);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h3 className="font-semibold">Chat</h3>
        {unreadCount > 0 && (
          <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col ${msg.participantId === participantId ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-text-muted">{msg.participantName}</span>
                {msg.isHost && (
                  <span className="text-[10px] bg-primary/30 text-primary px-1.5 py-0.5 rounded-md">
                    Host
                  </span>
                )}
              </div>
              <div
                className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                  msg.participantId === participantId
                    ? 'bg-primary text-white rounded-br-md'
                    : 'glass rounded-bl-md'
                }`}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {othersTyping.length > 0 && (
          <div className="text-xs text-text-muted italic">
            {othersTyping.map((t) => t.participantName).join(', ')} typing...
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="p-3 border-t border-white/10">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => handleTyping(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 rounded-2xl glass bg-white/5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-4 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
