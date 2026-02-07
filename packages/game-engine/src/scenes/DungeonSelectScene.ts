import Phaser from 'phaser'
import { DataLoader } from '../loaders/DataLoader';
import { ProgressionSystem } from '../systems/ProgressionSystem';
import { TechDebt } from '../systems/TechDebt';
import type { Character, Chapter } from '@bug-slayer/shared';
import type { BugData } from '../loaders/DataLoader';

/**
 * DungeonSelectScene - Select chapter and stage
 */

interface DungeonSelectData {
  playerClass: string;
  player?: Character;
  techDebt?: number;
  progression?: ProgressionSystem;
  stagesCompleted?: number[];
  playTime?: number;
}

interface StageNode {
  chapter: number;
  stage: number;
  bug: BugData;
  status: 'completed' | 'current' | 'locked';
  x: number;
  y: number;
  circle?: Phaser.GameObjects.Arc;
  text?: Phaser.GameObjects.Text;
  icon?: Phaser.GameObjects.Text;
}

export class DungeonSelectScene extends Phaser.Scene {
  private dataLoader: DataLoader;
  private progression: ProgressionSystem;
  private techDebt: TechDebt;
  private playerClass: string = '';
  private player?: Character;
  private playTime: number = 0;

  private selectedChapter: number = 1;
  private selectedStage?: StageNode;
  private stageNodes: StageNode[] = [];

  // UI Elements
  private chapterCards: Map<number, Phaser.GameObjects.Container> = new Map();
  private stageInfoPanel?: Phaser.GameObjects.Container;
  private techDebtBar?: Phaser.GameObjects.Graphics;
  private startButton?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'DungeonSelectScene' });
    this.dataLoader = DataLoader.getInstance();
    this.progression = new ProgressionSystem();
    this.techDebt = new TechDebt(0);
  }

  init(data: DungeonSelectData) {
    this.playerClass = data.playerClass;
    this.player = data.player;
    this.playTime = data.playTime || 0;

    // Initialize or restore progression
    if (data.progression) {
      this.progression = data.progression;
    } else {
      this.progression = new ProgressionSystem();
      const saveData = ProgressionSystem.loadSave();
      if (saveData) {
        this.progression.loadProgress(saveData);
      }
    }

    // Initialize tech debt
    if (data.techDebt !== undefined) {
      this.techDebt = new TechDebt(data.techDebt);
    } else {
      this.techDebt = new TechDebt(this.progression.getTotalTechDebt());
    }

    // Set selected chapter to current chapter
    this.selectedChapter = this.progression.getCurrentChapter();
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1e1e1e);

    // Title
    this.add.text(width / 2, 30, 'Select Your Dungeon', {
      fontSize: '32px',
      color: '#4a90e2',
    }).setOrigin(0.5);

    // Create chapter selection
    this.createChapterSelection();

    // Create tech debt display
    this.createTechDebtDisplay();

    // Create stage info panel (initially hidden)
    this.createStageInfoPanel();

    // Create start button (initially hidden)
    this.createStartButton();

    // Create back button
    this.createBackButton();

    // Create stage grid for selected chapter
    this.createStageGrid();
  }

  private createChapterSelection() {
    const width = this.cameras.main.width;
    const cardWidth = 260;
    const cardHeight = 100;
    const gapX = 30;
    const gapY = 15;
    const startX = width / 2 - cardWidth - gapX / 2;
    const y1 = 85;
    const y2 = y1 + cardHeight + gapY;

    // Row 1
    this.createChapterCard(1, 'Bug Forest', '#4ec9b0', startX, y1, cardWidth, cardHeight);
    this.createChapterCard(2, 'Server Dungeon', '#4a90e2', startX + cardWidth + gapX, y1, cardWidth, cardHeight);

    // Row 2
    this.createChapterCard(3, 'Concurrency Cavern', '#c586c0', startX, y2, cardWidth, cardHeight);
    this.createChapterCard(4, 'Security Citadel', '#f48771', startX + cardWidth + gapX, y2, cardWidth, cardHeight);
  }

  private createChapterCard(
    chapter: number,
    name: string,
    color: string,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    const container = this.add.container(x, y);
    const chapterProgress = this.progression.getChapterProgress(chapter as Chapter);
    const isUnlocked = this.progression.isChapterUnlocked(chapter as Chapter);
    const isSelected = this.selectedChapter === chapter;

    // Card background
    const bg = this.add.rectangle(0, 0, width, height, parseInt(color.replace('#', '0x'), 16), isSelected ? 0.3 : 0.1);
    bg.setStrokeStyle(isSelected ? 4 : 2, parseInt(color.replace('#', '0x'), 16));
    container.add(bg);

    // Chapter name
    const nameText = this.add.text(0, -35, `Chapter ${chapter}`, {
      fontSize: '20px',
      color: isUnlocked ? color : '#858585',
    }).setOrigin(0.5);
    container.add(nameText);

    const subText = this.add.text(0, -15, name, {
      fontSize: '16px',
      color: isUnlocked ? '#d4d4d4' : '#858585',
    }).setOrigin(0.5);
    container.add(subText);

    if (!isUnlocked) {
      // Locked icon
      const lockIcon = this.add.text(0, 20, '🔒', {
        fontSize: '32px',
      }).setOrigin(0.5);
      container.add(lockIcon);
    } else {
      // Progress info
      const progressText = this.add.text(0, 15,
        `Stages: ${chapterProgress?.stagesCompleted || 0} / ${chapterProgress?.totalStages || 0}`,
        {
          fontSize: '14px',
          color: '#d4d4d4',
        }
      ).setOrigin(0.5);
      container.add(progressText);

      const bossText = this.add.text(0, 35,
        chapterProgress?.bossDefeated ? '✓ Boss Defeated' : 'Boss: Not Defeated',
        {
          fontSize: '12px',
          color: chapterProgress?.bossDefeated ? '#4ec9b0' : '#f48771',
        }
      ).setOrigin(0.5);
      container.add(bossText);
    }

    // Make interactive only if unlocked
    if (isUnlocked) {
      bg.setInteractive();

      bg.on('pointerover', () => {
        bg.setFillStyle(parseInt(color.replace('#', '0x'), 16), 0.3);
      });

      bg.on('pointerout', () => {
        if (this.selectedChapter !== chapter) {
          bg.setFillStyle(parseInt(color.replace('#', '0x'), 16), 0.1);
        }
      });

      bg.on('pointerdown', () => {
        this.selectChapter(chapter);
      });
    }

    this.chapterCards.set(chapter, container);
  }

  private selectChapter(chapter: number) {
    this.selectedChapter = chapter;

    // Update all chapter cards
    this.chapterCards.forEach((container, ch) => {
      const bg = container.getAt(0) as Phaser.GameObjects.Rectangle;
      const isSelected = ch === chapter;
      const chapterProgress = this.progression.getChapterProgress(ch as Chapter);
      const chapterColors: Record<number, string> = { 1: '#4ec9b0', 2: '#4a90e2', 3: '#c586c0', 4: '#f48771' };
      const color = chapterColors[ch] ?? '#4a90e2';

      if (isSelected) {
        bg.setStrokeStyle(4, parseInt(color.replace('#', '0x'), 16));
        bg.setFillStyle(parseInt(color.replace('#', '0x'), 16), 0.3);
      } else if (chapterProgress?.unlocked) {
        bg.setStrokeStyle(2, parseInt(color.replace('#', '0x'), 16));
        bg.setFillStyle(parseInt(color.replace('#', '0x'), 16), 0.1);
      }
    });

    // Recreate stage grid
    this.createStageGrid();

    // Hide stage info panel and start button
    this.selectedStage = undefined;
    if (this.stageInfoPanel) {
      this.stageInfoPanel.setVisible(false);
    }
    if (this.startButton) {
      this.startButton.setVisible(false);
    }
  }

  private createStageGrid() {
    // Clear existing stage nodes
    this.stageNodes.forEach(node => {
      node.circle?.destroy();
      node.text?.destroy();
      node.icon?.destroy();
    });
    this.stageNodes = [];

    const width = this.cameras.main.width;
    const bugs = this.dataLoader.getBugsForChapter(this.selectedChapter as Chapter);
    const boss = this.dataLoader.getBossForChapter(this.selectedChapter as Chapter);

    if (bugs.length === 0) return;

    // Sort bugs (non-boss first, then boss)
    const sortedBugs = [...bugs.filter(b => b.type !== 'boss'), ...(boss ? [boss] : [])];

    const totalStages = sortedBugs.length;
    const nodeSpacing = 120;
    const startX = width / 2 - (totalStages - 1) * nodeSpacing / 2;
    const y = 320;

    sortedBugs.forEach((bug, index) => {
      const stage = index + 1;
      const x = startX + index * nodeSpacing;
      const isUnlocked = this.progression.isStageUnlocked(this.selectedChapter as Chapter, stage);
      const stageProgress = this.progression.getStageProgress(this.selectedChapter as Chapter, stage);
      const isCompleted = stageProgress?.completed || false;
      const isCurrent = this.progression.getCurrentChapter() === this.selectedChapter &&
                        this.progression.getCurrentStage() === stage;

      let status: 'completed' | 'current' | 'locked';
      if (isCompleted) {
        status = 'completed';
      } else if (isCurrent && isUnlocked) {
        status = 'current';
      } else {
        status = 'locked';
      }

      const node: StageNode = {
        chapter: this.selectedChapter,
        stage,
        bug,
        status,
        x,
        y,
      };

      // Draw connection line (if not first node)
      if (index > 0) {
        const prevNode = this.stageNodes[index - 1];
        if (prevNode) {
          const lineColor = isCompleted || prevNode.status === 'completed' ? 0x4ec9b0 : 0x858585;
          const line = this.add.line(0, 0, prevNode.x, prevNode.y, x, y, lineColor, 0.5);
          line.setOrigin(0);
          line.setDepth(-1);
        }
      }

      // Draw stage node
      let nodeColor: number;
      let nodeRadius: number;
      let nodeAlpha: number;

      if (bug.type === 'boss') {
        nodeRadius = 35;
        nodeColor = 0xf48771; // Red for boss
        nodeAlpha = isUnlocked ? 1 : 0.3;
      } else {
        nodeRadius = 25;
        if (status === 'completed') {
          nodeColor = 0x4ec9b0; // Green
          nodeAlpha = 1;
        } else if (status === 'current') {
          nodeColor = 0xdcdcaa; // Yellow
          nodeAlpha = 1;
        } else {
          nodeColor = 0x858585; // Gray
          nodeAlpha = 0.5;
        }
      }

      const circle = this.add.circle(x, y, nodeRadius, nodeColor, nodeAlpha);
      circle.setStrokeStyle(2, 0xd4d4d4);
      node.circle = circle;

      // Stage number or icon (accessibility: shape indicators)
      let iconText: string;
      if (status === 'completed') {
        iconText = '✓'; // Checkmark for completed
      } else if (status === 'locked') {
        iconText = '🔒'; // Lock for locked
      } else {
        iconText = '▶'; // Arrow for current/available
      }

      const icon = this.add.text(x, y, iconText, {
        fontSize: bug.type === 'boss' ? '24px' : '18px',
        color: '#ffffff',
      }).setOrigin(0.5);
      node.icon = icon;

      // Bug name below node
      const nameText = this.add.text(x, y + nodeRadius + 15, bug.name, {
        fontSize: '12px',
        color: isUnlocked ? '#d4d4d4' : '#858585',
        align: 'center',
        wordWrap: { width: 100 },
      }).setOrigin(0.5);
      node.text = nameText;

      // Make interactive if unlocked
      if (isUnlocked) {
        circle.setInteractive();

        circle.on('pointerover', () => {
          circle.setScale(1.1);
          this.showStageInfo(node);
        });

        circle.on('pointerout', () => {
          if (this.selectedStage !== node) {
            circle.setScale(1.0);
          }
        });

        circle.on('pointerdown', () => {
          this.selectStage(node);
        });
      }

      // Pulsing animation for current stage
      if (status === 'current') {
        this.tweens.add({
          targets: circle,
          scale: { from: 1.0, to: 1.15 },
          alpha: { from: 1.0, to: 0.7 },
          duration: 1000,
          yoyo: true,
          repeat: -1,
        });
      }

      this.stageNodes.push(node);
    });
  }

  private showStageInfo(node: StageNode) {
    if (!this.stageInfoPanel) return;

    const bug = node.bug;
    const exp = bug.drops.exp;
    const gold = bug.drops.gold;

    // Update panel content
    const children = this.stageInfoPanel.list;

    // Bug name
    (children[1] as Phaser.GameObjects.Text).setText(bug.name);

    // Bug type
    (children[2] as Phaser.GameObjects.Text).setText(bug.type === 'boss' ? '🔥 BOSS' : `Type: ${bug.type}`);

    // Stats
    (children[3] as Phaser.GameObjects.Text).setText(
      `HP: ${bug.stats.HP} | ATK: ${bug.stats.ATK} | DEF: ${bug.stats.DEF} | SPD: ${bug.stats.SPD}`
    );

    // Description
    (children[4] as Phaser.GameObjects.Text).setText(bug.description);

    // Rewards
    (children[5] as Phaser.GameObjects.Text).setText(`Rewards: ${exp} EXP, ${gold} Gold`);

    this.stageInfoPanel.setVisible(true);
  }

  private selectStage(node: StageNode) {
    // Deselect previous
    if (this.selectedStage && this.selectedStage.circle) {
      this.selectedStage.circle.setScale(1.0);
    }

    // Select new
    this.selectedStage = node;
    if (node.circle) {
      node.circle.setScale(1.1);
    }

    // Show stage info
    this.showStageInfo(node);

    // Show start button
    if (this.startButton) {
      this.startButton.setVisible(true);
    }
  }

  private createTechDebtDisplay() {
    const x = 20;
    const y = this.cameras.main.height - 80;
    const barWidth = 200;
    const barHeight = 20;

    const techDebtStatus = this.techDebt.getStatus();

    // Label
    this.add.text(x, y - 25, 'Tech Debt', {
      fontSize: '14px',
      color: '#d4d4d4',
    });

    // Bar background
    this.add.rectangle(x + barWidth / 2, y, barWidth, barHeight, 0x3c3c3c);

    // Bar fill
    const fillWidth = (techDebtStatus.current / 100) * barWidth;
    this.techDebtBar = this.add.graphics();
    this.techDebtBar.fillStyle(parseInt(techDebtStatus.color.replace('#', '0x'), 16), 1);
    this.techDebtBar.fillRect(x, y - barHeight / 2, fillWidth, barHeight);

    // Value text
    this.add.text(x + barWidth + 10, y, `${techDebtStatus.current} / 100`, {
      fontSize: '14px',
      color: techDebtStatus.color,
    }).setOrigin(0, 0.5);

    // Level text
    this.add.text(x, y + 20, techDebtStatus.description, {
      fontSize: '12px',
      color: techDebtStatus.color,
    });
  }

  private createStageInfoPanel() {
    const width = this.cameras.main.width;
    const panelWidth = 400;
    const panelHeight = 180;
    const x = width - panelWidth / 2 - 20;
    const y = this.cameras.main.height - panelHeight / 2 - 20;

    const container = this.add.container(x, y);

    // Background
    const bg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x2d2d2d, 0.9);
    bg.setStrokeStyle(2, 0x4a90e2);
    container.add(bg);

    // Title
    const title = this.add.text(0, -70, 'Bug Info', {
      fontSize: '16px',
      color: '#4a90e2',
    }).setOrigin(0.5);
    container.add(title);

    // Bug name (will be updated)
    const bugName = this.add.text(0, -45, '', {
      fontSize: '18px',
      color: '#d4d4d4',
    }).setOrigin(0.5);
    container.add(bugName);

    // Bug type (will be updated)
    const bugType = this.add.text(0, -25, '', {
      fontSize: '14px',
      color: '#c586c0',
    }).setOrigin(0.5);
    container.add(bugType);

    // Stats (will be updated)
    const stats = this.add.text(0, -5, '', {
      fontSize: '12px',
      color: '#9cdcfe',
    }).setOrigin(0.5);
    container.add(stats);

    // Description (will be updated)
    const description = this.add.text(0, 25, '', {
      fontSize: '12px',
      color: '#d4d4d4',
      align: 'center',
      wordWrap: { width: panelWidth - 40 },
    }).setOrigin(0.5);
    container.add(description);

    // Rewards (will be updated)
    const rewards = this.add.text(0, 60, '', {
      fontSize: '12px',
      color: '#dcdcaa',
    }).setOrigin(0.5);
    container.add(rewards);

    container.setVisible(false);
    this.stageInfoPanel = container;
  }

  private createStartButton() {
    const width = this.cameras.main.width;
    const buttonWidth = 200;
    const buttonHeight = 50;
    const x = width / 2;
    const y = this.cameras.main.height - 60;

    const container = this.add.container(x, y);

    // Button background
    const bg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x4a90e2, 0.8);
    bg.setStrokeStyle(2, 0x4a90e2);
    bg.setInteractive();
    container.add(bg);

    // Button text
    const text = this.add.text(0, 0, 'Enter Battle', {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);
    container.add(text);

    // Hover effect
    bg.on('pointerover', () => {
      bg.setFillStyle(0x4a90e2, 1);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x4a90e2, 0.8);
    });

    // Click handler
    bg.on('pointerdown', () => {
      this.startBattle();
    });

    container.setVisible(false);
    this.startButton = container;
  }

  private createBackButton() {
    const buttonWidth = 120;
    const buttonHeight = 40;
    const x = 20 + buttonWidth / 2;
    const y = 30;

    const container = this.add.container(x, y);

    // Button background
    const bg = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x858585, 0.5);
    bg.setStrokeStyle(2, 0x858585);
    bg.setInteractive();
    container.add(bg);

    // Button text
    const text = this.add.text(0, 0, 'Back', {
      fontSize: '16px',
      color: '#d4d4d4',
    }).setOrigin(0.5);
    container.add(text);

    // Hover effect
    bg.on('pointerover', () => {
      bg.setFillStyle(0x858585, 0.8);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x858585, 0.5);
    });

    // Click handler
    bg.on('pointerdown', () => {
      this.goBack();
    });
  }

  private startBattle() {
    if (!this.selectedStage) return;

    console.log(`Starting battle: Chapter ${this.selectedStage.chapter}, Stage ${this.selectedStage.stage}`);

    this.scene.start('BattleScene', {
      playerClass: this.playerClass,
      player: this.player,
      chapter: this.selectedStage.chapter,
      stage: this.selectedStage.stage,
      techDebt: this.techDebt.current,
      progression: this.progression,
      playTime: this.playTime,
    });
  }

  private goBack() {
    // If player data exists, go to main menu, otherwise go to class select
    if (this.player) {
      this.scene.start('MainMenuScene');
    } else {
      this.scene.start('ClassSelectScene');
    }
  }
}
