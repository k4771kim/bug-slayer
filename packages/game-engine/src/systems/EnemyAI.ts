/**
 * EnemyAI System - Behavior Tree Implementation
 *
 * Handles enemy decision-making based on behaviorTree JSON:
 * - Regular bugs: Weighted random actions
 * - Bosses: 3-phase system at 75%/50%/25% HP thresholds
 *
 * Condition types:
 * - hp_below: Activate when HP falls below threshold (%)
 * - hp_above: Activate when HP is above threshold (%)
 * - turn_count: Activate after N turns
 * - phase_change: Boss phase transition trigger
 *
 * Action types:
 * - attack: Basic attack
 * - skill: Use specific skill by skillId
 * - buff: Apply buff to self
 * - heal: Heal self
 */

import type { Monster, BehaviorCondition, BehaviorAction, BehaviorTree } from '@bug-slayer/shared';

export type EnemyAction = {
  type: 'attack';
} | {
  type: 'skill';
  skillId: string;
} | {
  type: 'buff';
  targetStat?: string;
  modifier?: number;
} | {
  type: 'heal';
  amount?: number;
};

/**
 * EnemyAI class manages enemy decision-making
 */
export class EnemyAI {
  private monster: Monster;
  private turnCount: number = 0;
  private currentPhase: number = 1;

  constructor(monster: Monster) {
    this.monster = monster;
    this.currentPhase = monster.phase || 1;
  }

  /**
   * Get current turn count
   */
  get turns(): number {
    return this.turnCount;
  }

  /**
   * Get current boss phase (1-4)
   */
  get phase(): number {
    return this.currentPhase;
  }

  /**
   * Increment turn counter
   */
  incrementTurn(): void {
    this.turnCount++;
  }

  /**
   * Calculate current HP percentage
   */
  private getHPPercentage(): number {
    return (this.monster.currentHP / this.monster.stats.HP) * 100;
  }

  /**
   * Check if a condition is met
   */
  private evaluateCondition(condition: BehaviorCondition): boolean {
    switch (condition.type) {
      case 'hp_below':
        return this.getHPPercentage() <= condition.value;

      case 'hp_above':
        return this.getHPPercentage() >= condition.value;

      case 'turn_count':
        return this.turnCount >= condition.value;

      case 'phase_change':
        // Boss phase transitions at 75%, 50%, 25% HP
        const hpPercent = this.getHPPercentage();
        if (condition.value === 2 && hpPercent <= 75 && this.currentPhase === 1) {
          this.currentPhase = 2;
          return true;
        }
        if (condition.value === 3 && hpPercent <= 50 && this.currentPhase === 2) {
          this.currentPhase = 3;
          return true;
        }
        if (condition.value === 4 && hpPercent <= 25 && this.currentPhase === 3) {
          this.currentPhase = 4;
          return true;
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Evaluate all conditions
   */
  private evaluateConditions(): boolean {
    if (!this.monster.behaviorTree?.conditions) return true;

    // All conditions must be met (AND logic)
    // For boss phase changes, we only need one phase_change to trigger
    const conditions = this.monster.behaviorTree.conditions;
    const phaseConditions = conditions.filter(c => c.type === 'phase_change');
    const otherConditions = conditions.filter(c => c.type !== 'phase_change');

    // Check non-phase conditions (all must be true)
    const othersMet = otherConditions.length === 0 ||
                      otherConditions.every(c => this.evaluateCondition(c));

    // Check phase conditions (any can trigger)
    const phaseMet = phaseConditions.length === 0 ||
                     phaseConditions.some(c => this.evaluateCondition(c));

    return othersMet && phaseMet;
  }

  /**
   * Select action based on weights (weighted random)
   */
  private selectAction(): BehaviorAction | null {
    if (!this.monster.behaviorTree?.actions || this.monster.behaviorTree.actions.length === 0) {
      return null;
    }

    const actions = this.monster.behaviorTree.actions;

    // Calculate total weight
    const totalWeight = actions.reduce((sum, action) => sum + action.weight, 0);

    // Random weighted selection
    let random = Math.random() * totalWeight;

    for (const action of actions) {
      random -= action.weight;
      if (random <= 0) {
        return action;
      }
    }

    // Fallback to first action (or null if empty)
    return actions[0] || null;
  }

  /**
   * Convert BehaviorAction to EnemyAction for execution
   */
  private convertAction(behaviorAction: BehaviorAction): EnemyAction {
    switch (behaviorAction.type) {
      case 'attack':
        return { type: 'attack' };

      case 'skill':
        return {
          type: 'skill',
          skillId: behaviorAction.skillId || 'basic-skill',
        };

      case 'buff':
        return {
          type: 'buff',
          targetStat: 'ATK',
          modifier: 1.2,
        };

      case 'heal':
        return {
          type: 'heal',
          amount: 20,
        };

      default:
        return { type: 'attack' };
    }
  }

  /**
   * Get boss phase description
   */
  getPhaseDescription(): string {
    if (this.monster.type !== 'boss') return '';

    const descriptions = {
      1: 'Phase 1: Initial Pattern',
      2: 'Phase 2: Enhanced Pattern (HP < 75%)',
      3: 'Phase 3: Aggressive Pattern (HP < 50%)',
      4: 'Phase 4: Desperate Pattern (HP < 25%)',
    };

    return descriptions[this.currentPhase as keyof typeof descriptions] || '';
  }

  /**
   * Decide next action (main decision function)
   */
  decideAction(): EnemyAction {
    // Increment turn counter
    this.incrementTurn();

    // Evaluate conditions
    const conditionsMet = this.evaluateConditions();

    // If conditions not met, default to basic attack
    if (!conditionsMet) {
      return { type: 'attack' };
    }

    // Select action based on weights
    const behaviorAction = this.selectAction();

    // If no action found, default to attack
    if (!behaviorAction) {
      return { type: 'attack' };
    }

    // Convert and return action
    return this.convertAction(behaviorAction);
  }

  /**
   * Reset AI state (for new battle)
   */
  reset(): void {
    this.turnCount = 0;
    this.currentPhase = this.monster.phase || 1;
  }

  /**
   * Get AI debug info
   */
  getDebugInfo(): {
    turnCount: number;
    currentPhase: number;
    hpPercent: number;
    isBoss: boolean;
  } {
    return {
      turnCount: this.turnCount,
      currentPhase: this.currentPhase,
      hpPercent: this.getHPPercentage(),
      isBoss: this.monster.type === 'boss',
    };
  }
}
