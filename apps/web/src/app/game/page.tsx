'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';

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
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Game Coming Soon</h2>
          <p className="text-gray-400 mb-8">
            Phaser.js integration will be added in Week 1-4
          </p>
          <div className="space-y-4">
            <div className="bg-gray-700 p-4 rounded">
              <h3 className="font-bold mb-2">Next Steps:</h3>
              <ul className="text-left text-gray-300 space-y-2">
                <li>✓ Week 1-1: Monorepo Setup</li>
                <li>✓ Week 1-2: Backend Authentication</li>
                <li>✓ Week 1-3: Frontend Foundation</li>
                <li>□ Week 1-4: Phaser.js Integration</li>
                <li>□ Week 1-5: Game Data Preparation</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
