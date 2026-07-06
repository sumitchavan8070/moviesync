import { motion } from 'framer-motion';
import { useCallback, useRef, useState } from 'react';
import { isMobileDevice, formatFileSize, isMediaFile, detectMediaType } from '@/utils';
import type { MediaType } from '@/types';
import { Button } from '@/components/ui/Button';

interface FilePickerProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  disabled?: boolean;
}

const TABS: { id: MediaType; label: string; icon: string; accept: string; hint: string }[] = [
  {
    id: 'video',
    label: 'Video',
    icon: '🎬',
    accept: 'video/*',
    hint: 'Drag & drop your video here',
  },
  {
    id: 'audio',
    label: 'Music',
    icon: '🎵',
    accept: 'audio/*,.mp3,.wav,.flac,.aac,.m4a,.ogg,.opus',
    hint: 'Drag & drop your song here',
  },
];

export function FilePicker({ onFileSelect, selectedFile, disabled }: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<MediaType>('video');
  const isMobile = isMobileDevice();

  const currentTab = TABS.find((t) => t.id === activeTab)!;

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file || !isMediaFile(file)) return;
      onFileSelect(file);
      setActiveTab(detectMediaType(file));
    },
    [onFileSelect],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFile(e.dataTransfer.files[0]);
    },
    [handleFile],
  );

  const openPicker = () => {
    if (inputRef.current) {
      inputRef.current.accept = currentTab.accept;
      inputRef.current.click();
    }
  };

  return (
    <div className="space-y-4">
      {/* Video / Music tabs */}
      <div className="flex gap-2 p-1 glass rounded-2xl">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            disabled={disabled}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-primary text-white shadow-lg shadow-primary/25'
                : 'text-text-muted hover:text-text hover:bg-white/5'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={currentTab.accept}
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {!isMobile && (
        <motion.div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          animate={{ scale: isDragging ? 1.02 : 1, borderColor: isDragging ? '#6366F1' : undefined }}
          className={`glass rounded-[24px] p-8 border-2 border-dashed transition-colors text-center ${
            isDragging ? 'border-primary bg-primary/5' : 'border-white/10'
          }`}
        >
          <div className="text-4xl mb-3">{currentTab.icon}</div>
          <p className="text-text-muted mb-4">{currentTab.hint}</p>
          <Button variant="secondary" onClick={openPicker} disabled={disabled}>
            Browse {activeTab === 'audio' ? 'Music' : 'Video'}
          </Button>
        </motion.div>
      )}

      {isMobile && (
        <Button size="lg" className="w-full" onClick={openPicker} disabled={disabled}>
          Choose {activeTab === 'audio' ? 'Song' : 'Video'}
        </Button>
      )}

      {selectedFile && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-4 flex items-center gap-4"
        >
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${
              detectMediaType(selectedFile) === 'audio' ? 'bg-pink-500/20' : 'bg-primary/20'
            }`}
          >
            {detectMediaType(selectedFile) === 'audio' ? '🎵' : '▶'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{selectedFile.name}</p>
            <p className="text-sm text-text-muted">
              {formatFileSize(selectedFile.size)} ·{' '}
              {detectMediaType(selectedFile) === 'audio' ? 'Audio' : 'Video'}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={openPicker} disabled={disabled}>
            Change
          </Button>
        </motion.div>
      )}
    </div>
  );
}
