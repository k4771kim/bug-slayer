import Phaser from 'phaser';
import type { Character, Monster } from '@bug-slayer/shared';
import { createCharacter } from '../systems/CharacterFactory';
import { dataLoader } from '../loaders/DataLoader';
import { TechDebt } from '../systems/TechDebt';

interface BattleSceneData {
  playerClass: string;
  chapter: number;
  stage: number;
}

/**
 * BattleScene - Turn-based combat
 * Handles player vs monster battles
 */
export class BattleScene extends Phaser.Scene {
  private player: Character | null = null;
  private monster: Monster | null = null;
  private techDebt: TechDebt | null = null;
  private turnText: Phaser.GameObjects.Text | null = null;
  private playerHPText: Phaser.GameObjects.Text | null = null;
  private monsterHPText: Phaser.GameObjects.Text | null = null;
  private techDebtText: Phaser.GameObjects.Text | null = null;
  private techDebtBar: Phaser.GameObjects.Graphics | null = null;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data: BattleSceneData) {
    console.log('BattleScene initialized with:', data);

    // Initialize Tech Debt system
    this.techDebt = new TechDebt(0);

    // Load actual character from JSON data
    this.player = createCharacter(data.playerClass.toLowerCase(), 'Hero', 1);

    // Load actual monster from JSON data
    const bugData = dataLoader.getBug('nullpointer');
    if (bugData) {
      this.monster = this.createMonsterFromData(bugData);
    } else {
      console.error('Bug not found: nullpointer');
      this.monster = this.createMockMonster();
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

    this.playerHPText = this.add.text(100, 200, '', {
      fontSize: '18px',
      color: '#4ade80',
    });

    // Player placeholder sprite (32x32 square)
    this.add.rectangle(150, 300, 64, 64, 0x4a90e2);

    // Monster area (right)
    this.add.text(width - 200, 150, 'Bug', {
      fontSize: '24px',
      color: '#ffffff',
    });

    this.monsterHPText = this.add.text(width - 200, 200, '', {
      fontSize: '18px',
      color: '#ef4444',
    });

    // Monster placeholder sprite (32x32 square)
    this.add.rectangle(width - 150, 300, 64, 64, 0xef4444);

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

    // Tech Debt bar (filled based on current debt)
    this.techDebtBar = this.add.graphics();

    // Tech Debt text (value and status)
    this.techDebtText = this.add.text(width / 2, barY + barHeight + 15, '', {
      fontSize: '14px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Turn indicator
    this.turnText = this.add.text(width / 2, height - 200, '', {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Action buttons (4 buttons in 2 rows)
    const buttonY1 = height - 140;
    const buttonY2 = height - 90;
    const buttonGap = 180;

    const attackButton = this.add.text(width / 2 - buttonGap / 2, buttonY1, '⚔️ Attack', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#4a90e2',
      padding: { x: 15, y: 8 },
    }).setInteractive();

    const focusButton = this.add.text(width / 2 + buttonGap / 2, buttonY1, '🎯 Focus', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#9333ea',
      padding: { x: 15, y: 8 },
    }).setInteractive();

    const fleeButton = this.add.text(width / 2 - buttonGap / 2, buttonY2, '💨 Flee', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#f59e0b',
      padding: { x: 15, y: 8 },
    }).setInteractive();

    const skipButton = this.add.text(width / 2 + buttonGap / 2, buttonY2, '⏭️ Skip', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#6b7280',
      padding: { x: 15, y: 8 },
    }).setInteractive();

    attackButton.on('pointerdown', () => this.handleAttack());
    focusButton.on('pointerdown', () => this.handleFocus());
    fleeButton.on('pointerdown', () => this.handleFlee());
    skipButton.on('pointerdown', () => this.handleSkip());

    // Update UI
    this.updateUI();
  }

  private createMonsterFromData(bugData: any): Monster {
    return {
      id: bugData.id,
      name: bugData.name,
      type: bugData.type,
      chapter: bugData.chapter,
      stats: bugData.stats,
      currentHP: bugData.stats.HP,
      phase: bugData.phase,
      behaviorTree: bugData.behaviorTree,
      drops: bugData.drops,
      techDebtOnSkip: bugData.techDebtOnSkip,
    };
  }

  private createMockMonster(): Monster {
    return {
      id: 'bug-001',
      name: 'NullPointerException',
      type: 'bug',
      chapter: 1,
      stats: {
        HP: 80,
        ATK: 12,
        DEF: 5,
        SPD: 10,
      },
      currentHP: 80,
      behaviorTree: {
        conditions: [],
        actions: [{ type: 'attack', weight: 100 }],
      },
      drops: {
        items: [],
        exp: 50,
        gold: 20,
      },
      techDebtOnSkip: 10,
    };
  }

  private updateUI() {
    if (!this.player || !this.monster || !this.techDebt) return;

    this.playerHPText?.setText(
      `${this.player.name}\nHP: ${this.player.currentHP}/${this.player.stats.HP}\nMP: ${this.player.currentMP}/${this.player.stats.MP}`
    );

    this.monsterHPText?.setText(
      `${this.monster.name}\nHP: ${this.monster.currentHP}/${this.monster.stats.HP}`
    );

    // Update tech debt display
    const status = this.techDebt.getStatus();
    const barWidth = 300;
    const barHeight = 20;
    const barX = this.cameras.main.width / 2 - barWidth / 2;
    const barY = this.cameras.main.height - 250;
    const fillWidth = (status.current / 100) * barWidth;

    this.techDebtBar?.clear();
    this.techDebtBar?.fillStyle(parseInt(status.color.replace('#', '0x'), 16), 1);
    this.techDebtBar?.fillRect(barX, barY, fillWidth, barHeight);

    this.techDebtText?.setText(`${status.current}/100 - ${status.description}`);
    this.techDebtText?.setColor(status.color);

    this.turnText?.setText('Your turn! Choose an action.');
  }

  private handleAttack() {
    if (!this.player || !this.monster || !this.techDebt) return;

    // Calculate damage using game formula
    const baseDamage = this.player.stats.ATK;
    const defense = this.monster.stats.DEF;
    const damageReduction = 100 / (100 + defense * 0.7);
    const damage = Math.max(1, Math.floor(baseDamage * damageReduction));

    // Apply damage
    this.monster.currentHP = Math.max(0, this.monster.currentHP - damage);

    // Increase tech debt per turn
    this.techDebt.turnPassed();

    // Restore 5% MP per turn
    const mpRestore = Math.floor(this.player.stats.MP * 0.05);
    this.player.currentMP = Math.min(
      this.player.stats.MP,
      this.player.currentMP + mpRestore
    );

    this.turnText?.setText(`You dealt ${damage} damage! (+${mpRestore} MP, +1 Tech Debt)`);
    this.updateUI();

    // Check win condition
    if (this.monster.currentHP <= 0) {
      this.time.delayedCall(1000, () => {
        this.handleVictory();
      });
      return;
    }

    // Monster counter-attack
    this.time.delayedCall(1000, () => {
      this.monsterTurn();
    });
  }

  private handleFocus() {
    if (!this.player || !this.monster || !this.techDebt) return;

    // Restore 15% MP
    const mpRestore = Math.floor(this.player.stats.MP * 0.15);
    this.player.currentMP = Math.min(
      this.player.stats.MP,
      this.player.currentMP + mpRestore
    );

    // Increase tech debt per turn
    this.techDebt.turnPassed();

    this.turnText?.setText(`You focused! Restored ${mpRestore} MP. (+1 Tech Debt)`);
    this.updateUI();

    // Monster turn
    this.time.delayedCall(1000, () => {
      this.monsterTurn();
    });
  }

  private handleFlee() {
    if (!this.player || !this.monster || !this.techDebt) return;

    // Add tech debt for fleeing
    const debtAdded = this.techDebt.flee();

    this.turnText?.setText(`You fled from battle! (+${debtAdded} Tech Debt)`);
    this.updateUI();

    // Return to class selection after 2 seconds
    this.time.delayedCall(2000, () => {
      console.log('Fled from battle. Returning to class selection...');
      this.scene.start('ClassSelectScene');
    });
  }

  private handleSkip() {
    if (!this.player || !this.monster || !this.techDebt) return;

    // Add tech debt for skipping
    const debtAdded = this.techDebt.skipBattle();

    this.turnText?.setText(`You skipped the battle! (+${debtAdded} Tech Debt)`);
    this.updateUI();

    // Return to class selection after 2 seconds
    this.time.delayedCall(2000, () => {
      console.log('Skipped battle. Returning to class selection...');
      this.scene.start('ClassSelectScene');
    });
  }

  private monsterTurn() {
    if (!this.player || !this.monster || !this.techDebt) return;

    // Monster attacks with tech debt modifier
    const baseDamage = this.monster.stats.ATK;
    const techDebtModifier = this.techDebt.enemyAtkModifier;
    const modifiedAtk = Math.floor(baseDamage * techDebtModifier);

    const defense = this.player.stats.DEF;
    const damageReduction = 100 / (100 + defense * 0.7);
    const damage = Math.max(1, Math.floor(modifiedAtk * damageReduction));

    this.player.currentHP = Math.max(0, this.player.currentHP - damage);

    const modifierText = techDebtModifier !== 1.0
      ? ` (${Math.round((techDebtModifier - 1) * 100)}% from Tech Debt)`
      : '';
    this.turnText?.setText(`${this.monster.name} dealt ${damage} damage${modifierText}!`);
    this.updateUI();

    // Check lose condition
    if (this.player.currentHP <= 0) {
      this.time.delayedCall(1000, () => {
        this.handleDefeat();
      });
      return;
    }

    // Back to player turn
    this.time.delayedCall(1000, () => {
      this.turnText?.setText('Your turn! Choose an action.');
    });
  }

  private handleVictory() {
    if (!this.player) return;

    // Restore MP to 100% on victory
    this.player.currentMP = this.player.stats.MP;

    this.turnText?.setText('🎉 Victory! You defeated the bug! (MP fully restored)');
    this.updateUI();

    // TODO: Show rewards screen
    this.time.delayedCall(2000, () => {
      console.log('Battle won! Returning to class selection...');
      this.scene.start('ClassSelectScene');
    });
  }

  private handleDefeat() {
    this.turnText?.setText('💀 Defeat... The bug won.');

    this.time.delayedCall(2000, () => {
      console.log('Battle lost! Returning to class selection...');
      this.scene.start('ClassSelectScene');
    });
  }
}
