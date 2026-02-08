import Phaser from 'phaser'
import type { Character, Monster, Skill, SkillEffect, Item } from '@bug-slayer/shared';
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
import { TechDebt, type TechDebtLevel } from '../systems/TechDebt';
import { EnemyAI, type EnemyAction } from '../systems/EnemyAI';
import { MonsterAI } from '../systems/MonsterAI';
import { LevelUpSystem } from '../systems/LevelUpSystem';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import { ItemSystem } from '../systems/ItemSystem';
import { EndingScene, type EndingData } from './EndingScene';
import { EventSystem } from '../systems/EventSystem';
import type { EventSceneData } from './EventScene';
import { SoundManager } from '../systems/SoundManager';
import { BuffManager } from '../systems/BuffManager';
import { SkillManager } from '../systems/SkillManager';
import { BattleUIRenderer } from '../systems/BattleUIRenderer';
import { BattleResultHandler } from '../systems/BattleResultHandler';
import type { VictoryRewards, StageAdvanceResult } from '../systems/BattleResultHandler';

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
 * 6. EndingScene transition after Chapter 4 boss
 * 7. Buff/debuff tracking with turn duration
 * 8. ItemSystem for loot drops
 */
export class BattleScene extends Phaser.Scene {
  // Core game objects
  private player: Character | null = null;
  private monster: Monster | null = null;
  private techDebt: TechDebt | null = null;
  private lastTechDebtLevel: TechDebtLevel = 'clean';
  private monsterAI: MonsterAI | null = null;
  private levelUpSystem: LevelUpSystem | null = null;
  private progressionSystem: ProgressionSystem | null = null;
  private itemSystem: ItemSystem | null = null;
  private eventSystem: EventSystem | null = null;
  private soundManager?: SoundManager;

  // Extracted system modules
  private buffManager: BuffManager | null = null;
  private skillManager: SkillManager | null = null;
  private uiRenderer: BattleUIRenderer | null = null;
  private resultHandler: BattleResultHandler | null = null;

  // Scene data
  private sceneData: BattleSceneData | null = null;

  // Combat state
  private isPlayerTurn: boolean = true;
  private battleStartTime: number = 0;
  private stagesCompleted: number[] = [];
  private attackCount: number = 0; // for Refactorer passive

  // Skill panel
  private skillPanelContainer: Phaser.GameObjects.Container | null = null;
  private skillPanelVisible: boolean = false;

  // Item panel
  private itemPanelContainer: Phaser.GameObjects.Container | null = null;

  // Action buttons (stored so we can enable/disable them)
  private actionButtons: Phaser.GameObjects.Text[] = [];

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

    // ---- Buff/Skill Managers ----
    this.buffManager = new BuffManager();
    this.skillManager = new SkillManager(this.buffManager);

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
      this.monsterAI = new MonsterAI(this.monster);
    }
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1e1e1e);

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

    // Monster sprite placeholder (actual sprite creation handled by uiRenderer if boss)
    const monsterTexture = this.getMonsterTexture();
    if (monsterTexture && this.textures.exists(monsterTexture)) {
      this.add.image(width - 150, 300, monsterTexture).setOrigin(0.5, 0.5);
    } else {
      // Fallback to colored rectangle
      const monsterSprite = this.add.rectangle(width - 150, 300, 64, 64, 0xef4444);
      // Yellow tint for Warning-type monsters
      if (this.monster?.type === 'bug') {
        monsterSprite.fillColor = 0xdcdcaa;
      }
    }

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

    // ---- Initialize UI Renderer ----
    const chapter = this.sceneData?.chapter ?? 1;
    const stage = this.sceneData?.stage ?? 1;
    this.uiRenderer = new BattleUIRenderer(this);
    this.uiRenderer.createUI(chapter, stage);

    // Create boss visuals if this is a boss fight
    if (this.monster?.type === 'boss' && this.monsterAI) {
      this.uiRenderer.createBossVisuals(this.monster, this.getMonsterTexture());
    }

    // ---- Initialize Result Handler ----
    if (this.player && this.levelUpSystem && this.progressionSystem && this.techDebt) {
      this.resultHandler = new BattleResultHandler(
        this.player,
        this.levelUpSystem,
        this.progressionSystem,
        this.itemSystem,
        this.eventSystem,
        this.techDebt,
        this.soundManager
      );
    }

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

    // Initialize sound manager and play battle music
    this.soundManager = new SoundManager(this);
    const isBoss = this.monster?.type === 'boss';
    this.soundManager.playBGM(isBoss ? 'bgm-boss' : 'bgm-battle');
    if (isBoss) {
      this.soundManager.playSFX('sfx-boss-appear');
    }
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
                      'infiniteloop', 'heisenbug',
                      'threadstarvation', 'livelock', 'priorityinversion', 'phantomread',
                      'lostupdate', 'concurrencychaos', 'corsbypass', 'csrfattack',
                      'antipattern', 'dependencyhell', 'techdebtoverflow', 'spaghettidragon'];

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
    // Look up total stages from data: Ch.1=6, Ch.2=5, Ch.3=6, Ch.4=6
    const chapterStages: Record<number, number> = { 1: 6, 2: 5, 3: 6, 4: 6 };
    const bossStage = chapterStages[chapter] ?? 6;

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
      chapter: bugData.chapter as 1 | 2 | 3 | 4,
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
    if (!this.player || !this.skillManager) return;

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
      const cooldown = this.skillManager!.getCooldown(skillData.id);
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

      // Add cooldown overlay for disabled skills
      if (onCooldown) {
        const cdOverlay = this.add.text(200, y, `${cooldown}`, {
          fontSize: '20px',
          color: '#f48771',
          backgroundColor: '#000000',
          padding: { x: 6, y: 2 },
          fontStyle: 'bold',
        }).setOrigin(0.5).setAlpha(0.7);
        this.skillPanelContainer!.add(cdOverlay);
      }
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
    if (!this.player || !this.monster || !this.techDebt || !this.isPlayerTurn || !this.buffManager || !this.skillManager || !this.uiRenderer) return;
    this.isPlayerTurn = false;
    this.setActionsEnabled(false);

    // Close skill panel if open
    if (this.skillPanelVisible) this.toggleSkillPanel();

    // Confusion: 50% chance to attack self
    if (this.buffManager.hasStatusEffect('confusion', 'player') && Math.random() < 0.5) {
      const selfDmg = Math.floor(this.player.stats.ATK * 0.5);
      this.player.currentHP = Math.max(0, this.player.currentHP - selfDmg);
      this.techDebt.turnPassed();
      this.autoRestoreMP();
      this.uiRenderer.setTurnText(`CONFUSED! You hit yourself for ${selfDmg} damage!`);
      this.updateUI();
      if (this.player.currentHP <= 0) {
        this.time.delayedCall(1000, () => this.handleDefeat());
        return;
      }
      this.time.delayedCall(1000, () => this.monsterTurn());
      return;
    }

    // Calculate base damage
    let baseDamage = this.buffManager.getEffectiveStat(this.player.stats.ATK, 'ATK', 'player');

    // Apply focus buff (+20%)
    const hadFocusBuff = this.skillManager.hasFocusBuff();
    if (hadFocusBuff) {
      baseDamage = Math.floor(baseDamage * (1 + FOCUS_DAMAGE_BONUS_PERCENT / 100));
    }

    // Check evasion (monster evades?)
    const monsterSPD = this.monster.stats.SPD ?? 0;
    const playerSPD = this.buffManager.getEffectiveStat(this.player.stats.SPD, 'SPD', 'player');
    if (this.rollEvasion(monsterSPD, playerSPD)) {
      this.soundManager?.playSFX('sfx-evade');
      this.techDebt.turnPassed();
      this.autoRestoreMP();
      this.uiRenderer.setTurnText(`${this.monster.name} evaded! MISS!`);
      this.updateUI();
      this.time.delayedCall(1000, () => this.monsterTurn());
      return;
    }

    // Apply defense formula
    const monsterDEF = this.buffManager.getEffectiveStat(this.monster.stats.DEF, 'DEF', 'monster');
    let damage = this.calculateDamage(baseDamage, monsterDEF);

    // Critical hit check
    const critResult = this.rollCritical(playerSPD, monsterSPD);
    let critText = '';
    if (critResult) {
      damage = Math.floor(damage * CRIT_MULTIPLIER);
      critText = ' CRITICAL HIT!';
      this.soundManager?.playSFX('sfx-critical');
    } else {
      this.soundManager?.playSFX('sfx-attack');
    }

    // Focus bonus text
    const focusText = hadFocusBuff ? ' +20% Focus Bonus!' : '';

    // Apply class passive to outgoing damage
    const passive = this.applyPassiveToOutgoingDamage(damage);
    damage = passive.damage;

    // Apply damage
    this.monster.currentHP = Math.max(0, this.monster.currentHP - damage);

    // Tech debt per turn
    this.techDebt.turnPassed();

    // Auto MP restore (5% per turn)
    const mpRestored = this.autoRestoreMP();

    this.uiRenderer.setTurnText(
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
    if (!this.player || !this.monster || !this.techDebt || !this.isPlayerTurn || !this.skillManager || !this.uiRenderer) return;

    this.isPlayerTurn = false;
    this.setActionsEnabled(false);

    // Use skill via SkillManager
    const soundCallback = (sfxId: string) => this.soundManager?.playSFX(sfxId);
    const result = this.skillManager.useSkill(skillData, this.player, this.monster, this.techDebt, soundCallback);

    if (!result.success) {
      this.uiRenderer.setTurnText(result.errorMessage ?? 'Skill failed!');
      this.isPlayerTurn = true;
      this.setActionsEnabled(true);
      return;
    }

    this.soundManager?.playSFX('sfx-skill');

    // Build result text
    let resultText = `Used ${skillData.name}!`;
    if (result.totalDamage > 0) resultText += ` ${result.totalDamage} damage!`;
    if (result.totalHeal > 0) resultText += ` Restored ${result.totalHeal} HP!`;
    if (result.effectTexts.length > 0) resultText += `\n${result.effectTexts.join(' | ')}`;
    resultText += `\n(+${result.mpRestored} MP, +1 Tech Debt)`;

    this.uiRenderer.setTurnText(resultText);
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
    if (!this.player || !this.monster || !this.techDebt || !this.isPlayerTurn || !this.skillManager || !this.uiRenderer) return;
    this.isPlayerTurn = false;
    this.setActionsEnabled(false);

    // Close skill panel if open
    if (this.skillPanelVisible) this.toggleSkillPanel();

    // Use focus via SkillManager
    const result = this.skillManager.useFocus(this.player, this.techDebt);

    this.uiRenderer.setTurnText(
      `You focused! Restored ${result.mpRestored} MP.\nNext attack deals +20% damage! (+1 Tech Debt)`
    );
    this.updateUI();

    // Monster turn
    this.time.delayedCall(1000, () => this.monsterTurn());
  }

  private handleFlee() {
    if (!this.player || !this.monster || !this.techDebt || !this.isPlayerTurn || !this.uiRenderer) return;
    this.isPlayerTurn = false;
    this.setActionsEnabled(false);

    // Close skill panel if open
    if (this.skillPanelVisible) this.toggleSkillPanel();

    // Add tech debt for fleeing
    const debtAdded = this.techDebt.flee();

    this.uiRenderer.setTurnText(`You fled from battle! (+${debtAdded} Tech Debt)`);
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
    if (!this.monster || !this.monsterAI) return;

    this.minigameActive = true;

    // Determine difficulty based on boss phase
    const difficulty = this.monsterAI.phase;

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
    if (!this.monster || !this.player || !this.uiRenderer || !this.monsterAI) return;

    this.minigameActive = false;

    // Read result from minigame scene data
    const minigameScene = this.scene.get('MinigameScene');
    const success = minigameScene.data.get('onSuccess') as boolean;

    if (success) {
      // Success: Deal 30% of boss max HP as damage
      const damage = Math.floor(this.monster.stats.HP * 0.3);
      this.monster.currentHP = Math.max(0, this.monster.currentHP - damage);

      this.uiRenderer.setTurnText(`Shield Break! ${damage} damage to ${this.monster.name}!`);

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

      this.uiRenderer.setTurnText(`${this.monster.name} heals ${healAmount} HP!`);
    }

    this.updateUI();

    // Continue with boss turn after delay
    this.time.delayedCall(1500, () => {
      // Get the action again since time has passed
      if (this.monsterAI) {
        const action = this.monsterAI.selectAction();
        this.executeEnemyAction(action);
      }
    });
  }

  // =========================================================================
  // Monster Turn
  // =========================================================================

  private monsterTurn() {
    if (!this.player || !this.monster || !this.techDebt || !this.monsterAI || !this.buffManager || !this.skillManager || !this.uiRenderer) return;

    // Tick status effects on monster
    this.buffManager.tickStatusEffects('monster');

    // Check if monster is stunned
    if (this.buffManager.hasStatusEffect('stun', 'monster')) {
      this.uiRenderer.setTurnText(`${this.monster.name} is STUNNED! Turn skipped!`);
      this.updateUI();
      this.time.delayedCall(1500, () => {
        this.buffManager!.tickStatusEffects('player');
        if (this.buffManager!.hasStatusEffect('stun', 'player')) {
          this.uiRenderer!.setTurnText('You are STUNNED! Turn skipped!');
          this.updateUI();
          this.time.delayedCall(1500, () => this.monsterTurn());
          return;
        }
        this.isPlayerTurn = true;
        this.setActionsEnabled(true);
        this.skillManager!.tickCooldowns();
        const confusedText = this.buffManager!.hasStatusEffect('confusion', 'player') ? ' [CONFUSED]' : '';
        this.uiRenderer!.setTurnText(`Your turn! Choose an action.${confusedText}`);
      });
      return;
    }

    // Tick buffs/debuffs at start of monster turn
    this.buffManager.tickBuffs();

    // Apply DoT effects to monster
    this.buffManager.applyDoTEffects(this.monster);

    // Check if monster died from DoT
    if (this.monster.currentHP <= 0) {
      this.time.delayedCall(500, () => this.handleVictory());
      return;
    }

    // Check for boss phase change
    const phaseTransition = this.monsterAI.checkBossPhase();

    if (phaseTransition && phaseTransition.triggered) {
      // Show boss phase transition visuals
      const dialogue = this.monsterAI.getBossDialogue();
      this.uiRenderer.showBossPhaseTransition(phaseTransition.newPhase, dialogue);

      // Trigger minigame for boss phase change
      this.time.delayedCall(2500, () => {
        this.triggerMinigame();
        // Note: minigame will call executeEnemyAction via handleMinigameResult
      });
    } else {
      // Enemy AI decides action
      const action = this.monsterAI.selectAction();
      this.executeEnemyAction(action);
    }
  }

  private executeEnemyAction(action: EnemyAction) {
    if (!this.player || !this.monster || !this.techDebt || !this.buffManager || !this.skillManager || !this.uiRenderer) return;

    // Monster confusion: 50% chance to hit self on attack/skill
    if (this.buffManager.hasStatusEffect('confusion', 'monster') && (action.type === 'attack' || action.type === 'skill') && Math.random() < 0.5) {
      const selfDmg = Math.floor(this.monster.stats.ATK * 0.5);
      this.monster.currentHP = Math.max(0, this.monster.currentHP - selfDmg);
      this.uiRenderer.setTurnText(`${this.monster.name} is CONFUSED! Hit itself for ${selfDmg} damage!`);
      this.updateUI();
      if (this.monster.currentHP <= 0) {
        this.time.delayedCall(1000, () => this.handleVictory());
        return;
      }
      this.time.delayedCall(1500, () => {
        this.isPlayerTurn = true;
        this.setActionsEnabled(true);
        this.skillManager!.tickCooldowns();
        this.uiRenderer!.setTurnText('Your turn! Choose an action.');
      });
      return;
    }

    const techDebtModifier = this.techDebt.enemyAtkModifier;
    let actionText = '';

    switch (action.type) {
      case 'attack': {
        const baseDamage = this.monster.stats.ATK;
        const modifiedAtk = Math.floor(baseDamage * techDebtModifier);
        const monsterATK = this.buffManager.getEffectiveStat(modifiedAtk, 'ATK', 'monster');
        const playerDEF = this.buffManager.getEffectiveStat(this.player.stats.DEF, 'DEF', 'player');

        // Check evasion (player evades?)
        const playerSPD = this.buffManager.getEffectiveStat(this.player.stats.SPD, 'SPD', 'player');
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

        this.soundManager?.playSFX('sfx-hit');

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
        const playerDEF = this.buffManager.getEffectiveStat(this.player.stats.DEF, 'DEF', 'player');

        // Check evasion
        const playerSPD = this.buffManager.getEffectiveStat(this.player.stats.SPD, 'SPD', 'player');
        const monsterSPD = this.monster.stats.SPD ?? 0;
        if (this.rollEvasion(playerSPD, monsterSPD)) {
          this.soundManager?.playSFX('sfx-evade');
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

        this.soundManager?.playSFX('sfx-hit');

        actionText = `${this.monster.name} used ${action.skillId}!${skillCritText} ${damage} damage${skillPassive.text}`;

        this.player.currentHP = Math.max(0, this.player.currentHP - damage);

        // Boss skills that apply status effects
        if (action.skillId === 'boundary-breach') {
          this.buffManager.applyStatusEffect('stun', 1, 'player');
          actionText += ' You are STUNNED!';
        } else if (action.skillId === 'uncertainty') {
          this.buffManager.applyStatusEffect('confusion', 2, 'player');
          actionText += ' You are CONFUSED!';
        } else if (action.skillId === 'observer-effect') {
          this.buffManager.applyStatusEffect('confusion', 1, 'player');
          actionText += ' You are CONFUSED!';
        }

        break;
      }

      case 'buff': {
        const stat = action.targetStat || 'ATK';
        this.buffManager.applyBuff(stat, 20, 3, 'monster');
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

    this.uiRenderer.setTurnText(actionText);
    this.updateUI();

    // Check lose condition
    if (this.player.currentHP <= 0) {
      this.time.delayedCall(1000, () => this.handleDefeat());
      return;
    }

    // Back to player turn
    this.time.delayedCall(1500, () => {
      // Tick status effects on player
      this.buffManager!.tickStatusEffects('player');
      this.updateUI();

      // Check if player is stunned
      if (this.buffManager!.hasStatusEffect('stun', 'player')) {
        this.uiRenderer!.setTurnText('You are STUNNED! Turn skipped!');
        this.updateUI();
        this.time.delayedCall(1500, () => this.monsterTurn());
        return;
      }

      this.isPlayerTurn = true;
      this.setActionsEnabled(true);
      // Tick cooldowns at start of player turn
      this.skillManager!.tickCooldowns();
      const confusedText = this.buffManager!.hasStatusEffect('confusion', 'player') ? ' [CONFUSED]' : '';
      this.uiRenderer!.setTurnText(`Your turn! Choose an action.${confusedText}`);
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
    if (!this.player || !this.techDebt || !this.isPlayerTurn || !this.itemSystem || !this.uiRenderer) return;
    if (this.skillPanelVisible) this.toggleSkillPanel();

    const consumables = this.itemSystem.getItemsByType('consumable');
    if (consumables.length === 0) {
      this.uiRenderer.setTurnText('No items to use!');
      return;
    }

    // Create item selection popup
    this.showItemPanel(consumables);
  }

  private showItemPanel(items: Item[]) {
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

      const itemBtn = this.add.text(0, y, `${item.name} - ${item.type}`, {
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

  private useSelectedItem(item: Item) {
    if (!this.player || !this.techDebt || !this.itemSystem || !this.uiRenderer) return;

    this.isPlayerTurn = false;
    this.setActionsEnabled(false);

    const result = this.itemSystem.useItem(item);

    if (result.success) {
      let itemText = `Used ${item.name}!`;
      if (result.hpRestored && result.hpRestored > 0) itemText += ` +${result.hpRestored} HP`;
      if (result.mpRestored && result.mpRestored > 0) itemText += ` +${result.mpRestored} MP`;

      this.uiRenderer.setTurnText(itemText);
      this.updateUI();
      this.time.delayedCall(1000, () => this.monsterTurn());
    } else {
      this.uiRenderer.setTurnText(result.message);
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
    if (!this.resultHandler || !this.monster || !this.uiRenderer) return;

    // Mark stage as completed (not skipped)
    const chapter = this.sceneData?.chapter ?? 1;
    const stage = this.sceneData?.stage ?? 1;
    this.stagesCompleted.push(chapter * 100 + stage);

    // Process victory rewards
    const rewards = this.resultHandler.processVictory(this.monster);
    const message = this.resultHandler.getVictoryMessage(this.monster.name, rewards);
    this.uiRenderer.setTurnText(message);
    this.updateUI();

    // Check for level-up
    this.time.delayedCall(1500, () => {
      if (!this.resultHandler || !this.uiRenderer) return;

      if (rewards.levelUp) {
        const levelUpMsg = this.resultHandler.getLevelUpMessage(rewards);
        this.uiRenderer.setTurnText(levelUpMsg);
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
    if (!this.resultHandler || !this.sceneData || !this.uiRenderer) return;

    const battleTime = this.resultHandler.getBattleTime(this.battleStartTime);
    const totalPlayTime = this.resultHandler.calculateTotalPlayTime(
      this.battleStartTime,
      this.sceneData.playTime ?? 0
    );

    const chapter = this.sceneData.chapter;
    const stage = this.sceneData.stage;

    // Determine next stage
    const result = this.resultHandler.determineNextStage(
      chapter,
      stage,
      battleTime,
      this.stagesCompleted,
      totalPlayTime
    );

    if (result.type === 'game-complete') {
      // GAME COMPLETE - transition to EndingScene
      this.transitionToEnding(totalPlayTime);
      return;
    }

    if (result.type === 'chapter-complete') {
      // Chapter complete, show message then move to next chapter
      this.uiRenderer.setTurnText(
        this.resultHandler.getChapterCompleteMessage(chapter)
      );
      this.updateUI();

      this.time.delayedCall(2500, () => {
        this.advanceToNextStage(true);
      });
      return;
    }

    if (result.type === 'event') {
      // Event triggered - transition to EventScene
      this.transitionToEvent(result);
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
    if (!this.progressionSystem || !this.sceneData || !this.techDebt || !this.resultHandler) return;

    const nextChapter = this.progressionSystem.getCurrentChapter();
    const nextStage = this.progressionSystem.getCurrentStage();
    const totalPlayTime = this.resultHandler.calculateTotalPlayTime(
      this.battleStartTime,
      this.sceneData.playTime ?? 0
    );

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

    // No event triggered, go directly to next battle
    this.scene.start('BattleScene', nextBattleData);
  }

  /**
   * Transition to EventScene after rolling an event.
   */
  private transitionToEvent(result: StageAdvanceResult) {
    if (!this.sceneData || !this.techDebt || !this.progressionSystem || !result.eventData) return;

    const totalPlayTime = this.resultHandler?.calculateTotalPlayTime(
      this.battleStartTime,
      this.sceneData.playTime ?? 0
    ) ?? 0;

    const nextBattleData: BattleSceneData = {
      playerClass: this.sceneData.playerClass,
      chapter: result.chapter ?? 1,
      stage: result.stage ?? 1,
      player: this.player ?? undefined,
      techDebtCarry: this.techDebt.current,
      progression: this.progressionSystem,
      stagesCompleted: this.stagesCompleted,
      playTime: totalPlayTime,
    };

    const eventData: EventSceneData = {
      event: result.eventData.event,
      returnScene: 'BattleScene',
      returnData: nextBattleData,
    };

    this.scene.start('EventScene', eventData);
  }

  /**
   * Transition to EndingScene after defeating the final boss.
   */
  private transitionToEnding(totalPlayTime: number) {
    if (!this.techDebt || !this.progressionSystem || !this.player || !this.uiRenderer) return;

    // Determine if all stages were completed without skipping
    // Total stages: Ch1=6 + Ch2=5 + Ch3=6 + Ch4=6 = 23
    const allWarningsKilled = this.stagesCompleted.length >= 23;

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
      chapter: 4,
      finalLevel: this.player.level,
      allWarningsKilled,
    };

    this.uiRenderer.setTurnText('The final bug has been vanquished...');
    this.updateUI();

    this.time.delayedCall(3000, () => {
      this.scene.start('EndingScene', endingData);
    });
  }

  private handleDefeat() {
    if (!this.resultHandler || !this.uiRenderer) return;

    const result = this.resultHandler.processDefeat();
    this.uiRenderer.setTurnText(result.message);
    this.updateUI();

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
  // UI
  // =========================================================================

  private updateUI() {
    if (!this.player || !this.monster || !this.techDebt || !this.buffManager || !this.skillManager || !this.uiRenderer) return;

    this.uiRenderer.updateUI(
      this.player,
      this.monster,
      this.techDebt,
      this.buffManager.getActiveBuffs(),
      this.buffManager.getActiveStatusEffects(),
      this.skillManager.hasFocusBuff(),
      this.levelUpSystem,
      this.monsterAI
    );

    // Play warning sound when tech debt transitions to danger/crisis
    if (this.techDebt) {
      const currentLevel = this.techDebt.level;
      if (currentLevel !== this.lastTechDebtLevel) {
        if (currentLevel === 'danger' || currentLevel === 'crisis') {
          this.soundManager?.playSFX('sfx-techdebt-warn');
        }
        this.lastTechDebtLevel = currentLevel;
      }
    }
  }

  /**
   * Continuous update loop for boss phase visual effects.
   */
  update(time: number, delta: number): void {
    if (!this.monster || this.monster.type !== 'boss' || !this.monsterAI || !this.uiRenderer) {
      return;
    }

    // Delegate boss visual updates to UI renderer
    this.uiRenderer.updateBossVisuals(time, this.monsterAI);
  }
}
