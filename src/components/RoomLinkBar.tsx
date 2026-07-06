import { motion } from 'framer-motion';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCopyToClipboard } from '@/hooks/useMediaQuery';
import { getRoomUrl } from '@/utils';
import { Button } from './ui/Button';

interface RoomLinkBarProps {
  roomId: string;
}

export function RoomLinkBar({ roomId }: RoomLinkBarProps) {
  const copy = useCopyToClipboard();
  const [copied, setCopied] = useState(false);
  const url = getRoomUrl(roomId);

  const handleCopy = async () => {
    const ok = await copy(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'mauknh.diaries', url, text: 'Join my room on mauknh.diaries!' });
    } else {
      handleCopy();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 glass rounded-2xl px-4 py-2"
    >
      <span className="text-sm text-text-muted hidden sm:inline">Room Link:</span>
      <code className="text-sm text-primary truncate max-w-[200px] sm:max-w-xs">{url}</code>
      <Button variant="ghost" size="sm" onClick={handleCopy}>
        {copied ? '✓ Copied' : 'Copy'}
      </Button>
      <Button variant="secondary" size="sm" onClick={handleShare}>
        Invite
      </Button>
    </motion.div>
  );
}

export function TopBar({
  roomId,
  onSettings,
}: {
  roomId?: string;
  onSettings?: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-4 px-4 py-3">
      <Link to="/" className="flex items-center gap-2 font-bold text-xl shrink-0">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
          <span className="text-white text-sm">▶</span>
        </div>
        <span className="text-gradient hidden sm:inline">mauknh.diaries</span>
      </Link>

      {roomId && <RoomLinkBar roomId={roomId} />}

      {onSettings && (
        <Button variant="ghost" size="sm" onClick={onSettings}>
          ⚙️
        </Button>
      )}
    </header>
  );
}
