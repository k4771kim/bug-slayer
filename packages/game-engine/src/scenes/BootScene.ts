import Phaser from 'phaser'
import { SpriteSystem, type ClassPalette } from '../systems/SpriteSystem';
import { SoundManager } from '../systems/SoundManager';
import paletteData from '../../data/palette.json';

/**
 * BootScene - Initial loading and setup
 * Loads assets and transitions to MainMenu
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Display loading text
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const loadingText = this.add.text(width / 2, height / 2, 'Loading...', {
      fontSize: '24px',
      color: '#ffffff',
    });
    loadingText.setOrigin(0.5, 0.5);

    // Loading progress bar
    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 + 50, 320, 30);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x4a90e2, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 + 60, 300 * value, 10);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Load hidden class sprites
    this.load.image('char-gpu-warlock', '/assets/sprites/char-gpu-warlock.png');
    this.load.image('char-cat-summoner', '/assets/sprites/char-cat-summoner.png');
    this.load.image('char-code-ninja', '/assets/sprites/char-code-ninja.png');
    this.load.image('char-light-mage', '/assets/sprites/char-light-mage.png');

    // TODO: Load additional game assets here
    // this.load.image('character', 'assets/characters/debugger.png');
    // this.load.image('bug', 'assets/bugs/nullpointer.png');
  }

  create() {
    console.log('BootScene: Generating procedural sprites...');

    // Generate character sprites
    this.generateCharacterSprites();

    // Generate monster sprites
    this.generateMonsterSprites();

    // Generate icon sprites
    this.generateIconSprites();

    // Generate programmatic sounds
    console.log('BootScene: Generating programmatic sounds...');
    try {
      SoundManager.generateAllSounds(this);
      console.log('BootScene: Sound generation complete');
    } catch (e) {
      console.warn('BootScene: Sound generation failed (Web Audio may not be available):', e);
    }

    console.log('BootScene: Assets loaded, transitioning to MainMenuScene');

    // Show main menu
    this.scene.start('MainMenuScene');
  }

  /**
   * Generate all character class sprites
   */
  private generateCharacterSprites() {
    const classes = ['debugger', 'refactorer', 'fullstack', 'devops'];
    const characterColors = paletteData.characterColors;

    for (const className of classes) {
      const colorKey = className as keyof typeof characterColors;
      const primaryColor = characterColors[colorKey];

      if (!primaryColor) {
        console.warn(`No color found for class: ${className}`);
        continue;
      }

      // Create palette with primary, secondary (darker), and accent (lighter)
      const palette: ClassPalette = {
        primary: primaryColor,
        secondary: this.darkenColor(primaryColor, 0.2),
        accent: this.lightenColor(primaryColor, 0.3),
      };

      // Generate sprite
      const sprite = SpriteSystem.generateCharacterSprite(className, palette);

      // Upscale 2x for crisp rendering
      const upscaled = SpriteSystem.upscale(sprite, 2);

      // Add to Phaser textures
      this.textures.addCanvas(`character-${className}`, upscaled);

      console.log(`Generated sprite: character-${className}`);
    }
  }

  /**
   * Generate all monster/bug sprites
   */
  private generateMonsterSprites() {
    const bugColors = paletteData.bugColors;

    for (const [bugName, color] of Object.entries(bugColors)) {
      // Generate bug sprite
      const sprite = SpriteSystem.generateMonsterSprite(bugName, color);

      // Upscale 2x
      const upscaled = SpriteSystem.upscale(sprite, 2);

      // Add to Phaser textures
      this.textures.addCanvas(`bug-${bugName}`, upscaled);

      console.log(`Generated sprite: bug-${bugName}`);
    }

    // Generate generic boss sprite with special colors
    const bossSprite = SpriteSystem.generateMonsterSprite('boss-generic', '#c678dd');
    const bossUpscaled = SpriteSystem.upscale(bossSprite, 2);
    this.textures.addCanvas('bug-boss-generic', bossUpscaled);
    console.log('Generated sprite: bug-boss-generic');
  }

  /**
   * Generate all icon sprites
   */
  private generateIconSprites() {
    const icons = [
      { name: 'sword', type: 'attack', color: '#f48771' },
      { name: 'star', type: 'skill', color: '#569cd6' },
      { name: 'shield', type: 'focus', color: '#dcdcaa' },
      { name: 'potion', type: 'item', color: '#4ec9b0' },
      { name: 'run', type: 'flee', color: '#858585' },
    ];

    for (const icon of icons) {
      // Generate icon sprite
      const sprite = SpriteSystem.generateIconSprite(icon.type, icon.color);

      // Upscale 2x
      const upscaled = SpriteSystem.upscale(sprite, 2);

      // Add to Phaser textures
      this.textures.addCanvas(`icon-${icon.name}`, upscaled);

      console.log(`Generated icon: icon-${icon.name}`);
    }
  }

  /**
   * Darken a hex color by a factor
   */
  private darkenColor(hex: string, factor: number): string {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;

    const r = Math.floor(rgb.r * (1 - factor));
    const g = Math.floor(rgb.g * (1 - factor));
    const b = Math.floor(rgb.b * (1 - factor));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Lighten a hex color by a factor
   */
  private lightenColor(hex: string, factor: number): string {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;

    const r = Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * factor));
    const g = Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * factor));
    const b = Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * factor));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Convert hex to RGB
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result || !result[1] || !result[2] || !result[3]) return null;

    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  }
}
