import { Outlet } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export function MainLayout() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col">
        <Outlet />
      </div>
    </ErrorBoundary>
  );
}

export function RoomLayout() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-background">
        <Outlet />
      </div>
    </ErrorBoundary>
  );
}
