import Phaser from 'phaser';
import type { Character, Monster } from '@bug-slayer/shared';
import { createCharacter } from '../systems/CharacterFactory';
import { dataLoader } from '../loaders/DataLoader';

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
  private turnText: Phaser.GameObjects.Text | null = null;
  private playerHPText: Phaser.GameObjects.Text | null = null;
  private monsterHPText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'BattleScene' });
  }

  init(data: BattleSceneData) {
    console.log('BattleScene initialized with:', data);

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

    // Turn indicator
    this.turnText = this.add.text(width / 2, height - 200, '', {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Action buttons
    const attackButton = this.add.text(width / 2 - 100, height - 100, '⚔️ Attack', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#4a90e2',
      padding: { x: 20, y: 10 },
    }).setInteractive();

    const focusButton = this.add.text(width / 2 + 100, height - 100, '🎯 Focus', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#9333ea',
      padding: { x: 20, y: 10 },
    }).setInteractive();

    attackButton.on('pointerdown', () => this.handleAttack());
    focusButton.on('pointerdown', () => this.handleFocus());

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
    if (!this.player || !this.monster) return;

    this.playerHPText?.setText(
      `${this.player.name}\nHP: ${this.player.currentHP}/${this.player.stats.HP}\nMP: ${this.player.currentMP}/${this.player.stats.MP}`
    );

    this.monsterHPText?.setText(
      `${this.monster.name}\nHP: ${this.monster.currentHP}/${this.monster.stats.HP}`
    );

    this.turnText?.setText('Your turn! Choose an action.');
  }

  private handleAttack() {
    if (!this.player || !this.monster) return;

    // Calculate damage using game formula
    const baseDamage = this.player.stats.ATK;
    const defense = this.monster.stats.DEF;
    const damageReduction = 100 / (100 + defense * 0.7);
    const damage = Math.max(1, Math.floor(baseDamage * damageReduction));

    // Apply damage
    this.monster.currentHP = Math.max(0, this.monster.currentHP - damage);

    this.turnText?.setText(`You dealt ${damage} damage!`);
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
    if (!this.player || !this.monster) return;

    // Restore 15% MP
    const mpRestore = Math.floor(this.player.stats.MP * 0.15);
    this.player.currentMP = Math.min(
      this.player.stats.MP,
      this.player.currentMP + mpRestore
    );

    this.turnText?.setText(`You focused! Restored ${mpRestore} MP.`);
    this.updateUI();

    // Monster turn
    this.time.delayedCall(1000, () => {
      this.monsterTurn();
    });
  }

  private monsterTurn() {
    if (!this.player || !this.monster) return;

    // Monster attacks
    const baseDamage = this.monster.stats.ATK;
    const defense = this.player.stats.DEF;
    const damageReduction = 100 / (100 + defense * 0.7);
    const damage = Math.max(1, Math.floor(baseDamage * damageReduction));

    this.player.currentHP = Math.max(0, this.player.currentHP - damage);

    this.turnText?.setText(`${this.monster.name} dealt ${damage} damage!`);
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
    this.turnText?.setText('🎉 Victory! You defeated the bug!');

    // TODO: Show rewards screen
    this.time.delayedCall(2000, () => {
      console.log('Battle won! Returning to game page...');
      // TODO: Navigate back to game page with rewards
    });
  }

  private handleDefeat() {
    this.turnText?.setText('💀 Defeat... The bug won.');

    this.time.delayedCall(2000, () => {
      console.log('Battle lost! Returning to game page...');
      // TODO: Navigate back to game page
    });
  }
}
