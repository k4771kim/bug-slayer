/**
 * EndingScene - Game Ending Screen
 *
 * Handles:
 * - Ending determination based on Tech Debt
 * - Ending story display
 * - Final statistics
 * - Credits
 *
 * Ending Conditions (from GDD):
 * - Good Ending: Tech Debt 0-39 (Clean Code Champion)
 * - Normal Ending: Tech Debt 40-70 (Decent Developer)
 * - Bad Ending: Tech Debt 71-100 (Technical Debt Disaster)
 * - Secret Ending: Tech Debt 0 + All Warnings Killed + Boss Defeated
 */

import Phaser from 'phaser'

export type EndingType = 'good' | 'normal' | 'bad' | 'secret';

export interface EndingData {
  endingType: EndingType;
  techDebt: number;
  totalDefeated: number;
  playTime: number;
  chapter: number;
  finalLevel: number;
  allWarningsKilled: boolean;
}

interface EndingContent {
  title: string;
  subtitle: string;
  story: string[];
  reward: string;
  color: string;
}

/**
 * EndingScene - Shows game ending based on player's Tech Debt
 */
export class EndingScene extends Phaser.Scene {
  private endingData: EndingData | null = null;
  private titleText: Phaser.GameObjects.Text | null = null;
  private storyText: Phaser.GameObjects.Text | null = null;
  private statsText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'EndingScene' });
  }

  init(data: EndingData) {
    console.log('EndingScene initialized with:', data);
    this.endingData = data;
  }

  create() {
    if (!this.endingData) {
      console.error('No ending data provided');
      return;
    }

    const { width, height } = this.cameras.main;

    // Get ending content based on type
    const content = this.getEndingContent(this.endingData.endingType);

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, parseInt(content.color.replace('#', '0x'), 16), 0.2);

    // Title
    this.titleText = this.add.text(width / 2, 100, content.title, {
      fontSize: '48px',
      color: content.color,
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, 160, content.subtitle, {
      fontSize: '24px',
      color: '#d4d4d4',
      align: 'center',
    }).setOrigin(0.5);

    // Story text (multi-line)
    const storyY = 220;
    const storyLines = content.story.join('\n\n');
    this.storyText = this.add.text(width / 2, storyY, storyLines, {
      fontSize: '18px',
      color: '#d4d4d4',
      align: 'center',
      wordWrap: { width: width - 100 },
      lineSpacing: 10,
    }).setOrigin(0.5, 0);

    // Final Statistics
    const statsY = height - 200;
    const statsContent = this.formatStatistics(this.endingData);
    this.statsText = this.add.text(width / 2, statsY, statsContent, {
      fontSize: '16px',
      color: '#888888',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5);

    // Ending badge
    const badgeText = this.getEndingBadge(this.endingData.endingType);
    this.add.text(width / 2, statsY - 80, badgeText, {
      fontSize: '32px',
      color: content.color,
      align: 'center',
    }).setOrigin(0.5);

    // Rewards section
    const rewardsY = statsY - 30;
    this.add.text(width / 2, rewardsY, '⭐ REWARDS', {
      fontSize: '20px',
      color: '#dcdcaa',
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(width / 2, rewardsY + 30, content.reward, {
      fontSize: '16px',
      color: content.color,
      align: 'center',
      wordWrap: { width: width - 100 },
    }).setOrigin(0.5);

    // Continue prompt
    this.add.text(width / 2, height - 60, 'Press SPACE to return to main menu', {
      fontSize: '16px',
      color: '#666666',
      align: 'center',
    }).setOrigin(0.5);

    // Input handling
    this.input.keyboard?.once('keydown-SPACE', () => {
      this.scene.start('ClassSelectScene');
    });

    // Play ending-specific sound effect (TODO: add sound)
    console.log(`Ending: ${this.endingData.endingType} - Tech Debt: ${this.endingData.techDebt}`);
  }

  /**
   * Get ending content based on ending type
   */
  private getEndingContent(endingType: EndingType): EndingContent {
    switch (endingType) {
      case 'good':
        return {
          title: '✨ GOOD ENDING ✨',
          subtitle: 'Clean Code Champion',
          story: [
            'Your code is pristine, your architecture sound.',
            'The bugs have been vanquished, and the codebase shines.',
            'Senior developers nod in approval as they review your work.',
            'You\'ve earned the title of "Code Quality Guardian".',
            '',
            'The project ships on time with zero critical bugs.',
            'Your team celebrates with cake and high-fives.',
          ],
          reward: 'Unlocked: Clean Code legendary weapon + Clean Architecture title',
          color: '#4ec9b0', // Green (success)
        };

      case 'normal':
        return {
          title: '👍 NORMAL ENDING',
          subtitle: 'Decent Developer',
          story: [
            'The bugs are fixed, but some technical debt remains.',
            'It\'s not perfect, but it works well enough.',
            'The PM accepts the deliverable with minor reservations.',
            'You\'ve done your job competently.',
            '',
            'The project ships with a few known issues.',
            '"We\'ll refactor it in the next sprint," they say.',
            '(They never do.)',
          ],
          reward: 'Basic completion reward',
          color: '#dcdcaa', // Yellow (warning)
        };

      case 'bad':
        return {
          title: '💀 BAD ENDING',
          subtitle: 'Technical Debt Disaster',
          story: [
            'The bugs are gone, but at what cost?',
            'Your code is a tangled mess of quick fixes.',
            'The tech debt has spiraled out of control.',
            '"The bugs... they never truly die," whispers a voice in the dark.',
            '',
            'The system collapses under the weight of accumulated debt.',
            'The project ships, but crashes within a week.',
            'You spend the next month firefighting.',
            'The PM is... not pleased.',
          ],
          reward: 'Challenge Token: +10% difficulty on next run',
          color: '#f48771', // Red (error)
        };

      case 'secret':
        return {
          title: '🎊 SECRET ENDING 🎊',
          subtitle: 'Perfect Code Deity',
          story: [
            '🌟 LEGENDARY ACHIEVEMENT UNLOCKED 🌟',
            '',
            'Zero bugs. Zero tech debt. Zero compromises.',
            'You\'ve achieved what many thought impossible.',
            'Your code is so clean it could be taught in universities.',
            '',
            '"You are the developer we\'ve always needed," says the lead architect.',
            'The CTO personally offers you a senior architect position.',
            'Other developers ask you to mentor them.',
            'Your GitHub profile becomes a shrine.',
            '',
            'You are the embodiment of clean code principles.',
          ],
          reward: 'Unlocked: Perfect Developer title + Secret Dungeon',
          color: '#c586c0', // Purple (legendary)
        };
    }
  }

  /**
   * Get ending badge emoji
   */
  private getEndingBadge(endingType: EndingType): string {
    switch (endingType) {
      case 'good':
        return '🏆 CLEAN CODE CHAMPION';
      case 'normal':
        return '⚙️ WORKING AS INTENDED';
      case 'bad':
        return '🔥 TECHNICAL DEBT ACQUIRED';
      case 'secret':
        return '👑 LEGENDARY DEVELOPER';
    }
  }

  /**
   * Format final statistics
   */
  private formatStatistics(data: EndingData): string {
    const hours = Math.floor(data.playTime / 3600);
    const minutes = Math.floor((data.playTime % 3600) / 60);
    const timeString = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    return [
      '═══════════════════════════════════════',
      `FINAL STATISTICS`,
      '═══════════════════════════════════════',
      `Tech Debt: ${data.techDebt}/100`,
      `Bugs Defeated: ${data.totalDefeated}`,
      `Final Level: ${data.finalLevel}`,
      `Chapters Completed: ${data.chapter}`,
      `Play Time: ${timeString}`,
      '═══════════════════════════════════════',
    ].join('\n');
  }

  /**
   * Static method to determine ending type based on Tech Debt
   */
  static determineEnding(techDebt: number, allWarningsKilled: boolean, allStagesCleared: boolean): EndingType {
    // Secret ending: Tech Debt < 20 + all stages cleared
    if (techDebt < 20 && allStagesCleared) {
      return 'secret';
    }

    // Normal endings based on Tech Debt
    if (techDebt <= 39) {
      return 'good';
    } else if (techDebt <= 70) {
      return 'normal';
    } else {
      return 'bad';
    }
  }

  /**
   * Get ending description for UI
   */
  static getEndingDescription(endingType: EndingType): string {
    switch (endingType) {
      case 'good':
        return 'Tech Debt 0-39: Clean Code Champion';
      case 'normal':
        return 'Tech Debt 40-70: Decent Developer';
      case 'bad':
        return 'Tech Debt 71-100: Technical Debt Disaster';
      case 'secret':
        return 'Tech Debt 0 + Perfect Run: Legendary Developer';
    }
  }
}
