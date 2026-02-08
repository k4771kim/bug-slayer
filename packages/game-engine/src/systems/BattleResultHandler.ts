/**
 * BattleResultHandler - Handles victory and defeat outcomes
 *
 * Extracted from BattleScene.ts to improve modularity.
 * Handles:
 * - Victory rewards (EXP, gold, items)
 * - Level-up processing
 * - Stage completion and progression
 * - Scene transitions (next stage, ending, game over)
 */

import type { Character, Monster } from '@bug-slayer/shared';
import type { TechDebt } from './TechDebt';
import type { LevelUpSystem } from './LevelUpSystem';
import type { ProgressionSystem } from './ProgressionSystem';
import type { ItemSystem } from './ItemSystem';
import type { EventSystem } from './EventSystem';
import type { SoundManager } from './SoundManager';

export interface VictoryRewards {
  exp: number;
  gold: number;
  items: string[];
  levelUp: boolean;
  newLevel?: number;
  statsGained?: Record<string, number>;
}

export interface StageAdvanceResult {
  type: 'next-battle' | 'chapter-complete' | 'game-complete' | 'event';
  chapter?: number;
  stage?: number;
  eventData?: any;
}

/**
 * BattleResultHandler manages post-battle outcomes and progression.
 */
export class BattleResultHandler {
  constructor(
    private player: Character,
    private levelUpSystem: LevelUpSystem,
    private progressionSystem: ProgressionSystem,
    private itemSystem: ItemSystem | null,
    private eventSystem: EventSystem | null,
    private techDebt: TechDebt,
    private soundManager?: SoundManager
  ) {}

  /**
   * Process victory rewards and return summary.
   */
  processVictory(monster: Monster): VictoryRewards {
    // BEFORE values logging
    const beforeGold = this.player.gold;
    const beforeExp = this.player.exp;
    const beforeLevel = this.player.level;

    console.log('[BattleResult] Before Victory:', {
      gold: beforeGold,
      exp: beforeExp,
      level: beforeLevel,
      currentHP: this.player.currentHP,
      currentMP: this.player.currentMP,
    });

    // Stop BGM and play victory sound
    this.soundManager?.stopBGM();
    this.soundManager?.playSFX('sfx-victory');

    // Restore MP to 100% on victory
    this.player.currentMP = this.player.stats.MP;

    // Award EXP and gold from monster drops
    const exp = monster.drops.exp;
    const gold = monster.drops.gold;
    this.player.gold += gold;

    // Roll for item drops
    const items: string[] = [];
    if (this.itemSystem) {
      const drops = this.itemSystem.rollLoot(monster.drops);
      if (drops.items.length > 0) {
        const collected = this.itemSystem.collectDrops(drops);
        items.push(...collected.collected.map(i => i.name));
        if (items.length > 0) {
          this.soundManager?.playSFX('sfx-item-drop');
        }
      }
    }

    // Check for level-up
    const levelUpResult = this.levelUpSystem.addExp(exp);

    // AFTER values logging and validation
    console.log('[BattleResult] After Victory:', {
      goldGained: gold,
      expGained: exp,
      newGold: this.player.gold,
      newExp: this.player.exp,
      newLevel: this.player.level,
      levelUp: levelUpResult !== null,
    });

    // Validation: Check gold increase
    if (this.player.gold !== beforeGold + gold) {
      console.error('[BattleResult] Gold mismatch!', {
        expected: beforeGold + gold,
        actual: this.player.gold,
      });
    }

    if (levelUpResult) {
      this.soundManager?.playSFX('sfx-levelup');
      return {
        exp,
        gold,
        items,
        levelUp: true,
        newLevel: levelUpResult.newLevel,
        statsGained: levelUpResult.statsGained,
      };
    }

    return {
      exp,
      gold,
      items,
      levelUp: false,
    };
  }

  /**
   * Determine next stage or ending after victory.
   */
  determineNextStage(
    chapter: number,
    stage: number,
    battleTime: number,
    stagesCompleted: number[],
    totalPlayTime: number
  ): StageAdvanceResult {
    // Complete stage in progression
    const result = this.progressionSystem.completeStage(this.techDebt.current, battleTime);

    // Mark stage as completed
    stagesCompleted.push(chapter * 100 + stage);

    // Determine if this was the final boss (Chapter 2 boss for MVP)
    const chapterTotalStages: Record<number, number> = { 1: 6, 2: 5 };
    const isFinalBoss = chapter === 2 && stage === (chapterTotalStages[chapter] ?? 5);

    if (isFinalBoss || (result.chapterCompleted && chapter === 2)) {
      // GAME COMPLETE
      return {
        type: 'game-complete',
      };
    }

    if (result.chapterCompleted && result.newChapterUnlocked) {
      // Chapter complete, new chapter unlocked
      return {
        type: 'chapter-complete',
        chapter: chapter + 1,
      };
    }

    // Check for random event
    if (this.eventSystem) {
      const eventResult = this.eventSystem.rollEvent();
      if (eventResult.event) {
        this.eventSystem.setLastEventResult(eventResult);
        return {
          type: 'event',
          chapter: this.progressionSystem.getCurrentChapter(),
          stage: this.progressionSystem.getCurrentStage(),
          eventData: eventResult,
        };
      }
    }

    // Normal stage completion - advance to next stage
    return {
      type: 'next-battle',
      chapter: this.progressionSystem.getCurrentChapter(),
      stage: this.progressionSystem.getCurrentStage(),
    };
  }

  /**
   * Get victory message text.
   */
  getVictoryMessage(monsterName: string, rewards: VictoryRewards): string {
    let message = `Victory! Defeated ${monsterName}!\n+${rewards.exp} EXP, +${rewards.gold} Gold, MP restored`;

    if (rewards.items.length > 0) {
      message += `\nItems: ${rewards.items.join(', ')}`;
    }

    return message;
  }

  /**
   * Get level-up message text.
   */
  getLevelUpMessage(rewards: VictoryRewards): string {
    if (!rewards.levelUp || !rewards.newLevel || !rewards.statsGained) {
      return '';
    }

    const statsText = Object.entries(rewards.statsGained)
      .filter(([_, value]) => value && value > 0)
      .map(([stat, value]) => `${stat}+${value}`)
      .join(', ');

    return (
      `LEVEL UP! Lv.${rewards.newLevel}\n` +
      `Stats increased: ${statsText}\n` +
      `HP and MP fully restored!`
    );
  }

  /**
   * Get chapter complete message text.
   */
  getChapterCompleteMessage(chapter: number): string {
    return `Chapter ${chapter} Complete! Chapter ${chapter + 1} Unlocked!`;
  }

  /**
   * Process defeat and determine outcome.
   */
  processDefeat(): { canRetry: boolean; message: string } {
    // Stop BGM and play defeat sound
    this.soundManager?.stopBGM();
    this.soundManager?.playSFX('sfx-defeat');

    return {
      canRetry: true,
      message: 'Defeated! Your code crashed...',
    };
  }

  /**
   * Calculate total play time including current battle.
   */
  calculateTotalPlayTime(battleStartTime: number, carryOverTime: number): number {
    const battleTime = Math.floor((Date.now() - battleStartTime) / 1000);
    return carryOverTime + battleTime;
  }

  /**
   * Get battle time in seconds.
   */
  getBattleTime(battleStartTime: number): number {
    return Math.floor((Date.now() - battleStartTime) / 1000);
  }

  /**
   * Get current player state for debugging
   */
  getPlayerState(): { gold: number; exp: number; level: number; hp: number; mp: number } {
    return {
      gold: this.player.gold,
      exp: this.player.exp,
      level: this.player.level,
      hp: this.player.currentHP,
      mp: this.player.currentMP,
    };
  }
}
