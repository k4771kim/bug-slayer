import Phaser from 'phaser';
import type { Character, Monster } from '@bug-slayer/shared';

/**
 * TutorialScene - Guided first-combat experience
 *
 * Provides a step-by-step tutorial for new players:
 * 1. Welcome message
 * 2. Tutorial bug (weakened NullPointerException)
 * 3. Combat basics with highlighted actions
 * 4. Victory and transition to DungeonSelectScene
 */
export class TutorialScene extends Phaser.Scene {
  private tutorialStep = 0;
  private highlightRect?: Phaser.GameObjects.Rectangle;
  private highlightTween?: Phaser.Tweens.Tween;
  private tutorialText?: Phaser.GameObjects.Text;
  private arrowGraphics?: Phaser.GameObjects.Graphics;
  private overlay?: Phaser.GameObjects.Rectangle;

  private playerData?: Character;
  private tutorialBug?: Monster;

  private playerHPBar?: Phaser.GameObjects.Rectangle;
  private playerMPBar?: Phaser.GameObjects.Rectangle;
  private bugHPBar?: Phaser.GameObjects.Rectangle;

  private attackButton?: Phaser.GameObjects.Container;
  private skillButton?: Phaser.GameObjects.Container;
  private focusButton?: Phaser.GameObjects.Container;
  private itemButton?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'TutorialScene' });
  }

  create(data?: { party: Character[] }) {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Get player data from passed party
    if (data?.party && data.party.length > 0) {
      this.playerData = data.party[0];
    } else {
      // Fallback: create a default character
      this.playerData = {
        id: 'player-1',
        name: 'Tutorial Player',
        class: 'Debugger',
        level: 1,
        exp: 0,
        gold: 0,
        stats: { HP: 100, ATK: 15, DEF: 8, SPD: 12, MP: 50 },
        currentHP: 100,
        currentMP: 50,
        skills: [],
        equipment: {},
        inventory: []
      };
    }

    // Create tutorial bug (weakened NullPointerException)
    this.tutorialBug = {
      id: 'tutorial-nullpointer',
      name: 'NullPointerException',
      type: 'bug',
      chapter: 1,
      stats: { HP: 50, ATK: 8, DEF: 3, SPD: 8 },
      currentHP: 50,
      behaviorTree: {
        conditions: [],
        actions: [{ type: 'attack', weight: 100 }]
      },
      drops: {
        items: [],
        exp: 25,
        gold: 10
      },
      techDebtOnSkip: 5
    };

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1e1e1e);

    // Create battle layout
    this.createBattleLayout();

    // Create action buttons
    this.createActionButtons();

    // Start tutorial
    this.startTutorial();

    // Skip tutorial button
    this.createSkipButton();
  }

  private createBattleLayout(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    if (!this.playerData || !this.tutorialBug) return;

    // Player side (left)
    const playerX = width * 0.25;
    const playerY = height * 0.5;

    // Player sprite placeholder (32x32 scaled 2x)
    const playerSprite = this.add.rectangle(playerX, playerY, 64, 64, 0x569cd6, 0.5);
    playerSprite.setStrokeStyle(2, 0x569cd6);

    // Player name
    this.add.text(playerX, playerY - 80, this.playerData.name, {
      fontSize: '18px',
      color: '#d4d4d4'
    }).setOrigin(0.5);

    // Player HP bar
    const hpBarWidth = 120;
    const hpBarHeight = 16;
    this.add.rectangle(playerX, playerY + 60, hpBarWidth, hpBarHeight, 0x3e3e42);
    this.playerHPBar = this.add.rectangle(
      playerX - hpBarWidth / 2,
      playerY + 60,
      hpBarWidth,
      hpBarHeight,
      0x4ec9b0
    ).setOrigin(0, 0.5);
    this.add.text(playerX, playerY + 60, `HP: ${this.playerData.currentHP}/${this.playerData.stats.HP}`, {
      fontSize: '12px',
      color: '#d4d4d4'
    }).setOrigin(0.5);

    // Player MP bar
    this.add.rectangle(playerX, playerY + 80, hpBarWidth, hpBarHeight, 0x3e3e42);
    this.playerMPBar = this.add.rectangle(
      playerX - hpBarWidth / 2,
      playerY + 80,
      hpBarWidth,
      hpBarHeight,
      0x569cd6
    ).setOrigin(0, 0.5);
    this.add.text(playerX, playerY + 80, `MP: ${this.playerData.currentMP}/${this.playerData.stats.MP}`, {
      fontSize: '12px',
      color: '#d4d4d4'
    }).setOrigin(0.5);

    // Bug side (right)
    const bugX = width * 0.75;
    const bugY = height * 0.4;

    // Bug sprite placeholder
    const bugSprite = this.add.rectangle(bugX, bugY, 64, 64, 0xf48771, 0.5);
    bugSprite.setStrokeStyle(2, 0xf48771);

    // Bug name
    this.add.text(bugX, bugY - 80, this.tutorialBug.name, {
      fontSize: '18px',
      color: '#f48771'
    }).setOrigin(0.5);

    // Bug HP bar
    this.add.rectangle(bugX, bugY + 60, hpBarWidth, hpBarHeight, 0x3e3e42);
    this.bugHPBar = this.add.rectangle(
      bugX - hpBarWidth / 2,
      bugY + 60,
      hpBarWidth,
      hpBarHeight,
      0xf48771
    ).setOrigin(0, 0.5);
    this.add.text(bugX, bugY + 60, `HP: ${this.tutorialBug.currentHP}/${this.tutorialBug.stats.HP}`, {
      fontSize: '12px',
      color: '#d4d4d4'
    }).setOrigin(0.5);
  }

  private createActionButtons(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const buttonY = height - 100;
    const buttonWidth = 120;
    const buttonHeight = 50;
    const gap = 20;

    const totalWidth = buttonWidth * 4 + gap * 3;
    const startX = (width - totalWidth) / 2 + buttonWidth / 2;

    // Attack button
    this.attackButton = this.createButton(
      startX,
      buttonY,
      buttonWidth,
      buttonHeight,
      'Attack',
      '#f48771',
      () => this.handleAction('attack')
    );

    // Skill button
    this.skillButton = this.createButton(
      startX + buttonWidth + gap,
      buttonY,
      buttonWidth,
      buttonHeight,
      'Skill',
      '#569cd6',
      () => this.handleAction('skill')
    );

    // Focus button
    this.focusButton = this.createButton(
      startX + (buttonWidth + gap) * 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      'Focus',
      '#dcdcaa',
      () => this.handleAction('focus')
    );

    // Item button
    this.itemButton = this.createButton(
      startX + (buttonWidth + gap) * 3,
      buttonY,
      buttonWidth,
      buttonHeight,
      'Item',
      '#4ec9b0',
      () => this.handleAction('item')
    );

    // Disable all buttons initially
    this.setButtonsEnabled(false);
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    color: string,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, width, height, parseInt(color.replace('#', '0x'), 16), 0.2);
    bg.setStrokeStyle(2, parseInt(color.replace('#', '0x'), 16));
    bg.setInteractive();

    const label = this.add.text(0, 0, text, {
      fontSize: '16px',
      color: color
    }).setOrigin(0.5);

    container.add([bg, label]);

    bg.on('pointerover', () => {
      if (bg.input?.enabled) {
        bg.setFillStyle(parseInt(color.replace('#', '0x'), 16), 0.4);
      }
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(parseInt(color.replace('#', '0x'), 16), 0.2);
    });

    bg.on('pointerdown', () => {
      if (bg.input?.enabled) {
        callback();
      }
    });

    return container;
  }

  private setButtonsEnabled(enabled: boolean): void {
    const buttons = [this.attackButton, this.skillButton, this.focusButton, this.itemButton];
    buttons.forEach(btn => {
      if (btn) {
        const bg = btn.list[0] as Phaser.GameObjects.Rectangle;
        if (bg.input) {
          bg.input.enabled = enabled;
        }
        btn.setAlpha(enabled ? 1 : 0.5);
      }
    });
  }

  private startTutorial(): void {
    this.tutorialStep = 0;
    this.showTutorialStep();
  }

  private showTutorialStep(): void {
    const width = this.cameras.main.width;

    // Clear previous highlights
    this.clearHighlight();

    switch (this.tutorialStep) {
      case 0:
        // Welcome message
        this.showTutorialMessage(
          "Welcome, Bug Slayer! Your first mission awaits.\n\nClick anywhere to continue...",
          width / 2,
          100
        );
        this.input.once('pointerdown', () => {
          this.tutorialStep++;
          this.showTutorialStep();
        });
        break;

      case 1:
        // Attack tutorial
        this.showTutorialMessage(
          "Click Attack to damage the bug!",
          width / 2,
          100
        );
        this.highlightButton(this.attackButton, '#f48771');
        this.enableButton(this.attackButton);
        break;

      case 2:
        // Skill tutorial
        this.showTutorialMessage(
          "Use a Skill for bonus damage!",
          width / 2,
          100
        );
        this.highlightButton(this.skillButton, '#569cd6');
        this.enableButton(this.skillButton);
        break;

      case 3:
        // Focus tutorial
        this.showTutorialMessage(
          "Focus restores MP and boosts your next attack!",
          width / 2,
          100
        );
        this.highlightButton(this.focusButton, '#dcdcaa');
        this.enableButton(this.focusButton);
        break;

      case 4:
        // Item tutorial
        this.showTutorialMessage(
          "Use items to heal when needed!",
          width / 2,
          100
        );
        this.highlightButton(this.itemButton, '#4ec9b0');
        this.enableButton(this.itemButton);
        break;

      case 5:
        // Final attack
        this.showTutorialMessage(
          "Finish it! Use any action to defeat the bug!",
          width / 2,
          100
        );
        this.setButtonsEnabled(true);
        break;
    }
  }

  private showTutorialMessage(message: string, x: number, y: number): void {
    if (this.tutorialText) {
      this.tutorialText.destroy();
    }

    this.tutorialText = this.add.text(x, y, message, {
      fontSize: '20px',
      color: '#dcdcaa',
      align: 'center',
      backgroundColor: '#2d2d30',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5);
  }

  private highlightButton(button?: Phaser.GameObjects.Container, color?: string): void {
    if (!button) return;

    const bounds = button.getBounds();

    // Create overlay to dim everything else
    this.overlay = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.5
    );
    this.overlay.setDepth(-1);

    // Create highlight rectangle
    this.highlightRect = this.add.rectangle(
      bounds.centerX,
      bounds.centerY,
      bounds.width + 20,
      bounds.height + 20
    );
    this.highlightRect.setStrokeStyle(4, parseInt((color || '#007acc').replace('#', '0x'), 16));
    this.highlightRect.setFillStyle(0x000000, 0);

    // Pulsing animation
    this.highlightTween = this.tweens.add({
      targets: this.highlightRect,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Arrow pointing to button
    this.arrowGraphics = this.add.graphics();
    this.arrowGraphics.lineStyle(3, parseInt((color || '#007acc').replace('#', '0x'), 16));
    this.arrowGraphics.beginPath();
    this.arrowGraphics.moveTo(bounds.centerX, bounds.top - 40);
    this.arrowGraphics.lineTo(bounds.centerX, bounds.top - 10);
    this.arrowGraphics.strokePath();

    // Arrow head
    this.arrowGraphics.fillStyle(parseInt((color || '#007acc').replace('#', '0x'), 16));
    this.arrowGraphics.fillTriangle(
      bounds.centerX, bounds.top - 10,
      bounds.centerX - 8, bounds.top - 20,
      bounds.centerX + 8, bounds.top - 20
    );
  }

  private clearHighlight(): void {
    if (this.highlightRect) {
      this.highlightRect.destroy();
      this.highlightRect = undefined;
    }
    if (this.highlightTween) {
      this.highlightTween.stop();
      this.highlightTween = undefined;
    }
    if (this.arrowGraphics) {
      this.arrowGraphics.destroy();
      this.arrowGraphics = undefined;
    }
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = undefined;
    }
  }

  private enableButton(button?: Phaser.GameObjects.Container): void {
    if (!button) return;

    const bg = button.list[0] as Phaser.GameObjects.Rectangle;
    if (bg.input) {
      bg.input.enabled = true;
    }
    button.setAlpha(1);
  }

  private handleAction(action: 'attack' | 'skill' | 'focus' | 'item'): void {
    if (!this.tutorialBug || !this.playerData) return;

    let damage = 0;
    let message = '';

    switch (action) {
      case 'attack':
        damage = Math.floor(this.playerData.stats.ATK * 0.8);
        message = `You dealt ${damage} damage!`;
        break;
      case 'skill':
        damage = Math.floor(this.playerData.stats.ATK * 1.5);
        message = `Skill hit for ${damage} damage!`;
        break;
      case 'focus':
        this.playerData.currentMP = Math.min(
          this.playerData.currentMP + Math.floor(this.playerData.stats.MP * 0.15),
          this.playerData.stats.MP
        );
        message = 'MP restored! Next attack boosted!';
        this.updatePlayerBars();
        break;
      case 'item':
        this.playerData.currentHP = Math.min(
          this.playerData.currentHP + 30,
          this.playerData.stats.HP
        );
        message = 'Healed 30 HP!';
        this.updatePlayerBars();
        break;
    }

    // Apply damage
    if (damage > 0) {
      this.tutorialBug.currentHP = Math.max(0, this.tutorialBug.currentHP - damage);
      this.updateBugBar();
    }

    // Show action result
    this.showFloatingText(message, this.cameras.main.width / 2, 200);

    // Check if bug is defeated
    if (this.tutorialBug.currentHP <= 0) {
      this.time.delayedCall(1000, () => {
        this.showVictory();
      });
      return;
    }

    // Disable buttons temporarily
    this.setButtonsEnabled(false);

    // Bug's turn (simple attack)
    this.time.delayedCall(1000, () => {
      this.bugTurn();
    });
  }

  private bugTurn(): void {
    if (!this.tutorialBug || !this.playerData) return;

    const damage = Math.floor(this.tutorialBug.stats.ATK * 0.5); // Reduced damage for tutorial
    this.playerData.currentHP = Math.max(0, this.playerData.currentHP - damage);
    this.updatePlayerBars();

    this.showFloatingText(`Bug attacked for ${damage} damage!`, this.cameras.main.width / 2, 200);

    // Continue tutorial
    this.time.delayedCall(1000, () => {
      this.tutorialStep++;
      this.showTutorialStep();
    });
  }

  private updatePlayerBars(): void {
    if (!this.playerData || !this.playerHPBar || !this.playerMPBar) return;

    const hpPercent = this.playerData.currentHP / this.playerData.stats.HP;
    const mpPercent = this.playerData.currentMP / this.playerData.stats.MP;

    this.playerHPBar.setScale(hpPercent, 1);
    this.playerMPBar.setScale(mpPercent, 1);
  }

  private updateBugBar(): void {
    if (!this.tutorialBug || !this.bugHPBar) return;

    const hpPercent = this.tutorialBug.currentHP / this.tutorialBug.stats.HP;
    this.bugHPBar.setScale(hpPercent, 1);
  }

  private showFloatingText(text: string, x: number, y: number): void {
    const floatingText = this.add.text(x, y, text, {
      fontSize: '24px',
      color: '#89d185',
      backgroundColor: '#1e1e1e',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5);

    this.tweens.add({
      targets: floatingText,
      y: y - 50,
      alpha: 0,
      duration: 1500,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        floatingText.destroy();
      }
    });
  }

  private showVictory(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Clear highlights
    this.clearHighlight();

    // Dim background
    const dimOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);

    // Victory message
    const victoryText = this.add.text(width / 2, height / 2 - 80, 'Victory!', {
      fontSize: '48px',
      color: '#89d185'
    }).setOrigin(0.5);

    // Tutorial complete message
    const completeText = this.add.text(
      width / 2,
      height / 2,
      "You're ready for the real dungeons!",
      {
        fontSize: '24px',
        color: '#dcdcaa'
      }
    ).setOrigin(0.5);

    // Rewards
    const rewardsText = this.add.text(
      width / 2,
      height / 2 + 50,
      '+25 EXP  +10 Gold',
      {
        fontSize: '18px',
        color: '#d4d4d4'
      }
    ).setOrigin(0.5);

    // Continue button
    const continueBtn = this.add.rectangle(width / 2, height / 2 + 120, 200, 50, 0x007acc, 0.3);
    continueBtn.setStrokeStyle(2, 0x007acc);
    continueBtn.setInteractive();

    const continueBtnText = this.add.text(width / 2, height / 2 + 120, 'Continue', {
      fontSize: '20px',
      color: '#007acc'
    }).setOrigin(0.5);

    continueBtn.on('pointerover', () => {
      continueBtn.setFillStyle(0x007acc, 0.6);
    });

    continueBtn.on('pointerout', () => {
      continueBtn.setFillStyle(0x007acc, 0.3);
    });

    continueBtn.on('pointerdown', () => {
      this.scene.start('DungeonSelectScene', {
        party: [this.playerData]
      });
    });
  }

  private createSkipButton(): void {
    const width = this.cameras.main.width;

    const skipBtn = this.add.text(width - 20, 20, 'Skip Tutorial', {
      fontSize: '14px',
      color: '#858585',
      backgroundColor: '#2d2d30',
      padding: { x: 10, y: 5 }
    }).setOrigin(1, 0);

    skipBtn.setInteractive();

    skipBtn.on('pointerover', () => {
      skipBtn.setColor('#d4d4d4');
    });

    skipBtn.on('pointerout', () => {
      skipBtn.setColor('#858585');
    });

    skipBtn.on('pointerdown', () => {
      this.scene.start('DungeonSelectScene', {
        party: [this.playerData]
      });
    });
  }
}
