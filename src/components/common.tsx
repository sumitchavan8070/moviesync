'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' };
  return (
    <Link href="/" className={`flex items-center gap-2 font-bold ${sizes[size]}`}>
      <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
        <span className="text-white text-sm">▶</span>
      </div>
      <span className="text-gradient">mauknh.diaries</span>
    </Link>
  );
}

export function LoadingSpinner({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-12 h-12 border-3 border-primary/30 border-t-primary rounded-full"
      />
      {message && <p className="text-text-muted">{message}</p>}
    </div>
  );
}

export function StatusScreen({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center p-8 space-y-4"
    >
      <div className="text-5xl">{icon}</div>
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="text-text-muted max-w-md">{description}</p>
      {action}
    </motion.div>
  );
}
