import Phaser from 'phaser';
import { getAllClassesInfo } from '../systems/CharacterFactory';

/**
 * ClassSelectScene - Choose your character class
 */
export class ClassSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ClassSelectScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1e1e1e);

    // Title
    this.add.text(width / 2, 80, 'Choose Your Class', {
      fontSize: '36px',
      color: '#4a90e2',
    }).setOrigin(0.5);

    // Get all classes
    const classes = getAllClassesInfo();

    // Create class cards
    const startX = 100;
    const startY = 180;
    const cardWidth = 160;
    const cardHeight = 200;
    const gap = 20;

    classes.forEach((cls, index) => {
      const x = startX + (cardWidth + gap) * index;
      const y = startY;

      // Card background
      const card = this.add.rectangle(x, y, cardWidth, cardHeight, parseInt(cls.color.replace('#', '0x'), 16), 0.2);
      card.setStrokeStyle(2, parseInt(cls.color.replace('#', '0x'), 16));
      card.setInteractive();

      // Class name
      this.add.text(x, y - 70, cls.name, {
        fontSize: '20px',
        color: cls.color,
      }).setOrigin(0.5);

      // Stats
      const statsText = [
        `HP: ${cls.baseStats.HP}`,
        `ATK: ${cls.baseStats.ATK}`,
        `DEF: ${cls.baseStats.DEF}`,
        `SPD: ${cls.baseStats.SPD}`,
        `MP: ${cls.baseStats.MP}`,
      ].join('\n');

      this.add.text(x, y - 20, statsText, {
        fontSize: '14px',
        color: '#d4d4d4',
        align: 'center',
      }).setOrigin(0.5);

      // Passive
      this.add.text(x, y + 60, cls.passive.name, {
        fontSize: '12px',
        color: '#9cdcfe',
      }).setOrigin(0.5);

      // Hover effect
      card.on('pointerover', () => {
        card.setFillStyle(parseInt(cls.color.replace('#', '0x'), 16), 0.4);
      });

      card.on('pointerout', () => {
        card.setFillStyle(parseInt(cls.color.replace('#', '0x'), 16), 0.2);
      });

      // Click to select
      card.on('pointerdown', () => {
        console.log(`Selected class: ${cls.id}`);
        this.scene.start('BattleScene', {
          playerClass: cls.id,
          chapter: 1,
          stage: 1,
        });
      });
    });

    // Description area
    this.add.text(width / 2, height - 100, 'Click a class to begin your journey', {
      fontSize: '18px',
      color: '#858585',
    }).setOrigin(0.5);
  }
}
