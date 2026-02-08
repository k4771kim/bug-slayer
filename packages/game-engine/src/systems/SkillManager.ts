/**
 * SkillManager - Manages skill usage, cooldowns, and MP in battle
 *
 * Extracted from BattleScene.ts to improve modularity.
 * Handles:
 * - Skill execution with all effect types
 * - Skill cooldown tracking
 * - MP costs and recovery
 * - Focus buff management
 */

import type { Character, Monster } from '@bug-slayer/shared';
import {
  calculateCritChance,
  calculateEvasionChance,
  calculateDamage as sharedCalculateDamage,
  CRIT_MULTIPLIER,
  FOCUS_DAMAGE_BONUS_PERCENT,
  MP_AUTO_RECOVERY_PERCENT,
  MP_FOCUS_RECOVERY_PERCENT,
} from '@bug-slayer/shared';
import type { SkillData } from '../loaders/DataLoader';
import type { TechDebt } from './TechDebt';
import { BuffManager } from './BuffManager';

export interface SkillUseResult {
  success: boolean;
  totalDamage: number;
  totalHeal: number;
  effectTexts: string[];
  mpRestored: number;
  errorMessage?: string;
}

export interface FocusResult {
  mpRestored: number;
}

export class SkillManager {
  private skillCooldowns: Map<string, number> = new Map();
  private focusBuff: boolean = false;

  constructor(private buffManager: BuffManager) {}

  /**
   * Reset cooldowns and focus buff (call at battle start)
   */
  reset(): void {
    this.skillCooldowns.clear();
    this.focusBuff = false;
  }

  // =========================================================================
  // Skill Execution
  // =========================================================================

  /**
   * Execute a skill with all its effects.
   * @returns Result object with damage, healing, and effect messages
   */
  useSkill(
    skillData: SkillData,
    player: Character,
    monster: Monster,
    techDebt: TechDebt,
    soundCallback?: (sfxId: string) => void
  ): SkillUseResult {
    // Check MP
    if (player.currentMP < skillData.mpCost) {
      return {
        success: false,
        totalDamage: 0,
        totalHeal: 0,
        effectTexts: [],
        mpRestored: 0,
        errorMessage: 'Not enough MP!',
      };
    }

    // Check cooldown
    const currentCD = this.skillCooldowns.get(skillData.id) ?? 0;
    if (currentCD > 0) {
      return {
        success: false,
        totalDamage: 0,
        totalHeal: 0,
        effectTexts: [],
        mpRestored: 0,
        errorMessage: `${skillData.name} is on cooldown! (${currentCD} turns)`,
      };
    }

    // Deduct MP
    player.currentMP -= skillData.mpCost;

    // Set cooldown from skill data
    if (skillData.cooldown > 0) {
      this.skillCooldowns.set(skillData.id, skillData.cooldown);
    }

    // Process skill effects
    let totalDamage = 0;
    let totalHeal = 0;
    const effectTexts: string[] = [];

    for (const effect of skillData.effects) {
      switch (effect.type) {
        case 'damage': {
          // Scale skill damage off player ATK: baseDmg = ATK * (skillValue / 100)
          const playerATK = this.buffManager.getEffectiveStat(player.stats.ATK, 'ATK', 'player');
          let baseDmg = Math.floor(playerATK * (effect.value / 100));

          // Apply focus buff
          if (this.focusBuff) {
            baseDmg = Math.floor(baseDmg * (1 + FOCUS_DAMAGE_BONUS_PERCENT / 100));
            effectTexts.push('+20% Focus Bonus!');
            this.focusBuff = false;
          }

          // Check evasion
          const monsterSPD = monster.stats.SPD ?? 0;
          const playerSPD = this.buffManager.getEffectiveStat(player.stats.SPD, 'SPD', 'player');
          if (this.rollEvasion(monsterSPD, playerSPD)) {
            soundCallback?.('sfx-evade');
            effectTexts.push('MISS!');
            break;
          }

          // Apply defense formula
          const monsterDEF = this.buffManager.getEffectiveStat(monster.stats.DEF, 'DEF', 'monster');
          let dmg = this.calculateDamage(baseDmg, monsterDEF);

          // Critical hit
          if (this.rollCritical(playerSPD, monsterSPD)) {
            dmg = Math.floor(dmg * CRIT_MULTIPLIER);
            effectTexts.push('CRITICAL!');
          }

          monster.currentHP = Math.max(0, monster.currentHP - dmg);
          totalDamage += dmg;
          break;
        }

        case 'heal': {
          // value is % of max HP
          const healAmount = Math.floor(player.stats.HP * (effect.value / 100));
          player.currentHP = Math.min(player.stats.HP, player.currentHP + healAmount);
          totalHeal += healAmount;
          effectTexts.push(`Healed ${healAmount} HP`);
          soundCallback?.('sfx-heal');
          break;
        }

        case 'buff': {
          if (effect.stat && effect.duration) {
            this.buffManager.applyBuff(
              effect.stat,
              effect.value,
              effect.duration,
              skillData.targetType === 'self' ? 'player' : 'player'
            );
            effectTexts.push(`+${effect.value} ${effect.stat} for ${effect.duration} turns`);
            soundCallback?.('sfx-buff');
          }
          break;
        }

        case 'debuff': {
          if (effect.stat && effect.duration) {
            this.buffManager.applyBuff(
              effect.stat,
              effect.value, // negative value for debuffs
              effect.duration,
              'monster'
            );
            effectTexts.push(`${effect.value} ${effect.stat} on enemy for ${effect.duration} turns`);
            soundCallback?.('sfx-debuff');
          }
          break;
        }

        case 'special': {
          // Handle special effects like "Pay Tech Debt"
          if (effect.description?.includes('Tech Debt')) {
            const reduction = Math.abs(effect.value);
            techDebt.decrease(reduction);
            effectTexts.push(`Tech Debt reduced by ${reduction}!`);
          }
          break;
        }

        case 'dot': {
          // Damage over time - apply as buff with 'DOT' stat
          if (effect.duration) {
            this.buffManager.applyBuff('DOT', effect.value, effect.duration, 'monster');
            effectTexts.push(`DoT: ${effect.value} dmg/turn for ${effect.duration} turns`);
          }
          break;
        }
      }
    }

    // Tech debt per turn
    techDebt.turnPassed();

    // Auto MP restore (5% per turn)
    const mpRestored = this.autoRestoreMP(player);

    return {
      success: true,
      totalDamage,
      totalHeal,
      effectTexts,
      mpRestored,
    };
  }

  /**
   * Handle Focus action: restore 15% MP and set +20% damage buff for next attack.
   */
  useFocus(player: Character, techDebt: TechDebt): FocusResult {
    // Restore Focus MP
    const mpRestore = Math.floor(player.stats.MP * (MP_FOCUS_RECOVERY_PERCENT / 100));
    player.currentMP = Math.min(player.stats.MP, player.currentMP + mpRestore);

    // Set focus buff for next attack (+20% DMG)
    this.focusBuff = true;

    // Tech debt per turn
    techDebt.turnPassed();

    return { mpRestored: mpRestore };
  }

  /**
   * Check if a skill can be used (MP and cooldown check).
   */
  canUseSkill(skillData: SkillData, player: Character): { canUse: boolean; reason?: string } {
    if (player.currentMP < skillData.mpCost) {
      return { canUse: false, reason: 'Not enough MP!' };
    }

    const currentCD = this.skillCooldowns.get(skillData.id) ?? 0;
    if (currentCD > 0) {
      return { canUse: false, reason: `On cooldown! (${currentCD} turns)` };
    }

    return { canUse: true };
  }

  /**
   * Get current cooldown for a skill.
   */
  getCooldown(skillId: string): number {
    return this.skillCooldowns.get(skillId) ?? 0;
  }

  /**
   * Check if focus buff is active.
   */
  hasFocusBuff(): boolean {
    return this.focusBuff;
  }

  // =========================================================================
  // Cooldown Management
  // =========================================================================

  /**
   * Tick all skill cooldowns by 1 at start of player turn.
   */
  tickCooldowns(): void {
    for (const [skillId, cd] of this.skillCooldowns.entries()) {
      if (cd > 0) {
        this.skillCooldowns.set(skillId, cd - 1);
      }
      if (cd <= 1) {
        this.skillCooldowns.delete(skillId);
      }
    }
  }

  // =========================================================================
  // MP Recovery
  // =========================================================================

  /**
   * Auto restore 5% MP per turn.
   */
  private autoRestoreMP(player: Character): number {
    const mpRestore = Math.floor(player.stats.MP * (MP_AUTO_RECOVERY_PERCENT / 100));
    player.currentMP = Math.min(player.stats.MP, player.currentMP + mpRestore);
    return mpRestore;
  }

  // =========================================================================
  // Combat Calculations
  // =========================================================================

  /**
   * Critical hit: critChance = min(30%, 10 + SPD * 0.5)
   */
  private rollCritical(attackerSPD: number, _defenderSPD: number): boolean {
    const critChance = calculateCritChance(attackerSPD);
    return Math.random() * 100 < critChance;
  }

  /**
   * Evasion: evasionChance = max(0, (targetSPD - attackerSPD) * 2)
   * Capped at 50%.
   */
  private rollEvasion(defenderSPD: number, attackerSPD: number): boolean {
    const evasionChance = Math.min(50, calculateEvasionChance(defenderSPD, attackerSPD));
    return Math.random() * 100 < evasionChance;
  }

  /**
   * finalDmg = baseDmg * (100 / (100 + DEF * 0.7))
   */
  private calculateDamage(baseDmg: number, defense: number): number {
    return sharedCalculateDamage(baseDmg, defense);
  }
}
