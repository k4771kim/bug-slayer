/**
 * Game Engine Entry Point
 * Exports Phaser configuration and scenes
 */

import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { BattleScene } from './scenes/BattleScene';

export { BootScene, BattleScene };

/**
 * Create Phaser game configuration
 * @param parentElement - DOM element ID to mount the game
 */
export function createGameConfig(parentElement: string): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: parentElement,
    backgroundColor: '#1e1e1e',
    scene: [BootScene, BattleScene],
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };
}

/**
 * Initialize Phaser game instance
 */
export function initGame(parentElement: string): Phaser.Game {
  const config = createGameConfig(parentElement);
  return new Phaser.Game(config);
}
