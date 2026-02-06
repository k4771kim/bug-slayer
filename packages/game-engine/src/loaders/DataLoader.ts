/**
 * DataLoader - Loads game data from JSON files
 * Provides type-safe access to classes, skills, bugs, and palette
 */

import classesData from '../data/classes.json';
import skillsData from '../data/skills.json';
import bugsData from '../data/bugs.json';
import paletteData from '../data/palette.json';
import itemsData from '../data/items.json';
import type { Item } from '@bug-slayer/shared';

export interface ClassData {
  id: string;
  name: string;
  description: string;
  baseStats: {
    HP: number;
    ATK: number;
    DEF: number;
    SPD: number;
    MP: number;
  };
  statGrowth: {
    HP: number;
    ATK: number;
    DEF: number;
    SPD: number;
    MP: number;
  };
  skillIds: string[];
  passive: {
    name: string;
    description: string;
  };
}

export interface SkillData {
  id: string;
  name: string;
  description: string;
  class: string;
  mpCost: number;
  baseDamage: number;
  cooldown: number;
  targetType: 'single' | 'all' | 'self';
  effects: SkillEffect[];
}

export interface SkillEffect {
  type: 'damage' | 'heal' | 'buff' | 'debuff' | 'dot' | 'special';
  value: number;
  stat?: string;
  duration?: number;
  description?: string;
}

export interface BugData {
  id: string;
  name: string;
  description: string;
  type: 'bug' | 'boss';
  chapter: number;
  stats: {
    HP: number;
    ATK: number;
    DEF: number;
    SPD: number;
  };
  phase?: number;
  behaviorTree: {
    conditions: Array<{ type: string; value: number }>;
    actions: Array<{ type: string; skillId?: string; weight: number }>;
  };
  drops: {
    items: Array<{ itemId: string; dropRate: number }>;
    exp: number;
    gold: number;
  };
  techDebtOnSkip: number;
}

export interface PaletteData {
  name: string;
  description: string;
  colors: Record<string, Record<string, string>>;
  characterColors: Record<string, string>;
  bugColors: Record<string, string>;
  rarityColors: Record<string, string>;
  statusColors: Record<string, string>;
}

/**
 * DataLoader class - Singleton pattern for data access
 */
export class DataLoader {
  private static instance: DataLoader;

  private classes: Map<string, ClassData> = new Map();
  private skills: Map<string, SkillData> = new Map();
  private bugs: Map<string, BugData> = new Map();
  private items: Map<string, Item> = new Map();
  private palette: PaletteData;

  private constructor() {
    this.loadData();
    this.palette = paletteData as PaletteData;
  }

  static getInstance(): DataLoader {
    if (!DataLoader.instance) {
      DataLoader.instance = new DataLoader();
    }
    return DataLoader.instance;
  }

  private loadData() {
    // Load classes
    (classesData as any).classes.forEach((cls: ClassData) => {
      this.classes.set(cls.id, cls);
    });

    // Load skills
    (skillsData as any).skills.forEach((skill: SkillData) => {
      this.skills.set(skill.id, skill);
    });

    // Load bugs
    (bugsData as any).bugs.forEach((bug: BugData) => {
      this.bugs.set(bug.id, bug);
    });

    // Load items
    (itemsData as any).items.forEach((item: Item) => {
      this.items.set(item.id, item);
    });

    console.log(`DataLoader: Loaded ${this.classes.size} classes, ${this.skills.size} skills, ${this.bugs.size} bugs, ${this.items.size} items`);
  }

  /**
   * Get class by ID
   */
  getClass(classId: string): ClassData | undefined {
    return this.classes.get(classId);
  }

  /**
   * Get all classes
   */
  getAllClasses(): ClassData[] {
    return Array.from(this.classes.values());
  }

  /**
   * Get skill by ID
   */
  getSkill(skillId: string): SkillData | undefined {
    return this.skills.get(skillId);
  }

  /**
   * Get skills for a class
   */
  getSkillsForClass(classId: string): SkillData[] {
    const classData = this.getClass(classId);
    if (!classData) return [];

    return classData.skillIds
      .map(id => this.getSkill(id))
      .filter((skill): skill is SkillData => skill !== undefined);
  }

  /**
   * Get bug by ID
   */
  getBug(bugId: string): BugData | undefined {
    return this.bugs.get(bugId);
  }

  /**
   * Get bugs for a chapter
   */
  getBugsForChapter(chapter: number): BugData[] {
    return Array.from(this.bugs.values())
      .filter(bug => bug.chapter === chapter);
  }

  /**
   * Get boss for a chapter
   */
  getBossForChapter(chapter: number): BugData | undefined {
    return Array.from(this.bugs.values())
      .find(bug => bug.chapter === chapter && bug.type === 'boss');
  }

  /**
   * Get color from palette
   */
  getColor(category: string, colorName: string): string {
    const colors = this.palette.colors[category];
    return colors ? colors[colorName] || '#ffffff' : '#ffffff';
  }

  /**
   * Get character color
   */
  getCharacterColor(classId: string): string {
    return this.palette.characterColors[classId] || '#ffffff';
  }

  /**
   * Get bug color
   */
  getBugColor(bugId: string): string {
    return this.palette.bugColors[bugId] || '#ffffff';
  }

  /**
   * Get status color
   */
  getStatusColor(status: string): string {
    return this.palette.statusColors[status] || '#ffffff';
  }

  /**
   * Get item by ID
   */
  getItem(itemId: string): Item | undefined {
    return this.items.get(itemId);
  }

  /**
   * Get all items
   */
  getAllItems(): Item[] {
    return Array.from(this.items.values());
  }

  /**
   * Get items by type
   */
  getItemsByType(type: 'weapon' | 'armor' | 'accessory' | 'consumable'): Item[] {
    return Array.from(this.items.values())
      .filter(item => item.type === type);
  }

  /**
   * Get items by rarity
   */
  getItemsByRarity(rarity: 'common' | 'rare' | 'epic'): Item[] {
    return Array.from(this.items.values())
      .filter(item => item.rarity === rarity);
  }
}

// Export singleton instance
export const dataLoader = DataLoader.getInstance();
