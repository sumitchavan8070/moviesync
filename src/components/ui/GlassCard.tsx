import type { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  strong?: boolean;
}

export function GlassCard({ children, className = '', strong }: GlassCardProps) {
  return (
    <div className={`${strong ? 'glass-strong' : 'glass'} rounded-[24px] ${className}`}>
      {children}
    </div>
  );
}
