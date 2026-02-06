/**
 * EventScene - Random Event Display
 *
 * Displays random events that occur between battle stages.
 * Shows event description, animates effects, and transitions back to battle.
 */

import Phaser from 'phaser';
import { GameEvent } from '../systems/EventSystem';

export interface EventSceneData {
  event: GameEvent;
  returnScene: string;
  returnData: any;
}

export class EventScene extends Phaser.Scene {
  private eventData?: EventSceneData;
  private canSkip: boolean = false;
  private autoAdvanceTimer?: Phaser.Time.TimerEvent;

  // VS Code Dark+ colors
  private readonly COLOR_BG = 0x1e1e1e;
  private readonly COLOR_YELLOW = 0xdcdcaa;
  private readonly COLOR_WHITE = 0xffffff;
  private readonly COLOR_BLUE = 0x4a90e2;
  private readonly COLOR_GREEN = 0x4ec9b0;
  private readonly COLOR_RED = 0xf48771;
  private readonly COLOR_PURPLE = 0xc586c0;

  constructor() {
    super({ key: 'EventScene' });
  }

  init(data: EventSceneData) {
    this.eventData = data;
    this.canSkip = false;
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
      0,
      0,
      this.cameras.main.width,
      this.cameras.main.height,
      this.COLOR_BG,
      0.95
    );
    overlay.setOrigin(0, 0);

    // Event icon (large emoji at top)
    const iconText = this.add.text(centerX, centerY - 150, event.icon, {
      fontSize: '96px',
      fontFamily: 'Arial',
    });
    iconText.setOrigin(0.5);
    iconText.setAlpha(0);

    // Event name (large yellow text)
    const nameText = this.add.text(centerX, centerY - 50, event.name, {
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
    const descText = this.add.text(centerX, centerY + 20, event.description, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: `#${this.COLOR_WHITE.toString(16).padStart(6, '0')}`,
      align: 'center',
      wordWrap: { width: 600 },
    });
    descText.setOrigin(0.5);
    descText.setAlpha(0);

    // Result text (initially hidden)
    const resultText = this.add.text(centerX, centerY + 100, event.resultText, {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: `#${this.getEffectColor(event).toString(16).padStart(6, '0')}`,
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 600 },
    });
    resultText.setOrigin(0.5);
    resultText.setAlpha(0);

    // Continue button (initially hidden)
    const continueBtn = this.add.text(centerX, centerY + 180, 'Click to Continue', {
      fontSize: '18px',
      fontFamily: 'Arial',
      color: `#${this.COLOR_BLUE.toString(16).padStart(6, '0')}`,
      fontStyle: 'italic',
    });
    continueBtn.setOrigin(0.5);
    continueBtn.setAlpha(0);

    // Animation sequence
    this.tweens.add({
      targets: iconText,
      alpha: 1,
      scale: { from: 0.5, to: 1 },
      duration: 300,
      ease: 'Back.easeOut',
    });

    this.tweens.add({
      targets: nameText,
      alpha: 1,
      y: centerY - 40,
      duration: 400,
      delay: 200,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: descText,
      alpha: 1,
      duration: 400,
      delay: 500,
      ease: 'Power2',
    });

    // Flash effect based on event type
    this.time.delayedCall(900, () => {
      this.applyEffectAnimation(event);
    });

    // Show result text with animation
    this.tweens.add({
      targets: resultText,
      alpha: 1,
      scale: { from: 1.2, to: 1 },
      duration: 500,
      delay: 1200,
      ease: 'Back.easeOut',
    });

    // Show continue button
    this.tweens.add({
      targets: continueBtn,
      alpha: 1,
      duration: 300,
      delay: 1700,
      onComplete: () => {
        this.canSkip = true;
      },
    });

    // Pulse continue button
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
        if (this.autoAdvanceTimer) {
          this.autoAdvanceTimer.remove();
        }
        this.transitionToNextScene();
      }
    });

    // Keyboard skip (Space or Enter)
    this.input.keyboard?.on('keydown-SPACE', () => {
      if (this.canSkip) {
        if (this.autoAdvanceTimer) {
          this.autoAdvanceTimer.remove();
        }
        this.transitionToNextScene();
      }
    });

    this.input.keyboard?.on('keydown-ENTER', () => {
      if (this.canSkip) {
        if (this.autoAdvanceTimer) {
          this.autoAdvanceTimer.remove();
        }
        this.transitionToNextScene();
      }
    });
  }

  /**
   * Apply visual effect animation based on event type
   */
  private applyEffectAnimation(event: GameEvent) {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    const color = this.getEffectColor(event);

    // Create flash effect
    const flash = this.add.rectangle(
      centerX,
      centerY,
      this.cameras.main.width,
      this.cameras.main.height,
      color,
      0.6
    );
    flash.setDepth(100);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 600,
      ease: 'Power2',
      onComplete: () => {
        flash.destroy();
      },
    });

    // Create particles for positive effects
    if (this.isPositiveEvent(event)) {
      this.createParticles(centerX, centerY, color);
    }
  }

  /**
   * Create particle effect
   */
  private createParticles(x: number, y: number, color: number) {
    const particles: Phaser.GameObjects.Arc[] = [];

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const particle = this.add.circle(x, y, 4, color);
      particles.push(particle);

      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * 100,
        y: y + Math.sin(angle) * 100,
        alpha: 0,
        duration: 800,
        ease: 'Power2',
        onComplete: () => {
          particle.destroy();
        },
      });
    }
  }

  /**
   * Get color for event effect
   */
  private getEffectColor(event: GameEvent): number {
    // Check effect types to determine color
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
   * Check if event is positive
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
   * Transition to next scene
   */
  private transitionToNextScene() {
    if (!this.eventData) return;

    const { returnScene, returnData } = this.eventData;

    // Fade out
    this.cameras.main.fadeOut(300, 0, 0, 0);

    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(returnScene, returnData);
    });
  }

  shutdown() {
    // Clean up
    if (this.autoAdvanceTimer) {
      this.autoAdvanceTimer.remove();
    }
    this.input.keyboard?.off('keydown-SPACE');
    this.input.keyboard?.off('keydown-ENTER');
    this.input.off('pointerdown');
  }
}
