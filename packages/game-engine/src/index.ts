/**
 * Game Engine Entry Point
 * Exports Phaser configuration and scenes
 */

import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { ClassSelectScene } from './scenes/ClassSelectScene';
import { TutorialScene } from './scenes/TutorialScene';
import { DungeonSelectScene } from './scenes/DungeonSelectScene';
import { BattleScene } from './scenes/BattleScene';
import { EndingScene } from './scenes/EndingScene';
import { MinigameScene } from './scenes/MinigameScene';
import { EventScene } from './scenes/EventScene';

export { BootScene, MainMenuScene, ClassSelectScene, TutorialScene, DungeonSelectScene, BattleScene, EndingScene, MinigameScene, EventScene };
export type { MinigameSceneData } from './scenes/MinigameScene';
export { TechDebt } from './systems/TechDebt';
export type { TechDebtLevel, TechDebtStatus } from './systems/TechDebt';
export { EnemyAI } from './systems/EnemyAI';
export type { EnemyAction } from './systems/EnemyAI';
export { ItemSystem } from './systems/ItemSystem';
export type { UseItemResult, DropResult } from './systems/ItemSystem';
export { LevelUpSystem } from './systems/LevelUpSystem';
export type { LevelUpResult, StatGrowth } from './systems/LevelUpSystem';
export { ProgressionSystem } from './systems/ProgressionSystem';
export type { GameProgress, ChapterProgress, StageProgress, SaveData } from './systems/ProgressionSystem';
export type { EndingType, EndingData } from './scenes/EndingScene';
export { EventSystem } from './systems/EventSystem';
export type { GameEvent, EventEffect, EventResult, AppliedEffect } from './systems/EventSystem';
export type { EventSceneData } from './scenes/EventScene';
export { AccessibilitySystem } from './systems/AccessibilitySystem';
export type { AccessibilityConfig, ColorIconPair, ValidationReport } from './systems/AccessibilitySystem';
export { SpriteSystem } from './systems/SpriteSystem';
export type { ClassPalette, SpriteConfig } from './systems/SpriteSystem';
export { BalanceSimulator } from './systems/BalanceSimulator';
export type { SimulationConfig, BattleSimResult, SimulationReport } from './systems/BalanceSimulator';

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
    scene: [BootScene, MainMenuScene, ClassSelectScene, TutorialScene, DungeonSelectScene, BattleScene, EventScene, EndingScene, MinigameScene],
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
    input: {
      activePointers: 3, // Support multi-touch
      touch: {
        target: null as any, // Use canvas element
      },
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
