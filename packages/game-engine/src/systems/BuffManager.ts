/**
 * BuffManager - Manages buffs, debuffs, and status effects in battle
 *
 * Extracted from BattleScene.ts to improve modularity.
 * Handles:
 * - Active buffs/debuffs with turn duration
 * - Status effects (stun, confusion)
 * - DoT (Damage over Time) effects
 * - Stat modification calculations
 */

import type { Character, Monster } from '@bug-slayer/shared';

export interface ActiveBuff {
  stat: string;
  value: number;
  turnsRemaining: number;
  /** 'player' or 'monster' */
  target: 'player' | 'monster';
}

export interface ActiveStatusEffect {
  type: 'stun' | 'confusion';
  turnsRemaining: number;
  target: 'player' | 'monster';
}

export class BuffManager {
  private activeBuffs: ActiveBuff[] = [];
  private statusEffects: ActiveStatusEffect[] = [];

  /**
   * Reset all buffs and status effects (call at battle start)
   */
  reset(): void {
    this.activeBuffs = [];
    this.statusEffects = [];
  }

  // =========================================================================
  // Buff/Debuff Management
  // =========================================================================

  /**
   * Apply a buff or debuff to a target.
   * @param stat - Stat to modify (ATK, DEF, SPD, etc.) or 'DOT' for damage over time
   * @param value - Modifier value (positive for buff, negative for debuff)
   * @param duration - Number of turns the effect lasts
   * @param target - 'player' or 'monster'
   */
  applyBuff(stat: string, value: number, duration: number, target: 'player' | 'monster'): void {
    this.activeBuffs.push({
      stat,
      value,
      turnsRemaining: duration,
      target,
    });
  }

  /**
   * Get effective stat value after applying active buffs.
   * @param baseValue - Base stat value
   * @param stat - Stat name (ATK, DEF, SPD, etc.)
   * @param target - 'player' or 'monster'
   * @returns Modified stat value
   */
  getEffectiveStat(baseValue: number, stat: string, target: 'player' | 'monster'): number {
    let modifier = 0;
    for (const buff of this.activeBuffs) {
      if (buff.stat === stat && buff.target === target && buff.turnsRemaining > 0) {
        modifier += buff.value;
      }
    }
    return Math.max(0, baseValue + modifier);
  }

  /**
   * Tick all buffs at start of each combat phase.
   * Decrements turnsRemaining and removes expired buffs.
   */
  tickBuffs(): void {
    for (const buff of this.activeBuffs) {
      buff.turnsRemaining -= 1;
    }
    // Remove expired
    this.activeBuffs = this.activeBuffs.filter(b => b.turnsRemaining > 0);
  }

  /**
   * Apply DoT (damage over time) effects to the monster.
   * @param monster - Monster to apply DoT to
   * @returns Total damage dealt from DoT effects
   */
  applyDoTEffects(monster: Monster): number {
    let totalDotDamage = 0;
    for (const buff of this.activeBuffs) {
      if (buff.stat === 'DOT' && buff.target === 'monster' && buff.turnsRemaining > 0) {
        const damage = buff.value;
        monster.currentHP = Math.max(0, monster.currentHP - damage);
        totalDotDamage += damage;
      }
    }
    return totalDotDamage;
  }

  /**
   * Get all active buffs (for UI display)
   */
  getActiveBuffs(): ActiveBuff[] {
    return this.activeBuffs.filter(b => b.turnsRemaining > 0);
  }

  // =========================================================================
  // Status Effect Management
  // =========================================================================

  /**
   * Apply a status effect (stun, confusion) to a target.
   * If the effect already exists, refresh duration instead of stacking.
   * @param type - 'stun' or 'confusion'
   * @param duration - Number of turns the effect lasts
   * @param target - 'player' or 'monster'
   */
  applyStatusEffect(type: 'stun' | 'confusion', duration: number, target: 'player' | 'monster'): void {
    // Don't stack same effect on same target — refresh duration instead
    const existing = this.statusEffects.find(e => e.type === type && e.target === target);
    if (existing) {
      existing.turnsRemaining = Math.max(existing.turnsRemaining, duration);
      return;
    }
    this.statusEffects.push({ type, turnsRemaining: duration, target });
  }

  /**
   * Check if a target has a specific status effect.
   * @param type - 'stun' or 'confusion'
   * @param target - 'player' or 'monster'
   * @returns True if the effect is active
   */
  hasStatusEffect(type: 'stun' | 'confusion', target: 'player' | 'monster'): boolean {
    return this.statusEffects.some(e => e.type === type && e.target === target && e.turnsRemaining > 0);
  }

  /**
   * Tick status effects for a specific target.
   * Decrements turnsRemaining and removes expired effects.
   * @param target - 'player' or 'monster'
   */
  tickStatusEffects(target: 'player' | 'monster'): void {
    for (const effect of this.statusEffects) {
      if (effect.target === target) {
        effect.turnsRemaining -= 1;
      }
    }
    this.statusEffects = this.statusEffects.filter(e => e.turnsRemaining > 0);
  }

  /**
   * Get all active status effects (for UI display)
   */
  getActiveStatusEffects(): ActiveStatusEffect[] {
    return this.statusEffects.filter(e => e.turnsRemaining > 0);
  }

  /**
   * Clear all buffs and status effects for a specific target.
   * Useful for special abilities or end-of-battle cleanup.
   * @param target - 'player' or 'monster'
   */
  clearEffects(target: 'player' | 'monster'): void {
    this.activeBuffs = this.activeBuffs.filter(b => b.target !== target);
    this.statusEffects = this.statusEffects.filter(e => e.target !== target);
  }
}
