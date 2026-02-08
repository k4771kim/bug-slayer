/**
 * ProgressionSystem - Chapter and Stage Management
 *
 * Handles:
 * - Chapter/stage unlocking logic
 * - Progress tracking (current chapter/stage)
 * - Save/load progression state
 * - Stage completion rewards
 * - Chapter completion milestones
 *
 * Progression Flow:
 * - Chapter 1: 5 bugs → 1 boss (OffByOneError)
 * - Chapter 2: 4 bugs → 1 boss (Heisenbug)
 * - Chapter 3: 5 bugs → 1 boss (Concurrency Chaos)
 * - Chapter 4: 5 bugs → 1 boss (Spaghetti Code Dragon)
 * - Chapters unlock sequentially
 * - Each stage must be completed to unlock next
 */

import type { Chapter } from '@bug-slayer/shared';

export interface StageProgress {
  chapter: Chapter;
  stage: number;
  completed: boolean;
  attempts: number;
  bestTime?: number;
  techDebt: number;
}

export interface ChapterProgress {
  chapter: Chapter;
  unlocked: boolean;
  completed: boolean;
  stagesCompleted: number;
  totalStages: number;
  bossDefeated: boolean;
}

export interface GameProgress {
  currentChapter: Chapter;
  currentStage: number;
  chapters: Map<Chapter, ChapterProgress>;
  stages: StageProgress[];
  totalDefeated: number;
  totalTechDebt: number;
  playTime: number;
  lastPlayed: Date;
  classUnlocks: Map<string, boolean>; // classId -> unlocked
}

export interface SaveData {
  version: string;
  timestamp: string;
  playerClass?: string;
  player?: any; // Character data
  techDebt?: number;
  stagesCompleted?: number[];
  playTime?: number;
  progress: {
    currentChapter: number;
    currentStage: number;
    chapters: Array<{ chapter: number; data: ChapterProgress }>;
    stages: StageProgress[];
    totalDefeated: number;
    totalTechDebt: number;
    playTime: number;
    classUnlocks?: Array<[string, boolean]>;
  };
}

/**
 * ProgressionSystem class manages game progression
 */
export class ProgressionSystem {
  private progress: GameProgress;
  private readonly SAVE_KEY = 'bug-slayer-progress';
  private readonly SAVE_VERSION = '1.0.0';

  // Chapter configuration
  private readonly CHAPTER_CONFIG: Record<number, { totalStages: number; bugs: number; boss: number }> = {
    1: { totalStages: 6, bugs: 5, boss: 1 }, // 5 bugs + OffByOneError boss
    2: { totalStages: 5, bugs: 4, boss: 1 }, // 4 bugs + Heisenbug boss
    3: { totalStages: 6, bugs: 5, boss: 1 }, // 5 bugs + Concurrency Chaos boss
    4: { totalStages: 6, bugs: 5, boss: 1 }, // 5 bugs + Spaghetti Code Dragon boss
  };

  constructor() {
    this.progress = this.initializeProgress();
  }

  /**
   * Initialize default progress
   */
  private initializeProgress(): GameProgress {
    return {
      currentChapter: 1,
      currentStage: 1,
      chapters: new Map([
        [1, { chapter: 1, unlocked: true, completed: false, stagesCompleted: 0, totalStages: 6, bossDefeated: false }],
        [2, { chapter: 2, unlocked: false, completed: false, stagesCompleted: 0, totalStages: 5, bossDefeated: false }],
        [3, { chapter: 3, unlocked: false, completed: false, stagesCompleted: 0, totalStages: 6, bossDefeated: false }],
        [4, { chapter: 4, unlocked: false, completed: false, stagesCompleted: 0, totalStages: 6, bossDefeated: false }],
      ]),
      stages: [],
      totalDefeated: 0,
      totalTechDebt: 0,
      playTime: 0,
      lastPlayed: new Date(),
      classUnlocks: new Map([
        ['gpu-warlock', false],
        ['cat-summoner', false],
        ['code-ninja', false],
        ['light-mage', false],
      ]),
    };
  }

  /**
   * Get current chapter
   */
  getCurrentChapter(): Chapter {
    return this.progress.currentChapter;
  }

  /**
   * Get current stage
   */
  getCurrentStage(): number {
    return this.progress.currentStage;
  }

  /**
   * Check if chapter is unlocked
   */
  isChapterUnlocked(chapter: Chapter): boolean {
    return this.progress.chapters.get(chapter)?.unlocked ?? false;
  }

  /**
   * Check if stage is unlocked
   */
  isStageUnlocked(chapter: Chapter, stage: number): boolean {
    const chapterData = this.progress.chapters.get(chapter);
    if (!chapterData || !chapterData.unlocked) return false;

    // First stage is always unlocked if chapter is unlocked
    if (stage === 1) return true;

    // Check if previous stage is completed
    return chapterData.stagesCompleted >= stage - 1;
  }

  /**
   * Complete current stage and advance
   */
  completeStage(techDebt: number, time?: number): { chapterCompleted: boolean; newChapterUnlocked: boolean } {
    const chapter = this.progress.currentChapter;
    const stage = this.progress.currentStage;

    console.log('[Progression] Completing Stage:', {
      chapter,
      stage,
      techDebt,
      time,
      beforeTotalDefeated: this.progress.totalDefeated,
      beforeTotalTechDebt: this.progress.totalTechDebt,
    });

    // Record stage completion
    const stageProgress: StageProgress = {
      chapter,
      stage,
      completed: true,
      attempts: 1,
      bestTime: time,
      techDebt,
    };

    // Update or add stage progress
    const existingIndex = this.progress.stages.findIndex(
      s => s.chapter === chapter && s.stage === stage
    );
    if (existingIndex >= 0) {
      this.progress.stages[existingIndex] = stageProgress;
    } else {
      this.progress.stages.push(stageProgress);
    }

    // Update chapter progress
    const chapterData = this.progress.chapters.get(chapter);
    if (chapterData) {
      chapterData.stagesCompleted = Math.max(chapterData.stagesCompleted, stage);

      // Check if this was the boss stage (last stage)
      const config = this.CHAPTER_CONFIG[chapter];
      if (config && stage === config.totalStages) {
        chapterData.bossDefeated = true;
        chapterData.completed = true;
      }
    }

    // Update counters
    this.progress.totalDefeated += 1;
    this.progress.totalTechDebt = Math.max(0, this.progress.totalTechDebt + techDebt);

    // Check for chapter completion
    const chapterCompleted = chapterData?.completed ?? false;
    let newChapterUnlocked = false;

    // Unlock next chapter if current chapter is completed
    if (chapterCompleted && chapter < 4) {
      const nextChapterNum = (chapter + 1) as Chapter;
      const nextChapter = this.progress.chapters.get(nextChapterNum);
      if (nextChapter && !nextChapter.unlocked) {
        nextChapter.unlocked = true;
        newChapterUnlocked = true;
      }
    }

    // Advance to next stage
    this.advanceStage();

    console.log('[Progression] Stage Completed:', {
      chapter,
      stage,
      chapterCompleted,
      newChapterUnlocked,
      nextChapter: this.progress.currentChapter,
      nextStage: this.progress.currentStage,
      totalDefeated: this.progress.totalDefeated,
      totalTechDebt: this.progress.totalTechDebt,
    });

    return { chapterCompleted, newChapterUnlocked };
  }

  /**
   * Advance to next stage
   */
  private advanceStage(): void {
    const chapter = this.progress.currentChapter;
    const config = this.CHAPTER_CONFIG[chapter];

    // If current chapter is complete, move to next chapter
    if (config && this.progress.currentStage >= config.totalStages) {
      if (chapter < 4) {
        const nextChapter = (chapter + 1) as Chapter;
        if (this.isChapterUnlocked(nextChapter)) {
          this.progress.currentChapter = nextChapter;
          this.progress.currentStage = 1;
        }
      }
      // If Chapter 4 is complete, stay at final stage (end game)
    } else {
      // Move to next stage in current chapter
      this.progress.currentStage += 1;
    }
  }

  /**
   * Get chapter progress
   */
  getChapterProgress(chapter: Chapter): ChapterProgress | null {
    return this.progress.chapters.get(chapter) ?? null;
  }

  /**
   * Get all unlocked chapters
   */
  getUnlockedChapters(): Chapter[] {
    return Array.from(this.progress.chapters.entries())
      .filter(([_, data]) => data.unlocked)
      .map(([chapter, _]) => chapter);
  }

  /**
   * Get stage progress for a specific stage
   */
  getStageProgress(chapter: Chapter, stage: number): StageProgress | null {
    return (
      this.progress.stages.find(s => s.chapter === chapter && s.stage === stage) ?? null
    );
  }

  /**
   * Get total tech debt accumulated
   */
  getTotalTechDebt(): number {
    return this.progress.totalTechDebt;
  }

  /**
   * Get total enemies defeated
   */
  getTotalDefeated(): number {
    return this.progress.totalDefeated;
  }

  /**
   * Get play time in seconds
   */
  getPlayTime(): number {
    return this.progress.playTime;
  }

  /**
   * Add play time
   */
  addPlayTime(seconds: number): void {
    this.progress.playTime += seconds;
  }

  /**
   * Check if a hidden class is unlocked
   */
  isClassUnlocked(classId: string): boolean {
    return this.progress.classUnlocks.get(classId) ?? false;
  }

  /**
   * Unlock a hidden class
   */
  unlockClass(classId: string): void {
    this.progress.classUnlocks.set(classId, true);
  }

  /**
   * Get all unlocked class IDs
   */
  getUnlockedClasses(): string[] {
    return Array.from(this.progress.classUnlocks.entries())
      .filter(([_, unlocked]) => unlocked)
      .map(([id, _]) => id);
  }

  /**
   * Check unlock conditions after stage completion
   */
  checkClassUnlocks(battleStats: { damageDealt: number; turnsUsed: number; chapterTime?: number }): string[] {
    const newlyUnlocked: string[] = [];

    // GPU Warlock: Deal 2x damage in 3 turns (high burst damage)
    if (!this.isClassUnlocked('gpu-warlock') && battleStats.damageDealt > 200 && battleStats.turnsUsed <= 3) {
      this.unlockClass('gpu-warlock');
      newlyUnlocked.push('gpu-warlock');
    }

    // Cat Summoner: Play for 1 hour (3600 seconds)
    if (!this.isClassUnlocked('cat-summoner') && this.progress.playTime >= 3600) {
      this.unlockClass('cat-summoner');
      newlyUnlocked.push('cat-summoner');
    }

    // Code Ninja: Clear Chapter 1 in under 5 minutes (300 seconds)
    if (!this.isClassUnlocked('code-ninja') && battleStats.chapterTime !== undefined && battleStats.chapterTime < 300) {
      const ch1 = this.progress.chapters.get(1);
      if (ch1?.completed) {
        this.unlockClass('code-ninja');
        newlyUnlocked.push('code-ninja');
      }
    }

    // Light Mage: Complete any chapter with Tech Debt 0
    if (!this.isClassUnlocked('light-mage') && this.progress.totalTechDebt === 0) {
      const anyChapterComplete = Array.from(this.progress.chapters.values()).some(ch => ch.completed);
      if (anyChapterComplete) {
        this.unlockClass('light-mage');
        newlyUnlocked.push('light-mage');
      }
    }

    return newlyUnlocked;
  }

  /**
   * Reset progress to beginning
   */
  resetProgress(): void {
    this.progress = this.initializeProgress();
  }

  /**
   * Save progress to localStorage
   */
  saveProgress(): boolean {
    try {
      const saveData: SaveData = {
        version: this.SAVE_VERSION,
        timestamp: new Date().toISOString(),
        progress: {
          currentChapter: this.progress.currentChapter,
          currentStage: this.progress.currentStage,
          chapters: Array.from(this.progress.chapters.entries()).map(([chapter, data]) => ({
            chapter,
            data,
          })),
          stages: this.progress.stages,
          totalDefeated: this.progress.totalDefeated,
          totalTechDebt: this.progress.totalTechDebt,
          playTime: this.progress.playTime,
          classUnlocks: Array.from(this.progress.classUnlocks.entries()),
        },
      };

      localStorage.setItem(this.SAVE_KEY, JSON.stringify(saveData));
      return true;
    } catch (error) {
      console.error('Failed to save progress:', error);
      return false;
    }
  }

  /**
   * Load progress from localStorage into this instance
   */
  loadProgress(saveData?: SaveData): boolean {
    try {
      let data: SaveData;

      if (saveData) {
        data = saveData;
      } else {
        const saved = localStorage.getItem(this.SAVE_KEY);
        if (!saved) return false;
        data = JSON.parse(saved);
      }

      // Version check (future-proof)
      if (data.version !== this.SAVE_VERSION) {
        console.warn('Save version mismatch, skipping load');
        return false;
      }

      // Restore progress
      this.progress.currentChapter = data.progress.currentChapter as Chapter;
      this.progress.currentStage = data.progress.currentStage;
      this.progress.totalDefeated = data.progress.totalDefeated;
      this.progress.totalTechDebt = data.progress.totalTechDebt;
      this.progress.playTime = data.progress.playTime;
      this.progress.stages = data.progress.stages;

      // Restore chapter data
      this.progress.chapters.clear();
      data.progress.chapters.forEach(({ chapter, data }) => {
        this.progress.chapters.set(chapter as Chapter, data);
      });

      // Restore class unlocks
      if (data.progress.classUnlocks) {
        this.progress.classUnlocks.clear();
        data.progress.classUnlocks.forEach(([id, unlocked]: [string, boolean]) => {
          this.progress.classUnlocks.set(id, unlocked);
        });
      }

      this.progress.lastPlayed = new Date(data.timestamp);

      return true;
    } catch (error) {
      console.error('Failed to load progress:', error);
      return false;
    }
  }

  /**
   * Static method to load save data from localStorage
   */
  static loadSave(): SaveData | null {
    try {
      const saved = localStorage.getItem('bug-slayer-progress');
      if (!saved) return null;
      return JSON.parse(saved) as SaveData;
    } catch (error) {
      console.error('Failed to load save:', error);
      return null;
    }
  }

  /**
   * Check if save exists
   */
  hasSaveData(): boolean {
    return localStorage.getItem(this.SAVE_KEY) !== null;
  }

  /**
   * Delete save data
   */
  deleteSaveData(): boolean {
    try {
      localStorage.removeItem(this.SAVE_KEY);
      return true;
    } catch (error) {
      console.error('Failed to delete save data:', error);
      return false;
    }
  }

  /**
   * Get overall completion percentage
   */
  getCompletionPercentage(): number {
    let totalStages = 0;
    let completedStages = 0;

    this.progress.chapters.forEach(chapter => {
      totalStages += chapter.totalStages;
      completedStages += chapter.stagesCompleted;
    });

    return totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;
  }

  /**
   * Get progression summary
   */
  getSummary(): {
    currentLocation: string;
    completion: number;
    techDebt: number;
    defeated: number;
    playTime: string;
  } {
    const chapter = this.progress.currentChapter;
    const stage = this.progress.currentStage;
    const hours = Math.floor(this.progress.playTime / 3600);
    const minutes = Math.floor((this.progress.playTime % 3600) / 60);

    return {
      currentLocation: `Chapter ${chapter} - Stage ${stage}`,
      completion: this.getCompletionPercentage(),
      techDebt: this.progress.totalTechDebt,
      defeated: this.progress.totalDefeated,
      playTime: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
    };
  }

  /**
   * Get detailed progression info for debugging
   */
  getDebugInfo(): {
    currentChapter: number;
    currentStage: number;
    totalDefeated: number;
    totalTechDebt: number;
    playTime: number;
    chapters: Array<{ chapter: number; data: ChapterProgress }>;
  } {
    return {
      currentChapter: this.progress.currentChapter,
      currentStage: this.progress.currentStage,
      totalDefeated: this.progress.totalDefeated,
      totalTechDebt: this.progress.totalTechDebt,
      playTime: this.progress.playTime,
      chapters: Array.from(this.progress.chapters.entries()).map(([chapter, data]) => ({
        chapter,
        data,
      })),
    };
  }
}
