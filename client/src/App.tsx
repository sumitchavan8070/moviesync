import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LoadingSpinner } from '@/components/common';
import { MainLayout, RoomLayout } from '@/layouts/MainLayout';

const LandingPage = lazy(() =>
  import('@/pages/LandingPage').then((m) => ({ default: m.LandingPage })),
);
const CreateRoomPage = lazy(() =>
  import('@/pages/CreateRoomPage').then((m) => ({ default: m.CreateRoomPage })),
);
const JoinRoomPage = lazy(() =>
  import('@/pages/JoinRoomPage').then((m) => ({ default: m.JoinRoomPage })),
);
const RoomPage = lazy(() => import('@/pages/RoomPage').then((m) => ({ default: m.RoomPage })));

export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner message="Loading..." />}>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/create" element={<CreateRoomPage />} />
            <Route path="/join" element={<JoinRoomPage />} />
          </Route>
          <Route element={<RoomLayout />}>
            <Route path="/room/:roomId" element={<RoomPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
