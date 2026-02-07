'use client';

import { create } from 'zustand';

export interface SkillInfo {
  id: string;
  name: string;
  mpCost: number;
  cooldown: number;
  maxCooldown: number;
  description: string;
}

export interface LogEntry {
  id: number;
  message: string;
  type: 'player' | 'enemy' | 'system';
}

export interface StatusEffect {
  type: 'stun' | 'confusion';
  turnsRemaining: number;
  target: 'player' | 'monster';
}

interface BattleState {
  // Player
  playerName: string;
  playerHP: number;
  playerMaxHP: number;
  playerMP: number;
  playerMaxMP: number;
  playerLevel: number;
  playerExp: number;
  playerExpNext: number;

  // Monster
  monsterName: string;
  monsterHP: number;
  monsterMaxHP: number;
  monsterType: string;
  bossPhase: number;

  // Skills
  skills: SkillInfo[];

  // Tech Debt
  techDebt: number;

  // Status Effects
  statusEffects: StatusEffect[];

  // Battle Log
  logs: LogEntry[];

  // State
  isPlayerTurn: boolean;
  isBattleActive: boolean;
  chapter: number;
  stage: number;

  // Actions (called from Phaser via window event bridge)
  updatePlayer: (data: Partial<Pick<BattleState, 'playerName' | 'playerHP' | 'playerMaxHP' | 'playerMP' | 'playerMaxMP' | 'playerLevel' | 'playerExp' | 'playerExpNext'>>) => void;
  updateMonster: (data: Partial<Pick<BattleState, 'monsterName' | 'monsterHP' | 'monsterMaxHP' | 'monsterType' | 'bossPhase'>>) => void;
  setSkills: (skills: SkillInfo[]) => void;
  setTechDebt: (value: number) => void;
  setStatusEffects: (effects: StatusEffect[]) => void;
  addLog: (message: string, type: LogEntry['type']) => void;
  clearLogs: () => void;
  setTurn: (isPlayerTurn: boolean) => void;
  setBattleActive: (active: boolean) => void;
  setStageInfo: (chapter: number, stage: number) => void;
  reset: () => void;
}

let logCounter = 0;

const initialState = {
  playerName: 'Hero',
  playerHP: 100,
  playerMaxHP: 100,
  playerMP: 50,
  playerMaxMP: 50,
  playerLevel: 1,
  playerExp: 0,
  playerExpNext: 100,
  monsterName: '',
  monsterHP: 0,
  monsterMaxHP: 0,
  monsterType: 'bug',
  bossPhase: 1,
  skills: [] as SkillInfo[],
  techDebt: 0,
  statusEffects: [] as StatusEffect[],
  logs: [] as LogEntry[],
  isPlayerTurn: true,
  isBattleActive: false,
  chapter: 1,
  stage: 1,
};

export const useBattleStore = create<BattleState>((set) => ({
  ...initialState,

  updatePlayer: (data) => set((state) => ({ ...state, ...data })),
  updateMonster: (data) => set((state) => ({ ...state, ...data })),
  setSkills: (skills) => set({ skills }),
  setTechDebt: (value) => set({ techDebt: value }),
  setStatusEffects: (effects) => set({ statusEffects: effects }),
  addLog: (message, type) =>
    set((state) => ({
      logs: [...state.logs.slice(-49), { id: ++logCounter, message, type }],
    })),
  clearLogs: () => set({ logs: [] }),
  setTurn: (isPlayerTurn) => set({ isPlayerTurn }),
  setBattleActive: (active) => set({ isBattleActive: active }),
  setStageInfo: (chapter, stage) => set({ chapter, stage }),
  reset: () => {
    logCounter = 0;
    set(initialState);
  },
}));

/**
 * Phaser Event Bridge
 *
 * Phaser scenes emit custom events on `window` which this listener
 * translates into Zustand store updates. Call `initBattleBridge()`
 * once when the PhaserGame component mounts.
 *
 * From Phaser (BattleScene), dispatch:
 *   window.dispatchEvent(new CustomEvent('battle:update', { detail: { ... } }))
 */
export function initBattleBridge(): () => void {
  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (!detail) return;

    const store = useBattleStore.getState();

    if (detail.player) store.updatePlayer(detail.player);
    if (detail.monster) store.updateMonster(detail.monster);
    if (detail.skills) store.setSkills(detail.skills);
    if (detail.techDebt !== undefined) store.setTechDebt(detail.techDebt);
    if (detail.statusEffects) store.setStatusEffects(detail.statusEffects);
    if (detail.log) store.addLog(detail.log.message, detail.log.type);
    if (detail.isPlayerTurn !== undefined) store.setTurn(detail.isPlayerTurn);
    if (detail.battleActive !== undefined) store.setBattleActive(detail.battleActive);
    if (detail.stage) store.setStageInfo(detail.stage.chapter, detail.stage.stage);
  };

  window.addEventListener('battle:update', handler);
  return () => window.removeEventListener('battle:update', handler);
}
