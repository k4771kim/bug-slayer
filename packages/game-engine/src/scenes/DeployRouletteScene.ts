import Phaser from 'phaser'

/**
 * Deploy Roulette Scene Data Interface
 */
export interface DeployRouletteSceneData {
  returnScene: string;
  returnData?: Record<string, unknown>;
  player?: { gold: number; currentHP: number; stats: { HP: number } };
}

// VS Code Dark+ palette (same as MinigameScene)
const C = {
  bg: 0x1e1e1e,
  bgElevated: 0x2d2d30,
  bgSecondary: 0x252526,
  border: 0x3e3e42,
  text: '#d4d4d4',
  textMuted: '#858585',
  blue: '#569cd6',
  blueHex: 0x569cd6,
  green: '#4ec9b0',
  greenHex: 0x4ec9b0,
  yellow: '#dcdcaa',
  yellowHex: 0xdcdcaa,
  red: '#f48771',
  redHex: 0xf48771,
  pink: '#c586c0',
  orange: '#ce9178',
  orangeHex: 0xce9178,
  white: '#ffffff',
  selection: 0x264f78,
} as const;

// Roulette outcomes
type RouletteOutcome = 'SUCCESS' | 'ROLLBACK' | 'SERVER_CRASH' | 'AWS_BILL';

interface RouletteSlot {
  outcome: RouletteOutcome;
  label: string;
  color: string;
  colorHex: number;
  icon: string;
  description: string;
}

const SLOTS: RouletteSlot[] = [
  { outcome: 'SUCCESS', label: 'SUCCESS', color: '#4ec9b0', colorHex: 0x4ec9b0, icon: '✓', description: 'Deploy successful! Boss takes 30% HP damage!' },
  { outcome: 'ROLLBACK', label: 'ROLLBACK', color: '#dcdcaa', colorHex: 0xdcdcaa, icon: '↺', description: 'Rolled back. Nothing happens.' },
  { outcome: 'SERVER_CRASH', label: 'SERVER CRASH', color: '#f48771', colorHex: 0xf48771, icon: '✗', description: 'Server crashed! You take 15% HP damage!' },
  { outcome: 'AWS_BILL', label: 'AWS BILL', color: '#ce9178', colorHex: 0xce9178, icon: '$', description: 'Surprise bill! -500 Gold' },
];

/**
 * DeployRouletteScene - "Deploy Roulette" minigame
 *
 * Spin the roulette to deploy to production!
 * 4 outcomes: SUCCESS (boss damage), ROLLBACK (no effect),
 * SERVER_CRASH (player damage), AWS_BILL (gold penalty)
 *
 * Friday deployments have worse odds (lower SUCCESS rate)
 */
export class DeployRouletteScene extends Phaser.Scene {
  private sceneData?: DeployRouletteSceneData;
  private currentOutcome?: RouletteOutcome;
  private spinning = false;
  private currentSlotIndex = 0;

  private rouletteSlots: Phaser.GameObjects.Container[] = [];
  private deployButton?: Phaser.GameObjects.Container;
  private resultPopup?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'DeployRouletteScene' });
  }

  init(data: DeployRouletteSceneData): void {
    this.sceneData = data;
    this.spinning = false;
    this.currentSlotIndex = 0;
    this.currentOutcome = undefined;
    this.rouletteSlots = [];
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Background
    this.add.rectangle(w / 2, h / 2, w, h, C.bg);

    // Title bar
    this.add.rectangle(w / 2, 25, w, 50, C.bgSecondary);
    this.add.text(w / 2, 25, 'DEPLOY ROULETTE', {
      fontSize: '28px',
      color: C.red,
      fontStyle: 'bold',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // Friday warning
    const isFriday = new Date().getDay() === 5;
    if (isFriday) {
      this.add.text(w / 2, 55, '⚠️ FRIDAY DEPLOY - REDUCED SUCCESS RATE ⚠️', {
        fontSize: '14px',
        color: C.orange,
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    }

    // Pipeline visualization
    this.createPipeline();

    // Roulette display
    this.createRoulette();

    // Deploy button
    this.createDeployButton();
  }

  private createPipeline(): void {
    const w = this.cameras.main.width;
    const startY = 80;
    const stages = ['Build', 'Test', 'Stage', 'Deploy'];
    const stageWidth = 120;
    const gap = 40;
    const totalWidth = stages.length * stageWidth + (stages.length - 1) * gap;
    const startX = (w - totalWidth) / 2;

    for (let i = 0; i < stages.length; i++) {
      const x = startX + i * (stageWidth + gap);
      const stageName = stages[i]!;

      // Stage box
      this.add.rectangle(x + stageWidth / 2, startY, stageWidth, 40, C.bgElevated)
        .setStrokeStyle(2, C.blueHex);

      this.add.text(x + stageWidth / 2, startY, stageName, {
        fontSize: '16px',
        color: C.blue,
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      // Arrow to next stage
      if (i < stages.length - 1) {
        const arrowX = x + stageWidth + gap / 2;
        const arrowChar = '\u2192'; // Right arrow unicode
        this.add.text(arrowX, startY, arrowChar, {
          fontSize: '24px',
          color: C.textMuted,
          fontFamily: 'monospace',
        }).setOrigin(0.5);
      }
    }
  }

  private createRoulette(): void {
    const w = this.cameras.main.width;
    const centerY = 240;
    const slotWidth = 160;
    const slotHeight = 100;
    const gap = 20;
    const totalWidth = SLOTS.length * slotWidth + (SLOTS.length - 1) * gap;
    const startX = (w - totalWidth) / 2;

    for (let i = 0; i < SLOTS.length; i++) {
      const slot = SLOTS[i]!;
      const x = startX + i * (slotWidth + gap);

      const container = this.add.container(x, centerY);

      // Slot background
      const bg = this.add.rectangle(slotWidth / 2, slotHeight / 2, slotWidth, slotHeight, C.bgElevated)
        .setStrokeStyle(2, C.border);
      container.add(bg);

      // Icon
      const icon = this.add.text(slotWidth / 2, slotHeight / 2 - 20, slot.icon, {
        fontSize: '32px',
        color: slot.color,
        fontFamily: 'monospace',
      }).setOrigin(0.5);
      container.add(icon);

      // Label
      const label = this.add.text(slotWidth / 2, slotHeight / 2 + 20, slot.label, {
        fontSize: '12px',
        color: slot.color,
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add(label);

      this.rouletteSlots.push(container);
    }

    // Info text
    this.add.text(w / 2, centerY + slotHeight + 30, 'Click DEPLOY to spin the roulette!', {
      fontSize: '16px',
      color: C.textMuted,
      fontFamily: 'monospace',
    }).setOrigin(0.5);
  }

  private createDeployButton(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const btnY = h - 80;

    const container = this.add.container(w / 2, btnY);

    const bg = this.add.rectangle(0, 0, 200, 50, C.redHex, 0.8)
      .setStrokeStyle(2, C.redHex)
      .setInteractive({ useHandCursor: true });
    container.add(bg);

    const text = this.add.text(0, 0, 'DEPLOY', {
      fontSize: '24px',
      color: C.white,
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(text);

    bg.on('pointerover', () => {
      if (!this.spinning) {
        bg.setFillStyle(C.redHex, 1);
      }
    });
    bg.on('pointerout', () => {
      if (!this.spinning) {
        bg.setFillStyle(C.redHex, 0.8);
      }
    });
    bg.on('pointerdown', () => {
      if (!this.spinning) {
        this.startSpin();
      }
    });

    this.deployButton = container;
  }

  private startSpin(): void {
    this.spinning = true;
    this.currentSlotIndex = 0;

    // Hide deploy button
    if (this.deployButton) {
      this.deployButton.setVisible(false);
    }

    // Determine outcome
    this.currentOutcome = this.spinRoulette();

    // Animation phases - use recursive delayed calls for variable speed
    const targetIndex = SLOTS.findIndex(s => s.outcome === this.currentOutcome);
    this.animateSpin(0, 20, targetIndex);
  }

  private animateSpin(spinCount: number, maxSpins: number, targetIndex: number): void {
    // Clear previous highlight
    this.clearHighlight();

    // Move to next slot
    this.currentSlotIndex = (this.currentSlotIndex + 1) % SLOTS.length;

    // Highlight current slot
    this.highlightSlot(this.currentSlotIndex, false);

    spinCount++;

    // Calculate delay for next spin (deceleration)
    let nextDelay = 50; // Base speed
    if (spinCount > maxSpins - 5) {
      // Slow down in last 5 spins
      nextDelay = 100 + (spinCount - (maxSpins - 5)) * 100;
    }

    // Stop on target
    if (spinCount >= maxSpins) {
      this.currentSlotIndex = targetIndex;
      this.clearHighlight();
      this.highlightSlot(this.currentSlotIndex, true);
      this.time.delayedCall(500, () => this.showResult());
    } else {
      // Continue spinning
      this.time.delayedCall(nextDelay, () => {
        this.animateSpin(spinCount, maxSpins, targetIndex);
      });
    }
  }

  private highlightSlot(index: number, flash: boolean): void {
    const container = this.rouletteSlots[index];
    if (!container) return;

    const bg = container.list[0] as Phaser.GameObjects.Rectangle;
    const slot = SLOTS[index]!;

    if (flash) {
      // Final flash effect
      bg.setStrokeStyle(4, slot.colorHex);
      bg.setFillStyle(slot.colorHex, 0.3);

      this.tweens.add({
        targets: bg,
        alpha: { from: 1, to: 0.5 },
        yoyo: true,
        repeat: 2,
        duration: 200,
      });
    } else {
      // Regular highlight during spin
      bg.setStrokeStyle(3, slot.colorHex);
    }
  }

  private clearHighlight(): void {
    for (let i = 0; i < this.rouletteSlots.length; i++) {
      const container = this.rouletteSlots[i];
      if (!container) continue;

      const bg = container.list[0] as Phaser.GameObjects.Rectangle;
      bg.setStrokeStyle(2, C.border);
      bg.setFillStyle(C.bgElevated);
      bg.setAlpha(1);
    }
  }

  private showResult(): void {
    if (!this.currentOutcome) return;

    const slot = SLOTS.find(s => s.outcome === this.currentOutcome)!;
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Apply outcome effects
    this.applyOutcome(this.currentOutcome);
    this.trackAchievement(this.currentOutcome);

    // Create result popup
    const container = this.add.container(w / 2, h / 2);

    // Semi-transparent overlay
    const overlay = this.add.rectangle(0, 0, w, h, 0x000000, 0.7);
    overlay.setOrigin(0.5);
    container.add(overlay);

    // Popup panel
    const panelWidth = 500;
    const panelHeight = 280;
    const panel = this.add.rectangle(0, 0, panelWidth, panelHeight, C.bgElevated)
      .setStrokeStyle(3, slot.colorHex);
    container.add(panel);

    // Outcome title
    const title = this.add.text(0, -panelHeight / 2 + 40, slot.label, {
      fontSize: '32px',
      color: slot.color,
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(title);

    // Icon
    const icon = this.add.text(0, -30, slot.icon, {
      fontSize: '64px',
      color: slot.color,
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    container.add(icon);

    // Description
    const desc = this.add.text(0, 50, slot.description, {
      fontSize: '16px',
      color: C.text,
      fontFamily: 'monospace',
      wordWrap: { width: panelWidth - 40 },
      align: 'center',
    }).setOrigin(0.5);
    container.add(desc);

    // Achievement notification (if unlocked)
    if (this.data.get('achievementUnlocked')) {
      const achievementText = this.add.text(0, 90, '🏆 Friday Deploy Survivor! +5000 Gold!', {
        fontSize: '14px',
        color: C.yellow,
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      container.add(achievementText);
    }

    // Continue button
    const btnBg = this.add.rectangle(0, panelHeight / 2 - 35, 180, 45, C.blueHex, 0.8)
      .setStrokeStyle(2, C.blueHex)
      .setInteractive({ useHandCursor: true });
    container.add(btnBg);

    const btnText = this.add.text(0, panelHeight / 2 - 35, 'Continue', {
      fontSize: '18px',
      color: C.white,
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    container.add(btnText);

    btnBg.on('pointerover', () => btnBg.setFillStyle(C.blueHex, 1));
    btnBg.on('pointerout', () => btnBg.setFillStyle(C.blueHex, 0.8));
    btnBg.on('pointerdown', () => this.exitScene());

    // Entrance animation
    container.setAlpha(0).setScale(0.8);
    this.tweens.add({
      targets: container,
      alpha: 1,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
    });

    // Flash effect
    const flash = this.add.rectangle(w / 2, h / 2, w, h, slot.colorHex, 0.2);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 500,
      onComplete: () => flash.destroy(),
    });

    // Camera shake for negative outcomes
    if (this.currentOutcome === 'SERVER_CRASH' || this.currentOutcome === 'AWS_BILL') {
      this.cameras.main.shake(300, 0.008);
    }

    this.resultPopup = container;

    // Keyboard shortcuts
    this.input.keyboard?.once('keydown-ENTER', () => this.exitScene());
    this.input.keyboard?.once('keydown-SPACE', () => this.exitScene());
  }

  private getWeights(): Record<RouletteOutcome, number> {
    const isFriday = new Date().getDay() === 5;
    return isFriday
      ? { SUCCESS: 15, ROLLBACK: 30, SERVER_CRASH: 30, AWS_BILL: 25 }
      : { SUCCESS: 25, ROLLBACK: 25, SERVER_CRASH: 25, AWS_BILL: 25 };
  }

  private spinRoulette(): RouletteOutcome {
    const weights = this.getWeights();
    const total = Object.values(weights).reduce((a, b) => a + b, 0);
    let random = Math.random() * total;

    for (const [outcome, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) return outcome as RouletteOutcome;
    }

    return 'ROLLBACK';
  }

  private applyOutcome(outcome: RouletteOutcome): void {
    switch (outcome) {
      case 'SUCCESS':
        this.data.set('bossDamagePercent', 30);
        this.data.set('success', true);
        break;

      case 'ROLLBACK':
        this.data.set('success', false);
        this.data.set('noEffect', true);
        break;

      case 'SERVER_CRASH':
        // Apply 15% HP damage to player
        if (this.sceneData?.player) {
          const dmg = Math.floor(this.sceneData.player.stats.HP * 0.15);
          this.data.set('playerDamage', dmg);
        }
        this.data.set('success', false);
        break;

      case 'AWS_BILL':
        this.data.set('goldPenalty', 500);
        this.data.set('success', false);
        break;
    }
  }

  private trackAchievement(outcome: RouletteOutcome): void {
    const isFriday = new Date().getDay() === 5;
    if (!isFriday) return;

    const key = 'deploy-roulette-friday-streak';
    const streak = parseInt(localStorage.getItem(key) || '0', 10);

    if (outcome === 'SUCCESS') {
      const newStreak = streak + 1;
      localStorage.setItem(key, String(newStreak));
      if (newStreak >= 3) {
        // Achievement unlocked: "Friday Deploy Survivor"
        this.data.set('achievementUnlocked', true);
        this.data.set('achievementGold', 5000);
      }
    } else {
      localStorage.setItem(key, '0'); // Reset streak
    }
  }

  private exitScene(): void {
    const returnScene = this.sceneData?.returnScene || 'DungeonSelectScene';
    const returnData = this.sceneData?.returnData || {};

    this.scene.start(returnScene, {
      ...returnData,
      deployRouletteResult: {
        outcome: this.currentOutcome,
        bossDamagePercent: this.data.get('bossDamagePercent') || 0,
        playerDamage: this.data.get('playerDamage') || 0,
        goldPenalty: this.data.get('goldPenalty') || 0,
        noEffect: this.data.get('noEffect') || false,
        achievementUnlocked: this.data.get('achievementUnlocked') || false,
        achievementGold: this.data.get('achievementGold') || 0,
      },
    });
  }
}
