import Phaser from 'phaser'
import minigameData from '../../data/minigame-snippets.json';
import { SoundManager } from '../systems/SoundManager';

/**
 * Minigame Scene Data Interface
 */
export interface MinigameSceneData {
  returnScene: string;
  returnData?: Record<string, unknown>;
  difficulty?: number;
  player?: { gold: number };
  techDebt?: number;
}

/**
 * Merge conflict data from JSON
 */
interface ConflictData {
  id: string;
  title: string;
  head: string;
  incoming: string;
  options: string[];
  correctIndex: number;
  hint: string;
}

// VS Code Dark+ palette
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

const TOTAL_ROUNDS = 5;
const TIMER_SECONDS = 15;
const GOLD_PER_CORRECT = 15;
const TECH_DEBT_PENALTY = 10;

/**
 * MinigameScene - "Merge Conflict" puzzle minigame
 *
 * 5 rounds of git merge conflict resolution.
 * Pick the correct code from 3-4 options per round.
 * 15-second timer. Gold on success, tech debt +10 on failure.
 * Transitions to DungeonSelectScene on completion.
 */
export class MinigameScene extends Phaser.Scene {
  private conflicts: ConflictData[] = [];
  private roundConflicts: ConflictData[] = [];
  private currentRound = 0;
  private score = 0;
  private roundActive = false;
  private gameOver = false;

  private timerEvent?: Phaser.Time.TimerEvent;
  private timerBar?: Phaser.GameObjects.Graphics;
  private timerText?: Phaser.GameObjects.Text;
  private timerBarX = 0;
  private timerBarWidth = 0;
  private timerBarY = 0;

  private sceneData?: MinigameSceneData;
  private roundUI: Phaser.GameObjects.GameObject[] = [];

  private roundLabel?: Phaser.GameObjects.Text;
  private scoreLabel?: Phaser.GameObjects.Text;
  private titleText?: Phaser.GameObjects.Text;
  private soundManager?: SoundManager;

  constructor() {
    super({ key: 'MinigameScene' });
  }

  init(data: MinigameSceneData): void {
    this.sceneData = data;
    this.conflicts = (minigameData as { conflicts: ConflictData[] }).conflicts;
    this.currentRound = 0;
    this.score = 0;
    this.roundActive = false;
    this.gameOver = false;
    this.roundUI = [];

    const shuffled = Phaser.Utils.Array.Shuffle([...this.conflicts]);
    this.roundConflicts = shuffled.slice(0, TOTAL_ROUNDS);
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.add.rectangle(w / 2, h / 2, w, h, C.bg);

    // Initialize sound manager
    this.soundManager = new SoundManager(this);

    this.add.rectangle(w / 2, 25, w, 50, C.bgSecondary);
    this.titleText = this.add.text(w / 2, 25, 'MERGE CONFLICT', {
      fontSize: '28px',
      color: C.red,
      fontStyle: 'bold',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.roundLabel = this.add.text(16, 60, '', {
      fontSize: '16px',
      color: C.blue,
      fontFamily: 'monospace',
    });

    this.scoreLabel = this.add.text(w - 16, 60, '', {
      fontSize: '16px',
      color: C.green,
      fontFamily: 'monospace',
    }).setOrigin(1, 0);

    this.timerBarWidth = w - 40;
    this.timerBarX = 20;
    this.timerBarY = 85;
    this.add.rectangle(
      this.timerBarX + this.timerBarWidth / 2,
      this.timerBarY + 6,
      this.timerBarWidth, 12, 0x333333
    );
    this.timerBar = this.add.graphics();
    this.timerText = this.add.text(w / 2, this.timerBarY + 6, '', {
      fontSize: '12px',
      color: C.white,
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.startRound();
  }

  update(): void {
    if (!this.roundActive || this.gameOver) return;

    if (this.timerEvent && this.timerBar) {
      const progress = this.timerEvent.getProgress();
      const remaining = TIMER_SECONDS * (1 - progress);

      this.timerBar.clear();
      let color: number = C.greenHex;
      if (remaining < 5) color = C.redHex;
      else if (remaining < 10) color = C.yellowHex;

      const fillWidth = this.timerBarWidth * (1 - progress);
      this.timerBar.fillStyle(color);
      this.timerBar.fillRect(this.timerBarX, this.timerBarY, fillWidth, 12);

      if (this.timerText) {
        this.timerText.setText(`${remaining.toFixed(1)}s`);
      }
    }
  }

  private startRound(): void {
    this.clearRoundUI();

    if (this.currentRound >= TOTAL_ROUNDS) {
      this.showResults();
      return;
    }

    const conflict = this.roundConflicts[this.currentRound]!;
    this.roundActive = true;

    this.roundLabel?.setText(`Round ${this.currentRound + 1} / ${TOTAL_ROUNDS}`);
    this.scoreLabel?.setText(`Score: ${this.score} / ${this.currentRound}`);

    const w = this.cameras.main.width;

    const conflictTitle = this.add.text(w / 2, 110, `// ${conflict.title}`, {
      fontSize: '18px',
      color: C.pink,
      fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.roundUI.push(conflictTitle);

    this.createConflictDisplay(conflict);
    this.createOptionButtons(conflict);

    const hint = this.add.text(w / 2, this.cameras.main.height - 20, `Hint: ${conflict.hint}`, {
      fontSize: '13px',
      color: C.textMuted,
      fontFamily: 'monospace',
      wordWrap: { width: w - 40 },
      align: 'center',
    }).setOrigin(0.5);
    this.roundUI.push(hint);

    this.timerEvent = this.time.addEvent({
      delay: TIMER_SECONDS * 1000,
      callback: () => this.handleTimeout(),
    });
  }

  private createConflictDisplay(conflict: ConflictData): void {
    const w = this.cameras.main.width;
    const panelWidth = w - 60;
    const panelX = 30;
    const panelY = 135;

    const panelBg = this.add.rectangle(
      w / 2, panelY + 70, panelWidth, 140, C.bgElevated
    ).setStrokeStyle(1, C.border);
    this.roundUI.push(panelBg);

    const headMarker = this.add.text(panelX + 10, panelY + 10, '<<<<<<< HEAD', {
      fontSize: '13px', color: C.green, fontFamily: 'monospace', fontStyle: 'bold',
    });
    this.roundUI.push(headMarker);

    const headCode = this.add.text(panelX + 20, panelY + 30, conflict.head, {
      fontSize: '13px', color: '#89d185', fontFamily: 'monospace',
      wordWrap: { width: panelWidth - 40 },
    });
    this.roundUI.push(headCode);

    const separator = this.add.text(panelX + 10, panelY + 70, '=======', {
      fontSize: '13px', color: C.textMuted, fontFamily: 'monospace', fontStyle: 'bold',
    });
    this.roundUI.push(separator);

    const incomingCode = this.add.text(panelX + 20, panelY + 90, conflict.incoming, {
      fontSize: '13px', color: C.red, fontFamily: 'monospace',
      wordWrap: { width: panelWidth - 40 },
    });
    this.roundUI.push(incomingCode);

    const incomingMarker = this.add.text(panelX + 10, panelY + 120, '>>>>>>> incoming', {
      fontSize: '13px', color: C.red, fontFamily: 'monospace', fontStyle: 'bold',
    });
    this.roundUI.push(incomingMarker);

    const chooseLabel = this.add.text(w / 2, panelY + 155, 'Choose the correct resolution:', {
      fontSize: '15px', color: C.yellow, fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.roundUI.push(chooseLabel);
  }

  private createOptionButtons(conflict: ConflictData): void {
    const w = this.cameras.main.width;
    const options = conflict.options;
    const numOptions = options.length;
    const btnWidth = w - 60;
    const btnHeight = 52;
    const gap = 8;
    const startY = 310;

    // Shuffle display order, track correct answer
    const indices: number[] = [];
    for (let i = 0; i < numOptions; i++) indices.push(i);
    Phaser.Utils.Array.Shuffle(indices);

    for (let displayIdx = 0; displayIdx < indices.length; displayIdx++) {
      const optionIdx = indices[displayIdx]!;
      const y = startY + displayIdx * (btnHeight + gap);
      const isCorrect = optionIdx === conflict.correctIndex;

      const bg = this.add.rectangle(w / 2, y + btnHeight / 2, btnWidth, btnHeight, C.bgSecondary)
        .setStrokeStyle(2, C.border)
        .setInteractive({ useHandCursor: true });
      this.roundUI.push(bg);

      const letter = String.fromCharCode(65 + displayIdx);
      const letterText = this.add.text(40, y + btnHeight / 2, `${letter})`, {
        fontSize: '16px', color: C.blue, fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0, 0.5);
      this.roundUI.push(letterText);

      const displayText = options[optionIdx]!.replace(/\n/g, '  ');
      const codeText = this.add.text(70, y + btnHeight / 2, displayText, {
        fontSize: '13px', color: C.text, fontFamily: 'monospace',
        wordWrap: { width: btnWidth - 80 },
      }).setOrigin(0, 0.5);
      this.roundUI.push(codeText);

      bg.on('pointerover', () => {
        if (!this.roundActive) return;
        bg.setStrokeStyle(2, C.blueHex);
        bg.setFillStyle(C.selection);
      });
      bg.on('pointerout', () => {
        if (!this.roundActive) return;
        bg.setStrokeStyle(2, C.border);
        bg.setFillStyle(C.bgSecondary);
      });
      bg.on('pointerdown', () => {
        if (!this.roundActive) return;
        this.soundManager?.playSFX('sfx-click');
        this.handleAnswer(isCorrect, bg);
      });

      const key = this.input.keyboard?.addKey(letter);
      if (key) {
        const handler = (): void => {
          if (!this.roundActive) return;
          this.soundManager?.playSFX('sfx-click');
          this.handleAnswer(isCorrect, bg);
        };
        key.on('down', handler);
        this.roundUI.push({
          destroy: () => key.off('down', handler),
        } as unknown as Phaser.GameObjects.GameObject);
      }
    }
  }

  private handleAnswer(correct: boolean, selectedBg: Phaser.GameObjects.Rectangle): void {
    this.roundActive = false;
    this.timerEvent?.remove(false);

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    if (correct) {
      this.score++;
      this.soundManager?.playSFX('sfx-minigame-success');
      selectedBg.setStrokeStyle(3, C.greenHex);
      selectedBg.setFillStyle(C.greenHex, 0.2);

      const resultText = this.add.text(w / 2, h / 2, 'RESOLVED!', {
        fontSize: '48px', color: C.green, fontStyle: 'bold', fontFamily: 'monospace',
      }).setOrigin(0.5).setAlpha(0).setDepth(10);
      this.roundUI.push(resultText);

      this.tweens.add({
        targets: resultText, alpha: 1, scale: { from: 0.5, to: 1 },
        duration: 300, ease: 'Back.easeOut',
      });

      const flash = this.add.rectangle(w / 2, h / 2, w, h, C.greenHex, 0.15).setDepth(9);
      this.roundUI.push(flash);
      this.tweens.add({ targets: flash, alpha: 0, duration: 500 });
    } else {
      this.soundManager?.playSFX('sfx-minigame-fail');
      selectedBg.setStrokeStyle(3, C.redHex);
      selectedBg.setFillStyle(C.redHex, 0.2);

      const resultText = this.add.text(w / 2, h / 2, 'CONFLICT!', {
        fontSize: '48px', color: C.red, fontStyle: 'bold', fontFamily: 'monospace',
      }).setOrigin(0.5).setAlpha(0).setDepth(10);
      this.roundUI.push(resultText);

      this.tweens.add({
        targets: resultText, alpha: 1, scale: { from: 0.5, to: 1 },
        duration: 300, ease: 'Back.easeOut',
      });

      const flash = this.add.rectangle(w / 2, h / 2, w, h, C.redHex, 0.15).setDepth(9);
      this.roundUI.push(flash);
      this.tweens.add({ targets: flash, alpha: 0, duration: 500 });
      this.cameras.main.shake(200, 0.005);
    }

    this.scoreLabel?.setText(`Score: ${this.score} / ${this.currentRound + 1}`);
    this.currentRound++;
    this.time.delayedCall(1200, () => this.startRound());
  }

  private handleTimeout(): void {
    if (!this.roundActive) return;
    this.roundActive = false;

    this.soundManager?.playSFX('sfx-minigame-fail');

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    const timeoutText = this.add.text(w / 2, h / 2, 'TIME OUT!', {
      fontSize: '48px', color: C.orange, fontStyle: 'bold', fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0).setDepth(10);
    this.roundUI.push(timeoutText);

    this.tweens.add({
      targets: timeoutText, alpha: 1, scale: { from: 0.5, to: 1 },
      duration: 300, ease: 'Back.easeOut',
    });

    const flash = this.add.rectangle(w / 2, h / 2, w, h, C.orangeHex, 0.15).setDepth(9);
    this.roundUI.push(flash);
    this.tweens.add({ targets: flash, alpha: 0, duration: 500 });
    this.cameras.main.shake(200, 0.005);

    this.scoreLabel?.setText(`Score: ${this.score} / ${this.currentRound + 1}`);
    this.currentRound++;
    this.time.delayedCall(1200, () => this.startRound());
  }

  private showResults(): void {
    this.clearRoundUI();
    this.gameOver = true;
    this.timerBar?.clear();
    this.timerText?.setText('');
    this.roundLabel?.setText('');

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const success = this.score >= 3;

    if (success) {
      this.soundManager?.playSFX('sfx-chapter-clear');
    } else {
      this.soundManager?.playSFX('sfx-defeat');
    }

    this.titleText?.setText(success ? 'MERGE COMPLETE!' : 'BUILD FAILED!');
    this.titleText?.setColor(success ? C.green : C.red);

    this.add.text(w / 2, 120, `${this.score} / ${TOTAL_ROUNDS} Conflicts Resolved`, {
      fontSize: '24px', color: C.text, fontFamily: 'monospace',
    }).setOrigin(0.5);

    let stars: string;
    if (this.score >= 5) stars = '★★★';
    else if (this.score >= 4) stars = '★★☆';
    else if (this.score >= 3) stars = '★☆☆';
    else stars = '☆☆☆';

    this.add.text(w / 2, 155, stars, {
      fontSize: '36px',
      color: this.score >= 3 ? C.yellow : C.textMuted,
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const panelY = 200;
    const panelHeight = 180;
    this.add.rectangle(w / 2, panelY + panelHeight / 2, w - 80, panelHeight, C.bgElevated)
      .setStrokeStyle(2, success ? C.greenHex : C.redHex);

    let yPos = panelY + 20;
    const lineHeight = 28;

    for (let i = 0; i < TOTAL_ROUNDS; i++) {
      const passed = i < this.score;
      const icon = passed ? '✓' : '✗';
      const color = passed ? C.green : C.red;
      const conflict = this.roundConflicts[i]!;
      this.add.text(60, yPos, `${icon}  Round ${i + 1}: ${conflict.title}`, {
        fontSize: '14px', color, fontFamily: 'monospace',
      });
      yPos += lineHeight;
    }

    const rewardY = panelY + panelHeight + 30;
    if (success) {
      const goldReward = this.score * GOLD_PER_CORRECT;
      this.add.text(w / 2, rewardY, `+ ${goldReward} Gold`, {
        fontSize: '22px', color: C.yellow, fontStyle: 'bold', fontFamily: 'monospace',
      }).setOrigin(0.5);

      if (this.score === TOTAL_ROUNDS) {
        this.add.text(w / 2, rewardY + 30, 'PERFECT! Bonus: Debug Potion', {
          fontSize: '16px', color: C.green, fontFamily: 'monospace',
        }).setOrigin(0.5);
      }

      this.data.set('success', true);
      this.data.set('goldReward', goldReward);
      this.data.set('perfectClear', this.score === TOTAL_ROUNDS);
    } else {
      this.add.text(w / 2, rewardY, `Tech Debt + ${TECH_DEBT_PENALTY}`, {
        fontSize: '22px', color: C.red, fontStyle: 'bold', fontFamily: 'monospace',
      }).setOrigin(0.5);

      this.add.text(w / 2, rewardY + 30, 'Unresolved conflicts increase tech debt!', {
        fontSize: '14px', color: C.textMuted, fontFamily: 'monospace',
      }).setOrigin(0.5);

      this.data.set('success', false);
      this.data.set('techDebtPenalty', TECH_DEBT_PENALTY);
    }

    this.data.set('score', this.score);

    const btnY = h - 60;
    const btnBg = this.add.rectangle(w / 2, btnY, 220, 50, C.blueHex, 0.8)
      .setStrokeStyle(2, C.blueHex)
      .setInteractive({ useHandCursor: true });

    this.add.text(w / 2, btnY, 'Continue', {
      fontSize: '20px', color: C.white, fontFamily: 'monospace',
    }).setOrigin(0.5);

    btnBg.on('pointerover', () => btnBg.setFillStyle(C.blueHex, 1));
    btnBg.on('pointerout', () => btnBg.setFillStyle(C.blueHex, 0.8));
    btnBg.on('pointerdown', () => this.exitMinigame());

    this.input.keyboard?.once('keydown-ENTER', () => this.exitMinigame());
    this.input.keyboard?.once('keydown-SPACE', () => this.exitMinigame());
  }

  private exitMinigame(): void {
    const returnScene = this.sceneData?.returnScene || 'DungeonSelectScene';
    const returnData = this.sceneData?.returnData || {};

    this.scene.start(returnScene, {
      ...returnData,
      minigameResult: {
        success: this.data.get('success'),
        score: this.score,
        goldReward: this.data.get('goldReward') || 0,
        techDebtPenalty: this.data.get('techDebtPenalty') || 0,
        perfectClear: this.data.get('perfectClear') || false,
      },
    });
  }

  private clearRoundUI(): void {
    this.roundUI.forEach(obj => {
      if (obj && typeof obj.destroy === 'function') {
        obj.destroy();
      }
    });
    this.roundUI = [];
  }
}
