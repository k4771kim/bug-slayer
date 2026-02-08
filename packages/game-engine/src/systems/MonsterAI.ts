/**
 * MonsterAI - Enhanced AI for boss monsters with phase-aware behavior
 *
 * Extends EnemyAI with boss-specific features:
 * - Phase transition detection and handling
 * - Phase-aware action selection
 * - Dynamic action weight adjustment
 * - Boss dialogue and visual triggers
 */

import type { Monster } from '@bug-slayer/shared';
import { EnemyAI, type EnemyAction } from './EnemyAI';

export interface BossPhaseTransition {
  newPhase: number;
  hpThreshold: number;
  triggered: boolean;
}

export interface BossDialogue {
  phase: number;
  messages: string[];
}

/**
 * MonsterAI class manages boss-specific AI behavior
 */
export class MonsterAI {
  private enemyAI: EnemyAI;
  private monster: Monster;
  private lastCheckedPhase: number = 1;

  constructor(monster: Monster) {
    this.monster = monster;
    this.enemyAI = new EnemyAI(monster);
    this.lastCheckedPhase = this.enemyAI.phase;
  }

  /**
   * Get current boss phase (1-4)
   */
  get phase(): number {
    return this.enemyAI.phase;
  }

  /**
   * Get current turn count
   */
  get turns(): number {
    return this.enemyAI.turns;
  }

  /**
   * Increment turn counter
   */
  incrementTurn(): void {
    this.enemyAI.incrementTurn();
  }

  /**
   * Check if boss has transitioned to a new phase.
   * Boss phases trigger at 75%, 50%, 25% HP.
   * @returns Phase transition info if phase changed, null otherwise
   */
  checkBossPhase(): BossPhaseTransition | null {
    if (this.monster.type !== 'boss') {
      return null;
    }

    const currentPhase = this.enemyAI.phase;

    // Check if phase has changed since last check
    if (currentPhase > this.lastCheckedPhase) {
      const hpPercent = (this.monster.currentHP / this.monster.stats.HP) * 100;
      const transition: BossPhaseTransition = {
        newPhase: currentPhase,
        hpThreshold: this.getPhaseThreshold(currentPhase),
        triggered: true,
      };

      this.lastCheckedPhase = currentPhase;
      return transition;
    }

    return null;
  }

  /**
   * Get HP threshold for a given phase.
   * Phase 2: 75%, Phase 3: 50%, Phase 4: 25%
   */
  private getPhaseThreshold(phase: number): number {
    switch (phase) {
      case 2: return 75;
      case 3: return 50;
      case 4: return 25;
      default: return 100;
    }
  }

  /**
   * Get boss dialogue for current phase.
   * Returns a random dialogue from the phase's dialogue pool.
   */
  getBossDialogue(): string | null {
    if (this.monster.type !== 'boss') {
      return null;
    }

    const dialogues = this.getPhaseDialogues(this.enemyAI.phase);
    if (dialogues.length === 0) {
      return null;
    }

    const randomDialogue = dialogues[Math.floor(Math.random() * dialogues.length)];
    return randomDialogue ?? null;
  }

  /**
   * Get dialogue pool for a specific phase.
   */
  private getPhaseDialogues(phase: number): string[] {
    switch (phase) {
      case 1:
        return ['Let\'s see what you\'ve got...', 'Is that all?'];
      case 2:
        return ['You\'re not bad...', 'I\'m just getting started!', 'My code is evolving!'];
      case 3:
        return ['COMPILING RAGE!', 'Stack overflow incoming!', 'You can\'t refactor ME!'];
      case 4:
        return ['SEGFAULT... SEGFAULT...', 'I... won\'t... crash...', 'FATAL ERROR!'];
      default:
        return [];
    }
  }

  /**
   * Select enemy action using behavior tree.
   * Delegates to EnemyAI's decideAction method.
   */
  selectAction(): EnemyAction {
    return this.enemyAI.decideAction();
  }

  /**
   * Get visual configuration for current boss phase.
   * Used by BattleUIRenderer for boss visual effects.
   */
  getBossPhaseConfig(): {
    tint: number;
    overlayAlpha: number;
    shakeIntensity: number;
  } | null {
    if (this.monster.type !== 'boss') {
      return null;
    }

    const phase = this.enemyAI.phase;

    switch (phase) {
      case 1:
        return { tint: 0xffffff, overlayAlpha: 0, shakeIntensity: 0 };
      case 2:
        return { tint: 0xdcdcaa, overlayAlpha: 0.1, shakeIntensity: 2 };
      case 3:
        return { tint: 0xce9178, overlayAlpha: 0.15, shakeIntensity: 4 };
      case 4:
        return { tint: 0xf44747, overlayAlpha: 0.25, shakeIntensity: 8 };
      default:
        return { tint: 0xffffff, overlayAlpha: 0, shakeIntensity: 0 };
    }
  }

  /**
   * Check if this is a boss monster.
   */
  isBoss(): boolean {
    return this.monster.type === 'boss';
  }

  /**
   * Reset AI state for a new battle.
   */
  reset(): void {
    this.lastCheckedPhase = 1;
    // Note: EnemyAI doesn't have a reset method, so we'd need to recreate it
    // or add a reset method to EnemyAI
  }
}
