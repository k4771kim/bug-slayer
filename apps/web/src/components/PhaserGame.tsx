'use client';

import { useEffect, useRef } from 'react';
import { initGame } from '@bug-slayer/game-engine';
import { BattleOverlay } from './game/BattleOverlay';
import { initBattleBridge } from '@/stores/useBattleStore';

interface PhaserGameProps {
  className?: string;
}

/**
 * PhaserGame Component
 * Mounts Phaser game canvas in Next.js app with React Battle UI overlay
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

    // Initialize Phaser <-> React event bridge
    const cleanupBridge = initBattleBridge();

    // Cleanup on unmount
    return () => {
      cleanupBridge();
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className={className} style={{ position: 'relative' }}>
      <div
        id="phaser-game"
        ref={containerRef}
        className="w-full h-full flex items-center justify-center"
      />
      <BattleOverlay />
    </div>
  );
}
