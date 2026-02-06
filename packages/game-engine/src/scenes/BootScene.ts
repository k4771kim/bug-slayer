import Phaser from 'phaser';

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

    // TODO: Load game assets here
    // this.load.image('character', 'assets/characters/debugger.png');
    // this.load.image('bug', 'assets/bugs/nullpointer.png');
  }

  create() {
    console.log('BootScene: Assets loaded, transitioning to BattleScene');

    // Transition to battle scene for MVP
    this.scene.start('BattleScene', {
      playerClass: 'Debugger',
      chapter: 1,
      stage: 1,
    });
  }
}
