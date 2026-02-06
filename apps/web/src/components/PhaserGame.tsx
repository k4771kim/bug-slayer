'use client';

import { useEffect, useRef } from 'react';
import { initGame } from '@bug-slayer/game-engine';

interface PhaserGameProps {
  className?: string;
}

/**
 * PhaserGame Component
 * Mounts Phaser game canvas in Next.js app
 */
export function PhaserGame({ className }: PhaserGameProps) {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Phaser game only on client-side
    if (typeof window === 'undefined') return;

    // Create game instance
    if (!gameRef.current && containerRef.current) {
      gameRef.current = initGame('phaser-game');
    }

    // Cleanup on unmount
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className={className}>
      <div
        id="phaser-game"
        ref={containerRef}
        className="mx-auto"
        style={{ maxWidth: '800px' }}
      />
    </div>
  );
}
