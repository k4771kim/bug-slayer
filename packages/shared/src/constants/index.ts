/**
 * Bug Slayer: Shared Constants
 *
 * Game constants and configuration values confirmed in the 2026-02-06 meeting.
 */

// ============================================================================
// Game Balance Constants (Confirmed 2026-02-06)
// ============================================================================

export const MAX_TECH_DEBT = 100;
export const TECH_DEBT_THRESHOLDS = {
  LOW: 25,
  MEDIUM: 60,
  HIGH: 90,
  CRITICAL: 91,
} as const;

export const CRIT_CAP = 30;
export const CRIT_MULTIPLIER = 1.5;
export const BASE_CRIT_CHANCE = 10;
export const CRIT_SPD_SCALING = 0.5;
export const EVASION_SPD_SCALING = 2;
export const DEF_MULTIPLIER = 0.7;

export const MP_AUTO_RECOVERY_PERCENT = 5;
export const MP_FOCUS_RECOVERY_PERCENT = 15;
export const MP_VICTORY_RECOVERY_PERCENT = 100;
export const FOCUS_DAMAGE_BONUS_PERCENT = 20;

export const TOTAL_STAT_POINTS = 28;
export const MAX_LEVEL = 20;
export const MIN_DAMAGE = 1;

export const BOSS_PHASE_THRESHOLDS = {
  PHASE_1: 75,
  PHASE_2: 50,
  PHASE_3: 25,
} as const;

export const MAX_PARTY_SIZE = 4;
export const MAX_INVENTORY_SIZE = 50;

// Helper functions
export function calculateDamage(baseDamage: number, defense: number): number {
  const damageReduction = 100 / (100 + defense * DEF_MULTIPLIER);
  return Math.max(MIN_DAMAGE, Math.floor(baseDamage * damageReduction));
}

export function calculateCritChance(speed: number): number {
  return Math.min(CRIT_CAP, BASE_CRIT_CHANCE + speed * CRIT_SPD_SCALING);
}

export function calculateEvasionChance(targetSpeed: number, attackerSpeed: number): number {
  return Math.max(0, (targetSpeed - attackerSpeed) * EVASION_SPD_SCALING);
}
