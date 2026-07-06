import type { Metadata } from 'next';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import './globals.css';

export const metadata: Metadata = {
  title: 'mauknh.diaries',
  description:
    'Stream local videos and music to anyone, anywhere. No cloud upload — real-time synced sessions.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
