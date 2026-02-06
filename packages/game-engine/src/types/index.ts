/**
 * Game Engine specific types
 */

export * from '@bug-slayer/shared';

export enum SceneKey {
  Boot = 'BootScene',
  MainMenu = 'MainMenuScene',
  CharSelect = 'CharSelectScene',
  ChapterSelect = 'ChapterSelectScene',
  Battle = 'BattleScene',
  Loot = 'LootScene',
}

export interface GameConfig {
  width: number;
  height: number;
  scale: number;
  backgroundColor: string;
}
