import Phaser from 'phaser'
import minigameSnippetsData from '../../data/minigame-snippets.json';

/**
 * Minigame Scene Data Interface
 */
export interface MinigameSceneData {
  returnScene: string; // Scene to return to (e.g., 'BattleScene')
  returnData?: any; // Data to pass back to parent scene
  difficulty?: number; // 1-3, affects timer duration
}

/**
 * Code snippet interface
 */
interface CodeSnippet {
  id: string;
  correct: string;
  wrong: string;
  hint: string;
}

/**
 * MinigameScene - "Merge Conflict" code selection minigame
 *
 * Player must choose the correct code snippet from two options within a time limit.
 * Success/failure is stored in scene data for the parent scene to read.
 */
export class MinigameScene extends Phaser.Scene {
  private snippets: CodeSnippet[] = [];
  private currentSnippet: CodeSnippet | null = null;
  private leftIsCorrect: boolean = false;

  // Timer
  private timerDuration: number = 5000; // milliseconds
  private timerStartTime: number = 0;
  private timerBar: Phaser.GameObjects.Graphics | null = null;
  private timerText: Phaser.GameObjects.Text | null = null;

  // UI elements
  private titleText: Phaser.GameObjects.Text | null = null;
  private subtitleText: Phaser.GameObjects.Text | null = null;
  private hintText: Phaser.GameObjects.Text | null = null;
  private leftPanel: Phaser.GameObjects.Container | null = null;
  private rightPanel: Phaser.GameObjects.Container | null = null;
  private leftCodeText: Phaser.GameObjects.Text | null = null;
  private rightCodeText: Phaser.GameObjects.Text | null = null;

  // State
  private gameActive: boolean = false;
  private selectedPanel: 'left' | 'right' | null = null;

  constructor() {
    super({ key: 'MinigameScene' });
  }

  init(data: MinigameSceneData) {
    // Load snippets from data file
    this.snippets = minigameSnippetsData.conflicts.map(c => ({
      id: c.id,
      correct: c.options[c.correctIndex] ?? c.head,
      wrong: c.options[1 - c.correctIndex] ?? c.incoming,
      hint: c.hint,
    }));

    // Set timer duration based on difficulty
    const difficulty = data.difficulty ?? 1;
    switch (difficulty) {
      case 1:
        this.timerDuration = 5000;
        break;
      case 2:
        this.timerDuration = 4000;
        break;
      case 3:
        this.timerDuration = 3000;
        break;
      default:
        this.timerDuration = 5000;
    }

    // Select random snippet
    this.currentSnippet = Phaser.Utils.Array.GetRandom(this.snippets);

    // Randomly determine which side is correct
    this.leftIsCorrect = Math.random() < 0.5;

    // Reset state
    this.gameActive = true;
    this.selectedPanel = null;
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Dark overlay background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);

    // Title
    this.titleText = this.add.text(width / 2, 60, 'MERGE CONFLICT!', {
      fontSize: '48px',
      color: '#f48771', // VS Code red
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtitle
    this.subtitleText = this.add.text(width / 2, 110, 'Pick the correct code!', {
      fontSize: '24px',
      color: '#dcdcaa', // VS Code yellow
    }).setOrigin(0.5);

    // Timer bar background
    const timerBarWidth = 600;
    const timerBarHeight = 20;
    const timerBarX = (width - timerBarWidth) / 2;
    const timerBarY = 140;

    this.add.rectangle(timerBarX + timerBarWidth / 2, timerBarY + timerBarHeight / 2,
                       timerBarWidth, timerBarHeight, 0x333333);

    // Timer bar (will update in update())
    this.timerBar = this.add.graphics();

    // Timer text
    this.timerText = this.add.text(width / 2, timerBarY + timerBarHeight / 2, '', {
      fontSize: '16px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Code panels
    this.createCodePanels();

    // Hint text
    if (this.currentSnippet) {
      this.hintText = this.add.text(width / 2, height - 80, `Hint: ${this.currentSnippet.hint}`, {
        fontSize: '18px',
        color: '#858585', // VS Code gray
        wordWrap: { width: 700 },
        align: 'center',
      }).setOrigin(0.5);
    }

    // Keyboard controls
    this.input.keyboard?.on('keydown-LEFT', () => this.selectPanel('left'));
    this.input.keyboard?.on('keydown-RIGHT', () => this.selectPanel('right'));

    // Start timer
    this.timerStartTime = this.time.now;
  }

  private createCodePanels() {
    if (!this.currentSnippet) return;

    const width = this.cameras.main.width;
    const panelWidth = 350;
    const panelHeight = 280;
    const panelY = 340;
    const leftPanelX = 140;
    const rightPanelX = 660;

    // Determine which code goes where
    const leftCode = this.leftIsCorrect ? this.currentSnippet.correct : this.currentSnippet.wrong;
    const rightCode = this.leftIsCorrect ? this.currentSnippet.wrong : this.currentSnippet.correct;

    // Left panel
    this.leftPanel = this.add.container(leftPanelX, panelY);
    const leftBg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x1e1e1e);
    leftBg.setStrokeStyle(3, 0x4a90e2); // VS Code blue
    leftBg.setInteractive({ useHandCursor: true });
    leftBg.on('pointerdown', () => this.selectPanel('left'));
    leftBg.on('pointerover', () => leftBg.setStrokeStyle(4, 0x4ec9b0)); // Highlight green
    leftBg.on('pointerout', () => leftBg.setStrokeStyle(3, 0x4a90e2));

    this.leftCodeText = this.add.text(0, 0, leftCode, {
      fontSize: '16px',
      color: '#dcdcaa',
      fontFamily: 'monospace',
      lineSpacing: 4,
    }).setOrigin(0.5);

    this.leftPanel.add([leftBg, this.leftCodeText]);

    // Right panel
    this.rightPanel = this.add.container(rightPanelX, panelY);
    const rightBg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x1e1e1e);
    rightBg.setStrokeStyle(3, 0x4a90e2); // VS Code blue
    rightBg.setInteractive({ useHandCursor: true });
    rightBg.on('pointerdown', () => this.selectPanel('right'));
    rightBg.on('pointerover', () => rightBg.setStrokeStyle(4, 0x4ec9b0)); // Highlight green
    rightBg.on('pointerout', () => rightBg.setStrokeStyle(3, 0x4a90e2));

    this.rightCodeText = this.add.text(0, 0, rightCode, {
      fontSize: '16px',
      color: '#dcdcaa',
      fontFamily: 'monospace',
      lineSpacing: 4,
    }).setOrigin(0.5);

    this.rightPanel.add([rightBg, this.rightCodeText]);

    // Panel labels
    this.add.text(leftPanelX, panelY - panelHeight / 2 - 30, 'LEFT', {
      fontSize: '20px',
      color: '#c586c0', // VS Code purple
    }).setOrigin(0.5);

    this.add.text(rightPanelX, panelY - panelHeight / 2 - 30, 'RIGHT', {
      fontSize: '20px',
      color: '#c586c0', // VS Code purple
    }).setOrigin(0.5);
  }

  update(time: number, delta: number) {
    if (!this.gameActive) return;

    // Update timer
    const elapsed = time - this.timerStartTime;
    const remaining = Math.max(0, this.timerDuration - elapsed);
    const progress = remaining / this.timerDuration;

    // Update timer bar
    if (this.timerBar) {
      this.timerBar.clear();

      const timerBarWidth = 600;
      const timerBarHeight = 20;
      const timerBarX = (this.cameras.main.width - timerBarWidth) / 2;
      const timerBarY = 140;

      // Color based on remaining time
      let color = 0x4ec9b0; // green
      if (progress < 0.3) {
        color = 0xf48771; // red
      } else if (progress < 0.6) {
        color = 0xdcdcaa; // yellow
      }

      this.timerBar.fillStyle(color);
      this.timerBar.fillRect(timerBarX, timerBarY, timerBarWidth * progress, timerBarHeight);
    }

    // Update timer text
    if (this.timerText) {
      this.timerText.setText(`${(remaining / 1000).toFixed(1)}s`);
    }

    // Check timeout
    if (remaining <= 0) {
      this.handleTimeout();
    }
  }

  private selectPanel(panel: 'left' | 'right') {
    if (!this.gameActive) return;

    this.selectedPanel = panel;
    this.gameActive = false;

    // Determine if correct
    const isCorrect = (panel === 'left' && this.leftIsCorrect) ||
                     (panel === 'right' && !this.leftIsCorrect);

    if (isCorrect) {
      this.handleSuccess();
    } else {
      this.handleFailure();
    }
  }

  private handleSuccess() {
    // Flash green
    const flash = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x4ec9b0,
      0.3
    );

    // Show success message
    const successText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      'RESOLVED!',
      {
        fontSize: '64px',
        color: '#4ec9b0',
        fontStyle: 'bold',
      }
    ).setOrigin(0.5);

    // Store result in scene data
    this.data.set('onSuccess', true);

    // Return to parent scene after delay
    this.time.delayedCall(1500, () => {
      this.returnToParent(true);
    });
  }

  private handleFailure() {
    // Flash red
    const flash = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0xf48771,
      0.3
    );

    // Show failure message
    const failText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      'MERGE FAILED!',
      {
        fontSize: '64px',
        color: '#f48771',
        fontStyle: 'bold',
      }
    ).setOrigin(0.5);

    // Store result in scene data
    this.data.set('onSuccess', false);

    // Return to parent scene after delay
    this.time.delayedCall(1500, () => {
      this.returnToParent(false);
    });
  }

  private handleTimeout() {
    this.gameActive = false;

    // Flash red
    const flash = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0xf48771,
      0.3
    );

    // Show timeout message
    const timeoutText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      'TIME OUT!',
      {
        fontSize: '64px',
        color: '#f48771',
        fontStyle: 'bold',
      }
    ).setOrigin(0.5);

    // Store result in scene data
    this.data.set('onSuccess', false);

    // Return to parent scene after delay
    this.time.delayedCall(1500, () => {
      this.returnToParent(false);
    });
  }

  private returnToParent(success: boolean) {
    const initData = this.scene.settings.data as MinigameSceneData;
    const returnScene = initData?.returnScene || 'BattleScene';
    const returnData = initData?.returnData || {};

    // Stop this scene and resume parent
    this.scene.stop();
    this.scene.resume(returnScene);

    // Parent scene can read result from minigame scene data
    // via this.scene.get('MinigameScene').data.get('onSuccess')
  }
}
