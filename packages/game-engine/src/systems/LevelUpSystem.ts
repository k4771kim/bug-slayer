/**
 * LevelUpSystem - Experience and Level Progression
 *
 * Handles:
 * - Experience point tracking
 * - Level-up calculations (EXP curve)
 * - Stat growth application based on class
 * - Level-up notifications
 *
 * EXP Formula (linear):
 * - Required EXP = baseEXP + (level - 2) * 20
 * - baseEXP = 100
 * - Example: Lv1->2 = 100, Lv2->3 = 120, Lv3->4 = 140
 */

import type { Character, CharacterStats } from '@bug-slayer/shared';

export interface LevelUpResult {
  levelsGained: number;
  newLevel: number;
  statsGained: Partial<CharacterStats>;
  maxHPIncreased: number;
  maxMPIncreased: number;
}

export interface StatGrowth {
  HP: number;
  ATK: number;
  DEF: number;
  SPD: number;
  MP: number;
}

/**
 * LevelUpSystem class manages character progression
 */
export class LevelUpSystem {
  private character: Character;
  private statGrowth: StatGrowth;

  // EXP curve constants
  private readonly BASE_EXP = 100;
  private readonly EXP_EXPONENT = 1.5;
  private readonly MAX_LEVEL = 20;

  constructor(character: Character, statGrowth: StatGrowth) {
    this.character = character;
    this.statGrowth = statGrowth;
  }

  /**
   * Calculate EXP required to reach a specific level
   * GDD linear formula: Lv2=100, Lv3=120, Lv4=140... (+20 per level)
   */
  getExpForLevel(level: number): number {
    if (level <= 1) return 0;
    if (level > this.MAX_LEVEL) return Infinity;

    // Linear formula: 100 + (level - 2) * 20
    // Lv2=100, Lv3=120, Lv4=140, Lv5=160, ...
    return this.BASE_EXP + (level - 2) * 20;
  }

  /**
   * Get EXP required for next level
   */
  getExpForNextLevel(): number {
    return this.getExpForLevel(this.character.level + 1);
  }

  /**
   * Get current progress to next level (0-100%)
   */
  getExpProgress(): number {
    if (this.character.level >= this.MAX_LEVEL) return 100;

    const currentLevelExp = this.getExpForLevel(this.character.level);
    const nextLevelExp = this.getExpForNextLevel();
    const expIntoLevel = this.character.exp - currentLevelExp;
    const expNeeded = nextLevelExp - currentLevelExp;

    return Math.min(100, (expIntoLevel / expNeeded) * 100);
  }

  /**
   * Get remaining EXP needed for next level
   */
  getExpToNextLevel(): number {
    if (this.character.level >= this.MAX_LEVEL) return 0;
    return this.getExpForNextLevel() - this.character.exp;
  }

  /**
   * Check if character can level up
   */
  canLevelUp(): boolean {
    return (
      this.character.level < this.MAX_LEVEL &&
      this.character.exp >= this.getExpForNextLevel()
    );
  }

  /**
   * Add experience points and handle level-ups
   * Returns level-up result if leveled up, null otherwise
   */
  addExp(amount: number): LevelUpResult | null {
    const beforeExp = this.character.exp;
    const beforeLevel = this.character.level;
    const beforeStats = { ...this.character.stats };

    console.log('[LevelUp] Adding EXP:', {
      amount,
      beforeExp,
      beforeLevel,
      expForNextLevel: this.getExpForNextLevel(),
    });

    if (this.character.level >= this.MAX_LEVEL) {
      console.log('[LevelUp] Max level reached, no EXP gain');
      return null; // Max level reached
    }

    // Add EXP
    this.character.exp += amount;

    // Validation: Check EXP increase
    if (this.character.exp !== beforeExp + amount) {
      console.error('[LevelUp] EXP mismatch!', {
        expected: beforeExp + amount,
        actual: this.character.exp,
      });
    }

    // Check for level-ups (can level up multiple times)
    let levelsGained = 0;
    const statsGained: Partial<CharacterStats> = {
      HP: 0,
      ATK: 0,
      DEF: 0,
      SPD: 0,
      MP: 0,
    };

    while (this.canLevelUp()) {
      this.character.level += 1;
      levelsGained += 1;

      // Apply stat growth
      this.applyStatGrowth(statsGained);

      // Stop if max level reached
      if (this.character.level >= this.MAX_LEVEL) {
        break;
      }
    }

    // If no level-up occurred, return null
    if (levelsGained === 0) {
      console.log('[LevelUp] No level up', {
        currentExp: this.character.exp,
        expNeeded: this.getExpForNextLevel(),
      });
      return null;
    }

    console.log('[LevelUp] Level Up!', {
      levelsGained,
      newLevel: this.character.level,
      statsGained,
      beforeStats,
      afterStats: { ...this.character.stats },
    });

    // Restore HP/MP to full on level-up
    this.character.currentHP = this.character.stats.HP;
    this.character.currentMP = this.character.stats.MP;

    return {
      levelsGained,
      newLevel: this.character.level,
      statsGained,
      maxHPIncreased: statsGained.HP || 0,
      maxMPIncreased: statsGained.MP || 0,
    };
  }

  /**
   * Apply stat growth for one level
   */
  private applyStatGrowth(accumulator: Partial<CharacterStats>): void {
    // Increase stats based on class growth rates
    this.character.stats.HP += this.statGrowth.HP;
    this.character.stats.ATK += this.statGrowth.ATK;
    this.character.stats.DEF += this.statGrowth.DEF;
    this.character.stats.SPD += this.statGrowth.SPD;
    this.character.stats.MP += this.statGrowth.MP;

    // Accumulate for display
    accumulator.HP = (accumulator.HP || 0) + this.statGrowth.HP;
    accumulator.ATK = (accumulator.ATK || 0) + this.statGrowth.ATK;
    accumulator.DEF = (accumulator.DEF || 0) + this.statGrowth.DEF;
    accumulator.SPD = (accumulator.SPD || 0) + this.statGrowth.SPD;
    accumulator.MP = (accumulator.MP || 0) + this.statGrowth.MP;
  }

  /**
   * Get character's current level
   */
  getLevel(): number {
    return this.character.level;
  }

  /**
   * Get character's current EXP
   */
  getExp(): number {
    return this.character.exp;
  }

  /**
   * Set character level directly (for testing/admin)
   */
  setLevel(level: number): void {
    if (level < 1 || level > this.MAX_LEVEL) {
      throw new Error(`Level must be between 1 and ${this.MAX_LEVEL}`);
    }

    const levelDiff = level - this.character.level;
    if (levelDiff === 0) return;

    // Apply stat growth for each level
    for (let i = 0; i < Math.abs(levelDiff); i++) {
      if (levelDiff > 0) {
        // Level up
        this.character.stats.HP += this.statGrowth.HP;
        this.character.stats.ATK += this.statGrowth.ATK;
        this.character.stats.DEF += this.statGrowth.DEF;
        this.character.stats.SPD += this.statGrowth.SPD;
        this.character.stats.MP += this.statGrowth.MP;
      } else {
        // Level down (remove stats)
        this.character.stats.HP -= this.statGrowth.HP;
        this.character.stats.ATK -= this.statGrowth.ATK;
        this.character.stats.DEF -= this.statGrowth.DEF;
        this.character.stats.SPD -= this.statGrowth.SPD;
        this.character.stats.MP -= this.statGrowth.MP;
      }
    }

    // Update level and EXP
    this.character.level = level;
    this.character.exp = this.getExpForLevel(level);

    // Restore HP/MP
    this.character.currentHP = this.character.stats.HP;
    this.character.currentMP = this.character.stats.MP;
  }

  /**
   * Get max level
   */
  getMaxLevel(): number {
    return this.MAX_LEVEL;
  }

  /**
   * Check if at max level
   */
  isMaxLevel(): boolean {
    return this.character.level >= this.MAX_LEVEL;
  }

  /**
   * Get stat growth rates
   */
  getStatGrowth(): StatGrowth {
    return { ...this.statGrowth };
  }

  /**
   * Get level info summary
   */
  getLevelInfo(): {
    level: number;
    exp: number;
    expForNextLevel: number;
    expToNextLevel: number;
    progress: number;
    isMaxLevel: boolean;
  } {
    return {
      level: this.character.level,
      exp: this.character.exp,
      expForNextLevel: this.getExpForNextLevel(),
      expToNextLevel: this.getExpToNextLevel(),
      progress: this.getExpProgress(),
      isMaxLevel: this.isMaxLevel(),
    };
  }

  /**
   * Get detailed level info for debugging
   */
  getDebugInfo(): {
    level: number;
    exp: number;
    expForNextLevel: number;
    expToNextLevel: number;
    progress: number;
    stats: CharacterStats;
  } {
    return {
      level: this.character.level,
      exp: this.character.exp,
      expForNextLevel: this.getExpForNextLevel(),
      expToNextLevel: this.getExpToNextLevel(),
      progress: this.getExpProgress(),
      stats: { ...this.character.stats },
    };
  }
}
