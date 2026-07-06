import { useRoomStore } from '@/store/room.store';
import { ChatPanel } from './ChatPanel';
import { ParticipantsPanel } from './ParticipantsPanel';

export function Sidebar() {
  const sidebarTab = useRoomStore((s) => s.sidebarTab);
  const setSidebarTab = useRoomStore((s) => s.setSidebarTab);
  const unreadCount = useRoomStore((s) => s.unreadCount);

  const tabs = [
    { id: 'participants' as const, label: 'People', icon: '👥' },
    { id: 'chat' as const, label: 'Chat', icon: '💬', badge: unreadCount },
    { id: 'activity' as const, label: 'Activity', icon: '📋' },
  ];

  return (
    <div className="flex flex-col h-full glass rounded-[24px] overflow-hidden">
      <div className="flex border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSidebarTab(tab.id)}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              sidebarTab === tab.id
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-muted hover:text-text'
            }`}
          >
            <span className="mr-1">{tab.icon}</span>
            {tab.label}
            {tab.badge ? (
              <span className="absolute top-2 right-2 bg-primary text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0">
        {sidebarTab === 'participants' && <ParticipantsPanel />}
        {sidebarTab === 'chat' && <ChatPanel />}
        {sidebarTab === 'activity' && <ActivityPanel />}
      </div>
    </div>
  );
}

function ActivityPanel() {
  const sessionStatus = useRoomStore((s) => s.sessionStatus);
  const connectionStatus = useRoomStore((s) => s.connectionStatus);
  const room = useRoomStore((s) => s.room);

  const events = [
    { time: new Date().toLocaleTimeString(), text: `Connection: ${connectionStatus}` },
    { time: new Date().toLocaleTimeString(), text: `Session: ${sessionStatus}` },
    ...(room?.streamActive
      ? [{ time: new Date().toLocaleTimeString(), text: 'Stream is live' }]
      : []),
  ];

  return (
    <div className="p-4 space-y-3 overflow-y-auto h-full">
      {events.map((e, i) => (
        <div key={i} className="flex gap-3 text-sm">
          <span className="text-text-muted shrink-0">{e.time}</span>
          <span>{e.text}</span>
        </div>
      ))}
    </div>
  );
}
