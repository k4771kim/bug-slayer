import Phaser from 'phaser';

interface SoundSettings {
  sfxVolume: number;   // 0-1
  bgmVolume: number;   // 0-1
  muted: boolean;
}

const STORAGE_KEY = 'bug-slayer-sound-settings';

const DEFAULT_SETTINGS: SoundSettings = {
  sfxVolume: 0.7,
  bgmVolume: 0.5,
  muted: false,
};

/**
 * SoundManager - Centralized sound management utility
 *
 * Features:
 * - Separate SFX/BGM volume control
 * - Mute toggle
 * - localStorage persistence
 * - Programmatic sound generation via Web Audio API
 */
export class SoundManager {
  private scene: Phaser.Scene;
  private settings: SoundSettings;
  private currentBGM: Phaser.Sound.BaseSound | null = null;
  private currentBGMKey: string = '';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.settings = this.loadSettings();
  }

  // ---- Playback ----

  playSFX(key: string): void {
    if (this.settings.muted) return;
    try {
      this.scene.sound.play(key, { volume: this.settings.sfxVolume });
    } catch (e) {
      // Sound not loaded - ignore silently
    }
  }

  playBGM(key: string): void {
    if (this.currentBGMKey === key && this.currentBGM?.isPlaying) return;

    this.stopBGM();

    if (this.settings.muted) return;

    try {
      this.currentBGM = this.scene.sound.add(key, {
        volume: this.settings.bgmVolume,
        loop: true,
      });
      this.currentBGM.play();
      this.currentBGMKey = key;
    } catch (e) {
      // Sound not loaded - ignore silently
    }
  }

  stopBGM(): void {
    if (this.currentBGM) {
      this.currentBGM.stop();
      this.currentBGM.destroy();
      this.currentBGM = null;
      this.currentBGMKey = '';
    }
  }

  // ---- Volume Control ----

  setSFXVolume(value: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, value));
    this.saveSettings();
  }

  setBGMVolume(value: number): void {
    this.settings.bgmVolume = Math.max(0, Math.min(1, value));
    if (this.currentBGM && 'setVolume' in this.currentBGM) {
      (this.currentBGM as any).setVolume(this.settings.bgmVolume);
    }
    this.saveSettings();
  }

  getSFXVolume(): number { return this.settings.sfxVolume; }
  getBGMVolume(): number { return this.settings.bgmVolume; }
  isMuted(): boolean { return this.settings.muted; }

  toggleMute(): boolean {
    this.settings.muted = !this.settings.muted;

    if (this.settings.muted) {
      this.scene.sound.mute = true;
    } else {
      this.scene.sound.mute = false;
    }

    this.saveSettings();
    return this.settings.muted;
  }

  setMuted(muted: boolean): void {
    this.settings.muted = muted;
    this.scene.sound.mute = muted;
    this.saveSettings();
  }

  // ---- Persistence ----

  private loadSettings(): SoundSettings {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // ignore
    }
  }

  // ---- Static: Programmatic Sound Generation ----
  // These are called from BootScene to generate all sounds

  /**
   * Generate all game sounds programmatically and register with Phaser
   */
  static generateAllSounds(scene: Phaser.Scene): void {
    const audioContext = (scene.sound as any).context as AudioContext;
    if (!audioContext) {
      console.warn('SoundManager: Web Audio not available, skipping sound generation');
      return;
    }

    // SFX (short sounds)
    SoundManager.generateAndRegister(scene, audioContext, 'sfx-attack', () => SoundManager.genAttack(audioContext));
    SoundManager.generateAndRegister(scene, audioContext, 'sfx-skill', () => SoundManager.genSkill(audioContext));
    SoundManager.generateAndRegister(scene, audioContext, 'sfx-hit', () => SoundManager.genHit(audioContext));
    SoundManager.generateAndRegister(scene, audioContext, 'sfx-heal', () => SoundManager.genHeal(audioContext));
    SoundManager.generateAndRegister(scene, audioContext, 'sfx-levelup', () => SoundManager.genLevelUp(audioContext));
    SoundManager.generateAndRegister(scene, audioContext, 'sfx-boss-appear', () => SoundManager.genBossAppear(audioContext));
    SoundManager.generateAndRegister(scene, audioContext, 'sfx-boss-phase', () => SoundManager.genBossPhase(audioContext));
    SoundManager.generateAndRegister(scene, audioContext, 'sfx-item-drop', () => SoundManager.genItemDrop(audioContext));
    SoundManager.generateAndRegister(scene, audioContext, 'sfx-minigame-success', () => SoundManager.genSuccess(audioContext));
    SoundManager.generateAndRegister(scene, audioContext, 'sfx-minigame-fail', () => SoundManager.genFail(audioContext));
    SoundManager.generateAndRegister(scene, audioContext, 'sfx-click', () => SoundManager.genClick(audioContext));
    SoundManager.generateAndRegister(scene, audioContext, 'sfx-chapter-clear', () => SoundManager.genChapterClear(audioContext));
    SoundManager.generateAndRegister(scene, audioContext, 'sfx-ending', () => SoundManager.genEnding(audioContext));
    SoundManager.generateAndRegister(scene, audioContext, 'sfx-victory', () => SoundManager.genVictory(audioContext));
    SoundManager.generateAndRegister(scene, audioContext, 'sfx-defeat', () => SoundManager.genDefeat(audioContext));
    SoundManager.generateAndRegister(scene, audioContext, 'sfx-critical', () => SoundManager.genCritical(audioContext));
    SoundManager.generateAndRegister(scene, audioContext, 'sfx-evade', () => SoundManager.genEvade(audioContext));
    SoundManager.generateAndRegister(scene, audioContext, 'sfx-buff', () => SoundManager.genBuff(audioContext));
    SoundManager.generateAndRegister(scene, audioContext, 'sfx-debuff', () => SoundManager.genDebuff(audioContext));
    SoundManager.generateAndRegister(scene, audioContext, 'sfx-techdebt-warn', () => SoundManager.genTechDebtWarn(audioContext));

    // BGM (longer loops)
    SoundManager.generateAndRegister(scene, audioContext, 'bgm-battle', () => SoundManager.genBGMBattle(audioContext));
    SoundManager.generateAndRegister(scene, audioContext, 'bgm-boss', () => SoundManager.genBGMBoss(audioContext));

    console.log('SoundManager: All 22 sounds generated');
  }

  private static generateAndRegister(
    scene: Phaser.Scene,
    ctx: AudioContext,
    key: string,
    generator: () => AudioBuffer
  ): void {
    try {
      const buffer = generator();
      // Decode and add to Phaser sound manager
      scene.cache.audio.add(key, { data: buffer, sourceType: 'audioBuffer' } as any);
      // Alternative: use sound.decodeAudio
      (scene.sound as any).decodeAudio(key, buffer);
    } catch (e) {
      console.warn(`SoundManager: Failed to generate ${key}:`, e);
    }
  }

  // ---- Sound Generators (Web Audio API) ----
  // Each returns an AudioBuffer with the synthesized sound

  private static createBuffer(ctx: AudioContext, duration: number): AudioBuffer {
    return ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
  }

  private static fillBuffer(buffer: AudioBuffer, fn: (t: number, sampleRate: number) => number): AudioBuffer {
    const data = buffer.getChannelData(0);
    const sr = buffer.sampleRate;
    for (let i = 0; i < data.length; i++) {
      data[i] = fn(i / sr, sr);
    }
    return buffer;
  }

  // Helper: sine wave with envelope
  private static sineEnv(t: number, freq: number, duration: number, attack: number = 0.01): number {
    const env = t < attack ? t / attack : Math.max(0, 1 - (t - attack) / (duration - attack));
    return Math.sin(2 * Math.PI * freq * t) * env;
  }

  // Helper: noise
  private static noise(): number {
    return Math.random() * 2 - 1;
  }

  // 1. Attack - short swoosh
  private static genAttack(ctx: AudioContext): AudioBuffer {
    const buf = SoundManager.createBuffer(ctx, 0.15);
    return SoundManager.fillBuffer(buf, (t) => {
      const freq = 800 - t * 4000;
      return SoundManager.sineEnv(t, freq, 0.15) * 0.4;
    });
  }

  // 2. Skill - ascending tone
  private static genSkill(ctx: AudioContext): AudioBuffer {
    const buf = SoundManager.createBuffer(ctx, 0.3);
    return SoundManager.fillBuffer(buf, (t) => {
      const freq = 400 + t * 1200;
      return SoundManager.sineEnv(t, freq, 0.3) * 0.3;
    });
  }

  // 3. Hit - impact thud
  private static genHit(ctx: AudioContext): AudioBuffer {
    const buf = SoundManager.createBuffer(ctx, 0.1);
    return SoundManager.fillBuffer(buf, (t) => {
      const env = Math.max(0, 1 - t / 0.1);
      return (SoundManager.noise() * 0.5 + Math.sin(2 * Math.PI * 150 * t)) * env * 0.5;
    });
  }

  // 4. Heal - gentle chime
  private static genHeal(ctx: AudioContext): AudioBuffer {
    const buf = SoundManager.createBuffer(ctx, 0.5);
    return SoundManager.fillBuffer(buf, (t) => {
      return (SoundManager.sineEnv(t, 523, 0.5) + SoundManager.sineEnv(t, 659, 0.5) * 0.5) * 0.25;
    });
  }

  // 5. Level Up - triumphant arpeggio
  private static genLevelUp(ctx: AudioContext): AudioBuffer {
    const buf = SoundManager.createBuffer(ctx, 0.8);
    return SoundManager.fillBuffer(buf, (t) => {
      const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
      const noteLen = 0.2;
      const idx = Math.min(3, Math.floor(t / noteLen));
      const localT = t - idx * noteLen;
      return SoundManager.sineEnv(localT, notes[idx]!, noteLen) * 0.3;
    });
  }

  // 6. Boss Appear - ominous low tone
  private static genBossAppear(ctx: AudioContext): AudioBuffer {
    const buf = SoundManager.createBuffer(ctx, 1.0);
    return SoundManager.fillBuffer(buf, (t) => {
      const env = Math.min(1, t / 0.3) * Math.max(0, 1 - (t - 0.5) / 0.5);
      return (Math.sin(2 * Math.PI * 80 * t) + Math.sin(2 * Math.PI * 120 * t) * 0.5) * env * 0.4;
    });
  }

  // 7. Boss Phase - dramatic shift
  private static genBossPhase(ctx: AudioContext): AudioBuffer {
    const buf = SoundManager.createBuffer(ctx, 0.6);
    return SoundManager.fillBuffer(buf, (t) => {
      const freq = 200 + Math.sin(t * 20) * 100;
      return SoundManager.sineEnv(t, freq, 0.6) * 0.4;
    });
  }

  // 8. Item Drop - coin-like ding
  private static genItemDrop(ctx: AudioContext): AudioBuffer {
    const buf = SoundManager.createBuffer(ctx, 0.3);
    return SoundManager.fillBuffer(buf, (t) => {
      return (SoundManager.sineEnv(t, 1200, 0.15) + SoundManager.sineEnv(Math.max(0, t - 0.1), 1500, 0.2)) * 0.25;
    });
  }

  // 9. Success - happy jingle
  private static genSuccess(ctx: AudioContext): AudioBuffer {
    const buf = SoundManager.createBuffer(ctx, 0.5);
    return SoundManager.fillBuffer(buf, (t) => {
      const notes = [523, 659, 784];
      const noteLen = 0.15;
      const idx = Math.min(2, Math.floor(t / noteLen));
      const localT = t - idx * noteLen;
      return SoundManager.sineEnv(localT, notes[idx]!, noteLen) * 0.3;
    });
  }

  // 10. Fail - sad descending tone
  private static genFail(ctx: AudioContext): AudioBuffer {
    const buf = SoundManager.createBuffer(ctx, 0.4);
    return SoundManager.fillBuffer(buf, (t) => {
      const freq = 400 - t * 600;
      return SoundManager.sineEnv(t, Math.max(100, freq), 0.4) * 0.3;
    });
  }

  // 11. Click - short blip
  private static genClick(ctx: AudioContext): AudioBuffer {
    const buf = SoundManager.createBuffer(ctx, 0.05);
    return SoundManager.fillBuffer(buf, (t) => {
      return SoundManager.sineEnv(t, 1000, 0.05) * 0.2;
    });
  }

  // 12. Chapter Clear - fanfare
  private static genChapterClear(ctx: AudioContext): AudioBuffer {
    const buf = SoundManager.createBuffer(ctx, 1.2);
    return SoundManager.fillBuffer(buf, (t) => {
      const notes = [523, 659, 784, 1047, 1047];
      const noteLen = 0.24;
      const idx = Math.min(4, Math.floor(t / noteLen));
      const localT = t - idx * noteLen;
      return SoundManager.sineEnv(localT, notes[idx]!, noteLen) * 0.3;
    });
  }

  // 13. Ending - sustained chord
  private static genEnding(ctx: AudioContext): AudioBuffer {
    const buf = SoundManager.createBuffer(ctx, 2.0);
    return SoundManager.fillBuffer(buf, (t) => {
      const env = Math.min(1, t / 0.5) * Math.max(0, 1 - (t - 1.0) / 1.0);
      return (Math.sin(2 * Math.PI * 261 * t) + Math.sin(2 * Math.PI * 329 * t) * 0.7 + Math.sin(2 * Math.PI * 392 * t) * 0.5) * env * 0.2;
    });
  }

  // 14. Victory - triumphant
  private static genVictory(ctx: AudioContext): AudioBuffer {
    const buf = SoundManager.createBuffer(ctx, 0.6);
    return SoundManager.fillBuffer(buf, (t) => {
      const notes = [392, 523, 659, 784];
      const noteLen = 0.15;
      const idx = Math.min(3, Math.floor(t / noteLen));
      const localT = t - idx * noteLen;
      return SoundManager.sineEnv(localT, notes[idx]!, noteLen) * 0.3;
    });
  }

  // 15. Defeat - descending sad
  private static genDefeat(ctx: AudioContext): AudioBuffer {
    const buf = SoundManager.createBuffer(ctx, 0.8);
    return SoundManager.fillBuffer(buf, (t) => {
      const notes = [392, 349, 294, 261];
      const noteLen = 0.2;
      const idx = Math.min(3, Math.floor(t / noteLen));
      const localT = t - idx * noteLen;
      return SoundManager.sineEnv(localT, notes[idx]!, noteLen) * 0.3;
    });
  }

  // 16. Critical - sharp hit
  private static genCritical(ctx: AudioContext): AudioBuffer {
    const buf = SoundManager.createBuffer(ctx, 0.2);
    return SoundManager.fillBuffer(buf, (t) => {
      const env = Math.max(0, 1 - t / 0.2);
      return (SoundManager.noise() * 0.3 + Math.sin(2 * Math.PI * 600 * t) + Math.sin(2 * Math.PI * 900 * t) * 0.5) * env * 0.4;
    });
  }

  // 17. Evade - whoosh
  private static genEvade(ctx: AudioContext): AudioBuffer {
    const buf = SoundManager.createBuffer(ctx, 0.2);
    return SoundManager.fillBuffer(buf, (t) => {
      const freq = 2000 * (1 - t / 0.2);
      const env = t < 0.05 ? t / 0.05 : Math.max(0, 1 - (t - 0.05) / 0.15);
      return SoundManager.noise() * env * 0.15 + SoundManager.sineEnv(t, freq, 0.2) * 0.1;
    });
  }

  // 18. Buff - ascending sparkle
  private static genBuff(ctx: AudioContext): AudioBuffer {
    const buf = SoundManager.createBuffer(ctx, 0.3);
    return SoundManager.fillBuffer(buf, (t) => {
      const freq = 800 + t * 1000;
      return SoundManager.sineEnv(t, freq, 0.3) * 0.25;
    });
  }

  // 19. Debuff - descending buzz
  private static genDebuff(ctx: AudioContext): AudioBuffer {
    const buf = SoundManager.createBuffer(ctx, 0.3);
    return SoundManager.fillBuffer(buf, (t) => {
      const freq = 500 - t * 800;
      return SoundManager.sineEnv(t, Math.max(80, freq), 0.3) * 0.25;
    });
  }

  // 20. Tech Debt Warning - alarm
  private static genTechDebtWarn(ctx: AudioContext): AudioBuffer {
    const buf = SoundManager.createBuffer(ctx, 0.4);
    return SoundManager.fillBuffer(buf, (t) => {
      const freq = 600 + Math.sin(t * 30) * 200;
      return SoundManager.sineEnv(t, freq, 0.4) * 0.3;
    });
  }

  // BGM Battle - lo-fi loop (4 seconds)
  private static genBGMBattle(ctx: AudioContext): AudioBuffer {
    const dur = 4;
    const buf = SoundManager.createBuffer(ctx, dur);
    return SoundManager.fillBuffer(buf, (t) => {
      // Simple lo-fi beat: bass + hi-hat pattern
      const beat = t % 0.5;
      const bass = Math.sin(2 * Math.PI * 110 * t) * (beat < 0.1 ? 0.3 : 0.05);
      const hihat = beat > 0.25 && beat < 0.28 ? SoundManager.noise() * 0.08 : 0;
      const melody = Math.sin(2 * Math.PI * (220 + Math.sin(t * 0.5) * 30) * t) * 0.05;
      return (bass + hihat + melody) * 0.5;
    });
  }

  // BGM Boss - intense loop (4 seconds)
  private static genBGMBoss(ctx: AudioContext): AudioBuffer {
    const dur = 4;
    const buf = SoundManager.createBuffer(ctx, dur);
    return SoundManager.fillBuffer(buf, (t) => {
      const beat = t % 0.25;
      const bass = Math.sin(2 * Math.PI * 80 * t) * (beat < 0.05 ? 0.4 : 0.1);
      const hihat = beat > 0.12 && beat < 0.15 ? SoundManager.noise() * 0.12 : 0;
      const lead = Math.sin(2 * Math.PI * (160 + Math.sin(t * 3) * 50) * t) * 0.08;
      const tension = Math.sin(2 * Math.PI * 55 * t) * 0.15;
      return (bass + hihat + lead + tension) * 0.4;
    });
  }
}
