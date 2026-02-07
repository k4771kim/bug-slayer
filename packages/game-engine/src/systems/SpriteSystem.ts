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

    // Route to specific monster sprites
    switch (nameId) {
      // Ch.3 Monsters
      case 'threadstarvation':
        this.drawThreadStarvationSprite(ctx, color);
        break;
      case 'livelock':
        this.drawLivelockSprite(ctx, color);
        break;
      case 'priorityinversion':
        this.drawPriorityInversionSprite(ctx, color);
        break;
      case 'phantomread':
        this.drawPhantomReadSprite(ctx, color);
        break;
      case 'lostupdate':
        this.drawLostUpdateSprite(ctx, color);
        break;
      case 'concurrencychaos':
        this.drawConcurrencyChaosSprite(ctx, color);
        break;
      // Ch.4 Monsters
      case 'corsbypass':
        this.drawCorsBypassSprite(ctx, color);
        break;
      case 'csrfattack':
        this.drawCsrfAttackSprite(ctx, color);
        break;
      case 'antipattern':
        this.drawAntiPatternSprite(ctx, color);
        break;
      case 'dependencyhell':
        this.drawDependencyHellSprite(ctx, color);
        break;
      case 'techdebtoverflow':
        this.drawTechDebtOverflowSprite(ctx, color);
        break;
      case 'spaghettidragon':
        this.drawSpaghettiDragonSprite(ctx, color);
        break;
      default:
        // Fallback for Ch.1-2 monsters
        if (nameId.includes('boss') || nameId.includes('heisenbug') || nameId.includes('finalcompiler') || nameId.includes('concurrencychaos') || nameId.includes('spaghettidragon')) {
          this.drawBossSprite(ctx, color);
        } else {
          this.drawBugSprite(ctx, color);
        }
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
  // Chapter 3 Monster Sprites (Concurrency Theme)
  // =========================================================================

  /**
   * Draw Thread Starvation sprite - Emaciated creature with reaching arms
   */
  private static drawThreadStarvationSprite(ctx: CanvasRenderingContext2D, color: string) {
    // Thin, skeletal head
    ctx.fillStyle = color;
    this.fillPixels(ctx, [[15, 8], [16, 8]]);
    this.fillPixels(ctx, [[14, 9], [15, 9], [16, 9], [17, 9]]);
    this.fillPixels(ctx, [[14, 10], [17, 10]]);

    // Hollow eyes (starving look)
    ctx.fillStyle = this.darkenColor(color, 0.7);
    this.fillPixels(ctx, [[14, 9], [17, 9]]);

    // Very thin body (emaciated)
    ctx.fillStyle = color;
    this.fillPixels(ctx, [[15, 11], [16, 11]]);
    this.fillPixels(ctx, [[15, 12], [16, 12]]);
    this.fillPixels(ctx, [[15, 13], [16, 13]]);
    this.fillPixels(ctx, [[15, 14], [16, 14]]);

    // Ribs visible (darker lines)
    ctx.fillStyle = this.darkenColor(color, 0.4);
    this.fillPixels(ctx, [[14, 11], [17, 11]]);
    this.fillPixels(ctx, [[14, 13], [17, 13]]);

    // Reaching arms (desperate, grasping)
    ctx.fillStyle = color;
    // Left arm reaching up
    this.fillPixels(ctx, [[13, 12], [12, 11], [11, 10], [10, 9]]);
    this.fillPixels(ctx, [[9, 8], [8, 8]]); // Hand
    // Right arm reaching up
    this.fillPixels(ctx, [[18, 12], [19, 11], [20, 10], [21, 9]]);
    this.fillPixels(ctx, [[22, 8], [23, 8]]); // Hand

    // Thin legs
    this.fillPixels(ctx, [[14, 15], [14, 16]]);
    this.fillPixels(ctx, [[17, 15], [17, 16]]);
  }

  /**
   * Draw Livelock sprite - Two intertwined spinning arrows/loops
   */
  private static drawLivelockSprite(ctx: CanvasRenderingContext2D, color: string) {
    const darker = this.darkenColor(color, 0.3);

    // Left spiral (clockwise)
    ctx.fillStyle = color;
    // Outer ring
    this.fillPixels(ctx, [[11, 8], [12, 8], [13, 8]]);
    this.fillPixels(ctx, [[10, 9], [13, 9]]);
    this.fillPixels(ctx, [[10, 10], [13, 10]]);
    this.fillPixels(ctx, [[10, 11], [13, 11]]);
    this.fillPixels(ctx, [[11, 12], [12, 12], [13, 12]]);
    // Arrow head (top)
    this.fillPixels(ctx, [[12, 7], [11, 7], [13, 7]]);

    // Right spiral (counter-clockwise)
    ctx.fillStyle = darker;
    // Outer ring
    this.fillPixels(ctx, [[18, 8], [19, 8], [20, 8]]);
    this.fillPixels(ctx, [[18, 9], [21, 9]]);
    this.fillPixels(ctx, [[18, 10], [21, 10]]);
    this.fillPixels(ctx, [[18, 11], [21, 11]]);
    this.fillPixels(ctx, [[18, 12], [19, 12], [20, 12]]);
    // Arrow head (bottom)
    this.fillPixels(ctx, [[19, 13], [18, 13], [20, 13]]);

    // Connecting loop (showing they're stuck together)
    ctx.fillStyle = this.lightenColor(color, 0.2);
    this.fillPixels(ctx, [[14, 10], [15, 10], [16, 10], [17, 10]]);

    // Motion blur lines (spinning effect)
    ctx.fillStyle = this.lightenColor(color, 0.5);
    this.fillPixels(ctx, [[9, 10], [8, 10]]);
    this.fillPixels(ctx, [[22, 10], [23, 10]]);
  }

  /**
   * Draw Priority Inversion sprite - Upside-down creature
   */
  private static drawPriorityInversionSprite(ctx: CanvasRenderingContext2D, color: string) {
    // Body (at top, inverted)
    ctx.fillStyle = color;
    this.fillPixels(ctx, [[13, 7], [14, 7], [15, 7], [16, 7], [17, 7], [18, 7]]);
    this.fillPixels(ctx, [[12, 8], [13, 8], [14, 8], [15, 8], [16, 8], [17, 8], [18, 8], [19, 8]]);
    this.fillPixels(ctx, [[13, 9], [14, 9], [15, 9], [16, 9], [17, 9], [18, 9]]);

    // Darker segment
    ctx.fillStyle = this.darkenColor(color, 0.3);
    this.fillPixels(ctx, [[12, 8], [19, 8]]);

    // Head hanging down (inverted)
    ctx.fillStyle = color;
    this.fillPixels(ctx, [[14, 10], [15, 10], [16, 10], [17, 10]]);
    this.fillPixels(ctx, [[14, 11], [15, 11], [16, 11], [17, 11]]);

    // Eyes (confused, upside-down)
    ctx.fillStyle = this.darkenColor(color, 0.6);
    this.fillPixels(ctx, [[14, 11], [17, 11]]);

    // Arms hanging down
    ctx.fillStyle = color;
    this.fillPixels(ctx, [[12, 10], [12, 11], [12, 12]]);
    this.fillPixels(ctx, [[19, 10], [19, 11], [19, 12]]);

    // Legs pointing up (inverted)
    this.fillPixels(ctx, [[14, 6], [14, 5]]);
    this.fillPixels(ctx, [[17, 6], [17, 5]]);

    // "Wrong way" arrow indicator
    ctx.fillStyle = '#ff6666';
    this.fillPixels(ctx, [[15, 13], [16, 13]]);
    this.fillPixels(ctx, [[14, 14], [15, 14], [16, 14], [17, 14]]);
    this.fillPixels(ctx, [[15, 15], [16, 15]]);
  }

  /**
   * Draw Phantom Read sprite - Ghost/phantom shape
   */
  private static drawPhantomReadSprite(ctx: CanvasRenderingContext2D, color: string) {
    // Semi-transparent ghost body (lighter color to simulate transparency)
    const ghostColor = this.lightenColor(color, 0.4);
    ctx.fillStyle = ghostColor;

    // Ghost head
    this.fillPixels(ctx, [[14, 8], [15, 8], [16, 8], [17, 8]]);
    this.fillPixels(ctx, [[13, 9], [14, 9], [15, 9], [16, 9], [17, 9], [18, 9]]);

    // Hollow eyes (phantom look)
    ctx.fillStyle = this.darkenColor(color, 0.8);
    this.fillPixels(ctx, [[14, 9], [17, 9]]);

    // Ghost body (wavy, ethereal)
    ctx.fillStyle = ghostColor;
    this.fillPixels(ctx, [[13, 10], [14, 10], [15, 10], [16, 10], [17, 10], [18, 10]]);
    this.fillPixels(ctx, [[12, 11], [13, 11], [14, 11], [15, 11], [16, 11], [17, 11], [18, 11], [19, 11]]);
    this.fillPixels(ctx, [[12, 12], [13, 12], [14, 12], [15, 12], [16, 12], [17, 12], [18, 12], [19, 12]]);
    this.fillPixels(ctx, [[13, 13], [14, 13], [15, 13], [16, 13], [17, 13], [18, 13]]);

    // Wavy bottom (ghostly trailing edges)
    this.fillPixels(ctx, [[13, 14], [15, 14], [17, 14]]);
    this.fillPixels(ctx, [[14, 15], [16, 15], [18, 15]]);

    // Phantom glow aura
    ctx.fillStyle = this.lightenColor(color, 0.6);
    this.fillPixels(ctx, [[12, 10], [19, 10]]);
    this.fillPixels(ctx, [[11, 11], [20, 11]]);
    this.fillPixels(ctx, [[11, 12], [20, 12]]);
  }

  /**
   * Draw Lost Update sprite - Glitchy creature with duplicate shadows
   */
  private static drawLostUpdateSprite(ctx: CanvasRenderingContext2D, color: string) {
    // Main body (primary)
    ctx.fillStyle = color;
    this.fillPixels(ctx, [[15, 9], [16, 9]]);
    this.fillPixels(ctx, [[14, 10], [15, 10], [16, 10], [17, 10]]);
    this.fillPixels(ctx, [[14, 11], [15, 11], [16, 11], [17, 11]]);
    this.fillPixels(ctx, [[13, 12], [14, 12], [15, 12], [16, 12], [17, 12], [18, 12]]);
    this.fillPixels(ctx, [[14, 13], [15, 13], [16, 13], [17, 13]]);

    // Eyes
    ctx.fillStyle = this.darkenColor(color, 0.6);
    this.fillPixels(ctx, [[14, 10], [17, 10]]);

    // Shadow/duplicate 1 (offset left-up, glitchy)
    ctx.fillStyle = this.lightenColor(color, 0.3);
    this.fillPixels(ctx, [[13, 8], [14, 8]]);
    this.fillPixels(ctx, [[12, 9], [13, 9], [14, 9], [15, 9]]);
    this.fillPixels(ctx, [[12, 10], [13, 10], [14, 10], [15, 10]]);
    this.fillPixels(ctx, [[11, 11], [12, 11], [13, 11], [14, 11], [15, 11], [16, 11]]);

    // Shadow/duplicate 2 (offset right-down, glitchy)
    ctx.fillStyle = this.darkenColor(color, 0.2);
    this.fillPixels(ctx, [[17, 10], [18, 10]]);
    this.fillPixels(ctx, [[16, 11], [17, 11], [18, 11], [19, 11]]);
    this.fillPixels(ctx, [[15, 12], [16, 12], [17, 12], [18, 12], [19, 12], [20, 12]]);
    this.fillPixels(ctx, [[16, 13], [17, 13], [18, 13], [19, 13]]);
    this.fillPixels(ctx, [[17, 14], [18, 14]]);

    // Glitch scanlines
    ctx.fillStyle = this.lightenColor(color, 0.5);
    this.fillPixels(ctx, [[11, 10], [12, 10], [19, 10], [20, 10]]);
  }

  /**
   * Draw Concurrency Chaos (BOSS) sprite - Multi-headed hydra with tendrils
   */
  private static drawConcurrencyChaosSprite(ctx: CanvasRenderingContext2D, color: string) {
    // Crown (boss indicator)
    ctx.fillStyle = '#ffcc00';
    this.fillPixels(ctx, [[11, 4], [12, 3], [13, 4]]);
    this.fillPixels(ctx, [[15, 2], [16, 2]]);
    this.fillPixels(ctx, [[18, 4], [19, 3], [20, 4]]);

    // Central body (massive)
    ctx.fillStyle = color;
    this.fillPixels(ctx, [[12, 10], [13, 10], [14, 10], [15, 10], [16, 10], [17, 10], [18, 10], [19, 10]]);
    this.fillPixels(ctx, [[11, 11], [12, 11], [13, 11], [14, 11], [15, 11], [16, 11], [17, 11], [18, 11], [19, 11], [20, 11]]);
    this.fillPixels(ctx, [[10, 12], [11, 12], [12, 12], [13, 12], [14, 12], [15, 12], [16, 12], [17, 12], [18, 12], [19, 12], [20, 12], [21, 12]]);
    this.fillPixels(ctx, [[11, 13], [12, 13], [13, 13], [14, 13], [15, 13], [16, 13], [17, 13], [18, 13], [19, 13], [20, 13]]);
    this.fillPixels(ctx, [[12, 14], [13, 14], [14, 14], [15, 14], [16, 14], [17, 14], [18, 14], [19, 14]]);

    // Head 1 (left)
    ctx.fillStyle = color;
    this.fillPixels(ctx, [[10, 6], [11, 6], [12, 6]]);
    this.fillPixels(ctx, [[10, 7], [11, 7], [12, 7]]);
    this.fillPixels(ctx, [[10, 8], [11, 8], [12, 8]]);
    // Neck
    this.fillPixels(ctx, [[11, 9]]);
    // Eye
    ctx.fillStyle = '#ff0000';
    this.fillPixels(ctx, [[11, 7]]);

    // Head 2 (center)
    ctx.fillStyle = color;
    this.fillPixels(ctx, [[14, 5], [15, 5], [16, 5], [17, 5]]);
    this.fillPixels(ctx, [[14, 6], [15, 6], [16, 6], [17, 6]]);
    this.fillPixels(ctx, [[14, 7], [15, 7], [16, 7], [17, 7]]);
    // Neck
    this.fillPixels(ctx, [[15, 8], [16, 8]]);
    this.fillPixels(ctx, [[15, 9], [16, 9]]);
    // Eyes
    ctx.fillStyle = '#ff0000';
    this.fillPixels(ctx, [[14, 6], [17, 6]]);

    // Head 3 (right)
    ctx.fillStyle = color;
    this.fillPixels(ctx, [[19, 6], [20, 6], [21, 6]]);
    this.fillPixels(ctx, [[19, 7], [20, 7], [21, 7]]);
    this.fillPixels(ctx, [[19, 8], [20, 8], [21, 8]]);
    // Neck
    this.fillPixels(ctx, [[20, 9]]);
    // Eye
    ctx.fillStyle = '#ff0000';
    this.fillPixels(ctx, [[20, 7]]);

    // Thread-like tendrils
    ctx.fillStyle = this.darkenColor(color, 0.3);
    // Left tendrils
    this.fillPixels(ctx, [[9, 11], [8, 12], [7, 13]]);
    this.fillPixels(ctx, [[9, 13], [8, 14], [7, 15]]);
    // Right tendrils
    this.fillPixels(ctx, [[22, 11], [23, 12], [24, 13]]);
    this.fillPixels(ctx, [[22, 13], [23, 14], [24, 15]]);

    // Boss aura
    ctx.fillStyle = this.lightenColor(color, 0.3);
    this.fillPixels(ctx, [[9, 12], [22, 12]]);
    this.fillPixels(ctx, [[10, 13], [21, 13]]);
  }

  // =========================================================================
  // Chapter 4 Monster Sprites (Security/Architecture Theme)
  // =========================================================================

  /**
   * Draw CORS Bypass sprite - Shield with crack/breach
   */
  private static drawCorsBypassSprite(ctx: CanvasRenderingContext2D, color: string) {
    // Shield outline
    ctx.fillStyle = color;
    this.fillPixels(ctx, [[15, 7], [16, 7]]);
    this.fillPixels(ctx, [[14, 8], [15, 8], [16, 8], [17, 8]]);
    this.fillPixels(ctx, [[13, 9], [14, 9], [15, 9], [16, 9], [17, 9], [18, 9]]);
    this.fillPixels(ctx, [[13, 10], [14, 10], [15, 10], [16, 10], [17, 10], [18, 10]]);
    this.fillPixels(ctx, [[13, 11], [14, 11], [15, 11], [16, 11], [17, 11], [18, 11]]);
    this.fillPixels(ctx, [[13, 12], [14, 12], [15, 12], [16, 12], [17, 12], [18, 12]]);
    this.fillPixels(ctx, [[14, 13], [15, 13], [16, 13], [17, 13]]);
    this.fillPixels(ctx, [[14, 14], [15, 14], [16, 14], [17, 14]]);
    this.fillPixels(ctx, [[15, 15], [16, 15]]);

    // Crack through the middle (showing breach)
    ctx.fillStyle = '#ff0000';
    this.fillPixels(ctx, [[15, 8], [16, 8]]);
    this.fillPixels(ctx, [[15, 9], [16, 9]]);
    this.fillPixels(ctx, [[14, 10], [17, 10]]);
    this.fillPixels(ctx, [[15, 11], [16, 11]]);
    this.fillPixels(ctx, [[15, 12], [16, 12]]);
    this.fillPixels(ctx, [[14, 13], [17, 13]]);
    this.fillPixels(ctx, [[15, 14], [16, 14]]);

    // Shattered pieces
    ctx.fillStyle = this.lightenColor(color, 0.3);
    this.fillPixels(ctx, [[12, 9], [11, 8]]);
    this.fillPixels(ctx, [[19, 9], [20, 8]]);
    this.fillPixels(ctx, [[12, 12], [11, 13]]);
    this.fillPixels(ctx, [[19, 12], [20, 13]]);
  }

  /**
   * Draw CSRF Attack sprite - Hooded infiltrator with forged token
   */
  private static drawCsrfAttackSprite(ctx: CanvasRenderingContext2D, color: string) {
    // Hood (sneaky infiltrator)
    ctx.fillStyle = color;
    this.fillPixels(ctx, [[14, 7], [15, 7], [16, 7], [17, 7]]);
    this.fillPixels(ctx, [[13, 8], [14, 8], [15, 8], [16, 8], [17, 8], [18, 8]]);
    this.fillPixels(ctx, [[12, 9], [13, 9], [18, 9], [19, 9]]);

    // Face in shadow
    ctx.fillStyle = this.darkenColor(color, 0.6);
    this.fillPixels(ctx, [[14, 9], [15, 9], [16, 9], [17, 9]]);

    // Sinister eyes
    ctx.fillStyle = '#ff6666';
    this.fillPixels(ctx, [[14, 9], [17, 9]]);

    // Body (dark cloak)
    ctx.fillStyle = color;
    this.fillPixels(ctx, [[13, 10], [14, 10], [15, 10], [16, 10], [17, 10], [18, 10]]);
    this.fillPixels(ctx, [[12, 11], [13, 11], [14, 11], [15, 11], [16, 11], [17, 11], [18, 11], [19, 11]]);
    this.fillPixels(ctx, [[12, 12], [13, 12], [14, 12], [15, 12], [16, 12], [17, 12], [18, 12], [19, 12]]);
    this.fillPixels(ctx, [[13, 13], [14, 13], [15, 13], [16, 13], [17, 13], [18, 13]]);
    this.fillPixels(ctx, [[14, 14], [15, 14], [16, 14], [17, 14]]);

    // Forged token (glowing fake badge)
    ctx.fillStyle = '#ffcc00';
    this.fillPixels(ctx, [[20, 10], [21, 10]]);
    this.fillPixels(ctx, [[20, 11], [21, 11]]);
    // Red X (indicating fake)
    ctx.fillStyle = '#ff0000';
    this.fillPixels(ctx, [[20, 10], [21, 11]]);
    this.fillPixels(ctx, [[21, 10], [20, 11]]);
  }

  /**
   * Draw Anti-Pattern sprite - Crystallized tangled geometric shape
   */
  private static drawAntiPatternSprite(ctx: CanvasRenderingContext2D, color: string) {
    // Central crystallized mass (wrong pattern)
    ctx.fillStyle = color;
    // Diamond shape
    this.fillPixels(ctx, [[15, 7], [16, 7]]);
    this.fillPixels(ctx, [[14, 8], [15, 8], [16, 8], [17, 8]]);
    this.fillPixels(ctx, [[13, 9], [14, 9], [15, 9], [16, 9], [17, 9], [18, 9]]);
    this.fillPixels(ctx, [[13, 10], [14, 10], [15, 10], [16, 10], [17, 10], [18, 10]]);
    this.fillPixels(ctx, [[13, 11], [14, 11], [15, 11], [16, 11], [17, 11], [18, 11]]);
    this.fillPixels(ctx, [[14, 12], [15, 12], [16, 12], [17, 12]]);
    this.fillPixels(ctx, [[15, 13], [16, 13]]);

    // Tangled geometric lines (wrong connections)
    ctx.fillStyle = this.darkenColor(color, 0.4);
    // Crossing lines creating confusion
    this.fillPixels(ctx, [[13, 9], [14, 10], [15, 11]]);
    this.fillPixels(ctx, [[18, 9], [17, 10], [16, 11]]);
    this.fillPixels(ctx, [[13, 11], [14, 12], [15, 13]]);
    this.fillPixels(ctx, [[18, 11], [17, 12], [16, 13]]);

    // Sharp crystal spikes (dangerous pattern)
    ctx.fillStyle = this.lightenColor(color, 0.2);
    this.fillPixels(ctx, [[11, 9], [10, 8]]);
    this.fillPixels(ctx, [[20, 9], [21, 8]]);
    this.fillPixels(ctx, [[12, 12], [11, 13]]);
    this.fillPixels(ctx, [[19, 12], [20, 13]]);

    // Grid overlay showing broken pattern
    ctx.fillStyle = this.darkenColor(color, 0.3);
    this.fillPixels(ctx, [[15, 8], [15, 9], [15, 10], [15, 11], [15, 12]]);
    this.fillPixels(ctx, [[16, 8], [16, 9], [16, 10], [16, 11], [16, 12]]);
  }

  /**
   * Draw Dependency Hell sprite - Chain-link creature with dangling chains
   */
  private static drawDependencyHellSprite(ctx: CanvasRenderingContext2D, color: string) {
    // Core body (trapped)
    ctx.fillStyle = color;
    this.fillPixels(ctx, [[14, 9], [15, 9], [16, 9], [17, 9]]);
    this.fillPixels(ctx, [[14, 10], [15, 10], [16, 10], [17, 10]]);
    this.fillPixels(ctx, [[14, 11], [15, 11], [16, 11], [17, 11]]);

    // Distressed eyes
    ctx.fillStyle = this.darkenColor(color, 0.7);
    this.fillPixels(ctx, [[14, 9], [17, 9]]);

    // Chain links wrapping around body
    ctx.fillStyle = '#888888';
    // Top chains
    this.fillPixels(ctx, [[12, 8], [13, 8], [14, 8]]);
    this.fillPixels(ctx, [[17, 8], [18, 8], [19, 8]]);
    // Side chains
    this.fillPixels(ctx, [[12, 9], [12, 10]]);
    this.fillPixels(ctx, [[19, 9], [19, 10]]);
    // Bottom chains
    this.fillPixels(ctx, [[13, 11], [18, 11]]);

    // Dangling chain segments (left)
    this.fillPixels(ctx, [[11, 11], [11, 12]]);
    this.fillPixels(ctx, [[10, 13], [10, 14]]);
    this.fillPixels(ctx, [[9, 15], [9, 16]]);

    // Dangling chain segments (right)
    this.fillPixels(ctx, [[20, 11], [20, 12]]);
    this.fillPixels(ctx, [[21, 13], [21, 14]]);
    this.fillPixels(ctx, [[22, 15], [22, 16]]);

    // Center dangling chains
    this.fillPixels(ctx, [[15, 12], [15, 13], [15, 14]]);
    this.fillPixels(ctx, [[16, 12], [16, 13], [16, 14]]);

    // Chain highlights
    ctx.fillStyle = '#aaaaaa';
    this.fillPixels(ctx, [[12, 8], [19, 8]]);
    this.fillPixels(ctx, [[11, 11], [20, 11]]);
  }

  /**
   * Draw Tech Debt Overflow sprite - Overflowing stack of blocks
   */
  private static drawTechDebtOverflowSprite(ctx: CanvasRenderingContext2D, color: string) {
    // Base container (overflowing)
    ctx.fillStyle = color;
    // Bottom container
    this.fillPixels(ctx, [[12, 13], [13, 13], [14, 13], [15, 13], [16, 13], [17, 13], [18, 13], [19, 13]]);
    this.fillPixels(ctx, [[12, 14], [19, 14]]);
    this.fillPixels(ctx, [[12, 15], [13, 15], [14, 15], [15, 15], [16, 15], [17, 15], [18, 15], [19, 15]]);

    // Stack of tech debt blocks (tipping over)
    ctx.fillStyle = this.darkenColor(color, 0.2);
    // Layer 1
    this.fillPixels(ctx, [[13, 12], [14, 12], [15, 12]]);
    // Layer 2 (offset)
    this.fillPixels(ctx, [[14, 11], [15, 11], [16, 11]]);
    // Layer 3 (more offset, tipping)
    this.fillPixels(ctx, [[15, 10], [16, 10], [17, 10]]);
    // Layer 4 (falling)
    this.fillPixels(ctx, [[16, 9], [17, 9], [18, 9]]);
    // Layer 5 (definitely falling)
    this.fillPixels(ctx, [[17, 8], [18, 8], [19, 8]]);

    // Falling/loose blocks
    ctx.fillStyle = this.lightenColor(color, 0.2);
    this.fillPixels(ctx, [[20, 7], [21, 7]]);
    this.fillPixels(ctx, [[19, 10], [20, 10]]);
    this.fillPixels(ctx, [[11, 11], [12, 11]]);

    // Cracks in structure
    ctx.fillStyle = '#ff0000';
    this.fillPixels(ctx, [[14, 12]]);
    this.fillPixels(ctx, [[15, 11]]);
    this.fillPixels(ctx, [[16, 10]]);
    this.fillPixels(ctx, [[17, 9]]);

    // Warning lines (overflow indicator)
    ctx.fillStyle = '#ffcc00';
    this.fillPixels(ctx, [[11, 12], [20, 12]]);
  }

  /**
   * Draw Spaghetti Dragon (BOSS) sprite - Dragon made of tangled noodle lines
   */
  private static drawSpaghettiDragonSprite(ctx: CanvasRenderingContext2D, color: string) {
    // Boss crown
    ctx.fillStyle = '#ffcc00';
    this.fillPixels(ctx, [[10, 3], [11, 2], [12, 3]]);
    this.fillPixels(ctx, [[15, 1], [16, 1]]);
    this.fillPixels(ctx, [[19, 3], [20, 2], [21, 3]]);

    // Dragon head (massive)
    ctx.fillStyle = color;
    this.fillPixels(ctx, [[12, 5], [13, 5], [14, 5], [15, 5], [16, 5], [17, 5], [18, 5], [19, 5]]);
    this.fillPixels(ctx, [[11, 6], [12, 6], [13, 6], [14, 6], [15, 6], [16, 6], [17, 6], [18, 6], [19, 6], [20, 6]]);
    this.fillPixels(ctx, [[11, 7], [12, 7], [13, 7], [14, 7], [15, 7], [16, 7], [17, 7], [18, 7], [19, 7], [20, 7]]);
    this.fillPixels(ctx, [[12, 8], [13, 8], [14, 8], [15, 8], [16, 8], [17, 8], [18, 8], [19, 8]]);

    // Menacing red eyes
    ctx.fillStyle = '#ff0000';
    this.fillPixels(ctx, [[13, 6], [14, 6]]);
    this.fillPixels(ctx, [[17, 6], [18, 6]]);

    // Spaghetti body (tangled lines)
    ctx.fillStyle = color;
    // Main body mass
    this.fillPixels(ctx, [[10, 9], [11, 9], [12, 9], [13, 9], [14, 9], [15, 9], [16, 9], [17, 9], [18, 9], [19, 9], [20, 9], [21, 9]]);
    this.fillPixels(ctx, [[9, 10], [10, 10], [11, 10], [12, 10], [13, 10], [14, 10], [15, 10], [16, 10], [17, 10], [18, 10], [19, 10], [20, 10], [21, 10], [22, 10]]);
    this.fillPixels(ctx, [[10, 11], [11, 11], [12, 11], [13, 11], [14, 11], [15, 11], [16, 11], [17, 11], [18, 11], [19, 11], [20, 11], [21, 11]]);

    // Tangled spaghetti strands (creating chaotic pattern)
    ctx.fillStyle = this.darkenColor(color, 0.3);
    // Wavy tangled lines
    this.fillPixels(ctx, [[8, 10], [7, 11], [6, 12], [7, 13]]);
    this.fillPixels(ctx, [[23, 10], [24, 11], [25, 12], [24, 13]]);
    this.fillPixels(ctx, [[11, 12], [12, 13], [13, 14], [14, 13], [15, 12]]);
    this.fillPixels(ctx, [[16, 12], [17, 13], [18, 14], [19, 13], [20, 12]]);

    // More tangled strands overlapping
    ctx.fillStyle = this.lightenColor(color, 0.2);
    this.fillPixels(ctx, [[10, 12], [11, 13], [10, 14]]);
    this.fillPixels(ctx, [[21, 12], [20, 13], [21, 14]]);
    this.fillPixels(ctx, [[14, 11], [15, 12], [16, 11]]);

    // Spaghetti dripping/dangling
    ctx.fillStyle = color;
    this.fillPixels(ctx, [[12, 15], [12, 16]]);
    this.fillPixels(ctx, [[15, 15], [15, 16]]);
    this.fillPixels(ctx, [[19, 15], [19, 16]]);

    // Boss aura (chaotic energy)
    ctx.fillStyle = this.lightenColor(color, 0.4);
    this.fillPixels(ctx, [[8, 9], [23, 9]]);
    this.fillPixels(ctx, [[7, 10], [24, 10]]);
    this.fillPixels(ctx, [[9, 11], [22, 11]]);
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
