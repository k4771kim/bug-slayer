/**
 * TechDebt System - Technical Debt Management
 *
 * Core mechanic that affects difficulty and endings based on player choices:
 * - Skip battles: +10 tech debt
 * - Flee from battle: +5 tech debt
 * - Kill warning monster: -15 tech debt
 * - Every turn in battle: +1 tech debt
 *
 * Range: 0-100
 */

export type TechDebtLevel = 'clean' | 'warning' | 'danger' | 'crisis';

export interface TechDebtStatus {
  current: number;
  level: TechDebtLevel;
  enemyAtkModifier: number;
  description: string;
  color: string;
}

/**
 * TechDebt class manages the technical debt system
 */
export class TechDebt {
  private debt: number = 0;
  private readonly MIN = 0;
  private readonly MAX = 100;

  constructor(initialDebt: number = 0) {
    this.debt = Math.max(this.MIN, Math.min(this.MAX, initialDebt));
  }

  /**
   * Get current tech debt value
   */
  get current(): number {
    return this.debt;
  }

  /**
   * Set tech debt value (clamped to 0-100)
   */
  set current(value: number) {
    this.debt = Math.max(this.MIN, Math.min(this.MAX, value));
  }

  /**
   * Get current tech debt level
   */
  get level(): TechDebtLevel {
    if (this.debt <= 20) return 'clean';
    if (this.debt <= 50) return 'warning';
    if (this.debt <= 80) return 'danger';
    return 'crisis';
  }

  /**
   * Get enemy attack modifier based on current level
   */
  get enemyAtkModifier(): number {
    switch (this.level) {
      case 'clean': return 0.8;   // -20% ATK
      case 'warning': return 1.0;  // +0% ATK (normal)
      case 'danger': return 1.3;   // +30% ATK
      case 'crisis': return 1.5;   // +50% ATK
    }
  }

  /**
   * Get full status information
   */
  getStatus(): TechDebtStatus {
    const levelDescriptions = {
      clean: '청결 - 시스템 안정',
      warning: '경고 - 관리 필요',
      danger: '위험 - 즉시 조치 요망',
      crisis: '위기 - 시스템 붕괴 직전',
    };

    const levelColors = {
      clean: '#4ade80',    // Green
      warning: '#fbbf24',  // Yellow
      danger: '#f97316',   // Orange
      crisis: '#ef4444',   // Red
    };

    return {
      current: this.debt,
      level: this.level,
      enemyAtkModifier: this.enemyAtkModifier,
      description: levelDescriptions[this.level],
      color: levelColors[this.level],
    };
  }

  /**
   * Increase tech debt by a specific amount
   */
  increase(amount: number): number {
    const oldDebt = this.debt;
    this.debt = Math.min(this.MAX, this.debt + amount);
    return this.debt - oldDebt;
  }

  /**
   * Decrease tech debt by a specific amount
   */
  decrease(amount: number): number {
    const oldDebt = this.debt;
    this.debt = Math.max(this.MIN, this.debt - amount);
    return oldDebt - this.debt;
  }

  /**
   * Add tech debt for skipping a battle
   */
  skipBattle(): number {
    return this.increase(10);
  }

  /**
   * Add tech debt for fleeing from battle
   */
  flee(): number {
    return this.increase(5);
  }

  /**
   * Reduce tech debt for killing a warning monster
   */
  killWarning(): number {
    return this.decrease(15);
  }

  /**
   * Add tech debt per turn
   */
  turnPassed(): number {
    return this.increase(1);
  }

  /**
   * Check if ending condition is met
   */
  getEndingType(): 'good' | 'normal' | 'bad' {
    if (this.debt < 40) return 'good';
    if (this.debt <= 70) return 'normal';
    return 'bad';
  }

  /**
   * Check if secret ending is achievable (tech debt must be 0)
   */
  canGetSecretEnding(): boolean {
    return this.debt === 0;
  }

  /**
   * Serialize to JSON
   */
  toJSON(): { debt: number } {
    return { debt: this.debt };
  }

  /**
   * Deserialize from JSON
   */
  static fromJSON(data: { debt: number }): TechDebt {
    return new TechDebt(data.debt);
  }

  /**
   * Reset tech debt to 0
   */
  reset(): void {
    this.debt = 0;
  }
}
