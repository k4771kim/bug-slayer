'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/stores/useAuthStore';

const PhaserGame = dynamic(() => import('@/components/PhaserGame').then(m => ({ default: m.PhaserGame })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-gray-400">Loading game engine...</div>
    </div>
  ),
});

export default function GamePage() {
  const router = useRouter();
  const { user, checkAuth, isLoading } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Add game-active class to body for mobile overscroll prevention
  useEffect(() => {
    document.body.classList.add('game-active');
    return () => document.body.classList.remove('game-active');
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1e1e1e]">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-[100dvh] bg-[#1e1e1e] text-white flex flex-col overflow-hidden">
      {/* Collapsible header - hidden on mobile landscape */}
      <header className="hidden md:flex bg-[#252526] border-b border-[#3c3c3c] p-2 px-4 items-center justify-between shrink-0">
        <h1 className="text-lg font-bold">Bug Slayer</h1>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm">{user.displayName}</span>
          <button
            onClick={() => {
              useAuthStore.getState().logout();
              router.push('/');
            }}
            className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Game container - fills remaining space */}
      <main className="flex-1 flex items-center justify-center min-h-0">
        <PhaserGame className="w-full h-full max-w-[800px] max-h-[600px] md:p-4" />
      </main>
    </div>
  );
}
