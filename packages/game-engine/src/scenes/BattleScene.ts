import Phaser from 'phaser';
import type { Character, Monster, Skill, SkillEffect } from '@bug-slayer/shared';
import {
  calculateDamage as sharedCalculateDamage,
  calculateCritChance,
  calculateEvasionChance,
  CRIT_MULTIPLIER,
  FOCUS_DAMAGE_BONUS_PERCENT,
  MP_AUTO_RECOVERY_PERCENT,
  MP_FOCUS_RECOVERY_PERCENT,
} from '@bug-slayer/shared';
import { createCharacter } from '../systems/CharacterFactory';
import { dataLoader } from '../loaders/DataLoader';
import type { SkillData, BugData } from '../loaders/DataLoader';
import { TechDebt } from '../systems/TechDebt';
import { EnemyAI, type EnemyAction } from '../systems/EnemyAI';
import { LevelUpSystem } from '../systems/LevelUpSystem';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import { ItemSystem } from '../systems/ItemSystem';
import { EndingScene, type EndingData } from './EndingScene';
import { EventSystem } from '../systems/EventSystem';
import type { EventSceneData } from './EventScene';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface BattleSceneData {
  playerClass: string;
  chapter: number;
  stage: number;
  /** Carry-over player when advancing to next stage without re-creating */
  player?: Character;
  /** Carry-over tech debt value from previous battle */
  techDebtCarry?: number;
  /** Carry-over progression system */
  progression?: ProgressionSystem;
  /** Track stages that were NOT skipped (for secret ending) */
  stagesCompleted?: number[];
  /** Total elapsed play time in seconds */
  playTime?: number;
}

interface ActiveBuff {
  stat: string;
  value: number;
  turnsRemaining: number;
  /** 'player' or 'monster' */
  target: 'player' | 'monster';
}

// ---------------------------------------------------------------------------
// BattleScene
// ---------------------------------------------------------------------------

/**
 * BattleScene - Turn-based combat with full system integration.
 *
 * Integrates:
 * 1. Stage-based monster selection via DataLoader
 * 2. ProgressionSystem for chapter/stage advancement
 * 3. Critical hit & evasion mechanics
 * 4. Focus +20% DMG buff on next attack
 * 5. Full player skill system (32 skills across 4 classes)
 * 6. EndingScene transition after Chapter 2 boss
 * 7. Buff/debuff tracking with turn duration
 * 8. ItemSystem for loot drops
 */
export class BattleScene extends Phaser.Scene {
  // Core game objects
  private player: Character | null = null;
  private monster: Monster | null = null;
  private techDebt: TechDebt | null = null;
  private enemyAI: EnemyAI | null = null;
  private levelUpSystem: LevelUpSystem | null = null;
  private progressionSystem: ProgressionSystem | null = null;
  private itemSystem: ItemSystem | null = null;
  private eventSystem: EventSystem | null = null;

  // Scene data
  private sceneData: BattleSceneData | null = null;

  // Combat state
  private focusBuff: boolean = false;
  private activeBuffs: ActiveBuff[] = [];
  private isPlayerTurn: boolean = true;
  private battleStartTime: number = 0;
  private stagesCompleted: number[] = [];
  private skillCooldowns: Map<string, number> = new Map();
  private attackCount: number = 0; // for Refactorer passive

  // UI elements
  private turnText: Phaser.GameObjects.Text | null = null;
  private playerHPText: Phaser.GameObjects.Text | null = null;
  private monsterHPText: Phaser.GameObjects.Text | null = null;
  private techDebtText: Phaser.GameObjects.Text | null = null;
  private techDebtBar: Phaser.GameObjects.Graphics | null = null;
  private buffText: Phaser.GameObjects.Text | null = null;
  private stageText: Phaser.GameObjects.Text | null = null;

  // Boss phase visuals
  private bossPhaseOverlay: Phaser.GameObjects.Rectangle | null = null;
  private bossDialogueText: Phaser.GameObjects.Text | null = null;
  private bossSprite: Phaser.GameObjects.Rectangle | null = null;
  private lastBossPhase: number = 1;

  // Skill panel
  private skillPanelContainer: Phaser.GameObjects.Container | null = null;
  private skillPanelVisible: boolean = false;

  // Item panel
  private itemPanelContainer: Phaser.GameObjects.Container | null = null;

  // Action buttons (stored so we can enable/disable them)
  private actionButtons: Phaser.GameObjects.Text[] = [];

  // Boss phase visual configuration
  private readonly BOSS_PHASE_CONFIG = {
    1: {
      tint: 0xffffff, // normal
      overlayAlpha: 0,
      dialogues: ['Let\'s see what you\'ve got...', 'Is that all?'],
      shakeIntensity: 0,
    },
    2: {
      tint: 0xdcdcaa, // yellow warning
      overlayAlpha: 0.1,
      dialogues: ['You\'re not bad...', 'I\'m just getting started!', 'My code is evolving!'],
      shakeIntensity: 2,
    },
    3: {
      tint: 0xf48771, // red rage
      overlayAlpha: 0.15,
      dialogues: ['COMPILING RAGE!', 'Stack overflow incoming!', 'You can\'t refactor ME!'],
      shakeIntensity: 4,
    },
    4: {
      tint: 0xce4545, // dark red desperate
      overlayAlpha: 0.2,
      dialogues: ['SEGFAULT... SEGFAULT...', 'I... won\'t... crash...', 'FATAL ERROR!'],
      shakeIntensity: 6,
    },
  };

  // Minigame state
  private minigameActive: boolean = false;

  constructor() {
    super({ key: 'BattleScene' });
    this.eventSystem = new EventSystem();
  }

  // =========================================================================
  // Lifecycle
  // =========================================================================

  init(data: BattleSceneData) {
    console.log('BattleScene initialized with:', data);
    this.sceneData = data;

    // Reset combat state
    this.focusBuff = false;
    this.activeBuffs = [];
    this.isPlayerTurn = true;
    this.battleStartTime = Date.now();
    this.skillPanelVisible = false;
    this.actionButtons = [];

    // Carry over stages-completed list
    this.stagesCompleted = data.stagesCompleted ?? [];

    // ---- Progression System ----
    this.progressionSystem = data.progression ?? new ProgressionSystem();

    // ---- Tech Debt ----
    this.techDebt = new TechDebt(data.techDebtCarry ?? 0);

    // ---- Player ----
    if (data.player) {
      // Carry over from previous battle (preserves level, HP, MP, EXP, inventory)
      this.player = data.player;
    } else {
      this.player = createCharacter(data.playerClass.toLowerCase(), 'Hero', 1);
    }

    // ---- Level-Up System ----
    const classData = dataLoader.getClass(data.playerClass.toLowerCase());
    if (classData && this.player) {
      this.levelUpSystem = new LevelUpSystem(this.player, classData.statGrowth);
    }

    // ---- Item System ----
    if (this.player) {
      this.itemSystem = new ItemSystem(this.player);
      // Register all items in the database for loot rolling
      this.itemSystem.registerItems(dataLoader.getAllItems());
    }

    // ---- Monster Selection (stage-based) ----
    this.monster = this.selectMonsterForStage(data.chapter, data.stage);
    if (this.monster) {
      this.enemyAI = new EnemyAI(this.monster);
    }
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1e1e1e);

    // Stage indicator (top center)
    const chapter = this.sceneData?.chapter ?? 1;
    const stage = this.sceneData?.stage ?? 1;
    this.stageText = this.add.text(width / 2, 20, `Chapter ${chapter} - Stage ${stage}`, {
      fontSize: '16px',
      color: '#858585',
    }).setOrigin(0.5);

    // Title
    this.add.text(width / 2, 50, 'Bug Slayer - Battle', {
      fontSize: '32px',
      color: '#4a90e2',
    }).setOrigin(0.5);

    // Player area (left)
    this.add.text(100, 150, 'Player', {
      fontSize: '24px',
      color: '#ffffff',
    });

    this.playerHPText = this.add.text(100, 200, '', {
      fontSize: '18px',
      color: '#4ade80',
    });

    // HP/MP icons for accessibility
    this.add.text(80, 225, '❤', { fontSize: '14px', color: '#4ec9b0' });
    this.add.text(80, 245, '◆', { fontSize: '14px', color: '#569cd6' });

    // Player sprite (use generated texture if available, fallback to rectangle)
    const playerClass = this.sceneData?.playerClass.toLowerCase() ?? 'debugger';
    const playerTexture = `character-${playerClass}`;
    if (this.textures.exists(playerTexture)) {
      this.add.image(150, 300, playerTexture).setOrigin(0.5, 0.5);
    } else {
      // Fallback to colored rectangle
      this.add.rectangle(150, 300, 64, 64, 0x4a90e2);
    }

    // Monster area (right)
    this.add.text(width - 200, 150, 'Bug', {
      fontSize: '24px',
      color: '#ffffff',
    });

    this.monsterHPText = this.add.text(width - 200, 200, '', {
      fontSize: '18px',
      color: '#ef4444',
    });

    // Monster sprite (use generated texture if available, fallback to rectangle)
    const monsterTexture = this.getMonsterTexture();
    if (monsterTexture && this.textures.exists(monsterTexture)) {
      this.bossSprite = this.add.image(width - 150, 300, monsterTexture).setOrigin(0.5, 0.5) as any;
    } else {
      // Fallback to colored rectangle
      this.bossSprite = this.add.rectangle(width - 150, 300, 64, 64, 0xef4444);
    }

    // Boss phase overlay (initially invisible)
    this.bossPhaseOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
      .setDepth(10);

    // Boss dialogue text (initially empty)
    this.bossDialogueText = this.add.text(width / 2, 420, '', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#1a1a2e',
      padding: { x: 15, y: 10 },
      align: 'center',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(20).setVisible(false);

    // Buff display (below monster area)
    this.buffText = this.add.text(width / 2, 380, '', {
      fontSize: '14px',
      color: '#c586c0',
      align: 'center',
    }).setOrigin(0.5);

    // Tech Debt UI (center bottom area)
    this.add.text(width / 2, height - 280, 'Tech Debt', {
      fontSize: '16px',
      color: '#858585',
    }).setOrigin(0.5);

    // Tech Debt bar background
    const barWidth = 300;
    const barHeight = 20;
    const barX = width / 2 - barWidth / 2;
    const barY = height - 250;

    this.add.rectangle(barX + barWidth / 2, barY + barHeight / 2, barWidth, barHeight, 0x2a2a2a)
      .setOrigin(0.5);

    // Tech Debt bar (filled based on current debt)
    this.techDebtBar = this.add.graphics();

    // Tech Debt text (value and status)
    this.techDebtText = this.add.text(width / 2, barY + barHeight + 15, '', {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Turn indicator
    this.turnText = this.add.text(width / 2, height - 200, '', {
      fontSize: '20px',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: width - 40 },
    }).setOrigin(0.5);

    // ---- Action Buttons: Attack, Skills, Item, Focus, Flee ----
    const buttonY1 = height - 140;
    const buttonY2 = height - 90;
    const btnStyle = (bg: string) => ({
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: bg,
      padding: { x: 12, y: 8 },
    });

    const attackButton = this.add.text(width / 2 - 120, buttonY1, '⚔ Attack', btnStyle('#4a90e2'))
      .setOrigin(0.5).setInteractive();
    const skillsButton = this.add.text(width / 2, buttonY1, '⭐ Skills', btnStyle('#e5c07b'))
      .setOrigin(0.5).setInteractive();
    const itemButton = this.add.text(width / 2 + 120, buttonY1, '🧭 Item', btnStyle('#4ade80'))
      .setOrigin(0.5).setInteractive();
    const focusButton = this.add.text(width / 2 - 80, buttonY2, '🛡 Focus', btnStyle('#9333ea'))
      .setOrigin(0.5).setInteractive();
    const fleeButton = this.add.text(width / 2 + 80, buttonY2, '🏃 Flee', btnStyle('#f59e0b'))
      .setOrigin(0.5).setInteractive();

    attackButton.on('pointerdown', () => this.handleAttack());
    skillsButton.on('pointerdown', () => this.toggleSkillPanel());
    itemButton.on('pointerdown', () => this.handleItemUse());
    focusButton.on('pointerdown', () => this.handleFocus());
    fleeButton.on('pointerdown', () => this.handleFlee());

    this.actionButtons = [attackButton, skillsButton, itemButton, focusButton, fleeButton];

    // ---- Skill Panel (hidden by default) ----
    this.createSkillPanel();

    // Update UI
    this.updateUI();
  }

  // =========================================================================
  // Monster Selection
  // =========================================================================

  /**
   * Get the texture name for the current monster
   */
  private getMonsterTexture(): string | null {
    if (!this.monster) return null;

    const monsterId = this.monster.id.toLowerCase();

    // Try to find matching texture
    if (this.monster.type === 'boss') {
      // Boss sprites
      if (monsterId.includes('heisenbug') || monsterId.includes('finalcompiler')) {
        return `bug-${monsterId}`;
      }
      return 'bug-boss-generic';
    }

    // Regular bug sprites - extract bug type from ID
    // IDs are like "bug-001", "nullpointer", etc.
    const bugName = monsterId.replace('bug-', '').replace(/\d+/g, '');
    const textureName = `bug-${bugName}`;

    // Check if texture exists, otherwise use generic
    if (this.textures.exists(textureName)) {
      return textureName;
    }

    // Try common bug names from palette
    const bugTypes = ['nullpointer', 'stackoverflow', 'racecondition', 'memoryleak',
                      'deadlock', 'offbyone', 'sqlinjection', 'xss', 'bufferoverflow',
                      'infiniteloop', 'heisenbug'];

    for (const bugType of bugTypes) {
      if (monsterId.includes(bugType) || this.monster.name.toLowerCase().includes(bugType)) {
        return `bug-${bugType}`;
      }
    }

    // Fallback to first available bug sprite
    return 'bug-nullpointer';
  }

  /**
   * Select the correct monster for this chapter + stage.
   * Chapter 1: stages 1-5 are bugs, stage 6 is boss.
   * Chapter 2: stages 1-4 are bugs, stage 5 is boss.
   */
  private selectMonsterForStage(chapter: number, stage: number): Monster | null {
    // Determine boss stage per chapter
    const bossStage = chapter === 1 ? 6 : 5;

    if (stage === bossStage) {
      // Boss fight
      const bossData = dataLoader.getBossForChapter(chapter);
      if (bossData) {
        return this.createMonsterFromData(bossData);
      }
      console.error(`Boss not found for chapter ${chapter}`);
      return this.createMockMonster();
    }

    // Regular bug: filter to only non-boss bugs for this chapter
    const allBugs = dataLoader.getBugsForChapter(chapter)
      .filter(b => b.type === 'bug');

    // Stage index is 0-based into the bugs array
    const bugIndex = stage - 1;
    if (bugIndex >= 0 && bugIndex < allBugs.length) {
      return this.createMonsterFromData(allBugs[bugIndex]!);
    }

    // Fallback
    console.error(`Bug not found for chapter ${chapter}, stage ${stage}`);
    return this.createMockMonster();
  }

  private createMonsterFromData(bugData: BugData): Monster {
    return {
      id: bugData.id,
      name: bugData.name,
      type: bugData.type,
      chapter: bugData.chapter as 1 | 2,
      stats: bugData.stats,
      currentHP: bugData.stats.HP,
      phase: bugData.phase as 1 | 2 | 3 | undefined,
      behaviorTree: bugData.behaviorTree as unknown as Monster['behaviorTree'],
      drops: bugData.drops as unknown as Monster['drops'],
      techDebtOnSkip: bugData.techDebtOnSkip,
    };
  }

  private createMockMonster(): Monster {
    return {
      id: 'bug-001',
      name: 'NullPointerException',
      type: 'bug',
      chapter: 1,
      stats: { HP: 80, ATK: 12, DEF: 5, SPD: 10 },
      currentHP: 80,
      behaviorTree: {
        conditions: [] as Monster['behaviorTree']['conditions'],
        actions: [{ type: 'attack' as const, weight: 100 }],
      },
      drops: { items: [], exp: 50, gold: 20 },
      techDebtOnSkip: 10,
    };
  }

  // =========================================================================
  // Skill Panel
  // =========================================================================

  private createSkillPanel() {
    if (!this.player) return;

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Container for the skill panel (anchored at center, above action buttons)
    this.skillPanelContainer = this.add.container(width / 2, height / 2);
    this.skillPanelContainer.setVisible(false);

    // Semi-transparent background
    const panelBg = this.add.rectangle(0, 0, 500, 320, 0x1a1a2e, 0.95);
    panelBg.setStrokeStyle(2, 0x4a90e2);
    this.skillPanelContainer.add(panelBg);

    // Title
    const title = this.add.text(0, -140, 'Skills', {
      fontSize: '22px',
      color: '#4a90e2',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.skillPanelContainer.add(title);

    // Close button
    const closeBtn = this.add.text(220, -140, 'X', {
      fontSize: '18px',
      color: '#ef4444',
      backgroundColor: '#2a2a2a',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setInteractive();
    closeBtn.on('pointerdown', () => this.toggleSkillPanel());
    this.skillPanelContainer.add(closeBtn);

    // Get skills for this class, filtered by level unlock
    // Skill unlock: indices 0-1 at Lv1, 2-3 at Lv5, 4-5 at Lv10, 6-7 at Lv15
    const classId = this.sceneData?.playerClass.toLowerCase() ?? '';
    const allSkills = dataLoader.getSkillsForClass(classId);
    const playerLevel = this.player!.level;
    const unlockLevels = [1, 1, 5, 5, 10, 10, 15, 15];
    const skills = allSkills.filter((_, idx) => playerLevel >= (unlockLevels[idx] ?? 1));

    // Layout skills in a scrollable-ish list (max 8 visible)
    const startY = -100;
    const rowHeight = 35;

    skills.forEach((skillData, index) => {
      const y = startY + index * rowHeight;
      if (y > 140) return; // skip if overflow

      const hasMP = this.player!.currentMP >= skillData.mpCost;
      const cooldown = this.skillCooldowns.get(skillData.id) ?? 0;
      const onCooldown = cooldown > 0;
      const canUse = hasMP && !onCooldown;
      const textColor = canUse ? '#ffffff' : '#666666';
      const bgColor = canUse ? '#2a4a6a' : '#1a1a2a';

      const cdText = onCooldown ? ` [CD: ${cooldown}t]` : '';
      const skillBtn = this.add.text(0, y,
        `${skillData.name} (${skillData.mpCost} MP)${cdText} - ${skillData.description}`, {
        fontSize: '13px',
        color: textColor,
        backgroundColor: bgColor,
        padding: { x: 10, y: 5 },
        wordWrap: { width: 460 },
      }).setOrigin(0.5);

      if (canUse) {
        skillBtn.setInteractive();
        skillBtn.on('pointerdown', () => {
          this.toggleSkillPanel();
          this.handleSkillUse(skillData);
        });
        skillBtn.on('pointerover', () => skillBtn.setBackgroundColor('#3a5a8a'));
        skillBtn.on('pointerout', () => skillBtn.setBackgroundColor('#2a4a6a'));
      }

      this.skillPanelContainer!.add(skillBtn);
    });

    // Show locked skills hint
    const lockedCount = allSkills.length - skills.length;
    if (lockedCount > 0) {
      const lockText = this.add.text(0, startY + skills.length * rowHeight + 10,
        `${lockedCount} skill(s) locked (higher level required)`, {
        fontSize: '12px',
        color: '#666666',
      }).setOrigin(0.5);
      this.skillPanelContainer!.add(lockText);
    }
  }

  private toggleSkillPanel() {
    if (!this.skillPanelContainer) return;
    this.skillPanelVisible = !this.skillPanelVisible;
    this.skillPanelContainer.setVisible(this.skillPanelVisible);

    // Rebuild skill panel to update MP availability
    if (this.skillPanelVisible) {
      this.rebuildSkillPanel();
    }
  }

  /**
   * Rebuild the skill panel to reflect current MP state.
   */
  private rebuildSkillPanel() {
    if (!this.skillPanelContainer || !this.player) return;

    // Destroy all children and recreate
    this.skillPanelContainer.removeAll(true);
    this.skillPanelContainer.setVisible(false);
    this.skillPanelContainer.destroy();

    this.createSkillPanel();
    this.skillPanelContainer!.setVisible(true);
    this.skillPanelVisible = true;
  }

  // =========================================================================
  // Combat Actions
  // =========================================================================

  private setActionsEnabled(enabled: boolean) {
    this.actionButtons.forEach(btn => {
      if (enabled) {
        btn.setInteractive();
        btn.setAlpha(1);
      } else {
        btn.disableInteractive();
        btn.setAlpha(0.5);
      }
    });
  }

  private handleAttack() {
    if (!this.player || !this.monster || !this.techDebt || !this.isPlayerTurn) return;
    this.isPlayerTurn = false;
    this.setActionsEnabled(false);

    // Close skill panel if open
    if (this.skillPanelVisible) this.toggleSkillPanel();

    // Calculate base damage
    let baseDamage = this.getEffectiveStat(this.player.stats.ATK, 'ATK', 'player');

    // Apply focus buff (+20%)
    if (this.focusBuff) {
      baseDamage = Math.floor(baseDamage * (1 + FOCUS_DAMAGE_BONUS_PERCENT / 100));
      this.focusBuff = false;
    }

    // Check evasion (monster evades?)
    const monsterSPD = this.monster.stats.SPD ?? 0;
    const playerSPD = this.getEffectiveStat(this.player.stats.SPD, 'SPD', 'player');
    if (this.rollEvasion(monsterSPD, playerSPD)) {
      this.techDebt.turnPassed();
      this.autoRestoreMP();
      this.turnText?.setText(`${this.monster.name} evaded! MISS!`);
      this.updateUI();
      this.time.delayedCall(1000, () => this.monsterTurn());
      return;
    }

    // Apply defense formula
    const monsterDEF = this.getEffectiveStat(this.monster.stats.DEF, 'DEF', 'monster');
    let damage = this.calculateDamage(baseDamage, monsterDEF);

    // Critical hit check
    const critResult = this.rollCritical(playerSPD, monsterSPD);
    let critText = '';
    if (critResult) {
      damage = Math.floor(damage * CRIT_MULTIPLIER);
      critText = ' CRITICAL HIT!';
    }

    // Focus bonus text
    const focusText = this.focusBuff === false && baseDamage !== this.player.stats.ATK
      ? ' +20% Focus Bonus!' : '';

    // Apply class passive to outgoing damage
    const passive = this.applyPassiveToOutgoingDamage(damage);
    damage = passive.damage;

    // Apply damage
    this.monster.currentHP = Math.max(0, this.monster.currentHP - damage);

    // Tech debt per turn
    this.techDebt.turnPassed();

    // Auto MP restore (5% per turn)
    const mpRestored = this.autoRestoreMP();

    this.turnText?.setText(
      `You dealt ${damage} damage!${critText}${focusText}${passive.text}\n(+${mpRestored} MP, +1 Tech Debt)`
    );
    this.updateUI();

    // Check win
    if (this.monster.currentHP <= 0) {
      this.time.delayedCall(1000, () => this.handleVictory());
      return;
    }

    // Monster counter-attack
    this.time.delayedCall(1000, () => this.monsterTurn());
  }

  private handleSkillUse(skillData: SkillData) {
    if (!this.player || !this.monster || !this.techDebt || !this.isPlayerTurn) return;

    // Check MP
    if (this.player.currentMP < skillData.mpCost) {
      this.turnText?.setText('Not enough MP!');
      return;
    }

    // Check cooldown
    const currentCD = this.skillCooldowns.get(skillData.id) ?? 0;
    if (currentCD > 0) {
      this.turnText?.setText(`${skillData.name} is on cooldown! (${currentCD} turns)`);
      return;
    }

    this.isPlayerTurn = false;
    this.setActionsEnabled(false);

    // Deduct MP
    this.player.currentMP -= skillData.mpCost;

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
          const playerATK = this.getEffectiveStat(this.player.stats.ATK, 'ATK', 'player');
          let baseDmg = Math.floor(playerATK * (effect.value / 100));

          // Apply focus buff
          if (this.focusBuff) {
            baseDmg = Math.floor(baseDmg * (1 + FOCUS_DAMAGE_BONUS_PERCENT / 100));
            effectTexts.push('+20% Focus Bonus!');
            this.focusBuff = false;
          }

          // Check evasion
          const monsterSPD = this.monster.stats.SPD ?? 0;
          const playerSPD = this.getEffectiveStat(this.player.stats.SPD, 'SPD', 'player');
          if (this.rollEvasion(monsterSPD, playerSPD)) {
            effectTexts.push('MISS!');
            break;
          }

          // Apply defense formula
          const monsterDEF = this.getEffectiveStat(this.monster.stats.DEF, 'DEF', 'monster');
          let dmg = this.calculateDamage(baseDmg, monsterDEF);

          // Critical hit
          if (this.rollCritical(playerSPD, monsterSPD)) {
            dmg = Math.floor(dmg * CRIT_MULTIPLIER);
            effectTexts.push('CRITICAL!');
          }

          this.monster.currentHP = Math.max(0, this.monster.currentHP - dmg);
          totalDamage += dmg;
          break;
        }

        case 'heal': {
          // value is % of max HP
          const healAmount = Math.floor(this.player.stats.HP * (effect.value / 100));
          this.player.currentHP = Math.min(this.player.stats.HP, this.player.currentHP + healAmount);
          totalHeal += healAmount;
          effectTexts.push(`Healed ${healAmount} HP`);
          break;
        }

        case 'buff': {
          if (effect.stat && effect.duration) {
            this.activeBuffs.push({
              stat: effect.stat,
              value: effect.value,
              turnsRemaining: effect.duration,
              target: skillData.targetType === 'self' ? 'player' : 'player',
            });
            effectTexts.push(`+${effect.value} ${effect.stat} for ${effect.duration} turns`);
          }
          break;
        }

        case 'debuff': {
          if (effect.stat && effect.duration) {
            this.activeBuffs.push({
              stat: effect.stat,
              value: effect.value, // negative value for debuffs
              turnsRemaining: effect.duration,
              target: 'monster',
            });
            effectTexts.push(`${effect.value} ${effect.stat} on enemy for ${effect.duration} turns`);
          }
          break;
        }

        case 'special': {
          // Handle special effects like "Pay Tech Debt"
          if (effect.description?.includes('Tech Debt') && this.techDebt) {
            const reduction = Math.abs(effect.value);
            this.techDebt.decrease(reduction);
            effectTexts.push(`Tech Debt reduced by ${reduction}!`);
          }
          break;
        }

        case 'dot': {
          // Damage over time - apply as debuff with negative HP
          if (effect.duration) {
            this.activeBuffs.push({
              stat: 'DOT',
              value: effect.value,
              turnsRemaining: effect.duration,
              target: 'monster',
            });
            effectTexts.push(`DoT: ${effect.value} dmg/turn for ${effect.duration} turns`);
          }
          break;
        }
      }
    }

    // Tech debt per turn
    this.techDebt.turnPassed();

    // Auto MP restore (5% per turn)
    const mpRestored = this.autoRestoreMP();

    // Build result text
    let resultText = `Used ${skillData.name}!`;
    if (totalDamage > 0) resultText += ` ${totalDamage} damage!`;
    if (totalHeal > 0) resultText += ` Restored ${totalHeal} HP!`;
    if (effectTexts.length > 0) resultText += `\n${effectTexts.join(' | ')}`;
    resultText += `\n(+${mpRestored} MP, +1 Tech Debt)`;

    this.turnText?.setText(resultText);
    this.updateUI();

    // Check win
    if (this.monster.currentHP <= 0) {
      this.time.delayedCall(1000, () => this.handleVictory());
      return;
    }

    // Monster turn
    this.time.delayedCall(1000, () => this.monsterTurn());
  }

  private handleFocus() {
    if (!this.player || !this.monster || !this.techDebt || !this.isPlayerTurn) return;
    this.isPlayerTurn = false;
    this.setActionsEnabled(false);

    // Close skill panel if open
    if (this.skillPanelVisible) this.toggleSkillPanel();

    // Restore Focus MP
    const mpRestore = Math.floor(this.player.stats.MP * (MP_FOCUS_RECOVERY_PERCENT / 100));
    this.player.currentMP = Math.min(
      this.player.stats.MP,
      this.player.currentMP + mpRestore
    );

    // Set focus buff for next attack (+20% DMG)
    this.focusBuff = true;

    // Tech debt per turn
    this.techDebt.turnPassed();

    this.turnText?.setText(
      `You focused! Restored ${mpRestore} MP.\nNext attack deals +20% damage! (+1 Tech Debt)`
    );
    this.updateUI();

    // Monster turn
    this.time.delayedCall(1000, () => this.monsterTurn());
  }

  private handleFlee() {
    if (!this.player || !this.monster || !this.techDebt || !this.isPlayerTurn) return;
    this.isPlayerTurn = false;
    this.setActionsEnabled(false);

    // Close skill panel if open
    if (this.skillPanelVisible) this.toggleSkillPanel();

    // Add tech debt for fleeing
    const debtAdded = this.techDebt.flee();

    this.turnText?.setText(`You fled from battle! (+${debtAdded} Tech Debt)`);
    this.updateUI();

    // Advance to next stage (mark as skipped by NOT adding to stagesCompleted)
    this.time.delayedCall(2000, () => {
      this.advanceToNextStage(false);
    });
  }

  // =========================================================================
  // Minigame
  // =========================================================================

  /**
   * Trigger the Merge Conflict minigame
   * Called when boss enters a new phase
   */
  private triggerMinigame() {
    if (!this.monster || !this.enemyAI) return;

    this.minigameActive = true;

    // Determine difficulty based on boss phase
    const difficulty = this.enemyAI.phase;

    // Launch minigame as overlay
    this.scene.launch('MinigameScene', {
      returnScene: 'BattleScene',
      difficulty: difficulty,
    });

    // Pause this scene while minigame is active
    this.scene.pause();

    // Listen for minigame completion
    this.scene.get('MinigameScene').events.once('shutdown', () => {
      this.handleMinigameResult();
    });
  }

  /**
   * Handle minigame result and apply effects
   */
  private handleMinigameResult() {
    if (!this.monster || !this.player) return;

    this.minigameActive = false;

    // Read result from minigame scene data
    const minigameScene = this.scene.get('MinigameScene');
    const success = minigameScene.data.get('onSuccess') as boolean;

    if (success) {
      // Success: Deal 30% of boss max HP as damage
      const damage = Math.floor(this.monster.stats.HP * 0.3);
      this.monster.currentHP = Math.max(0, this.monster.currentHP - damage);

      this.turnText?.setText(`Shield Break! ${damage} damage to ${this.monster.name}!`);

      // Check if boss died
      if (this.monster.currentHP <= 0) {
        this.updateUI();
        this.time.delayedCall(1500, () => this.handleVictory());
        return;
      }
    } else {
      // Failure: Boss heals 10% of max HP
      const healAmount = Math.floor(this.monster.stats.HP * 0.1);
      this.monster.currentHP = Math.min(this.monster.stats.HP, this.monster.currentHP + healAmount);

      this.turnText?.setText(`${this.monster.name} heals ${healAmount} HP!`);
    }

    this.updateUI();

    // Continue with boss turn after delay
    this.time.delayedCall(1500, () => {
      // Get the action again since time has passed
      if (this.enemyAI) {
        const action = this.enemyAI.decideAction();
        this.executeEnemyAction(action);
      }
    });
  }

  // =========================================================================
  // Monster Turn
  // =========================================================================

  private monsterTurn() {
    if (!this.player || !this.monster || !this.techDebt || !this.enemyAI) return;

    // Tick buffs/debuffs at start of monster turn
    this.tickBuffs();

    // Apply DoT effects to monster
    this.applyDoTEffects();

    // Check if monster died from DoT
    if (this.monster.currentHP <= 0) {
      this.time.delayedCall(500, () => this.handleVictory());
      return;
    }

    // Enemy AI decides action
    const action = this.enemyAI.decideAction();

    // Check for boss phase change
    const isBoss = this.monster.type === 'boss';
    const currentPhase = this.enemyAI.phase;
    const phaseChanged = isBoss && currentPhase > this.lastBossPhase;

    if (phaseChanged) {
      // Update tracked phase
      this.lastBossPhase = currentPhase;

      // Apply phase visual effects
      this.applyBossPhaseVisuals(currentPhase);

      // Trigger minigame for boss phase change
      this.time.delayedCall(2500, () => {
        this.triggerMinigame();
        // Note: minigame will call executeEnemyAction via handleMinigameResult
      });
    } else {
      this.executeEnemyAction(action);
    }
  }

  private executeEnemyAction(action: EnemyAction) {
    if (!this.player || !this.monster || !this.techDebt) return;

    const techDebtModifier = this.techDebt.enemyAtkModifier;
    let actionText = '';

    switch (action.type) {
      case 'attack': {
        const baseDamage = this.monster.stats.ATK;
        const modifiedAtk = Math.floor(baseDamage * techDebtModifier);
        const monsterATK = this.getEffectiveStat(modifiedAtk, 'ATK', 'monster');
        const playerDEF = this.getEffectiveStat(this.player.stats.DEF, 'DEF', 'player');

        // Check evasion (player evades?)
        const playerSPD = this.getEffectiveStat(this.player.stats.SPD, 'SPD', 'player');
        const monsterSPD = this.monster.stats.SPD ?? 0;
        if (this.rollEvasion(playerSPD, monsterSPD)) {
          actionText = `${this.monster.name} attacked but you evaded! MISS!`;
          break;
        }

        let damage = this.calculateDamage(monsterATK, playerDEF);

        // Monster critical hit
        let critText = '';
        if (this.rollCritical(monsterSPD, playerSPD)) {
          damage = Math.floor(damage * CRIT_MULTIPLIER);
          critText = ' CRITICAL HIT!';
        }

        // Apply Debugger passive (20% chance -50% incoming damage)
        const passive = this.applyPassiveToIncomingDamage(damage);
        damage = passive.damage;

        actionText = `${this.monster.name} attacked!${critText} ${damage} damage${passive.text}`;

        const modifierText = techDebtModifier !== 1.0
          ? ` (${Math.round((techDebtModifier - 1) * 100)}% from Tech Debt)`
          : '';
        actionText += modifierText;

        this.player.currentHP = Math.max(0, this.player.currentHP - damage);
        break;
      }

      case 'skill': {
        const baseDamage = Math.floor(this.monster.stats.ATK * 1.5);
        const modifiedAtk = Math.floor(baseDamage * techDebtModifier);
        const playerDEF = this.getEffectiveStat(this.player.stats.DEF, 'DEF', 'player');

        // Check evasion
        const playerSPD = this.getEffectiveStat(this.player.stats.SPD, 'SPD', 'player');
        const monsterSPD = this.monster.stats.SPD ?? 0;
        if (this.rollEvasion(playerSPD, monsterSPD)) {
          actionText = `${this.monster.name} used ${action.skillId} but you evaded! MISS!`;
          break;
        }

        let damage = this.calculateDamage(modifiedAtk, playerDEF);

        // Monster critical hit
        let skillCritText = '';
        if (this.rollCritical(monsterSPD, playerSPD)) {
          damage = Math.floor(damage * CRIT_MULTIPLIER);
          skillCritText = ' CRITICAL!';
        }

        // Apply Debugger passive (20% chance -50% incoming damage)
        const skillPassive = this.applyPassiveToIncomingDamage(damage);
        damage = skillPassive.damage;

        actionText = `${this.monster.name} used ${action.skillId}!${skillCritText} ${damage} damage${skillPassive.text}`;

        this.player.currentHP = Math.max(0, this.player.currentHP - damage);
        break;
      }

      case 'buff': {
        const stat = action.targetStat || 'ATK';
        this.activeBuffs.push({
          stat,
          value: 20, // +20 to buffed stat
          turnsRemaining: 3,
          target: 'monster',
        });
        actionText = `${this.monster.name} buffed ${stat}! (+20 for 3 turns)`;
        break;
      }

      case 'heal': {
        const healAmount = action.amount || Math.floor(this.monster.stats.HP * 0.15);
        this.monster.currentHP = Math.min(
          this.monster.stats.HP,
          this.monster.currentHP + healAmount
        );
        actionText = `${this.monster.name} healed ${healAmount} HP!`;
        break;
      }
    }

    this.turnText?.setText(actionText);
    this.updateUI();

    // Check lose condition
    if (this.player.currentHP <= 0) {
      this.time.delayedCall(1000, () => this.handleDefeat());
      return;
    }

    // Back to player turn
    this.time.delayedCall(1500, () => {
      this.isPlayerTurn = true;
      this.setActionsEnabled(true);
      // Tick cooldowns at start of player turn
      this.tickCooldowns();
      this.turnText?.setText('Your turn! Choose an action.');
    });
  }

  // =========================================================================
  // Critical Hit & Evasion
  // =========================================================================

  /**
   * Critical hit: critChance = min(30%, 10 + SPD * 0.5)
   * Uses shared constants from GDD spec.
   */
  private rollCritical(attackerSPD: number, _defenderSPD: number): boolean {
    const critChance = calculateCritChance(attackerSPD);
    return Math.random() * 100 < critChance;
  }

  /**
   * Evasion: evasionChance = max(0, (targetSPD - attackerSPD) * 2)
   * Uses shared constants from GDD spec. Capped at 50%.
   */
  private rollEvasion(defenderSPD: number, attackerSPD: number): boolean {
    const evasionChance = Math.min(50, calculateEvasionChance(defenderSPD, attackerSPD));
    return Math.random() * 100 < evasionChance;
  }

  // =========================================================================
  // Damage Calculation
  // =========================================================================

  /**
   * finalDmg = baseDmg * (100 / (100 + DEF * 0.7))
   * Uses shared formula from @bug-slayer/shared constants.
   */
  private calculateDamage(baseDmg: number, defense: number): number {
    return sharedCalculateDamage(baseDmg, defense);
  }

  // =========================================================================
  // Buff / Debuff System
  // =========================================================================

  /**
   * Get effective stat after applying active buffs.
   */
  private getEffectiveStat(baseValue: number, stat: string, target: 'player' | 'monster'): number {
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
  private tickBuffs() {
    for (const buff of this.activeBuffs) {
      buff.turnsRemaining -= 1;
    }
    // Remove expired
    this.activeBuffs = this.activeBuffs.filter(b => b.turnsRemaining > 0);
  }

  /**
   * Apply DoT (damage over time) effects to the monster.
   */
  private applyDoTEffects() {
    if (!this.monster) return;

    for (const buff of this.activeBuffs) {
      if (buff.stat === 'DOT' && buff.target === 'monster' && buff.turnsRemaining > 0) {
        this.monster.currentHP = Math.max(0, this.monster.currentHP - buff.value);
      }
    }
  }

  // =========================================================================
  // Cooldown System
  // =========================================================================

  /**
   * Tick all skill cooldowns by 1 at start of player turn.
   */
  private tickCooldowns() {
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
  // Passive Abilities
  // =========================================================================

  /**
   * Apply class passive ability to damage.
   * - Debugger: 20% chance to reduce incoming damage by 50%
   * - Refactorer: Every 3rd attack deals 150% damage
   * - FullStack: +20% damage when HP > 70%
   * - DevOps: +5% crit rate (handled in rollCritical via higher SPD)
   */
  private applyPassiveToOutgoingDamage(damage: number): { damage: number; text: string } {
    if (!this.player || !this.sceneData) return { damage, text: '' };

    const classId = this.sceneData.playerClass.toLowerCase();
    this.attackCount++;

    switch (classId) {
      case 'refactorer':
        if (this.attackCount % 3 === 0) {
          return { damage: Math.floor(damage * 1.5), text: ' [Code Optimization: 150%!]' };
        }
        break;
      case 'fullstack':
        if (this.player.currentHP > this.player.stats.HP * 0.7) {
          return { damage: Math.floor(damage * 1.2), text: ' [Full Power: +20%!]' };
        }
        break;
    }
    return { damage, text: '' };
  }

  /**
   * Apply class passive to incoming damage (Debugger).
   */
  private applyPassiveToIncomingDamage(damage: number): { damage: number; text: string } {
    if (!this.sceneData) return { damage, text: '' };

    const classId = this.sceneData.playerClass.toLowerCase();

    if (classId === 'debugger' && Math.random() < 0.2) {
      return { damage: Math.floor(damage * 0.5), text: ' [Exception Handler: -50%!]' };
    }
    return { damage, text: '' };
  }

  // =========================================================================
  // In-Battle Item Use
  // =========================================================================

  private handleItemUse() {
    if (!this.player || !this.techDebt || !this.isPlayerTurn || !this.itemSystem) return;
    if (this.skillPanelVisible) this.toggleSkillPanel();

    const consumables = this.itemSystem.getItemsByType('consumable');
    if (consumables.length === 0) {
      this.turnText?.setText('No items to use!');
      return;
    }

    // Create item selection popup
    this.showItemPanel(consumables);
  }

  private showItemPanel(items: any[]) {
    // Remove existing panel
    if (this.itemPanelContainer) {
      this.itemPanelContainer.removeAll(true);
      this.itemPanelContainer.destroy();
    }

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.itemPanelContainer = this.add.container(width / 2, height / 2);

    // Background
    const bg = this.add.rectangle(0, 0, 400, 250, 0x1a1a2e, 0.95);
    bg.setStrokeStyle(2, 0x4ade80);
    this.itemPanelContainer.add(bg);

    // Title
    const title = this.add.text(0, -100, 'Items', {
      fontSize: '22px', color: '#4ade80', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.itemPanelContainer.add(title);

    // Close button
    const closeBtn = this.add.text(170, -100, 'X', {
      fontSize: '18px', color: '#ef4444', backgroundColor: '#2a2a2a', padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setInteractive();
    closeBtn.on('pointerdown', () => this.hideItemPanel());
    this.itemPanelContainer.add(closeBtn);

    // List items
    items.forEach((item, index) => {
      const y = -60 + index * 35;
      if (y > 80) return;

      const itemBtn = this.add.text(0, y, `${item.name} - ${item.description ?? 'Consumable'}`, {
        fontSize: '14px', color: '#ffffff', backgroundColor: '#2a4a3a',
        padding: { x: 10, y: 5 }, wordWrap: { width: 360 },
      }).setOrigin(0.5).setInteractive();

      itemBtn.on('pointerdown', () => {
        this.hideItemPanel();
        this.useSelectedItem(item);
      });
      itemBtn.on('pointerover', () => itemBtn.setBackgroundColor('#3a6a4a'));
      itemBtn.on('pointerout', () => itemBtn.setBackgroundColor('#2a4a3a'));

      this.itemPanelContainer!.add(itemBtn);
    });
  }

  private hideItemPanel() {
    if (this.itemPanelContainer) {
      this.itemPanelContainer.removeAll(true);
      this.itemPanelContainer.destroy();
      this.itemPanelContainer = null;
    }
  }

  private useSelectedItem(item: any) {
    if (!this.player || !this.techDebt || !this.itemSystem) return;

    this.isPlayerTurn = false;
    this.setActionsEnabled(false);

    const result = this.itemSystem.useItem(item);

    if (result.success) {
      let itemText = `Used ${item.name}!`;
      if (result.hpRestored && result.hpRestored > 0) itemText += ` +${result.hpRestored} HP`;
      if (result.mpRestored && result.mpRestored > 0) itemText += ` +${result.mpRestored} MP`;

      this.turnText?.setText(itemText);
      this.updateUI();
      this.time.delayedCall(1000, () => this.monsterTurn());
    } else {
      this.turnText?.setText(result.message);
      this.isPlayerTurn = true;
      this.setActionsEnabled(true);
    }
  }

  // =========================================================================
  // MP Auto-Restore
  // =========================================================================

  /**
   * Auto restore 5% MP per turn.
   */
  private autoRestoreMP(): number {
    if (!this.player) return 0;
    const mpRestore = Math.floor(this.player.stats.MP * (MP_AUTO_RECOVERY_PERCENT / 100));
    this.player.currentMP = Math.min(
      this.player.stats.MP,
      this.player.currentMP + mpRestore
    );
    return mpRestore;
  }

  // =========================================================================
  // Victory / Defeat / Progression
  // =========================================================================

  private handleVictory() {
    if (!this.player || !this.monster || !this.levelUpSystem || !this.techDebt) return;

    // Restore MP to 100% on victory
    this.player.currentMP = this.player.stats.MP;

    // Mark stage as completed (not skipped)
    const chapter = this.sceneData?.chapter ?? 1;
    const stage = this.sceneData?.stage ?? 1;
    this.stagesCompleted.push(chapter * 100 + stage); // unique key

    // Award EXP and gold from monster drops
    const expReward = this.monster.drops.exp;
    const goldReward = this.monster.drops.gold;
    this.player.gold += goldReward;

    // Roll for item drops
    let dropText = '';
    if (this.itemSystem) {
      const drops = this.itemSystem.rollLoot(this.monster.drops);
      if (drops.items.length > 0) {
        const collected = this.itemSystem.collectDrops(drops);
        const itemNames = collected.collected.map(i => i.name).join(', ');
        if (itemNames) {
          dropText = `\nItems: ${itemNames}`;
        }
      }
    }

    this.turnText?.setText(
      `Victory! Defeated ${this.monster.name}!\n+${expReward} EXP, +${goldReward} Gold, MP restored${dropText}`
    );
    this.updateUI();

    // Check for level-up
    this.time.delayedCall(1500, () => {
      if (!this.levelUpSystem || !this.techDebt || !this.progressionSystem) return;

      const levelUpResult = this.levelUpSystem.addExp(expReward);

      if (levelUpResult) {
        const statsText = Object.entries(levelUpResult.statsGained)
          .filter(([_, value]) => value && value > 0)
          .map(([stat, value]) => `${stat}+${value}`)
          .join(', ');

        this.turnText?.setText(
          `LEVEL UP! Lv.${levelUpResult.newLevel}\n` +
          `Stats increased: ${statsText}\n` +
          `HP and MP fully restored!`
        );
        this.updateUI();

        this.time.delayedCall(2500, () => this.completeStageAndAdvance());
      } else {
        this.time.delayedCall(1000, () => this.completeStageAndAdvance());
      }
    });
  }

  /**
   * Complete stage via ProgressionSystem and advance to next battle or ending.
   */
  private completeStageAndAdvance() {
    if (!this.progressionSystem || !this.techDebt || !this.sceneData) return;

    const battleTime = Math.floor((Date.now() - this.battleStartTime) / 1000);
    const totalPlayTime = (this.sceneData.playTime ?? 0) + battleTime;

    // Complete stage in progression
    const result = this.progressionSystem.completeStage(this.techDebt.current, battleTime);

    const chapter = this.sceneData.chapter;
    const stage = this.sceneData.stage;

    // Determine if this was the final boss (Chapter 2 boss)
    const isFinalBoss = chapter === 2 && stage === 5;

    if (isFinalBoss || (result.chapterCompleted && chapter === 2)) {
      // GAME COMPLETE - transition to EndingScene
      this.transitionToEnding(totalPlayTime);
      return;
    }

    if (result.chapterCompleted && result.newChapterUnlocked) {
      // Chapter 1 complete, show message then move to Chapter 2
      this.turnText?.setText(
        `Chapter ${chapter} Complete! Chapter ${chapter + 1} Unlocked!`
      );
      this.updateUI();

      this.time.delayedCall(2500, () => {
        this.advanceToNextStage(true);
      });
      return;
    }

    // Normal stage completion - advance to next stage
    this.advanceToNextStage(true);
  }

  /**
   * Advance to the next battle stage.
   * @param wasVictory - true if player won, false if fled/skipped
   */
  private advanceToNextStage(wasVictory: boolean) {
    if (!this.progressionSystem || !this.sceneData || !this.techDebt || !this.eventSystem) return;

    const nextChapter = this.progressionSystem.getCurrentChapter();
    const nextStage = this.progressionSystem.getCurrentStage();
    const battleTime = Math.floor((Date.now() - this.battleStartTime) / 1000);
    const totalPlayTime = (this.sceneData.playTime ?? 0) + battleTime;

    // Prepare next battle data
    const nextBattleData: BattleSceneData = {
      playerClass: this.sceneData.playerClass,
      chapter: nextChapter,
      stage: nextStage,
      player: this.player ?? undefined,
      techDebtCarry: this.techDebt.current,
      progression: this.progressionSystem,
      stagesCompleted: this.stagesCompleted,
      playTime: totalPlayTime,
    };

    // Roll for random event (only on victory)
    if (wasVictory) {
      const eventResult = this.eventSystem.rollEvent();

      if (eventResult.event) {
        // Store event result for application in next battle
        this.eventSystem.setLastEventResult(eventResult);

        // Transition to EventScene, which will then go to BattleScene
        const eventData: EventSceneData = {
          event: eventResult.event,
          returnScene: 'BattleScene',
          returnData: nextBattleData,
        };

        this.scene.start('EventScene', eventData);
        return;
      }
    }

    // No event triggered, go directly to next battle
    this.scene.start('BattleScene', nextBattleData);
  }

  /**
   * Transition to EndingScene after defeating the final boss.
   */
  private transitionToEnding(totalPlayTime: number) {
    if (!this.techDebt || !this.progressionSystem || !this.player) return;

    // Determine if all stages were completed without skipping
    // Total stages: Ch1 = 6, Ch2 = 5, total = 11
    const allWarningsKilled = this.stagesCompleted.length >= 11;

    const endingType = EndingScene.determineEnding(
      this.techDebt.current,
      allWarningsKilled,
      true // boss was just defeated
    );

    const endingData: EndingData = {
      endingType,
      techDebt: this.techDebt.current,
      totalDefeated: this.progressionSystem.getTotalDefeated(),
      playTime: totalPlayTime,
      chapter: 2,
      finalLevel: this.player.level,
    };

    this.turnText?.setText('The final bug has been vanquished...');
    this.updateUI();

    this.time.delayedCall(3000, () => {
      this.scene.start('EndingScene', endingData);
    });
  }

  private handleDefeat() {
    this.turnText?.setText('Defeat... The bug won.\nReturning to try again...');

    this.time.delayedCall(2000, () => {
      // On defeat, restart the same stage (don't advance)
      if (this.sceneData) {
        this.scene.start('BattleScene', {
          playerClass: this.sceneData.playerClass,
          chapter: this.sceneData.chapter,
          stage: this.sceneData.stage,
          // Do NOT carry over player (reset HP/MP for retry)
          techDebtCarry: this.techDebt?.current ?? 0,
          progression: this.progressionSystem,
          stagesCompleted: this.stagesCompleted,
          playTime: this.sceneData.playTime ?? 0,
        } as BattleSceneData);
      } else {
        this.scene.start('ClassSelectScene');
      }
    });
  }

  // =========================================================================
  // Boss Phase Visuals
  // =========================================================================

  /**
   * Apply visual effects when boss transitions to a new phase.
   */
  private applyBossPhaseVisuals(newPhase: number) {
    if (!this.bossSprite || !this.monster) return;

    const phaseKey = newPhase as 1 | 2 | 3 | 4;
    const config = this.BOSS_PHASE_CONFIG[phaseKey];
    if (!config) return;

    // 1. Camera shake based on phase intensity
    this.cameras.main.shake(300, config.shakeIntensity / 1000);

    // 2. Screen flash with phase color
    this.cameras.main.flash(400,
      (config.tint >> 16) & 0xFF,
      (config.tint >> 8) & 0xFF,
      config.tint & 0xFF,
      false
    );

    // 3. Tween boss sprite color/tint
    this.tweens.add({
      targets: this.bossSprite,
      fillColor: config.tint,
      duration: 800,
      ease: 'Power2',
    });

    // 4. Scale boss sprite up then back (phase transition animation)
    this.tweens.add({
      targets: this.bossSprite,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 400,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    // 5. Update overlay with phase color
    if (this.bossPhaseOverlay) {
      this.tweens.add({
        targets: this.bossPhaseOverlay,
        fillColor: config.tint,
        alpha: config.overlayAlpha,
        duration: 600,
      });
    }

    // 6. Show random boss dialogue
    const dialogue = config.dialogues[Math.floor(Math.random() * config.dialogues.length)];
    if (this.bossDialogueText && dialogue) {
      this.bossDialogueText.setText(dialogue);
      this.bossDialogueText.setVisible(true);
      this.bossDialogueText.setAlpha(0);

      // Fade in dialogue
      this.tweens.add({
        targets: this.bossDialogueText,
        alpha: 1,
        duration: 300,
      });

      // Fade out after 2 seconds
      this.time.delayedCall(2000, () => {
        if (this.bossDialogueText) {
          this.tweens.add({
            targets: this.bossDialogueText,
            alpha: 0,
            duration: 300,
            onComplete: () => {
              this.bossDialogueText?.setVisible(false);
            },
          });
        }
      });
    }

    // 7. Show phase warning text
    const phaseDesc = this.enemyAI?.getPhaseDescription() ?? '';
    this.turnText?.setText(`WARNING: ${this.monster.name} enters ${phaseDesc}!`);
    this.updateUI();
  }

  // =========================================================================
  // UI
  // =========================================================================

  private updateUI() {
    if (!this.player || !this.monster || !this.techDebt) return;

    // ---- Player info ----
    const levelInfo = this.levelUpSystem?.getLevelInfo();
    const expDisplay = levelInfo
      ? `\nLv.${levelInfo.level} | EXP: ${levelInfo.exp}/${levelInfo.expForNextLevel}`
      : '';

    const focusIndicator = this.focusBuff ? '\n[FOCUS: +20% DMG next attack]' : '';

    this.playerHPText?.setText(
      `${this.player.name}${expDisplay}` +
      `\nHP: ${this.player.currentHP}/${this.player.stats.HP}` +
      `\nMP: ${this.player.currentMP}/${this.player.stats.MP}` +
      `\nGold: ${this.player.gold}` +
      focusIndicator
    );

    // ---- Monster info ----
    const isBoss = this.monster.type === 'boss';
    const currentPhase = this.enemyAI?.phase ?? 1;
    const phaseText = isBoss && this.enemyAI
      ? `\nPhase ${currentPhase}/4`
      : '';

    // Color HP text based on current phase
    let hpColor = '#ef4444'; // default red
    if (isBoss) {
      const phaseConfig = this.BOSS_PHASE_CONFIG[currentPhase as 1 | 2 | 3 | 4];
      if (phaseConfig) {
        hpColor = '#' + phaseConfig.tint.toString(16).padStart(6, '0');
      }
    }

    this.monsterHPText?.setText(
      `${this.monster.name}\nHP: ${this.monster.currentHP}/${this.monster.stats.HP}${phaseText}`
    );
    this.monsterHPText?.setColor(hpColor);

    // ---- Buff display ----
    if (this.buffText) {
      const buffLines: string[] = [];
      for (const buff of this.activeBuffs) {
        if (buff.stat === 'DOT') {
          buffLines.push(`[DoT on ${buff.target}] ${buff.value} dmg (${buff.turnsRemaining}t)`);
        } else {
          const sign = buff.value >= 0 ? '+' : '';
          buffLines.push(`[${buff.target}] ${sign}${buff.value} ${buff.stat} (${buff.turnsRemaining}t)`);
        }
      }
      this.buffText.setText(buffLines.join('\n'));
    }

    // ---- Tech Debt bar ----
    const status = this.techDebt.getStatus();
    const barWidth = 300;
    const barHeight = 20;
    const barX = this.cameras.main.width / 2 - barWidth / 2;
    const barY = this.cameras.main.height - 250;
    const fillWidth = (status.current / 100) * barWidth;

    this.techDebtBar?.clear();
    this.techDebtBar?.fillStyle(parseInt(status.color.replace('#', '0x'), 16), 1);
    this.techDebtBar?.fillRect(barX, barY, fillWidth, barHeight);

    this.techDebtText?.setText(`${status.current}/100 - ${status.description}`);
    this.techDebtText?.setColor(status.color);

    if (!this.turnText?.text) {
      this.turnText?.setText('Your turn! Choose an action.');
    }
  }

  /**
   * Continuous update loop for boss phase visual effects.
   */
  update(time: number, delta: number): void {
    if (!this.bossSprite || !this.monster || this.monster.type !== 'boss' || !this.enemyAI) {
      return;
    }

    const currentPhase = this.enemyAI.phase;

    // Phase 3+: Apply continuous visual effects
    if (currentPhase >= 3) {
      // Calculate oscillating alpha for red pulse effect
      const pulseSpeed = currentPhase === 4 ? 0.008 : 0.004; // Phase 4 pulses faster
      const pulseAlpha = 0.3 + Math.sin(time * pulseSpeed) * 0.2; // Oscillate between 0.1 and 0.5

      // Apply alpha pulse to boss sprite
      this.bossSprite.setAlpha(pulseAlpha);

      // Phase 4: Add slight position jitter
      if (currentPhase === 4) {
        const jitterX = (Math.random() - 0.5) * 2; // -1 to +1 pixel
        const jitterY = (Math.random() - 0.5) * 2;
        const baseX = this.cameras.main.width - 150;
        const baseY = 300;
        this.bossSprite.setPosition(baseX + jitterX, baseY + jitterY);
      }
    } else {
      // Phase 1-2: Normal opacity
      this.bossSprite.setAlpha(1);
    }
  }
}
