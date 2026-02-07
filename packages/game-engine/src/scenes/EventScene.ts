/**
 * EventScene - Interactive Random Event Display
 *
 * Displays random events between battle stages.
 * Supports both auto-resolve events (no choices) and interactive events
 * where the player picks from multiple options with different outcomes.
 */

import Phaser from 'phaser'
import { GameEvent, EventChoice, EventEffect } from '../systems/EventSystem';

export interface EventSceneData {
  event: GameEvent;
  returnScene: string;
  returnData: any;
}

export class EventScene extends Phaser.Scene {
  private eventData?: EventSceneData;
  private canSkip: boolean = false;
  private autoAdvanceTimer?: Phaser.Time.TimerEvent;
  private choiceMade: boolean = false;

  // VS Code Dark+ colors
  private readonly COLOR_BG = 0x1e1e1e;
  private readonly COLOR_YELLOW = 0xdcdcaa;
  private readonly COLOR_WHITE = 0xffffff;
  private readonly COLOR_BLUE = 0x4a90e2;
  private readonly COLOR_GREEN = 0x4ec9b0;
  private readonly COLOR_RED = 0xf48771;
  private readonly COLOR_PURPLE = 0xc586c0;
  private readonly COLOR_PANEL = 0x252526;
  private readonly COLOR_HOVER = 0x2a2d2e;
  private readonly COLOR_BORDER = 0x3c3c3c;

  constructor() {
    super({ key: 'EventScene' });
  }

  init(data: EventSceneData) {
    this.eventData = data;
    this.canSkip = false;
    this.choiceMade = false;
  }

  create() {
    if (!this.eventData) {
      console.error('EventScene: No event data provided');
      this.scene.start('BattleScene');
      return;
    }

    const { event } = this.eventData;
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Dark overlay background
    const overlay = this.add.rectangle(
      0, 0,
      this.cameras.main.width,
      this.cameras.main.height,
      this.COLOR_BG,
      0.95
    );
    overlay.setOrigin(0, 0);

    // Event icon (large emoji at top)
    const iconText = this.add.text(centerX, centerY - 160, event.icon, {
      fontSize: '96px',
      fontFamily: 'Arial',
    });
    iconText.setOrigin(0.5);
    iconText.setAlpha(0);

    // Event name (large yellow text)
    const nameText = this.add.text(centerX, centerY - 60, event.name, {
      fontSize: '32px',
      fontFamily: 'Arial',
      color: `#${this.COLOR_YELLOW.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 700 },
    });
    nameText.setOrigin(0.5);
    nameText.setAlpha(0);

    // Event description
    const descText = this.add.text(centerX, centerY + 10, event.description, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: `#${this.COLOR_WHITE.toString(16).padStart(6, '0')}`,
      align: 'center',
      wordWrap: { width: 600 },
    });
    descText.setOrigin(0.5);
    descText.setAlpha(0);

    // Animation sequence - icon
    this.tweens.add({
      targets: iconText,
      alpha: 1,
      scale: { from: 0.5, to: 1 },
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Animation - name
    this.tweens.add({
      targets: nameText,
      alpha: 1,
      y: centerY - 50,
      duration: 400,
      delay: 200,
      ease: 'Power2',
    });

    // Animation - description
    this.tweens.add({
      targets: descText,
      alpha: 1,
      duration: 400,
      delay: 500,
      ease: 'Power2',
    });

    // Branch: interactive choices vs auto-resolve
    const hasChoices = event.choices && event.choices.length > 0;

    if (hasChoices) {
      this.showChoices(event, centerX, centerY);
    } else {
      this.showAutoResolve(event, centerX, centerY);
    }
  }

  /**
   * Show interactive choice buttons for events with choices
   */
  private showChoices(event: GameEvent, centerX: number, centerY: number) {
    const choices = event.choices!;
    const btnWidth = 500;
    const btnHeight = 50;
    const btnGap = 12;
    const startY = centerY + 70;

    // Create choice buttons after description animation
    this.time.delayedCall(800, () => {
      choices.forEach((choice, index) => {
        const btnY = startY + index * (btnHeight + btnGap);

        // Button background
        const btnBg = this.add.rectangle(centerX, btnY, btnWidth, btnHeight, this.COLOR_PANEL);
        btnBg.setStrokeStyle(1, this.COLOR_BORDER);
        btnBg.setInteractive({ useHandCursor: true });
        btnBg.setAlpha(0);

        // Choice label (letter prefix)
        const prefix = String.fromCharCode(65 + index); // A, B, C...
        const btnText = this.add.text(
          centerX, btnY,
          `[${prefix}] ${choice.text}`,
          {
            fontSize: '18px',
            fontFamily: "'Consolas', 'Courier New', monospace",
            color: `#${this.COLOR_WHITE.toString(16).padStart(6, '0')}`,
            align: 'center',
            wordWrap: { width: btnWidth - 40 },
          }
        );
        btnText.setOrigin(0.5);
        btnText.setAlpha(0);

        // Fade in buttons
        this.tweens.add({
          targets: [btnBg, btnText],
          alpha: 1,
          duration: 300,
          delay: index * 100,
        });

        // Hover effects
        btnBg.on('pointerover', () => {
          if (!this.choiceMade) {
            btnBg.setFillStyle(this.COLOR_HOVER);
            btnBg.setStrokeStyle(2, this.COLOR_BLUE);
            btnText.setColor(`#${this.COLOR_BLUE.toString(16).padStart(6, '0')}`);
          }
        });

        btnBg.on('pointerout', () => {
          if (!this.choiceMade) {
            btnBg.setFillStyle(this.COLOR_PANEL);
            btnBg.setStrokeStyle(1, this.COLOR_BORDER);
            btnText.setColor(`#${this.COLOR_WHITE.toString(16).padStart(6, '0')}`);
          }
        });

        // Click handler
        btnBg.on('pointerdown', () => {
          if (!this.choiceMade) {
            this.choiceMade = true;
            this.handleChoice(choice, event, centerX, centerY, choices, index);
          }
        });

        // Keyboard shortcut (1-based number or A/B/C)
        const keyNum = `keydown-${index + 1}`;
        const keyLetter = `keydown-${prefix}`;
        this.input.keyboard?.on(keyNum, () => {
          if (!this.choiceMade) {
            this.choiceMade = true;
            this.handleChoice(choice, event, centerX, centerY, choices, index);
          }
        });
        this.input.keyboard?.on(keyLetter, () => {
          if (!this.choiceMade) {
            this.choiceMade = true;
            this.handleChoice(choice, event, centerX, centerY, choices, index);
          }
        });
      });
    });
  }

  /**
   * Handle a player's choice selection
   */
  private handleChoice(
    choice: EventChoice,
    event: GameEvent,
    centerX: number,
    centerY: number,
    allChoices: EventChoice[],
    selectedIndex: number
  ) {
    // Apply choice effects to returnData
    this.applyChoiceEffects(choice.effects);

    // Flash effect
    const color = this.getChoiceEffectColor(choice);
    this.applyEffectAnimation(color, this.isPositiveChoice(choice));

    // Fade out all buttons
    this.children.each((child: Phaser.GameObjects.GameObject) => {
      if (child instanceof Phaser.GameObjects.Rectangle && child !== this.children.first) {
        this.tweens.add({ targets: child, alpha: 0, duration: 200 });
      }
    });

    // Show result text
    const resultY = centerY + 90;
    const resultText = this.add.text(centerX, resultY, choice.resultText, {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: `#${color.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 600 },
    });
    resultText.setOrigin(0.5);
    resultText.setAlpha(0);

    this.tweens.add({
      targets: resultText,
      alpha: 1,
      scale: { from: 1.2, to: 1 },
      duration: 500,
      delay: 300,
      ease: 'Back.easeOut',
    });

    // Show continue prompt
    const continueBtn = this.add.text(centerX, resultY + 60, 'Click to Continue', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: `#${this.COLOR_BLUE.toString(16).padStart(6, '0')}`,
      fontStyle: 'italic',
    });
    continueBtn.setOrigin(0.5);
    continueBtn.setAlpha(0);

    this.tweens.add({
      targets: continueBtn,
      alpha: 1,
      duration: 300,
      delay: 800,
      onComplete: () => {
        this.canSkip = true;
      },
    });

    // Pulse continue button
    this.tweens.add({
      targets: continueBtn,
      alpha: 0.5,
      duration: 800,
      delay: 1100,
      yoyo: true,
      repeat: -1,
    });

    // Auto-advance after 4 seconds
    this.autoAdvanceTimer = this.time.delayedCall(4000, () => {
      this.transitionToNextScene();
    });

    // Enable click/keyboard to continue
    this.input.on('pointerdown', () => {
      if (this.canSkip) {
        if (this.autoAdvanceTimer) this.autoAdvanceTimer.remove();
        this.transitionToNextScene();
      }
    });
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.canSkip) {
        if (this.autoAdvanceTimer) this.autoAdvanceTimer.remove();
        this.transitionToNextScene();
      }
    });
    this.input.keyboard?.on('keydown-ENTER', () => {
      if (this.canSkip) {
        if (this.autoAdvanceTimer) this.autoAdvanceTimer.remove();
        this.transitionToNextScene();
      }
    });
  }

  /**
   * Apply choice effects to the returnData (player stats, techDebt, gold, exp)
   */
  private applyChoiceEffects(effects: EventEffect[]) {
    if (!this.eventData) return;
    const rd = this.eventData.returnData;

    for (const effect of effects) {
      switch (effect.type) {
        case 'heal':
          if (effect.target === 'player' && effect.stat === 'HP') {
            const maxHP = rd.player?.maxHP ?? rd.player?.HP ?? 100;
            const healing = Math.floor(maxHP * (effect.value / 100));
            if (rd.player) {
              rd.player.currentHP = Math.min(maxHP, (rd.player.currentHP ?? rd.player.HP ?? maxHP) + healing);
            }
          }
          break;

        case 'damage':
          if (effect.target === 'player' && effect.stat === 'HP') {
            const maxHP = rd.player?.maxHP ?? rd.player?.HP ?? 100;
            const damage = Math.floor(maxHP * (effect.value / 100));
            if (rd.player) {
              rd.player.currentHP = Math.max(1, (rd.player.currentHP ?? rd.player.HP ?? maxHP) - damage);
            }
          }
          break;

        case 'techDebt':
          if (rd.techDebtCarry !== undefined) {
            rd.techDebtCarry += effect.value;
          } else {
            rd.techDebtCarry = effect.value;
          }
          break;

        case 'gold':
          if (effect.multiplier) {
            rd.goldMultiplier = effect.value;
          } else if (rd.player) {
            rd.player.gold = (rd.player.gold ?? 0) + effect.value;
          }
          break;

        case 'exp':
          if (rd.player) {
            rd.player.exp = (rd.player.exp ?? 0) + effect.value;
          }
          break;

        case 'buff':
        case 'debuff':
          // Buffs/debuffs carry through as event effects for BattleScene to apply
          if (!rd.eventEffects) rd.eventEffects = [];
          rd.eventEffects.push({
            stat: effect.stat,
            modifier: effect.type === 'buff' ? effect.value : -effect.value,
            duration: effect.duration ?? 3,
            type: effect.type,
          });
          break;
      }
    }
  }

  /**
   * Show auto-resolve event (no player choices)
   */
  private showAutoResolve(event: GameEvent, centerX: number, centerY: number) {
    // Apply effects via EventSystem (non-interactive events)
    const color = this.getEffectColor(event);

    // Flash effect
    this.time.delayedCall(900, () => {
      this.applyEffectAnimation(color, this.isPositiveEvent(event));
    });

    // Result text
    const resultText = this.add.text(centerX, centerY + 100, event.resultText, {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: `#${color.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 600 },
    });
    resultText.setOrigin(0.5);
    resultText.setAlpha(0);

    this.tweens.add({
      targets: resultText,
      alpha: 1,
      scale: { from: 1.2, to: 1 },
      duration: 500,
      delay: 1200,
      ease: 'Back.easeOut',
    });

    // Continue button
    const continueBtn = this.add.text(centerX, centerY + 180, 'Click to Continue', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: `#${this.COLOR_BLUE.toString(16).padStart(6, '0')}`,
      fontStyle: 'italic',
    });
    continueBtn.setOrigin(0.5);
    continueBtn.setAlpha(0);

    this.tweens.add({
      targets: continueBtn,
      alpha: 1,
      duration: 300,
      delay: 1700,
      onComplete: () => {
        this.canSkip = true;
      },
    });

    // Pulse
    this.tweens.add({
      targets: continueBtn,
      alpha: 0.5,
      duration: 800,
      delay: 2000,
      yoyo: true,
      repeat: -1,
    });

    // Auto-advance after 5 seconds
    this.autoAdvanceTimer = this.time.delayedCall(5000, () => {
      this.transitionToNextScene();
    });

    // Click/touch to skip
    this.input.on('pointerdown', () => {
      if (this.canSkip) {
        if (this.autoAdvanceTimer) this.autoAdvanceTimer.remove();
        this.transitionToNextScene();
      }
    });

    // Keyboard skip
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.canSkip) {
        if (this.autoAdvanceTimer) this.autoAdvanceTimer.remove();
        this.transitionToNextScene();
      }
    });
    this.input.keyboard?.on('keydown-ENTER', () => {
      if (this.canSkip) {
        if (this.autoAdvanceTimer) this.autoAdvanceTimer.remove();
        this.transitionToNextScene();
      }
    });
  }

  /**
   * Apply visual effect animation
   */
  private applyEffectAnimation(color: number, isPositive: boolean) {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Flash
    const flash = this.add.rectangle(
      centerX, centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      color, 0.6
    );
    flash.setDepth(100);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => flash.destroy(),
    });

    // Particles for positive effects
    if (isPositive) {
      this.createParticles(centerX, centerY, color);
    }
  }

  /**
   * Create particle burst effect
   */
  private createParticles(x: number, y: number, color: number) {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const particle = this.add.circle(x, y, 4, color);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * 100,
        y: y + Math.sin(angle) * 100,
        alpha: 0,
        duration: 800,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  /**
   * Get color for auto-resolve event effects
   */
  private getEffectColor(event: GameEvent): number {
    const effectTypes = event.effects.map((e) => e.type);
    if (effectTypes.includes('buff')) return this.COLOR_GREEN;
    if (effectTypes.includes('heal')) return this.COLOR_GREEN;
    if (effectTypes.includes('debuff')) return this.COLOR_RED;
    if (effectTypes.includes('damage')) return this.COLOR_RED;
    if (effectTypes.includes('gold')) return this.COLOR_YELLOW;
    if (effectTypes.includes('techDebt')) return this.COLOR_PURPLE;
    return this.COLOR_BLUE;
  }

  /**
   * Get color for a choice's effects
   */
  private getChoiceEffectColor(choice: EventChoice): number {
    const effectTypes = choice.effects.map((e) => e.type);
    if (effectTypes.includes('exp')) return this.COLOR_GREEN;
    if (effectTypes.includes('heal')) return this.COLOR_GREEN;
    if (effectTypes.includes('buff')) return this.COLOR_GREEN;
    if (effectTypes.includes('gold')) return this.COLOR_YELLOW;
    if (effectTypes.includes('damage')) return this.COLOR_RED;
    if (effectTypes.includes('debuff')) return this.COLOR_RED;
    if (effectTypes.includes('techDebt')) {
      // Negative techDebt = reduction = good
      const tdEffect = choice.effects.find((e) => e.type === 'techDebt');
      if (tdEffect && tdEffect.value < 0) return this.COLOR_GREEN;
      return this.COLOR_PURPLE;
    }
    return this.COLOR_BLUE;
  }

  /**
   * Check if auto-resolve event is positive
   */
  private isPositiveEvent(event: GameEvent): boolean {
    const effectTypes = event.effects.map((e) => e.type);
    return (
      effectTypes.includes('buff') ||
      effectTypes.includes('heal') ||
      effectTypes.includes('gold')
    );
  }

  /**
   * Check if a choice outcome is positive
   */
  private isPositiveChoice(choice: EventChoice): boolean {
    const effectTypes = choice.effects.map((e) => e.type);
    if (effectTypes.includes('heal') || effectTypes.includes('buff') || effectTypes.includes('exp')) return true;
    if (effectTypes.includes('gold')) return true;
    if (effectTypes.includes('techDebt')) {
      const td = choice.effects.find((e) => e.type === 'techDebt');
      if (td && td.value < 0) return true;
    }
    return false;
  }

  /**
   * Transition to next scene
   */
  private transitionToNextScene() {
    if (!this.eventData) return;
    const { returnScene, returnData } = this.eventData;

    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(returnScene, returnData);
    });
  }

  shutdown() {
    if (this.autoAdvanceTimer) {
      this.autoAdvanceTimer.remove();
    }
    this.input.keyboard?.off('keydown-SPACE');
    this.input.keyboard?.off('keydown-ENTER');
    this.input.keyboard?.off('keydown-1');
    this.input.keyboard?.off('keydown-2');
    this.input.keyboard?.off('keydown-3');
    this.input.keyboard?.off('keydown-A');
    this.input.keyboard?.off('keydown-B');
    this.input.keyboard?.off('keydown-C');
    this.input.off('pointerdown');
  }
}
