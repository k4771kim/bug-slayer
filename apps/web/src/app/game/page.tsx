'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';
import { PhaserGame } from '@/components/PhaserGame';

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Bug Slayer</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-300">Welcome, {user.displayName}</span>
            <button
              onClick={() => {
                useAuthStore.getState().logout();
                router.push('/');
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8">
        <div className="bg-gray-800 rounded-lg p-8">
          <h2 className="text-3xl font-bold mb-6 text-center">Battle Arena</h2>

          <div className="mb-6">
            <PhaserGame />
          </div>

          <div className="bg-gray-700 p-4 rounded text-center">
            <p className="text-gray-300 text-sm">
              ⚡ Week 1-4 MVP: Basic turn-based combat with placeholder graphics
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
