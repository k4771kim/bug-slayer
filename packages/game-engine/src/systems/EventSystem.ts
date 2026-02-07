/**
 * EventSystem - Random Event Management
 *
 * Handles random events that occur between battle stages:
 * - Buffs/debuffs to player stats
 * - Damage/healing effects
 * - Tech debt changes
 * - Gold multipliers for next battle
 *
 * Only one event can trigger per stage transition
 */

import eventsData from '../../data/events.json';

export interface EventChoice {
  id: string;
  text: string;
  effects: EventEffect[];
  resultText: string;
}

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  icon: string;
  probability: number;
  effects: EventEffect[];
  resultText: string;
  choices?: EventChoice[];
  isMinigame?: boolean;
  minigameScene?: string;
}

export interface EventEffect {
  type: 'buff' | 'debuff' | 'damage' | 'heal' | 'techDebt' | 'gold' | 'exp';
  stat?: string;
  value: number;
  duration?: number;
  target?: 'player' | 'monster';
  multiplier?: boolean;
}

export interface EventResult {
  event: GameEvent | null;
  applied: boolean;
}

export interface AppliedEffect {
  stat: string;
  modifier: number;
  duration: number;
  type: 'buff' | 'debuff';
}

/**
 * EventSystem manages random events between battles
 */
export class EventSystem {
  private events: GameEvent[];
  private goldMultiplier: number = 1;
  private appliedEffects: AppliedEffect[] = [];

  constructor() {
    this.events = (eventsData as any).events as GameEvent[];
  }

  /**
   * Roll for a random event
   * Each event has an independent probability to trigger
   * Returns the first event that triggers (if any)
   */
  rollEvent(): EventResult {
    // 30% overall chance for an event to trigger between battles
    if (Math.random() * 100 >= 30) {
      return { event: null, applied: false };
    }

    // Pick a random event from the pool
    const event = this.events[Math.floor(Math.random() * this.events.length)];
    if (!event) {
      return { event: null, applied: false };
    }

    return { event, applied: false };
  }

  /**
   * Apply event effects to player and game state
   * @param player - Player stats object (with HP, maxHP, ATK, DEF, SPD)
   * @param techDebt - TechDebt instance
   * @returns Object with updated values and applied effects
   */
  applyEffects(
    player: { HP: number; maxHP: number; ATK: number; DEF: number; SPD: number },
    techDebt: { current: number }
  ): {
    damageDealt: number;
    healingDone: number;
    techDebtChange: number;
    goldMultiplier: number;
    appliedEffects: AppliedEffect[];
  } {
    let damageDealt = 0;
    let healingDone = 0;
    let techDebtChange = 0;
    const newAppliedEffects: AppliedEffect[] = [];

    const lastResult = this.getLastEventResult();
    if (!lastResult || !lastResult.event) {
      return {
        damageDealt: 0,
        healingDone: 0,
        techDebtChange: 0,
        goldMultiplier: 1,
        appliedEffects: [],
      };
    }

    const event = lastResult.event;

    for (const effect of event.effects) {
      switch (effect.type) {
        case 'damage':
          if (effect.target === 'player' && effect.stat === 'HP') {
            const damage = Math.floor(player.maxHP * (effect.value / 100));
            player.HP = Math.max(1, player.HP - damage); // Don't kill player
            damageDealt = damage;
          }
          break;

        case 'heal':
          if (effect.target === 'player' && effect.stat === 'HP') {
            const healing = Math.floor(player.maxHP * (effect.value / 100));
            player.HP = Math.min(player.maxHP, player.HP + healing);
            healingDone = healing;
          }
          break;

        case 'buff':
        case 'debuff':
          if (effect.target === 'player' && effect.stat && effect.duration) {
            newAppliedEffects.push({
              stat: effect.stat,
              modifier: effect.type === 'buff' ? effect.value : -effect.value,
              duration: effect.duration,
              type: effect.type,
            });
          }
          break;

        case 'techDebt':
          techDebtChange = effect.value;
          techDebt.current += techDebtChange;
          break;

        case 'gold':
          if (effect.multiplier) {
            this.goldMultiplier = effect.value;
          }
          break;
      }
    }

    this.appliedEffects = newAppliedEffects;

    return {
      damageDealt,
      healingDone,
      techDebtChange,
      goldMultiplier: this.goldMultiplier,
      appliedEffects: newAppliedEffects,
    };
  }

  /**
   * Get current gold multiplier and reset it
   */
  consumeGoldMultiplier(): number {
    const multiplier = this.goldMultiplier;
    this.goldMultiplier = 1;
    return multiplier;
  }

  /**
   * Get active stat modifiers from event effects
   */
  getActiveEffects(): AppliedEffect[] {
    return [...this.appliedEffects];
  }

  /**
   * Decrement effect durations and remove expired effects
   * Call this at the end of each turn
   */
  decrementEffectDurations(): void {
    this.appliedEffects = this.appliedEffects
      .map((effect) => ({
        ...effect,
        duration: effect.duration - 1,
      }))
      .filter((effect) => effect.duration > 0);
  }

  /**
   * Clear all active effects
   */
  clearEffects(): void {
    this.appliedEffects = [];
    this.goldMultiplier = 1;
  }

  /**
   * Store event result for deferred application
   */
  private lastEventResult: EventResult | null = null;

  setLastEventResult(result: EventResult): void {
    this.lastEventResult = result;
  }

  getLastEventResult(): EventResult | null {
    return this.lastEventResult;
  }

  clearLastEventResult(): void {
    this.lastEventResult = null;
  }

  /**
   * Check if the rolled event is a minigame event
   */
  isMinigameEvent(event: GameEvent): boolean {
    return (event as any).isMinigame === true;
  }

  /**
   * Get the minigame scene name for a minigame event
   */
  getMinigameScene(event: GameEvent): string | null {
    return (event as any).minigameScene || null;
  }
}
