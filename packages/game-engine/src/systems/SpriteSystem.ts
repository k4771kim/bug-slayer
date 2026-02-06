/**
 * SpriteSystem - Procedural pixel art sprite generation
 * Generates 32x32 character sprites, 32x32 monster sprites, and 16x16 icons
 * Uses Canvas API with nearest-neighbor upscaling for crisp pixel art
 */

export interface ClassPalette {
  primary: string;
  secondary: string;
  accent: string;
}

export interface SpriteConfig {
  size: number;
  palette: string[];
  pattern: string;
}

/**
 * Procedural sprite generation system for Bug Slayer
 */
export class SpriteSystem {
  /**
   * Generate a 32x32 character sprite for a given class
   * @param characterClass - The character class (debugger, refactorer, fullstack, devops)
   * @param palette - Color palette with primary, secondary, and accent colors
   * @returns Canvas element with the generated sprite
   */
  static generateCharacterSprite(characterClass: string, palette: ClassPalette): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) throw new Error('Failed to get canvas context');

    // Disable image smoothing for crisp pixels
    ctx.imageSmoothingEnabled = false;

    const classId = characterClass.toLowerCase();

    switch (classId) {
      case 'debugger':
        this.drawDebuggerSprite(ctx, palette);
        break;
      case 'refactorer':
        this.drawRefactorerSprite(ctx, palette);
        break;
      case 'fullstack':
        this.drawFullStackSprite(ctx, palette);
        break;
      case 'devops':
        this.drawDevOpsSprite(ctx, palette);
        break;
      default:
        this.drawDebuggerSprite(ctx, palette); // fallback
    }

    return canvas;
  }

  /**
   * Generate a 16x16 icon sprite
   * @param iconType - Type of icon (sword, star, shield, potion, run)
   * @param color - Hex color string
   * @returns Canvas element with the generated icon
   */
  static generateIconSprite(iconType: string, color: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) throw new Error('Failed to get canvas context');

    ctx.imageSmoothingEnabled = false;

    switch (iconType.toLowerCase()) {
      case 'sword':
      case 'attack':
        this.drawSwordIcon(ctx, color);
        break;
      case 'star':
      case 'skill':
        this.drawStarIcon(ctx, color);
        break;
      case 'shield':
      case 'focus':
      case 'defense':
        this.drawShieldIcon(ctx, color);
        break;
      case 'potion':
      case 'item':
        this.drawPotionIcon(ctx, color);
        break;
      case 'run':
      case 'flee':
        this.drawRunIcon(ctx, color);
        break;
      default:
        this.drawSwordIcon(ctx, color);
    }

    return canvas;
  }

  /**
   * Generate a 32x32 monster/bug sprite
   * @param monsterName - Name or ID of the monster
   * @param color - Primary color for the monster
   * @returns Canvas element with the generated sprite
   */
  static generateMonsterSprite(monsterName: string, color: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) throw new Error('Failed to get canvas context');

    ctx.imageSmoothingEnabled = false;

    const nameId = monsterName.toLowerCase();

    // Check if boss
    if (nameId.includes('boss') || nameId.includes('heisenbug') || nameId.includes('finalcompiler')) {
      this.drawBossSprite(ctx, color);
    } else {
      this.drawBugSprite(ctx, color);
    }

    return canvas;
  }

  /**
   * Apply palette swap to an existing sprite
   * @param canvas - Source canvas
   * @param fromColors - Array of colors to replace (hex strings)
   * @param toColors - Array of replacement colors (hex strings)
   * @returns New canvas with swapped colors
   */
  static paletteSwap(canvas: HTMLCanvasElement, fromColors: string[], toColors: string[]): HTMLCanvasElement {
    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;
    const ctx = newCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Failed to get canvas context');

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, 0, 0);

    const imageData = ctx.getImageData(0, 0, newCanvas.width, newCanvas.height);
    const data = imageData.data;

    // Convert hex colors to RGB
    const fromRGB = fromColors.map(hex => this.hexToRgb(hex));
    const toRGB = toColors.map(hex => this.hexToRgb(hex));

    // Replace colors
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      for (let j = 0; j < fromRGB.length; j++) {
        const from = fromRGB[j];
        const to = toRGB[j];
        if (from && to && r === from.r && g === from.g && b === from.b) {
          data[i] = to.r;
          data[i + 1] = to.g;
          data[i + 2] = to.b;
          break;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return newCanvas;
  }

  /**
   * Upscale a canvas by a factor using nearest-neighbor interpolation
   * @param canvas - Source canvas
   * @param factor - Upscale factor (default 2)
   * @returns New canvas scaled up
   */
  static upscale(canvas: HTMLCanvasElement, factor: number = 2): HTMLCanvasElement {
    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvas.width * factor;
    newCanvas.height = canvas.height * factor;
    const ctx = newCanvas.getContext('2d', { willReadFrequently: false });
    if (!ctx) throw new Error('Failed to get canvas context');

    // Nearest-neighbor interpolation for crisp pixels
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, 0, 0, newCanvas.width, newCanvas.height);

    return newCanvas;
  }

  // =========================================================================
  // Character Sprites
  // =========================================================================

  /**
   * Draw Debugger sprite - Hooded figure with magnifying glass
   */
  private static drawDebuggerSprite(ctx: CanvasRenderingContext2D, palette: ClassPalette) {
    // Hood (primary color)
    ctx.fillStyle = palette.primary;
    this.fillPixels(ctx, [[14, 6], [15, 6], [16, 6], [17, 6]]);
    this.fillPixels(ctx, [[13, 7], [14, 7], [15, 7], [16, 7], [17, 7], [18, 7]]);
    this.fillPixels(ctx, [[12, 8], [13, 8], [18, 8], [19, 8]]);
    this.fillPixels(ctx, [[12, 9], [19, 9]]);

    // Face (light skin tone)
    ctx.fillStyle = '#d4c5b9';
    this.fillPixels(ctx, [[14, 8], [15, 8], [16, 8], [17, 8]]);
    this.fillPixels(ctx, [[13, 9], [14, 9], [15, 9], [16, 9], [17, 9], [18, 9]]);
    this.fillPixels(ctx, [[14, 10], [15, 10], [16, 10], [17, 10]]);

    // Eyes
    ctx.fillStyle = '#333333';
    this.fillPixels(ctx, [[14, 9], [17, 9]]);

    // Body (darker primary)
    ctx.fillStyle = palette.secondary;
    this.fillPixels(ctx, [[13, 11], [14, 11], [15, 11], [16, 11], [17, 11], [18, 11]]);
    this.fillPixels(ctx, [[12, 12], [13, 12], [14, 12], [15, 12], [16, 12], [17, 12], [18, 12], [19, 12]]);
    this.fillPixels(ctx, [[12, 13], [13, 13], [18, 13], [19, 13]]);
    this.fillPixels(ctx, [[12, 14], [13, 14], [18, 14], [19, 14]]);
    this.fillPixels(ctx, [[12, 15], [13, 15], [18, 15], [19, 15]]);

    // Torso detail
    this.fillPixels(ctx, [[14, 13], [15, 13], [16, 13], [17, 13]]);
    this.fillPixels(ctx, [[14, 14], [15, 14], [16, 14], [17, 14]]);
    this.fillPixels(ctx, [[14, 15], [15, 15], [16, 15], [17, 15]]);

    // Legs
    this.fillPixels(ctx, [[13, 16], [14, 16], [17, 16], [18, 16]]);
    this.fillPixels(ctx, [[13, 17], [14, 17], [17, 17], [18, 17]]);
    this.fillPixels(ctx, [[13, 18], [14, 18], [17, 18], [18, 18]]);

    // Magnifying glass (accent color - held in right hand)
    ctx.fillStyle = palette.accent;
    // Handle
    this.fillPixels(ctx, [[20, 13], [21, 14], [22, 15]]);
    // Lens circle
    ctx.fillStyle = '#88ccff';
    this.fillPixels(ctx, [[23, 14], [24, 14]]);
    this.fillPixels(ctx, [[22, 15], [23, 15], [24, 15], [25, 15]]);
    this.fillPixels(ctx, [[23, 16], [24, 16]]);
  }

  /**
   * Draw Refactorer sprite - Engineer with wrench and goggles
   */
  private static drawRefactorerSprite(ctx: CanvasRenderingContext2D, palette: ClassPalette) {
    // Goggles
    ctx.fillStyle = '#666666';
    this.fillPixels(ctx, [[13, 7], [14, 7], [17, 7], [18, 7]]);
    this.fillPixels(ctx, [[13, 8], [14, 8], [17, 8], [18, 8]]);

    // Goggles lens
    ctx.fillStyle = '#88ccff';
    this.fillPixels(ctx, [[14, 8], [17, 8]]);

    // Face
    ctx.fillStyle = '#d4c5b9';
    this.fillPixels(ctx, [[14, 9], [15, 9], [16, 9], [17, 9]]);
    this.fillPixels(ctx, [[13, 10], [14, 10], [15, 10], [16, 10], [17, 10], [18, 10]]);

    // Eyes
    ctx.fillStyle = '#333333';
    this.fillPixels(ctx, [[14, 9], [17, 9]]);

    // Body (primary color - work vest)
    ctx.fillStyle = palette.primary;
    this.fillPixels(ctx, [[13, 11], [14, 11], [15, 11], [16, 11], [17, 11], [18, 11]]);
    this.fillPixels(ctx, [[12, 12], [13, 12], [14, 12], [15, 12], [16, 12], [17, 12], [18, 12], [19, 12]]);
    this.fillPixels(ctx, [[12, 13], [13, 13], [14, 13], [15, 13], [16, 13], [17, 13], [18, 13], [19, 13]]);
    this.fillPixels(ctx, [[12, 14], [13, 14], [18, 14], [19, 14]]);
    this.fillPixels(ctx, [[12, 15], [13, 15], [18, 15], [19, 15]]);

    // Tool belt (secondary)
    ctx.fillStyle = palette.secondary;
    this.fillPixels(ctx, [[13, 15], [14, 15], [15, 15], [16, 15], [17, 15], [18, 15]]);

    // Legs
    ctx.fillStyle = '#555555';
    this.fillPixels(ctx, [[13, 16], [14, 16], [17, 16], [18, 16]]);
    this.fillPixels(ctx, [[13, 17], [14, 17], [17, 17], [18, 17]]);
    this.fillPixels(ctx, [[13, 18], [14, 18], [17, 18], [18, 18]]);

    // Wrench (accent - held in right hand)
    ctx.fillStyle = palette.accent;
    this.fillPixels(ctx, [[20, 12], [21, 13], [22, 14]]);
    this.fillPixels(ctx, [[22, 13], [23, 13], [23, 14], [24, 14]]);
  }

  /**
   * Draw FullStack sprite - Dual-wielding mage with front+back symbols
   */
  private static drawFullStackSprite(ctx: CanvasRenderingContext2D, palette: ClassPalette) {
    // Hat/hood (primary)
    ctx.fillStyle = palette.primary;
    this.fillPixels(ctx, [[14, 5], [15, 5], [16, 5], [17, 5]]);
    this.fillPixels(ctx, [[13, 6], [14, 6], [15, 6], [16, 6], [17, 6], [18, 6]]);
    this.fillPixels(ctx, [[12, 7], [13, 7], [18, 7], [19, 7]]);

    // Face
    ctx.fillStyle = '#d4c5b9';
    this.fillPixels(ctx, [[14, 7], [15, 7], [16, 7], [17, 7]]);
    this.fillPixels(ctx, [[14, 8], [15, 8], [16, 8], [17, 8]]);
    this.fillPixels(ctx, [[13, 9], [14, 9], [15, 9], [16, 9], [17, 9], [18, 9]]);

    // Eyes
    ctx.fillStyle = '#333333';
    this.fillPixels(ctx, [[14, 8], [17, 8]]);

    // Robe (secondary)
    ctx.fillStyle = palette.secondary;
    this.fillPixels(ctx, [[13, 10], [14, 10], [15, 10], [16, 10], [17, 10], [18, 10]]);
    this.fillPixels(ctx, [[12, 11], [13, 11], [14, 11], [15, 11], [16, 11], [17, 11], [18, 11], [19, 11]]);
    this.fillPixels(ctx, [[11, 12], [12, 12], [13, 12], [14, 12], [15, 12], [16, 12], [17, 12], [18, 12], [19, 12], [20, 12]]);
    this.fillPixels(ctx, [[11, 13], [12, 13], [13, 13], [18, 13], [19, 13], [20, 13]]);
    this.fillPixels(ctx, [[11, 14], [12, 14], [19, 14], [20, 14]]);
    this.fillPixels(ctx, [[11, 15], [12, 15], [19, 15], [20, 15]]);

    // Front symbol "<" (left side - accent)
    ctx.fillStyle = palette.accent;
    this.fillPixels(ctx, [[10, 13], [9, 14], [10, 15]]);

    // Back symbol ">" (right side - accent)
    this.fillPixels(ctx, [[21, 13], [22, 14], [21, 15]]);

    // Legs
    ctx.fillStyle = palette.primary;
    this.fillPixels(ctx, [[13, 16], [14, 16], [17, 16], [18, 16]]);
    this.fillPixels(ctx, [[13, 17], [14, 17], [17, 17], [18, 17]]);
    this.fillPixels(ctx, [[13, 18], [14, 18], [17, 18], [18, 18]]);
  }

  /**
   * Draw DevOps sprite - Armored engineer with shield and gears
   */
  private static drawDevOpsSprite(ctx: CanvasRenderingContext2D, palette: ClassPalette) {
    // Helmet (primary)
    ctx.fillStyle = palette.primary;
    this.fillPixels(ctx, [[13, 6], [14, 6], [15, 6], [16, 6], [17, 6], [18, 6]]);
    this.fillPixels(ctx, [[12, 7], [13, 7], [14, 7], [15, 7], [16, 7], [17, 7], [18, 7], [19, 7]]);
    this.fillPixels(ctx, [[12, 8], [19, 8]]);

    // Face visor
    ctx.fillStyle = '#88ccff';
    this.fillPixels(ctx, [[13, 8], [14, 8], [15, 8], [16, 8], [17, 8], [18, 8]]);

    // Eyes (through visor)
    ctx.fillStyle = '#333333';
    this.fillPixels(ctx, [[14, 8], [17, 8]]);

    // Face lower
    ctx.fillStyle = '#d4c5b9';
    this.fillPixels(ctx, [[14, 9], [15, 9], [16, 9], [17, 9]]);

    // Armored body (secondary)
    ctx.fillStyle = palette.secondary;
    this.fillPixels(ctx, [[13, 10], [14, 10], [15, 10], [16, 10], [17, 10], [18, 10]]);
    this.fillPixels(ctx, [[12, 11], [13, 11], [14, 11], [15, 11], [16, 11], [17, 11], [18, 11], [19, 11]]);
    this.fillPixels(ctx, [[12, 12], [13, 12], [14, 12], [15, 12], [16, 12], [17, 12], [18, 12], [19, 12]]);
    this.fillPixels(ctx, [[12, 13], [13, 13], [18, 13], [19, 13]]);
    this.fillPixels(ctx, [[12, 14], [13, 14], [18, 14], [19, 14]]);
    this.fillPixels(ctx, [[12, 15], [13, 15], [18, 15], [19, 15]]);

    // Gear symbol on chest (accent)
    ctx.fillStyle = palette.accent;
    this.fillPixels(ctx, [[15, 12], [16, 12]]);
    this.fillPixels(ctx, [[14, 13], [15, 13], [16, 13], [17, 13]]);
    this.fillPixels(ctx, [[15, 14], [16, 14]]);

    // Legs
    ctx.fillStyle = palette.primary;
    this.fillPixels(ctx, [[13, 16], [14, 16], [17, 16], [18, 16]]);
    this.fillPixels(ctx, [[13, 17], [14, 17], [17, 17], [18, 17]]);
    this.fillPixels(ctx, [[13, 18], [14, 18], [17, 18], [18, 18]]);

    // Shield (left hand)
    ctx.fillStyle = '#cccccc';
    this.fillPixels(ctx, [[10, 11], [10, 12], [10, 13], [10, 14]]);
    this.fillPixels(ctx, [[9, 12], [9, 13]]);
  }

  // =========================================================================
  // Monster Sprites
  // =========================================================================

  /**
   * Draw generic bug sprite - Beetle-like creature
   */
  private static drawBugSprite(ctx: CanvasRenderingContext2D, color: string) {
    // Antennae
    ctx.fillStyle = color;
    this.fillPixels(ctx, [[13, 8], [12, 7], [11, 6]]);
    this.fillPixels(ctx, [[18, 8], [19, 7], [20, 6]]);

    // Head
    this.fillPixels(ctx, [[14, 9], [15, 9], [16, 9], [17, 9]]);
    this.fillPixels(ctx, [[13, 10], [14, 10], [15, 10], [16, 10], [17, 10], [18, 10]]);

    // Eyes (darker)
    ctx.fillStyle = this.darkenColor(color, 0.5);
    this.fillPixels(ctx, [[14, 10], [17, 10]]);

    // Body (main)
    ctx.fillStyle = color;
    this.fillPixels(ctx, [[12, 11], [13, 11], [14, 11], [15, 11], [16, 11], [17, 11], [18, 11], [19, 11]]);
    this.fillPixels(ctx, [[11, 12], [12, 12], [13, 12], [14, 12], [15, 12], [16, 12], [17, 12], [18, 12], [19, 12], [20, 12]]);
    this.fillPixels(ctx, [[11, 13], [12, 13], [13, 13], [14, 13], [15, 13], [16, 13], [17, 13], [18, 13], [19, 13], [20, 13]]);
    this.fillPixels(ctx, [[12, 14], [13, 14], [14, 14], [15, 14], [16, 14], [17, 14], [18, 14], [19, 14]]);
    this.fillPixels(ctx, [[13, 15], [14, 15], [15, 15], [16, 15], [17, 15], [18, 15]]);

    // Shell segments (darker stripes)
    ctx.fillStyle = this.darkenColor(color, 0.3);
    this.fillPixels(ctx, [[11, 12], [20, 12]]);
    this.fillPixels(ctx, [[12, 14], [19, 14]]);

    // Legs (6 legs)
    ctx.fillStyle = this.darkenColor(color, 0.4);
    // Left legs
    this.fillPixels(ctx, [[10, 12], [9, 13], [8, 14]]);
    this.fillPixels(ctx, [[10, 13], [9, 14], [8, 15]]);
    this.fillPixels(ctx, [[11, 14], [10, 15], [9, 16]]);
    // Right legs
    this.fillPixels(ctx, [[21, 12], [22, 13], [23, 14]]);
    this.fillPixels(ctx, [[21, 13], [22, 14], [23, 15]]);
    this.fillPixels(ctx, [[20, 14], [21, 15], [22, 16]]);
  }

  /**
   * Draw boss sprite - Larger, more detailed bug with crown/horns
   */
  private static drawBossSprite(ctx: CanvasRenderingContext2D, color: string) {
    // Crown/horns
    ctx.fillStyle = '#ffcc00';
    this.fillPixels(ctx, [[12, 5], [13, 4], [14, 5]]);
    this.fillPixels(ctx, [[15, 3], [16, 3]]);
    this.fillPixels(ctx, [[17, 5], [18, 4], [19, 5]]);

    // Large head
    ctx.fillStyle = color;
    this.fillPixels(ctx, [[13, 7], [14, 7], [15, 7], [16, 7], [17, 7], [18, 7]]);
    this.fillPixels(ctx, [[12, 8], [13, 8], [14, 8], [15, 8], [16, 8], [17, 8], [18, 8], [19, 8]]);
    this.fillPixels(ctx, [[11, 9], [12, 9], [13, 9], [14, 9], [15, 9], [16, 9], [17, 9], [18, 9], [19, 9], [20, 9]]);

    // Menacing eyes
    ctx.fillStyle = '#ff0000';
    this.fillPixels(ctx, [[13, 8], [14, 8]]);
    this.fillPixels(ctx, [[17, 8], [18, 8]]);

    // Massive body
    ctx.fillStyle = color;
    this.fillPixels(ctx, [[10, 10], [11, 10], [12, 10], [13, 10], [14, 10], [15, 10], [16, 10], [17, 10], [18, 10], [19, 10], [20, 10], [21, 10]]);
    this.fillPixels(ctx, [[9, 11], [10, 11], [11, 11], [12, 11], [13, 11], [14, 11], [15, 11], [16, 11], [17, 11], [18, 11], [19, 11], [20, 11], [21, 11], [22, 11]]);
    this.fillPixels(ctx, [[9, 12], [10, 12], [11, 12], [12, 12], [13, 12], [14, 12], [15, 12], [16, 12], [17, 12], [18, 12], [19, 12], [20, 12], [21, 12], [22, 12]]);
    this.fillPixels(ctx, [[10, 13], [11, 13], [12, 13], [13, 13], [14, 13], [15, 13], [16, 13], [17, 13], [18, 13], [19, 13], [20, 13], [21, 13]]);
    this.fillPixels(ctx, [[11, 14], [12, 14], [13, 14], [14, 14], [15, 14], [16, 14], [17, 14], [18, 14], [19, 14], [20, 14]]);
    this.fillPixels(ctx, [[12, 15], [13, 15], [14, 15], [15, 15], [16, 15], [17, 15], [18, 15], [19, 15]]);

    // Armor plates (darker)
    ctx.fillStyle = this.darkenColor(color, 0.3);
    this.fillPixels(ctx, [[9, 11], [22, 11]]);
    this.fillPixels(ctx, [[10, 13], [21, 13]]);
    this.fillPixels(ctx, [[12, 15], [19, 15]]);

    // Boss aura glow (lighter)
    ctx.fillStyle = this.lightenColor(color, 0.3);
    this.fillPixels(ctx, [[8, 10], [23, 10]]);
    this.fillPixels(ctx, [[8, 11], [23, 11]]);
    this.fillPixels(ctx, [[8, 12], [23, 12]]);
  }

  // =========================================================================
  // Icon Sprites (16x16)
  // =========================================================================

  /**
   * Draw sword icon for attack
   */
  private static drawSwordIcon(ctx: CanvasRenderingContext2D, color: string) {
    ctx.fillStyle = color;
    // Blade
    this.fillPixels(ctx, [[11, 2], [10, 3], [9, 4], [8, 5], [7, 6], [6, 7]]);
    this.fillPixels(ctx, [[12, 2], [11, 3], [10, 4], [9, 5], [8, 6], [7, 7]]);

    // Guard
    ctx.fillStyle = '#cccccc';
    this.fillPixels(ctx, [[5, 8], [6, 8], [7, 8], [8, 8]]);

    // Handle
    ctx.fillStyle = '#8b4513';
    this.fillPixels(ctx, [[6, 9], [6, 10], [6, 11]]);

    // Pommel
    ctx.fillStyle = '#ffd700';
    this.fillPixels(ctx, [[5, 12], [6, 12], [7, 12]]);
  }

  /**
   * Draw star icon for skills
   */
  private static drawStarIcon(ctx: CanvasRenderingContext2D, color: string) {
    ctx.fillStyle = color;
    // Center
    this.fillPixels(ctx, [[7, 7], [8, 7], [7, 8], [8, 8]]);
    // Top spike
    this.fillPixels(ctx, [[7, 5], [8, 5], [7, 6], [8, 6]]);
    // Bottom spike
    this.fillPixels(ctx, [[7, 9], [8, 9], [7, 10], [8, 10]]);
    // Left spike
    this.fillPixels(ctx, [[5, 7], [6, 7], [5, 8], [6, 8]]);
    // Right spike
    this.fillPixels(ctx, [[9, 7], [10, 7], [9, 8], [10, 8]]);
    // Diagonals
    this.fillPixels(ctx, [[6, 6], [9, 6], [6, 9], [9, 9]]);
  }

  /**
   * Draw shield icon for focus/defense
   */
  private static drawShieldIcon(ctx: CanvasRenderingContext2D, color: string) {
    ctx.fillStyle = color;
    // Shield outline
    this.fillPixels(ctx, [[7, 3], [8, 3]]);
    this.fillPixels(ctx, [[6, 4], [7, 4], [8, 4], [9, 4]]);
    this.fillPixels(ctx, [[5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5]]);
    this.fillPixels(ctx, [[5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6]]);
    this.fillPixels(ctx, [[5, 7], [6, 7], [7, 7], [8, 7], [9, 7], [10, 7]]);
    this.fillPixels(ctx, [[5, 8], [6, 8], [7, 8], [8, 8], [9, 8], [10, 8]]);
    this.fillPixels(ctx, [[6, 9], [7, 9], [8, 9], [9, 9]]);
    this.fillPixels(ctx, [[6, 10], [7, 10], [8, 10], [9, 10]]);
    this.fillPixels(ctx, [[7, 11], [8, 11]]);
    this.fillPixels(ctx, [[7, 12], [8, 12]]);

    // Shield detail (darker)
    ctx.fillStyle = this.darkenColor(color, 0.3);
    this.fillPixels(ctx, [[7, 5], [8, 5]]);
    this.fillPixels(ctx, [[7, 6], [8, 6]]);
    this.fillPixels(ctx, [[7, 7], [8, 7]]);
    this.fillPixels(ctx, [[7, 8], [8, 8]]);
  }

  /**
   * Draw potion icon
   */
  private static drawPotionIcon(ctx: CanvasRenderingContext2D, color: string) {
    // Bottle neck
    ctx.fillStyle = '#888888';
    this.fillPixels(ctx, [[7, 4], [8, 4]]);
    this.fillPixels(ctx, [[7, 5], [8, 5]]);

    // Cork
    ctx.fillStyle = '#8b4513';
    this.fillPixels(ctx, [[6, 3], [7, 3], [8, 3], [9, 3]]);

    // Bottle body
    ctx.fillStyle = '#aaaaaa';
    this.fillPixels(ctx, [[6, 6], [7, 6], [8, 6], [9, 6]]);
    this.fillPixels(ctx, [[5, 7], [6, 7], [7, 7], [8, 7], [9, 7], [10, 7]]);
    this.fillPixels(ctx, [[5, 8], [6, 8], [7, 8], [8, 8], [9, 8], [10, 8]]);
    this.fillPixels(ctx, [[5, 9], [6, 9], [7, 9], [8, 9], [9, 9], [10, 9]]);
    this.fillPixels(ctx, [[5, 10], [6, 10], [7, 10], [8, 10], [9, 10], [10, 10]]);
    this.fillPixels(ctx, [[6, 11], [7, 11], [8, 11], [9, 11]]);

    // Liquid
    ctx.fillStyle = color;
    this.fillPixels(ctx, [[6, 8], [7, 8], [8, 8], [9, 8]]);
    this.fillPixels(ctx, [[6, 9], [7, 9], [8, 9], [9, 9]]);
    this.fillPixels(ctx, [[6, 10], [7, 10], [8, 10], [9, 10]]);
  }

  /**
   * Draw run/flee icon
   */
  private static drawRunIcon(ctx: CanvasRenderingContext2D, color: string) {
    ctx.fillStyle = color;
    // Stick figure running
    // Head
    this.fillPixels(ctx, [[8, 4], [9, 4], [8, 5], [9, 5]]);
    // Body
    this.fillPixels(ctx, [[8, 6], [9, 6], [8, 7], [9, 7], [8, 8], [9, 8]]);
    // Legs (running pose)
    this.fillPixels(ctx, [[7, 9], [8, 9], [6, 10], [7, 10]]);
    this.fillPixels(ctx, [[10, 9], [11, 9], [11, 10], [12, 10]]);
    // Arms (pumping)
    this.fillPixels(ctx, [[6, 6], [7, 6], [10, 7], [11, 7]]);

    // Motion lines
    ctx.fillStyle = this.lightenColor(color, 0.5);
    this.fillPixels(ctx, [[3, 5], [4, 5], [5, 5]]);
    this.fillPixels(ctx, [[2, 7], [3, 7], [4, 7]]);
    this.fillPixels(ctx, [[3, 9], [4, 9], [5, 9]]);
  }

  // =========================================================================
  // Utility Functions
  // =========================================================================

  /**
   * Fill multiple pixels at once
   */
  private static fillPixels(ctx: CanvasRenderingContext2D, pixels: number[][]) {
    for (const pixel of pixels) {
      const x = pixel[0];
      const y = pixel[1];
      if (x !== undefined && y !== undefined) {
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  /**
   * Convert hex color to RGB object
   */
  private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result || !result[1] || !result[2] || !result[3]) return null;

    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  }

  /**
   * Darken a color by a factor (0-1)
   */
  private static darkenColor(hex: string, factor: number): string {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;

    const r = Math.floor(rgb.r * (1 - factor));
    const g = Math.floor(rgb.g * (1 - factor));
    const b = Math.floor(rgb.b * (1 - factor));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  /**
   * Lighten a color by a factor (0-1)
   */
  private static lightenColor(hex: string, factor: number): string {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;

    const r = Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * factor));
    const g = Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * factor));
    const b = Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * factor));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}
