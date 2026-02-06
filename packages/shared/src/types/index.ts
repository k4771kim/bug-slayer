/**
 * Bug Slayer: Shared TypeScript Types
 *
 * This file contains all shared type definitions used across
 * frontend (web), backend (server), and game engine packages.
 */

// ============================================================================
// Character Types
// ============================================================================

export type CharacterClass = 'Debugger' | 'Refactorer' | 'FullStack' | 'DevOps';

export interface CharacterStats {
  HP: number;
  ATK: number;
  DEF: number;
  SPD: number;
  MP: number;
}

export interface Character {
  id: string;
  name: string;
  class: CharacterClass;
  level: number;
  exp: number;
  stats: CharacterStats;
  currentHP: number;
  currentMP: number;
  skills: Skill[];
  equipment: Equipment;
  inventory: Item[];
}

export interface Equipment {
  weapon?: Item;
  armor?: Item;
  accessory?: Item;
}

// ============================================================================
// Skill Types
// ============================================================================

export type SkillEffectType = 'damage' | 'heal' | 'buff' | 'debuff' | 'dot' | 'special';
export type SkillTargetType = 'single' | 'all';

export interface Skill {
  id: string;
  name: string;
  description: string;
  mpCost: number;
  cooldown: number;
  currentCooldown: number;
  effects: SkillEffect[];
  targetType: SkillTargetType;
}

export interface SkillEffect {
  type: SkillEffectType;
  value: number;
  duration?: number;
  stat?: keyof CharacterStats;
}

// ============================================================================
// Monster Types
// ============================================================================

export type MonsterType = 'bug' | 'boss';
export type Chapter = 1 | 2;
export type BossPhase = 1 | 2 | 3;

export interface MonsterStats {
  HP: number;
  ATK: number;
  DEF: number;
  SPD: number;
}

export interface Monster {
  id: string;
  name: string;
  type: MonsterType;
  chapter: Chapter;
  stats: MonsterStats;
  currentHP: number;
  phase?: BossPhase;
  behaviorTree: BehaviorTree;
  drops: LootTable;
  techDebtOnSkip: number;
}

// ============================================================================
// AI Behavior Types
// ============================================================================

export type BehaviorConditionType = 'hp_below' | 'hp_above' | 'phase_change' | 'turn_count';
export type BehaviorActionType = 'attack' | 'skill' | 'buff' | 'heal';

export interface BehaviorCondition {
  type: BehaviorConditionType;
  value: number;
}

export interface BehaviorAction {
  type: BehaviorActionType;
  skillId?: string;
  weight: number;
}

export interface BehaviorTree {
  conditions: BehaviorCondition[];
  actions: BehaviorAction[];
}

// ============================================================================
// Item Types
// ============================================================================

export type ItemType = 'weapon' | 'armor' | 'accessory' | 'consumable';
export type ItemRarity = 'common' | 'rare' | 'epic';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  statBonus?: Partial<CharacterStats>;
  effects?: SkillEffect[];
  price: number;
}

export interface LootTable {
  items: LootDrop[];
  exp: number;
  gold: number;
}

export interface LootDrop {
  itemId: string;
  dropRate: number;
}

// ============================================================================
// Game Session Types
// ============================================================================

export type TechDebtLevel = 'low' | 'medium' | 'high' | 'critical';

export interface GameSession {
  id: string;
  userId: string;
  chapter: Chapter;
  stage: number;
  techDebt: number;
  party: Character[];
  inventory: Item[];
  gold: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Combat Types
// ============================================================================

export type CombatActionType = 'attack' | 'skill' | 'defend' | 'item' | 'flee';
export type CombatOutcome = 'victory' | 'defeat' | 'flee';

export interface CombatAction {
  actor: Character | Monster;
  target: Character | Monster;
  type: CombatActionType;
  skill?: Skill;
  item?: Item;
}

export interface CombatResult {
  actor: Character | Monster;
  target: Character | Monster;
  action: string;
  damage: number;
  heal: number;
  effects: string[];
}

export interface CombatLog {
  turn: number;
  actor: string;
  action: CombatActionType;
  target: string;
  skillId?: string;
  itemId?: string;
  damage?: number;
  heal?: number;
  effects?: string[];
}

export interface CombatState {
  combatId: string;
  party: Character[];
  monsters: Monster[];
  turnOrder: string[];
  currentTurn: number;
  logs: CombatLog[];
  isFinished: boolean;
}

// ============================================================================
// User Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface NewGameRequest {
  partySetup: Array<{
    class: CharacterClass;
    name: string;
  }>;
}

export interface StartCombatRequest {
  sessionId: string;
  monsterId: string;
}

export interface CombatActionRequest {
  combatId: string;
  actorId: string;
  action: CombatActionType;
  skillId?: string;
  itemId?: string;
  targetId: string;
}

export interface EndCombatRequest {
  combatId: string;
  outcome: CombatOutcome;
}

export interface CombatRewards {
  exp: number;
  gold: number;
  items: Item[];
}

export interface EndCombatResponse {
  rewards: CombatRewards;
  techDebt: number;
  updatedParty: Character[];
}

// ============================================================================
// Error Types
// ============================================================================

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiErrorResponse {
  error: ApiError;
}
