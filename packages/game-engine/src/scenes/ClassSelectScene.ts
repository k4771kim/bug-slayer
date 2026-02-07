import Phaser from 'phaser'
import { getAllClassesInfo, createCharacter } from '../systems/CharacterFactory';

/**
 * ClassSelectScene - Choose your character class
 * Shows 8 classes in 2 rows: 4 basic (row 1) + 4 hidden (row 2)
 */
export class ClassSelectScene extends Phaser.Scene {
  private isFirstGame = true; // TODO: Check save data to determine if tutorial needed

  constructor() {
    super({ key: 'ClassSelectScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1e1e1e);

    // Title
    this.add.text(width / 2, 50, 'Choose Your Class', {
      fontSize: '36px',
      color: '#4a90e2',
    }).setOrigin(0.5);

    // Get all classes and split into basic vs hidden
    const allClasses = getAllClassesInfo();
    const basicClasses = allClasses.filter(cls => !cls.hidden);
    const hiddenClasses = allClasses.filter(cls => cls.hidden);

    // Layout constants
    const cardWidth = 160;
    const cardHeight = 190;
    const gap = 20;
    const row1Y = 180;
    const row2Y = 420;

    // Calculate startX to center 4 cards
    const totalRowWidth = 4 * cardWidth + 3 * gap;
    const startX = (width - totalRowWidth) / 2 + cardWidth / 2;

    // Row 1: Basic classes
    basicClasses.forEach((cls, index) => {
      const x = startX + (cardWidth + gap) * index;
      this.createClassCard(x, row1Y, cardWidth, cardHeight, cls, false);
    });

    // "HIDDEN CLASSES" label above row 2
    this.add.text(width / 2, row2Y - cardHeight / 2 - 25, 'HIDDEN CLASSES', {
      fontSize: '16px',
      color: '#dcdcaa',
    }).setOrigin(0.5);

    // Row 2: Hidden classes
    hiddenClasses.forEach((cls, index) => {
      const x = startX + (cardWidth + gap) * index;
      this.createClassCard(x, row2Y, cardWidth, cardHeight, cls, true);
    });

    // Description area
    this.add.text(width / 2, height - 40, 'Click a class to begin your journey', {
      fontSize: '18px',
      color: '#858585',
    }).setOrigin(0.5);
  }

  /**
   * Create a class selection card
   */
  private createClassCard(
    x: number,
    y: number,
    cardWidth: number,
    cardHeight: number,
    cls: ReturnType<typeof getAllClassesInfo>[number],
    isHidden: boolean,
  ) {
    const colorInt = parseInt(cls.color.replace('#', '0x'), 16);
    const baseAlpha = isHidden ? 0.15 : 0.2;
    const hoverAlpha = isHidden ? 0.3 : 0.4;

    // Card background
    const card = this.add.rectangle(x, y, cardWidth, cardHeight, colorInt, baseAlpha);
    card.setStrokeStyle(2, colorInt);
    card.setInteractive();

    // Class name with star icon for hidden classes
    const displayName = isHidden ? `* ${cls.name}` : cls.name;
    this.add.text(x, y - 65, displayName, {
      fontSize: '18px',
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

    this.add.text(x, y - 15, statsText, {
      fontSize: '13px',
      color: '#d4d4d4',
      align: 'center',
    }).setOrigin(0.5);

    // Passive
    this.add.text(x, y + 50, cls.passive.name, {
      fontSize: '11px',
      color: '#9cdcfe',
    }).setOrigin(0.5);

    // Unlock condition text for hidden classes
    if (isHidden && cls.unlockCondition) {
      this.add.text(x, y + 70, `Unlock: ${cls.unlockCondition.description}`, {
        fontSize: '9px',
        color: '#858585',
        wordWrap: { width: cardWidth - 10 },
        align: 'center',
      }).setOrigin(0.5);
    }

    // Hover effect
    card.on('pointerover', () => {
      card.setFillStyle(colorInt, hoverAlpha);
    });

    card.on('pointerout', () => {
      card.setFillStyle(colorInt, baseAlpha);
    });

    // Click to select (all classes are playable for now)
    card.on('pointerdown', () => {
      console.log(`Selected class: ${cls.id}`);

      // Create character from selected class
      const character = createCharacter(cls.id, cls.name, 1);

      // If first game, go to tutorial; otherwise, go directly to dungeon select
      if (this.isFirstGame) {
        this.scene.start('TutorialScene', {
          party: [character],
        });
      } else {
        this.scene.start('DungeonSelectScene', {
          party: [character],
        });
      }
    });
  }
}
