/**
 * LevelUpSystem - Experience and Level Progression
 *
 * Handles:
 * - Experience point tracking
 * - Level-up calculations (EXP curve)
 * - Stat growth application based on class
 * - Level-up notifications
 *
 * EXP Formula:
 * - Required EXP = baseEXP * (level ^ exponent)
 * - baseEXP = 100, exponent = 1.5
 * - Example: Lv1->2 = 100, Lv2->3 = 282, Lv3->4 = 519
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
  private readonly MAX_LEVEL = 50;

  constructor(character: Character, statGrowth: StatGrowth) {
    this.character = character;
    this.statGrowth = statGrowth;
  }

  /**
   * Calculate EXP required to reach a specific level
   */
  getExpForLevel(level: number): number {
    if (level <= 1) return 0;
    if (level > this.MAX_LEVEL) return Infinity;

    // Formula: baseEXP * (level ^ 1.5)
    return Math.floor(this.BASE_EXP * Math.pow(level, this.EXP_EXPONENT));
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
    if (this.character.level >= this.MAX_LEVEL) {
      return null; // Max level reached
    }

    // Add EXP
    this.character.exp += amount;

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
      return null;
    }

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
}
