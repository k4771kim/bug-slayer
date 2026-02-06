/**
 * AccessibilitySystem - WCAG AA compliance and color blindness support
 *
 * Ensures all game elements meet accessibility standards:
 * - WCAG AA contrast ratios (4.5:1 for text, 3:1 for large text/UI)
 * - Color+icon pairing for color-blind users
 * - Color blindness simulation filters
 * - Palette validation against background
 */

export interface AccessibilityConfig {
  highContrast: boolean;
  colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  iconPairing: boolean; // Always show icons alongside colors
  textScale: number; // 1.0 = default, 1.5 = large
}

export interface ColorIconPair {
  color: string; // Hex color (e.g., "#4ec9b0")
  icon: string; // Unicode emoji or symbol
  shape?: string; // Optional shape identifier for rendering
  label: string; // Screen reader text
}

export interface ValidationReport {
  passed: boolean;
  results: Array<{
    color: string;
    name: string;
    contrastRatio: number;
    passesAA: boolean;
    passesAALarge: boolean;
    suggestion?: string;
  }>;
}

/**
 * AccessibilitySystem provides color accessibility verification and
 * color+icon pairing for color-blind friendly UI.
 */
export class AccessibilitySystem {
  private static readonly WCAG_AA_NORMAL = 4.5; // 4.5:1 for normal text
  private static readonly WCAG_AA_LARGE = 3.0; // 3:1 for large text (18pt+) and UI components

  private config: AccessibilityConfig;
  private pairs: Map<string, ColorIconPair>;

  constructor(config: Partial<AccessibilityConfig> = {}) {
    this.config = {
      highContrast: config.highContrast ?? false,
      colorBlindMode: config.colorBlindMode ?? 'none',
      iconPairing: config.iconPairing ?? true,
      textScale: config.textScale ?? 1.0,
    };
    this.pairs = new Map();
  }

  // =========================================================================
  // Color+Icon Pairing (Static methods for global access)
  // =========================================================================

  /**
   * Get accessible color+icon pair for character stats
   */
  static getStatusPair(stat: string): ColorIconPair {
    const pairs: Record<string, ColorIconPair> = {
      HP: { color: '#4ec9b0', icon: '❤', shape: 'heart', label: 'Health Points' },
      MP: { color: '#569cd6', icon: '◆', shape: 'diamond', label: 'Magic Points' },
      ATK: { color: '#f48771', icon: '⚔', shape: 'upTriangle', label: 'Attack' },
      DEF: { color: '#dcdcaa', icon: '🛡', shape: 'square', label: 'Defense' },
      SPD: { color: '#9cdcfe', icon: '⚡', shape: 'bolt', label: 'Speed' },
    };
    return pairs[stat] ?? { color: '#d4d4d4', icon: '?', label: stat };
  }

  /**
   * Get accessible color+icon pair for item rarity
   */
  static getRarityPair(rarity: string): ColorIconPair {
    const pairs: Record<string, ColorIconPair> = {
      common: { color: '#d4d4d4', icon: '○', shape: 'circle', label: 'Common' },
      rare: { color: '#569cd6', icon: '★', shape: 'star', label: 'Rare' },
      epic: { color: '#c586c0', icon: '♔', shape: 'crown', label: 'Epic' },
    };
    return pairs[rarity] ?? pairs.common!;
  }

  /**
   * Get tech debt level indicator with color+icon pairing
   */
  static getTechDebtPair(level: string): ColorIconPair {
    const pairs: Record<string, ColorIconPair> = {
      low: { color: '#89d185', icon: '✓', shape: 'checkmark', label: 'Low Tech Debt' },
      medium: { color: '#cca700', icon: '⚠', shape: 'warning', label: 'Medium Tech Debt' },
      high: { color: '#ce9178', icon: '!', shape: 'exclamation', label: 'High Tech Debt' },
      critical: { color: '#f48771', icon: '☠', shape: 'skull', label: 'Critical Tech Debt' },
    };
    return pairs[level] ?? pairs.medium!;
  }

  /**
   * Get combat action color+icon pair
   */
  static getCombatActionPair(action: string): ColorIconPair {
    const pairs: Record<string, ColorIconPair> = {
      attack: { color: '#f48771', icon: '⚔', shape: 'sword', label: 'Attack' },
      skill: { color: '#569cd6', icon: '⭐', shape: 'star', label: 'Skill' },
      focus: { color: '#dcdcaa', icon: '🛡', shape: 'shield', label: 'Focus' },
      item: { color: '#4ec9b0', icon: '🧭', shape: 'compass', label: 'Item' },
      flee: { color: '#858585', icon: '🏃', shape: 'run', label: 'Flee' },
    };
    return pairs[action] ?? { color: '#d4d4d4', icon: '?', label: action };
  }

  /**
   * Get stage status indicator
   */
  static getStageStatusPair(status: string): ColorIconPair {
    const pairs: Record<string, ColorIconPair> = {
      completed: { color: '#4ec9b0', icon: '✓', shape: 'checkmark', label: 'Completed' },
      current: { color: '#dcdcaa', icon: '▶', shape: 'arrow', label: 'Current' },
      locked: { color: '#858585', icon: '🔒', shape: 'lock', label: 'Locked' },
    };
    return pairs[status] ?? pairs.locked!;
  }

  // =========================================================================
  // Contrast Ratio Calculation (WCAG 2.1)
  // =========================================================================

  /**
   * Calculate relative luminance of a color (WCAG formula)
   * @param color Hex color string (e.g., "#4ec9b0")
   */
  private static getRelativeLuminance(color: string): number {
    // Parse hex color
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    // Apply gamma correction (sRGB)
    const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    // Calculate luminance
    return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB;
  }

  /**
   * Calculate contrast ratio between two colors (WCAG 2.1)
   * Returns ratio from 1:1 (no contrast) to 21:1 (max contrast)
   */
  static contrastRatio(fg: string, bg: string): number {
    const l1 = this.getRelativeLuminance(fg);
    const l2 = this.getRelativeLuminance(bg);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Get WCAG compliant text color for a given background
   * Returns white or black depending on which provides better contrast
   */
  static getAccessibleTextColor(bgColor: string): string {
    const whiteContrast = this.contrastRatio('#ffffff', bgColor);
    const blackContrast = this.contrastRatio('#000000', bgColor);

    return whiteContrast > blackContrast ? '#ffffff' : '#000000';
  }

  // =========================================================================
  // Color Blindness Simulation
  // =========================================================================

  /**
   * Simulate color blindness using Brettel et al. 1997 algorithm
   * @param color Hex color string
   * @param type Color blindness type
   */
  static simulateColorBlindness(
    color: string,
    type: 'protanopia' | 'deuteranopia' | 'tritanopia' | 'none'
  ): string {
    if (type === 'none') return color;

    // Parse hex color
    const hex = color.replace('#', '');
    let r = parseInt(hex.substring(0, 2), 16) / 255;
    let g = parseInt(hex.substring(2, 4), 16) / 255;
    let b = parseInt(hex.substring(4, 6), 16) / 255;

    // Simplified transformation matrices (Brettel et al. 1997)
    let rOut: number, gOut: number, bOut: number;

    switch (type) {
      case 'protanopia': // Red-blind
        rOut = 0.567 * r + 0.433 * g;
        gOut = 0.558 * r + 0.442 * g;
        bOut = 0.242 * g + 0.758 * b;
        break;

      case 'deuteranopia': // Green-blind
        rOut = 0.625 * r + 0.375 * g;
        gOut = 0.7 * r + 0.3 * g;
        bOut = 0.3 * g + 0.7 * b;
        break;

      case 'tritanopia': // Blue-blind
        rOut = 0.95 * r + 0.05 * g;
        gOut = 0.433 * g + 0.567 * b;
        bOut = 0.475 * g + 0.525 * b;
        break;

      default:
        return color;
    }

    // Clamp to [0, 1]
    rOut = Math.max(0, Math.min(1, rOut));
    gOut = Math.max(0, Math.min(1, gOut));
    bOut = Math.max(0, Math.min(1, bOut));

    // Convert back to hex
    const rHex = Math.round(rOut * 255).toString(16).padStart(2, '0');
    const gHex = Math.round(gOut * 255).toString(16).padStart(2, '0');
    const bHex = Math.round(bOut * 255).toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  }

  // =========================================================================
  // Palette Validation
  // =========================================================================

  /**
   * Validate all colors in a palette against a background color
   * @param palette Object with color values (nested structure supported)
   * @param bgColor Background color to test against (default: VS Code Dark+ primary)
   */
  static validatePalette(
    palette: Record<string, any>,
    bgColor: string = '#1e1e1e'
  ): ValidationReport {
    const results: ValidationReport['results'] = [];

    // Recursive function to extract all color values
    const extractColors = (obj: any, prefix: string = ''): void => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (typeof value === 'string' && value.startsWith('#')) {
          // This is a color value
          const ratio = this.contrastRatio(value, bgColor);
          const passesAA = ratio >= this.WCAG_AA_NORMAL;
          const passesAALarge = ratio >= this.WCAG_AA_LARGE;

          let suggestion: string | undefined;
          if (!passesAA) {
            suggestion = passesAALarge
              ? 'Use for large text (18pt+) or UI components only'
              : 'Increase contrast or use with icon pairing';
          }

          results.push({
            color: value,
            name: fullKey,
            contrastRatio: Math.round(ratio * 100) / 100,
            passesAA,
            passesAALarge,
            suggestion,
          });
        } else if (typeof value === 'object' && value !== null) {
          // Recurse into nested objects
          extractColors(value, fullKey);
        }
      }
    };

    extractColors(palette);

    // Overall pass if all colors meet at least WCAG AA Large (3:1)
    const passed = results.every(r => r.passesAALarge);

    return { passed, results };
  }

  // =========================================================================
  // Instance Configuration
  // =========================================================================

  /**
   * Update accessibility configuration
   */
  setConfig(config: Partial<AccessibilityConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AccessibilityConfig {
    return { ...this.config };
  }

  /**
   * Apply color blindness filter to a color based on current config
   */
  applyColorBlindFilter(color: string): string {
    return AccessibilitySystem.simulateColorBlindness(color, this.config.colorBlindMode);
  }

  /**
   * Get text scale multiplier
   */
  getTextScale(): number {
    return this.config.textScale;
  }

  /**
   * Check if icon pairing is enabled
   */
  isIconPairingEnabled(): boolean {
    return this.config.iconPairing;
  }

  /**
   * Check if high contrast mode is enabled
   */
  isHighContrastEnabled(): boolean {
    return this.config.highContrast;
  }
}
