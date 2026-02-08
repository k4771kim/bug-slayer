/**
 * BattleUIRenderer - Manages all UI rendering for battle scenes
 *
 * Extracted from BattleScene.ts to improve modularity.
 * Handles:
 * - HP/MP bars with gradients and rounded corners
 * - Status text displays (player, monster, buffs, tech debt)
 * - Boss phase visual effects
 * - Tech debt bar with pulsing glow
 */

import Phaser from 'phaser';
import type { Character, Monster } from '@bug-slayer/shared';
import type { TechDebt, TechDebtStatus } from './TechDebt';
import type { MonsterAI } from './MonsterAI';
import type { LevelUpSystem } from './LevelUpSystem';
import type { ActiveBuff, ActiveStatusEffect } from './BuffManager';

interface BossPhaseConfig {
  tint: number;
  overlayAlpha: number;
  dialogues: string[];
  shakeIntensity: number;
}

export class BattleUIRenderer {
  // Text elements
  private turnText: Phaser.GameObjects.Text | null = null;
  private playerHPText: Phaser.GameObjects.Text | null = null;
  private monsterHPText: Phaser.GameObjects.Text | null = null;
  private techDebtText: Phaser.GameObjects.Text | null = null;
  private buffText: Phaser.GameObjects.Text | null = null;
  private statusEffectText: Phaser.GameObjects.Text | null = null;
  private stageText: Phaser.GameObjects.Text | null = null;
  private goldText: Phaser.GameObjects.Text | null = null;

  // Graphics elements
  private playerHPBar: Phaser.GameObjects.Graphics | null = null;
  private playerMPBar: Phaser.GameObjects.Graphics | null = null;
  private monsterHPBar: Phaser.GameObjects.Graphics | null = null;
  private techDebtBar: Phaser.GameObjects.Graphics | null = null;
  private techDebtGlow: Phaser.GameObjects.Graphics | null = null;

  // Boss visual elements
  private bossSprite: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle | null = null;
  private bossPhaseOverlay: Phaser.GameObjects.Rectangle | null = null;
  private bossDialogueText: Phaser.GameObjects.Text | null = null;

  // Boss phase visual configuration
  private readonly BOSS_PHASE_CONFIG: Record<1 | 2 | 3 | 4, BossPhaseConfig> = {
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
      tint: 0xce9178, // orange rage
      overlayAlpha: 0.15,
      dialogues: ['COMPILING RAGE!', 'Stack overflow incoming!', 'You can\'t refactor ME!'],
      shakeIntensity: 4,
    },
    4: {
      tint: 0xf44747, // red desperate
      overlayAlpha: 0.25,
      dialogues: ['SEGFAULT... SEGFAULT...', 'I... won\'t... crash...', 'FATAL ERROR!'],
      shakeIntensity: 8,
    },
  };

  constructor(private scene: Phaser.Scene) {}

  /**
   * Create all UI elements during battle scene initialization.
   */
  createUI(chapter: number, stage: number): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    // Stage indicator
    this.stageText = this.scene.add.text(width / 2, 20, `Chapter ${chapter} - Stage ${stage}`, {
      fontSize: '20px',
      color: '#4ec9b0',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Player info (top-left)
    this.playerHPText = this.scene.add.text(50, 150, '', {
      fontSize: '14px',
      color: '#d4d4d4',
    });

    // Gold display (below player HP)
    this.goldText = this.scene.add.text(50, 270, '', {
      fontSize: '14px',
      color: '#dcdcaa',
      fontStyle: 'bold',
    });

    // Monster info (top-right)
    this.monsterHPText = this.scene.add.text(width - 50, 150, '', {
      fontSize: '14px',
      color: '#ef4444',
    }).setOrigin(1, 0);

    // Turn text (center-top)
    this.turnText = this.scene.add.text(width / 2, 80, '', {
      fontSize: '16px',
      color: '#569cd6',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);

    // Buff display (right side, below monster)
    this.buffText = this.scene.add.text(width - 50, 280, '', {
      fontSize: '12px',
      color: '#c586c0',
      align: 'right',
    }).setOrigin(1, 0);

    // Status effect display (center, below turn text)
    this.statusEffectText = this.scene.add.text(width / 2, 400, '', {
      fontSize: '13px',
      color: '#f48771',
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);

    // Tech debt display (bottom-center)
    this.techDebtText = this.scene.add.text(width / 2, height - 220, '', {
      fontSize: '13px',
      color: '#4ec9b0',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Create graphics objects for bars
    this.playerHPBar = this.scene.add.graphics();
    this.playerMPBar = this.scene.add.graphics();
    this.monsterHPBar = this.scene.add.graphics();
    this.techDebtBar = this.scene.add.graphics();
    this.techDebtGlow = this.scene.add.graphics();
  }

  /**
   * Update all UI elements with current game state.
   */
  updateUI(
    player: Character,
    monster: Monster,
    techDebt: TechDebt,
    activeBuffs: ActiveBuff[],
    statusEffects: ActiveStatusEffect[],
    focusBuff: boolean,
    levelUpSystem: LevelUpSystem | null,
    monsterAI: MonsterAI | null
  ): void {
    // ---- Player info ----
    const levelInfo = levelUpSystem?.getLevelInfo();
    const expDisplay = levelInfo
      ? `\nLv.${levelInfo.level} | EXP: ${levelInfo.exp}/${levelInfo.expForNextLevel}`
      : '';

    const focusIndicator = focusBuff ? '\n[FOCUS: +20% DMG next attack]' : '';

    this.playerHPText?.setText(
      `${player.name}${expDisplay}` +
      `\nHP: ${player.currentHP}/${player.stats.HP}` +
      `\nMP: ${player.currentMP}/${player.stats.MP}` +
      focusIndicator
    );

    // ---- Gold display with coin icon ----
    this.goldText?.setText(`● ${player.gold}g`);

    // ---- Player HP/MP bars with gradient and rounded corners ----
    this.drawPlayerBars(player);

    // ---- Monster info ----
    const isBoss = monster.type === 'boss';
    const currentPhase = monsterAI?.phase ?? 1;
    const phaseText = isBoss && monsterAI
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
      `${monster.name}\nHP: ${monster.currentHP}/${monster.stats.HP}${phaseText}`
    );
    this.monsterHPText?.setColor(hpColor);

    // ---- Monster HP bar ----
    this.drawMonsterHPBar(monster, monsterAI);

    // ---- Buff display ----
    if (this.buffText) {
      const buffLines: string[] = [];
      for (const buff of activeBuffs) {
        if (buff.stat === 'DOT') {
          buffLines.push(`[DoT on ${buff.target}] ${buff.value} dmg (${buff.turnsRemaining}t)`);
        } else {
          const sign = buff.value >= 0 ? '+' : '';
          buffLines.push(`[${buff.target}] ${sign}${buff.value} ${buff.stat} (${buff.turnsRemaining}t)`);
        }
      }
      this.buffText.setText(buffLines.join('\n'));
    }

    // ---- Status effects display ----
    if (this.statusEffectText) {
      const effectLines: string[] = [];
      for (const effect of statusEffects) {
        const icon = effect.type === 'stun' ? '⚡' : '❓';
        const label = effect.type.toUpperCase();
        effectLines.push(`${icon} [${effect.target}] ${label} (${effect.turnsRemaining}t)`);
      }
      this.statusEffectText.setText(effectLines.join('  '));
    }

    // ---- Tech Debt bar with gradient and glow ----
    const status = techDebt.getStatus();
    this.drawTechDebtBar(status);

    if (!this.turnText?.text) {
      this.turnText?.setText('Your turn! Choose an action.');
    }
  }

  /**
   * Set the turn text message.
   */
  setTurnText(text: string): void {
    this.turnText?.setText(text);
  }

  /**
   * Get the turn text object (for external modification).
   */
  getTurnText(): Phaser.GameObjects.Text | null {
    return this.turnText;
  }

  /**
   * Get boss phase configuration for a given phase.
   */
  getBossPhaseConfig(phase: 1 | 2 | 3 | 4): BossPhaseConfig {
    return this.BOSS_PHASE_CONFIG[phase];
  }

  // =========================================================================
  // Private Drawing Methods
  // =========================================================================

  /**
   * Draw player HP/MP bars with gradient and rounded corners.
   */
  private drawPlayerBars(player: Character): void {
    if (!this.playerHPBar || !this.playerMPBar) return;

    const barWidth = 150;
    const barHeight = 16;
    const barX = 100;
    const hpBarY = 225;
    const mpBarY = 245;

    // HP Bar
    const hpPercent = player.currentHP / player.stats.HP;
    const hpFillWidth = barWidth * hpPercent;

    this.playerHPBar.clear();
    // Background
    this.playerHPBar.fillStyle(0x2d2d30, 1);
    this.playerHPBar.fillRoundedRect(barX, hpBarY, barWidth, barHeight, 4);
    // Gradient fill (lighter at top, darker at bottom)
    this.playerHPBar.fillGradientStyle(0x6ed9c0, 0x6ed9c0, 0x4ec9b0, 0x4ec9b0, 1);
    this.playerHPBar.fillRoundedRect(barX, hpBarY, hpFillWidth, barHeight, 4);
    // Border
    this.playerHPBar.lineStyle(1, 0x3e3e42, 1);
    this.playerHPBar.strokeRoundedRect(barX, hpBarY, barWidth, barHeight, 4);

    // HP Text overlay
    this.scene.add.text(barX + barWidth / 2, hpBarY + barHeight / 2,
      `${player.currentHP}/${player.stats.HP}`, {
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10);

    // MP Bar
    const mpPercent = player.currentMP / player.stats.MP;
    const mpFillWidth = barWidth * mpPercent;

    this.playerMPBar.clear();
    // Background
    this.playerMPBar.fillStyle(0x2d2d30, 1);
    this.playerMPBar.fillRoundedRect(barX, mpBarY, barWidth, barHeight, 4);
    // Blue gradient fill
    this.playerMPBar.fillGradientStyle(0x6eacd6, 0x6eacd6, 0x569cd6, 0x569cd6, 1);
    this.playerMPBar.fillRoundedRect(barX, mpBarY, mpFillWidth, barHeight, 4);
    // Border
    this.playerMPBar.lineStyle(1, 0x3e3e42, 1);
    this.playerMPBar.strokeRoundedRect(barX, mpBarY, barWidth, barHeight, 4);

    // MP Text overlay
    this.scene.add.text(barX + barWidth / 2, mpBarY + barHeight / 2,
      `${player.currentMP}/${player.stats.MP}`, {
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10);
  }

  /**
   * Draw monster HP bar with gradient and boss phase coloring.
   */
  private drawMonsterHPBar(monster: Monster, monsterAI: MonsterAI | null): void {
    if (!this.monsterHPBar) return;

    const barWidth = 150;
    const barHeight = 16;
    const barX = this.scene.cameras.main.width - 200;
    const barY = 230;

    const hpPercent = monster.currentHP / monster.stats.HP;
    const hpFillWidth = barWidth * hpPercent;

    // Determine color based on monster type and phase
    let fillColorTop = 0xef6666;
    let fillColorBottom = 0xef4444;

    if (monster.type === 'boss' && monsterAI) {
      const phase = monsterAI.phase;
      if (phase === 2) {
        fillColorTop = 0xeedd8a;
        fillColorBottom = 0xdcdcaa;
      } else if (phase === 3) {
        fillColorTop = 0xd9a178;
        fillColorBottom = 0xce9178;
      } else if (phase === 4) {
        fillColorTop = 0xf66767;
        fillColorBottom = 0xf44747;
      }
    }

    this.monsterHPBar.clear();
    // Background
    this.monsterHPBar.fillStyle(0x2d2d30, 1);
    this.monsterHPBar.fillRoundedRect(barX, barY, barWidth, barHeight, 4);
    // Gradient fill
    this.monsterHPBar.fillGradientStyle(fillColorTop, fillColorTop, fillColorBottom, fillColorBottom, 1);
    this.monsterHPBar.fillRoundedRect(barX, barY, hpFillWidth, barHeight, 4);
    // Border
    this.monsterHPBar.lineStyle(1, 0x3e3e42, 1);
    this.monsterHPBar.strokeRoundedRect(barX, barY, barWidth, barHeight, 4);

    // HP Text overlay
    this.scene.add.text(barX + barWidth / 2, barY + barHeight / 2,
      `${monster.currentHP}/${monster.stats.HP}`, {
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10);
  }

  /**
   * Draw tech debt bar with pulsing glow effect when high.
   */
  private drawTechDebtBar(status: TechDebtStatus): void {
    if (!this.techDebtBar) return;

    const barWidth = 300;
    const barHeight = 20;
    const barX = this.scene.cameras.main.width / 2 - barWidth / 2;
    const barY = this.scene.cameras.main.height - 250;
    const fillWidth = (status.current / 100) * barWidth;

    // Determine color based on debt level (gradient from green to yellow to red)
    let fillColor = 0x4ec9b0; // green (low)
    if (status.current > 40 && status.current <= 70) {
      fillColor = 0xdcdcaa; // yellow (medium)
    } else if (status.current > 70) {
      fillColor = 0xf48771; // red (high)
    }

    this.techDebtBar.clear();
    this.techDebtBar.fillStyle(fillColor, 1);
    this.techDebtBar.fillRoundedRect(barX, barY, fillWidth, barHeight, 4);

    // Pulsing glow effect when tech debt > 60
    if (status.current > 60 && this.techDebtGlow) {
      this.techDebtGlow.clear();
      const glowAlpha = 0.3 + Math.sin(Date.now() * 0.005) * 0.2;
      this.techDebtGlow.lineStyle(3, fillColor, glowAlpha);
      this.techDebtGlow.strokeRoundedRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4, 6);
    } else if (this.techDebtGlow) {
      this.techDebtGlow.clear();
    }

    this.techDebtText?.setText(`${status.current}/100 - ${status.description}`);
    this.techDebtText?.setColor(status.color);
  }

  // =========================================================================
  // Boss Visual Methods
  // =========================================================================

  /**
   * Create boss sprite and visual overlays.
   */
  createBossVisuals(monster: Monster, textureKey: string | null): void {
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    // Create boss sprite
    if (textureKey && this.scene.textures.exists(textureKey)) {
      this.bossSprite = this.scene.add.image(width - 150, 300, textureKey).setOrigin(0.5, 0.5);
    } else {
      this.bossSprite = this.scene.add.rectangle(width - 150, 300, 64, 64, 0xef4444);
    }

    // Boss phase overlay (initially invisible)
    this.bossPhaseOverlay = this.scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0)
      .setDepth(10);

    // Boss dialogue text (initially empty)
    this.bossDialogueText = this.scene.add.text(width / 2, 420, '', {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#1a1a2e',
      padding: { x: 15, y: 10 },
      align: 'center',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(20).setVisible(false);
  }

  /**
   * Show boss phase transition with visual effects.
   */
  showBossPhaseTransition(phase: number, dialogue: string | null): void {
    if (!this.bossSprite) return;

    const phaseKey = phase as 1 | 2 | 3 | 4;
    const config = this.BOSS_PHASE_CONFIG[phaseKey];
    if (!config) return;

    // 1. Camera shake based on phase intensity
    this.scene.cameras.main.shake(300, config.shakeIntensity / 1000);

    // 2. Screen flash with phase color
    this.scene.cameras.main.flash(400,
      (config.tint >> 16) & 0xFF,
      (config.tint >> 8) & 0xFF,
      config.tint & 0xFF,
      false
    );

    // 3. Apply phase-specific visual effects
    this.applyBossPhaseEffect(phase, config);

    // 4. Show boss dialogue
    if (dialogue && this.bossDialogueText) {
      this.bossDialogueText.setText(dialogue);
      this.bossDialogueText.setVisible(true);
      this.bossDialogueText.setAlpha(0);

      // Fade in dialogue
      this.scene.tweens.add({
        targets: this.bossDialogueText,
        alpha: 1,
        duration: 300,
      });

      // Fade out after 2 seconds
      this.scene.time.delayedCall(2000, () => {
        if (this.bossDialogueText) {
          this.scene.tweens.add({
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

    // 5. Show phase warning text
    this.setTurnText(`WARNING: Boss enters Phase ${phase}!`);
  }

  /**
   * Apply phase-specific visual effect to boss sprite.
   */
  applyBossPhaseEffect(phase: number, config: BossPhaseConfig): void {
    if (!this.bossSprite) return;

    // Tween boss sprite color/tint (only for rectangles)
    if (this.bossSprite instanceof Phaser.GameObjects.Rectangle) {
      this.scene.tweens.add({
        targets: this.bossSprite,
        fillColor: config.tint,
        duration: 800,
        ease: 'Power2',
      });
    }

    // Scale boss sprite up then back (phase transition animation)
    this.scene.tweens.add({
      targets: this.bossSprite,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 400,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    // Update overlay with phase color
    if (this.bossPhaseOverlay) {
      this.scene.tweens.add({
        targets: this.bossPhaseOverlay,
        fillColor: config.tint,
        alpha: config.overlayAlpha,
        duration: 600,
      });
    }
  }

  /**
   * Update boss visuals continuously (called from BattleScene.update).
   */
  updateBossVisuals(time: number, monsterAI: MonsterAI): void {
    if (!this.bossSprite) return;

    const currentPhase = monsterAI.phase;

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
        const baseX = this.scene.cameras.main.width - 150;
        const baseY = 300;
        this.bossSprite.setPosition(baseX + jitterX, baseY + jitterY);
      }
    } else {
      // Phase 1-2: Normal opacity
      this.bossSprite.setAlpha(1);
    }
  }

  /**
   * Cleanup UI elements.
   */
  destroy(): void {
    this.turnText?.destroy();
    this.playerHPText?.destroy();
    this.monsterHPText?.destroy();
    this.techDebtText?.destroy();
    this.buffText?.destroy();
    this.statusEffectText?.destroy();
    this.stageText?.destroy();
    this.goldText?.destroy();
    this.playerHPBar?.destroy();
    this.playerMPBar?.destroy();
    this.monsterHPBar?.destroy();
    this.techDebtBar?.destroy();
    this.techDebtGlow?.destroy();
    this.bossSprite?.destroy();
    this.bossPhaseOverlay?.destroy();
    this.bossDialogueText?.destroy();
  }
}
