import Phaser from 'phaser'
import type { Character, Monster } from '@bug-slayer/shared';

/**
 * TutorialScene - Guided first-combat experience
 *
 * 5-step tutorial teaching combat basics:
 * 0. Welcome
 * 1. Attack (highlight + arrow)
 * 2. Skills (highlight + arrow)
 * 3. Focus (highlight + arrow)
 * 4. Items (highlight + arrow)
 * 5. Free combat - finish the bug
 *
 * Transitions to ClassSelectScene when complete.
 */
export class TutorialScene extends Phaser.Scene {
  private tutorialStep = 0;
  private readonly TOTAL_STEPS = 5;

  // Highlight visuals
  private highlightRect?: Phaser.GameObjects.Rectangle;
  private highlightTween?: Phaser.Tweens.Tween;
  private arrowContainer?: Phaser.GameObjects.Container;
  private overlay?: Phaser.GameObjects.Rectangle;

  // Tutorial UI
  private messageBox?: Phaser.GameObjects.Container;
  private stepIndicator?: Phaser.GameObjects.Text;

  // Game state
  private playerData?: Character;
  private tutorialBug?: Monster;
  private focusActive = false;

  // HP/MP bar references
  private playerHPBar?: Phaser.GameObjects.Rectangle;
  private playerMPBar?: Phaser.GameObjects.Rectangle;
  private playerHPLabel?: Phaser.GameObjects.Text;
  private playerMPLabel?: Phaser.GameObjects.Text;
  private bugHPBar?: Phaser.GameObjects.Rectangle;
  private bugHPLabel?: Phaser.GameObjects.Text;

  // Action buttons
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

    // Reset state
    this.tutorialStep = 0;
    this.focusActive = false;

    // Player data from party or default
    if (data?.party && data.party.length > 0) {
      this.playerData = data.party[0];
    } else {
      this.playerData = {
        id: 'player-1',
        name: 'Recruit',
        class: 'Debugger',
        level: 1,
        exp: 0,
        gold: 0,
        stats: { HP: 100, ATK: 15, DEF: 8, SPD: 12, MP: 50 },
        currentHP: 100,
        currentMP: 50,
        skills: [],
        equipment: {},
        inventory: [],
      };
    }

    // Weakened tutorial bug
    this.tutorialBug = {
      id: 'tutorial-nullpointer',
      name: 'NullPointerException',
      type: 'bug',
      chapter: 1,
      stats: { HP: 50, ATK: 8, DEF: 3, SPD: 8 },
      currentHP: 50,
      behaviorTree: {
        conditions: [],
        actions: [{ type: 'attack', weight: 100 }],
      },
      drops: { items: [], exp: 25, gold: 10 },
      techDebtOnSkip: 5,
    };

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1e1e1e);

    // Build scene
    this.createBattleLayout();
    this.createActionButtons();
    this.createSkipButton();

    // Start tutorial
    this.showTutorialStep();
  }

  // ===========================================================================
  // Battle Layout
  // ===========================================================================

  private createBattleLayout(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    if (!this.playerData || !this.tutorialBug) return;

    const barWidth = 120;
    const barHeight = 14;

    // --- Player (left) ---
    const px = width * 0.25;
    const py = height * 0.45;

    const playerSprite = this.add.rectangle(px, py, 64, 64, 0x569cd6, 0.5);
    playerSprite.setStrokeStyle(2, 0x569cd6);

    this.add.text(px, py - 80, this.playerData.name, {
      fontSize: '18px', color: '#d4d4d4',
    }).setOrigin(0.5);

    // HP bar
    this.add.rectangle(px, py + 55, barWidth, barHeight, 0x3e3e42);
    this.playerHPBar = this.add.rectangle(
      px - barWidth / 2, py + 55, barWidth, barHeight, 0x4ec9b0,
    ).setOrigin(0, 0.5);
    this.playerHPLabel = this.add.text(px, py + 55, '', {
      fontSize: '11px', color: '#ffffff',
    }).setOrigin(0.5);

    // MP bar
    this.add.rectangle(px, py + 75, barWidth, barHeight, 0x3e3e42);
    this.playerMPBar = this.add.rectangle(
      px - barWidth / 2, py + 75, barWidth, barHeight, 0x569cd6,
    ).setOrigin(0, 0.5);
    this.playerMPLabel = this.add.text(px, py + 75, '', {
      fontSize: '11px', color: '#ffffff',
    }).setOrigin(0.5);

    // --- Bug (right) ---
    const bx = width * 0.75;
    const by = height * 0.38;

    const bugSprite = this.add.rectangle(bx, by, 64, 64, 0xf48771, 0.5);
    bugSprite.setStrokeStyle(2, 0xf48771);

    this.add.text(bx, by - 80, this.tutorialBug.name, {
      fontSize: '18px', color: '#f48771',
    }).setOrigin(0.5);

    this.add.rectangle(bx, by + 55, barWidth, barHeight, 0x3e3e42);
    this.bugHPBar = this.add.rectangle(
      bx - barWidth / 2, by + 55, barWidth, barHeight, 0xf48771,
    ).setOrigin(0, 0.5);
    this.bugHPLabel = this.add.text(bx, by + 55, '', {
      fontSize: '11px', color: '#ffffff',
    }).setOrigin(0.5);

    this.refreshBars();
  }

  // ===========================================================================
  // Action Buttons
  // ===========================================================================

  private createActionButtons(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const btnY = height - 90;
    const btnW = 120;
    const btnH = 48;
    const gap = 16;
    const totalW = btnW * 4 + gap * 3;
    const startX = (width - totalW) / 2 + btnW / 2;

    this.attackButton = this.makeButton(startX, btnY, btnW, btnH, 'Attack', '#f48771', () => this.handleAction('attack'));
    this.skillButton = this.makeButton(startX + btnW + gap, btnY, btnW, btnH, 'Skill', '#569cd6', () => this.handleAction('skill'));
    this.focusButton = this.makeButton(startX + (btnW + gap) * 2, btnY, btnW, btnH, 'Focus', '#dcdcaa', () => this.handleAction('focus'));
    this.itemButton = this.makeButton(startX + (btnW + gap) * 3, btnY, btnW, btnH, 'Item', '#4ec9b0', () => this.handleAction('item'));

    this.setAllButtonsEnabled(false);
  }

  private makeButton(
    x: number, y: number, w: number, h: number,
    label: string, color: string, cb: () => void,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const colorHex = parseInt(color.replace('#', '0x'), 16);

    const bg = this.add.rectangle(0, 0, w, h, colorHex, 0.15);
    bg.setStrokeStyle(2, colorHex);
    bg.setInteractive();

    const text = this.add.text(0, 0, label, {
      fontSize: '16px', color, fontStyle: 'bold',
    }).setOrigin(0.5);

    container.add([bg, text]);

    bg.on('pointerover', () => { if (bg.input?.enabled) bg.setFillStyle(colorHex, 0.35); });
    bg.on('pointerout', () => bg.setFillStyle(colorHex, 0.15));
    bg.on('pointerdown', () => { if (bg.input?.enabled) cb(); });

    return container;
  }

  private setAllButtonsEnabled(enabled: boolean): void {
    [this.attackButton, this.skillButton, this.focusButton, this.itemButton].forEach(btn => {
      if (!btn) return;
      const bg = btn.list[0] as Phaser.GameObjects.Rectangle;
      if (bg.input) bg.input.enabled = enabled;
      btn.setAlpha(enabled ? 1 : 0.4);
    });
  }

  private setSingleButtonEnabled(btn: Phaser.GameObjects.Container | undefined, enabled: boolean): void {
    if (!btn) return;
    const bg = btn.list[0] as Phaser.GameObjects.Rectangle;
    if (bg.input) bg.input.enabled = enabled;
    btn.setAlpha(enabled ? 1 : 0.4);
  }

  // ===========================================================================
  // Skip Button
  // ===========================================================================

  private createSkipButton(): void {
    const width = this.cameras.main.width;

    const skipBtn = this.add.text(width - 16, 16, 'Skip Tutorial >>', {
      fontSize: '14px',
      color: '#858585',
      backgroundColor: '#2d2d30',
      padding: { x: 12, y: 6 },
    }).setOrigin(1, 0).setDepth(100).setInteractive();

    skipBtn.on('pointerover', () => skipBtn.setColor('#d4d4d4'));
    skipBtn.on('pointerout', () => skipBtn.setColor('#858585'));
    skipBtn.on('pointerdown', () => this.endTutorial());
  }

  // ===========================================================================
  // Tutorial Step Logic
  // ===========================================================================

  private showTutorialStep(): void {
    this.clearHighlight();

    switch (this.tutorialStep) {
      case 0:
        this.showMessage(
          'Welcome, Bug Slayer!',
          'Your mission: squash bugs and save the codebase.\nLet\'s learn the basics of combat.',
          0,
        );
        this.input.once('pointerdown', () => {
          this.tutorialStep = 1;
          this.showTutorialStep();
        });
        break;

      case 1:
        this.showMessage(
          'Step 1: Attack',
          'Click Attack to deal damage to the bug.\nThis is your bread-and-butter action.',
          1,
        );
        this.highlightButton(this.attackButton, '#f48771');
        this.setSingleButtonEnabled(this.attackButton, true);
        break;

      case 2:
        this.showMessage(
          'Step 2: Skills',
          'Skills cost MP but deal more damage.\nUnlock powerful skills as you level up!',
          2,
        );
        this.highlightButton(this.skillButton, '#569cd6');
        this.setSingleButtonEnabled(this.skillButton, true);
        break;

      case 3:
        this.showMessage(
          'Step 3: Focus',
          'Focus restores 15% MP and boosts your\nnext attack by +20% damage.',
          3,
        );
        this.highlightButton(this.focusButton, '#dcdcaa');
        this.setSingleButtonEnabled(this.focusButton, true);
        break;

      case 4:
        this.showMessage(
          'Step 4: Items',
          'Use items to heal HP during battle.\nStock up between fights!',
          4,
        );
        this.highlightButton(this.itemButton, '#4ec9b0');
        this.setSingleButtonEnabled(this.itemButton, true);
        break;

      case 5:
        this.showMessage(
          'Finish the Bug!',
          'Use any action to defeat the NullPointerException.\nGood luck, Bug Slayer!',
          5,
        );
        this.setAllButtonsEnabled(true);
        break;
    }
  }

  // ===========================================================================
  // Message Box
  // ===========================================================================

  private showMessage(title: string, body: string, step: number): void {
    if (this.messageBox) {
      this.messageBox.removeAll(true);
      this.messageBox.destroy();
    }
    if (this.stepIndicator) {
      this.stepIndicator.destroy();
    }

    const width = this.cameras.main.width;
    this.messageBox = this.add.container(width / 2, 80).setDepth(50);

    // Background panel
    const panelW = Math.min(480, width - 40);
    const panelH = 90;
    const bg = this.add.rectangle(0, 0, panelW, panelH, 0x252526, 0.95);
    bg.setStrokeStyle(2, 0x007acc);
    this.messageBox.add(bg);

    // Title
    const titleText = this.add.text(0, -22, title, {
      fontSize: '20px', color: '#4fc1ff', fontStyle: 'bold', align: 'center',
    }).setOrigin(0.5);
    this.messageBox.add(titleText);

    // Body
    const bodyText = this.add.text(0, 14, body, {
      fontSize: '14px', color: '#d4d4d4', align: 'center',
      lineSpacing: 4,
    }).setOrigin(0.5);
    this.messageBox.add(bodyText);

    // Step indicator (bottom of message box)
    if (step > 0 && step <= this.TOTAL_STEPS) {
      const dots: string[] = [];
      for (let i = 1; i <= this.TOTAL_STEPS; i++) {
        dots.push(i <= step ? '●' : '○');
      }
      this.stepIndicator = this.add.text(width / 2, 135, dots.join('  '), {
        fontSize: '14px', color: '#007acc',
      }).setOrigin(0.5).setDepth(50);
    }

    // Fade-in
    this.messageBox.setAlpha(0);
    this.tweens.add({
      targets: this.messageBox,
      alpha: 1,
      duration: 300,
      ease: 'Power2',
    });
  }

  // ===========================================================================
  // Highlight + Arrow System
  // ===========================================================================

  private highlightButton(button?: Phaser.GameObjects.Container, color?: string): void {
    if (!button) return;

    const bounds = button.getBounds();
    const colorHex = parseInt((color || '#007acc').replace('#', '0x'), 16);
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Dim overlay
    this.overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.5)
      .setDepth(20);

    // Bring button above overlay
    button.setDepth(30);

    // Pulsing highlight border
    this.highlightRect = this.add.rectangle(
      bounds.centerX, bounds.centerY,
      bounds.width + 16, bounds.height + 16,
    ).setDepth(25);
    this.highlightRect.setStrokeStyle(3, colorHex);
    this.highlightRect.setFillStyle(0x000000, 0);

    this.highlightTween = this.tweens.add({
      targets: this.highlightRect,
      scaleX: 1.08,
      scaleY: 1.12,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Animated arrow pointing down to button
    this.arrowContainer = this.add.container(bounds.centerX, bounds.top - 50).setDepth(30);

    // Arrow shaft
    const shaft = this.add.rectangle(0, 0, 4, 30, colorHex).setOrigin(0.5, 0);
    this.arrowContainer.add(shaft);

    // Arrow head (triangle)
    const head = this.add.graphics();
    head.fillStyle(colorHex, 1);
    head.fillTriangle(0, 30, -9, 18, 9, 18);
    this.arrowContainer.add(head);

    // Bounce animation
    this.tweens.add({
      targets: this.arrowContainer,
      y: bounds.top - 38,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private clearHighlight(): void {
    if (this.highlightTween) {
      this.highlightTween.stop();
      this.highlightTween = undefined;
    }
    if (this.highlightRect) {
      this.highlightRect.destroy();
      this.highlightRect = undefined;
    }
    if (this.arrowContainer) {
      this.arrowContainer.removeAll(true);
      this.arrowContainer.destroy();
      this.arrowContainer = undefined;
    }
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = undefined;
    }

    // Reset button depths
    [this.attackButton, this.skillButton, this.focusButton, this.itemButton].forEach(btn => {
      btn?.setDepth(0);
    });

    // Disable all buttons until next step enables specific ones
    this.setAllButtonsEnabled(false);
  }

  // ===========================================================================
  // Action Handling
  // ===========================================================================

  private handleAction(action: 'attack' | 'skill' | 'focus' | 'item'): void {
    if (!this.tutorialBug || !this.playerData) return;

    let damage = 0;
    let resultText = '';

    switch (action) {
      case 'attack': {
        damage = Math.floor(this.playerData.stats.ATK * (this.focusActive ? 1.0 : 0.8));
        resultText = `Attack dealt ${damage} damage!`;
        this.focusActive = false;
        break;
      }
      case 'skill': {
        const multiplier = this.focusActive ? 1.8 : 1.5;
        damage = Math.floor(this.playerData.stats.ATK * multiplier);
        this.playerData.currentMP = Math.max(0, this.playerData.currentMP - 10);
        resultText = `Skill hit for ${damage} damage! (-10 MP)`;
        this.focusActive = false;
        break;
      }
      case 'focus': {
        const mpGain = Math.floor(this.playerData.stats.MP * 0.15);
        this.playerData.currentMP = Math.min(this.playerData.stats.MP, this.playerData.currentMP + mpGain);
        this.focusActive = true;
        resultText = `Focused! +${mpGain} MP. Next attack +20%!`;
        break;
      }
      case 'item': {
        const healAmt = 30;
        this.playerData.currentHP = Math.min(this.playerData.stats.HP, this.playerData.currentHP + healAmt);
        resultText = `Used potion! +${healAmt} HP`;
        break;
      }
    }

    // Apply damage to bug
    if (damage > 0) {
      this.tutorialBug.currentHP = Math.max(0, this.tutorialBug.currentHP - damage);
    }

    this.refreshBars();
    this.showFloatingText(resultText, this.cameras.main.width / 2, 200);

    // Bug defeated?
    if (this.tutorialBug.currentHP <= 0) {
      this.setAllButtonsEnabled(false);
      this.clearHighlight();
      this.time.delayedCall(800, () => this.showVictory());
      return;
    }

    // Disable buttons for bug turn
    this.setAllButtonsEnabled(false);

    this.time.delayedCall(900, () => this.bugTurn());
  }

  private bugTurn(): void {
    if (!this.tutorialBug || !this.playerData) return;

    // Bug deals reduced damage in tutorial
    const damage = Math.floor(this.tutorialBug.stats.ATK * 0.5);
    this.playerData.currentHP = Math.max(0, this.playerData.currentHP - damage);
    this.refreshBars();

    this.showFloatingText(`Bug attacked! -${damage} HP`, this.cameras.main.width / 2, 200);

    this.time.delayedCall(900, () => {
      // Advance to next tutorial step
      if (this.tutorialStep < 5) {
        this.tutorialStep++;
      }
      this.showTutorialStep();
    });
  }

  // ===========================================================================
  // Bar Updates
  // ===========================================================================

  private refreshBars(): void {
    if (!this.playerData || !this.tutorialBug) return;

    const hpPct = this.playerData.currentHP / this.playerData.stats.HP;
    const mpPct = this.playerData.currentMP / this.playerData.stats.MP;
    const bugPct = this.tutorialBug.currentHP / this.tutorialBug.stats.HP;

    if (this.playerHPBar) this.playerHPBar.setScale(Math.max(0, hpPct), 1);
    if (this.playerMPBar) this.playerMPBar.setScale(Math.max(0, mpPct), 1);
    if (this.bugHPBar) this.bugHPBar.setScale(Math.max(0, bugPct), 1);

    if (this.playerHPLabel) {
      this.playerHPLabel.setText(`HP ${this.playerData.currentHP}/${this.playerData.stats.HP}`);
    }
    if (this.playerMPLabel) {
      this.playerMPLabel.setText(`MP ${this.playerData.currentMP}/${this.playerData.stats.MP}`);
    }
    if (this.bugHPLabel) {
      this.bugHPLabel.setText(`HP ${this.tutorialBug.currentHP}/${this.tutorialBug.stats.HP}`);
    }
  }

  // ===========================================================================
  // Floating Text
  // ===========================================================================

  private showFloatingText(text: string, x: number, y: number): void {
    const ft = this.add.text(x, y, text, {
      fontSize: '22px',
      color: '#89d185',
      backgroundColor: '#1e1e1e',
      padding: { x: 10, y: 5 },
    }).setOrigin(0.5).setDepth(60);

    this.tweens.add({
      targets: ft,
      y: y - 50,
      alpha: 0,
      duration: 1500,
      ease: 'Cubic.easeOut',
      onComplete: () => ft.destroy(),
    });
  }

  // ===========================================================================
  // Victory
  // ===========================================================================

  private showVictory(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Clear message box
    if (this.messageBox) {
      this.messageBox.removeAll(true);
      this.messageBox.destroy();
      this.messageBox = undefined;
    }
    if (this.stepIndicator) {
      this.stepIndicator.destroy();
      this.stepIndicator = undefined;
    }

    // Dim background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7).setDepth(70);

    // Victory text
    this.add.text(width / 2, height / 2 - 80, 'Victory!', {
      fontSize: '48px', color: '#89d185', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(80);

    this.add.text(width / 2, height / 2 - 20, 'Tutorial Complete!', {
      fontSize: '24px', color: '#dcdcaa',
    }).setOrigin(0.5).setDepth(80);

    this.add.text(width / 2, height / 2 + 20, '+25 EXP  +10 Gold', {
      fontSize: '16px', color: '#d4d4d4',
    }).setOrigin(0.5).setDepth(80);

    this.add.text(width / 2, height / 2 + 50, 'Now choose your class and enter the dungeons!', {
      fontSize: '14px', color: '#858585',
    }).setOrigin(0.5).setDepth(80);

    // Continue button
    const btnBg = this.add.rectangle(width / 2, height / 2 + 110, 220, 50, 0x007acc, 0.25)
      .setStrokeStyle(2, 0x007acc).setInteractive().setDepth(80);
    this.add.text(width / 2, height / 2 + 110, 'Choose Class', {
      fontSize: '20px', color: '#4fc1ff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(80);

    btnBg.on('pointerover', () => btnBg.setFillStyle(0x007acc, 0.5));
    btnBg.on('pointerout', () => btnBg.setFillStyle(0x007acc, 0.25));
    btnBg.on('pointerdown', () => this.endTutorial());
  }

  // ===========================================================================
  // Transition
  // ===========================================================================

  private endTutorial(): void {
    this.scene.start('ClassSelectScene');
  }
}
