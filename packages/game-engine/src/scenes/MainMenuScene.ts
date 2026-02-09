import Phaser from 'phaser'
import { ProgressionSystem } from '../systems/ProgressionSystem';
import type { SaveData } from '../systems/ProgressionSystem';
import { SoundManager } from '../systems/SoundManager';

/**
 * MainMenuScene - Main menu with New Game, Continue, and Credits
 * Entry point after BootScene
 */
export class MainMenuScene extends Phaser.Scene {
  private creditsOverlay: Phaser.GameObjects.Container | null = null;
  private settingsOverlay: Phaser.GameObjects.Container | null = null;
  private soundManager?: SoundManager;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Dark background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1e1e1e);

    // Title with blue gradient effect (simulated with shadow)
    const title = this.add.text(width / 2, 120, 'Bug Slayer:', {
      fontSize: '48px',
      color: '#4a90e2',
      fontStyle: 'bold',
      stroke: '#2a5a8a',
      strokeThickness: 2,
    }).setOrigin(0.5);

    const subtitle = this.add.text(width / 2, 170, 'The Debugging Dungeon', {
      fontSize: '28px',
      color: '#569cd6',
      fontStyle: 'italic',
    }).setOrigin(0.5);

    // Button styling
    const btnStyle = (bgColor: string) => ({
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: bgColor,
      padding: { x: 30, y: 12 },
    });

    // New Game button
    const newGameBtn = this.add.text(width / 2, 280, 'New Game', btnStyle('#4a90e2'))
      .setOrigin(0.5)
      .setInteractive();

    newGameBtn.on('pointerover', () => newGameBtn.setBackgroundColor('#5aa0f2'));
    newGameBtn.on('pointerout', () => newGameBtn.setBackgroundColor('#4a90e2'));
    newGameBtn.on('pointerdown', () => this.startNewGame());

    // Continue button
    const continueBtn = this.add.text(width / 2, 350, 'Continue', btnStyle('#4ade80'))
      .setOrigin(0.5)
      .setInteractive();

    continueBtn.on('pointerover', () => continueBtn.setBackgroundColor('#5aee90'));
    continueBtn.on('pointerout', () => continueBtn.setBackgroundColor('#4ade80'));
    continueBtn.on('pointerdown', () => this.loadSavedGame());

    // Credits button
    const creditsBtn = this.add.text(width / 2, 420, 'Credits', btnStyle('#c586c0'))
      .setOrigin(0.5)
      .setInteractive();

    creditsBtn.on('pointerover', () => creditsBtn.setBackgroundColor('#d596d0'));
    creditsBtn.on('pointerout', () => creditsBtn.setBackgroundColor('#c586c0'));
    creditsBtn.on('pointerdown', () => this.showCredits());

    // Settings button
    const settingsBtn = this.add.text(width / 2, 490, 'Settings', btnStyle('#569cd6'))
      .setOrigin(0.5)
      .setInteractive();

    settingsBtn.on('pointerover', () => settingsBtn.setBackgroundColor('#6aace6'));
    settingsBtn.on('pointerout', () => settingsBtn.setBackgroundColor('#569cd6'));
    settingsBtn.on('pointerdown', () => this.showSettings());

    // Initialize sound manager
    this.soundManager = new SoundManager(this);

    // Version text
    this.add.text(width / 2, height - 30, 'v1.0.0 MVP', {
      fontSize: '14px',
      color: '#858585',
    }).setOrigin(0.5);
  }

  private startNewGame() {
    // Start with tutorial for new players (has skip button)
    this.scene.start('TutorialScene');
  }

  private loadSavedGame() {
    try {
      const saveData = ProgressionSystem.loadSave();

      if (!saveData) {
        // No save found - show message
        this.showNoSaveMessage();
        return;
      }

      // Load saved game into DungeonSelectScene
      const progressionSystem = new ProgressionSystem();
      progressionSystem.loadProgress(saveData);

      // Start DungeonSelectScene with saved data
      this.scene.start('DungeonSelectScene', {
        playerClass: saveData.playerClass,
        player: saveData.player,
        techDebt: saveData.techDebt,
        progression: progressionSystem,
        stagesCompleted: saveData.stagesCompleted ?? [],
        playTime: saveData.playTime ?? 0,
      });
    } catch (error) {
      console.error('Failed to load save:', error);
      this.showNoSaveMessage();
    }
  }

  private showNoSaveMessage() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Create temporary message overlay
    const messageOverlay = this.add.container(width / 2, height / 2);

    const bg = this.add.rectangle(0, 0, 400, 150, 0x1a1a2e, 0.95);
    bg.setStrokeStyle(2, 0xef4444);
    messageOverlay.add(bg);

    const message = this.add.text(0, -20, 'No save data found!', {
      fontSize: '20px',
      color: '#ef4444',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    messageOverlay.add(message);

    const hint = this.add.text(0, 20, 'Start a New Game to begin.', {
      fontSize: '14px',
      color: '#858585',
    }).setOrigin(0.5);
    messageOverlay.add(hint);

    // Auto-dismiss after 2 seconds
    this.time.delayedCall(2000, () => {
      messageOverlay.destroy();
    });
  }

  private showCredits() {
    if (this.creditsOverlay) return; // Already showing

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.creditsOverlay = this.add.container(width / 2, height / 2);

    // Semi-transparent background
    const bg = this.add.rectangle(0, 0, 500, 300, 0x1a1a2e, 0.95);
    bg.setStrokeStyle(2, 0xc586c0);
    this.creditsOverlay.add(bg);

    // Title
    const title = this.add.text(0, -100, 'Credits', {
      fontSize: '28px',
      color: '#c586c0',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.creditsOverlay.add(title);

    // Credits content
    const credits = this.add.text(0, -20,
      'Created by AI Chat Lounge Team\n\n' +
      'Game Design: 루미PM\n' +
      'Development: AI Agents\n' +
      'Project: Bug Slayer MVP\n\n' +
      'Built with Phaser 3 + TypeScript',
      {
        fontSize: '16px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 8,
      }
    ).setOrigin(0.5);
    this.creditsOverlay.add(credits);

    // Close button
    const closeBtn = this.add.text(0, 110, 'Close', {
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: '#4a90e2',
      padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setInteractive();

    closeBtn.on('pointerover', () => closeBtn.setBackgroundColor('#5aa0f2'));
    closeBtn.on('pointerout', () => closeBtn.setBackgroundColor('#4a90e2'));
    closeBtn.on('pointerdown', () => this.hideCredits());

    this.creditsOverlay.add(closeBtn);
  }

  private hideCredits() {
    if (this.creditsOverlay) {
      this.creditsOverlay.destroy();
      this.creditsOverlay = null;
    }
  }

  private showSettings() {
    if (this.settingsOverlay) return;

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    this.settingsOverlay = this.add.container(width / 2, height / 2);

    // Background
    const bg = this.add.rectangle(0, 0, 450, 300, 0x1a1a2e, 0.95);
    bg.setStrokeStyle(2, 0x569cd6);
    this.settingsOverlay.add(bg);

    // Title
    const title = this.add.text(0, -120, 'Settings', {
      fontSize: '24px', color: '#569cd6', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.settingsOverlay.add(title);

    // SFX Volume
    this.settingsOverlay.add(
      this.add.text(-180, -60, 'SFX Volume', { fontSize: '16px', color: '#d4d4d4' })
    );
    this.createVolumeSlider(-60, 'sfx');

    // BGM Volume
    this.settingsOverlay.add(
      this.add.text(-180, 0, 'BGM Volume', { fontSize: '16px', color: '#d4d4d4' })
    );
    this.createVolumeSlider(0, 'bgm');

    // Mute toggle
    const muteState = this.soundManager?.isMuted() ? 'ON' : 'OFF';
    const muteBtn = this.add.text(0, 60, `Mute: ${muteState}`, {
      fontSize: '18px', color: '#ffffff',
      backgroundColor: this.soundManager?.isMuted() ? '#f48771' : '#4ec9b0',
      padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setInteractive();

    muteBtn.on('pointerdown', () => {
      const muted = this.soundManager?.toggleMute();
      muteBtn.setText(`Mute: ${muted ? 'ON' : 'OFF'}`);
      muteBtn.setBackgroundColor(muted ? '#f48771' : '#4ec9b0');
    });
    this.settingsOverlay.add(muteBtn);

    // Close button
    const closeBtn = this.add.text(0, 110, 'Close', {
      fontSize: '18px', color: '#ffffff',
      backgroundColor: '#4a90e2', padding: { x: 20, y: 8 },
    }).setOrigin(0.5).setInteractive();

    closeBtn.on('pointerover', () => closeBtn.setBackgroundColor('#5aa0f2'));
    closeBtn.on('pointerout', () => closeBtn.setBackgroundColor('#4a90e2'));
    closeBtn.on('pointerdown', () => this.hideSettings());
    this.settingsOverlay.add(closeBtn);
  }

  private createVolumeSlider(y: number, type: 'sfx' | 'bgm') {
    if (!this.settingsOverlay || !this.soundManager) return;

    const currentVol = type === 'sfx'
      ? this.soundManager.getSFXVolume()
      : this.soundManager.getBGMVolume();

    // Slider track
    const trackWidth = 200;
    const trackX = 20;

    const track = this.add.rectangle(trackX + trackWidth / 2, y, trackWidth, 8, 0x3e3e42);
    this.settingsOverlay.add(track);

    // Slider fill
    const fill = this.add.rectangle(
      trackX, y, trackWidth * currentVol, 8, type === 'sfx' ? 0x4ec9b0 : 0x569cd6
    ).setOrigin(0, 0.5);
    this.settingsOverlay.add(fill);

    // Slider handle
    const handleX = trackX + trackWidth * currentVol;
    const handle = this.add.circle(handleX, y, 10, 0xffffff)
      .setInteractive({ draggable: true, useHandCursor: true });
    this.settingsOverlay.add(handle);

    // Value text
    const valText = this.add.text(trackX + trackWidth + 15, y,
      `${Math.round(currentVol * 100)}%`, {
      fontSize: '14px', color: '#d4d4d4',
    }).setOrigin(0, 0.5);
    this.settingsOverlay.add(valText);

    // Drag handler
    handle.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
      const minX = trackX - trackWidth / 2;
      const maxX = trackX + trackWidth / 2;
      const clampedX = Phaser.Math.Clamp(dragX, minX, maxX);
      handle.x = clampedX;

      const value = (clampedX - minX) / trackWidth;
      fill.width = trackWidth * value;
      valText.setText(`${Math.round(value * 100)}%`);

      if (type === 'sfx') {
        this.soundManager?.setSFXVolume(value);
      } else {
        this.soundManager?.setBGMVolume(value);
      }
    });
  }

  private hideSettings() {
    if (this.settingsOverlay) {
      this.settingsOverlay.destroy();
      this.settingsOverlay = null;
    }
  }
}
