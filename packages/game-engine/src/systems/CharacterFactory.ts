/**
 * CharacterFactory - Creates Character instances from class data
 * Converts JSON class data to game Character objects
 */

import type { Character, Skill } from '@bug-slayer/shared';
import { dataLoader, type ClassData, type SkillData } from '../loaders/DataLoader';

/**
 * Create a character from class ID
 */
export function createCharacter(
  classId: string,
  name: string,
  level: number = 1
): Character {
  const classData = dataLoader.getClass(classId);
  if (!classData) {
    throw new Error(`Class not found: ${classId}`);
  }

  // Calculate stats based on level
  const stats = calculateStats(classData, level);

  // Load skills
  const skills = loadSkills(classData);

  return {
    id: `char-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    class: classId as any,
    level,
    exp: 0,
    stats,
    currentHP: stats.HP,
    currentMP: stats.MP,
    skills,
    equipment: {},
    inventory: [],
  };
}

/**
 * Calculate stats for a character at given level
 */
function calculateStats(classData: ClassData, level: number) {
  const baseStats = classData.baseStats;
  const growth = classData.statGrowth;

  return {
    HP: baseStats.HP + growth.HP * (level - 1),
    ATK: baseStats.ATK + growth.ATK * (level - 1),
    DEF: baseStats.DEF + growth.DEF * (level - 1),
    SPD: baseStats.SPD + growth.SPD * (level - 1),
    MP: baseStats.MP + growth.MP * (level - 1),
  };
}

/**
 * Load skills from skill IDs
 */
function loadSkills(classData: ClassData): Skill[] {
  return classData.skillIds.map(skillId => {
    const skillData = dataLoader.getSkill(skillId);
    if (!skillData) {
      console.warn(`Skill not found: ${skillId}`);
      return null;
    }
    return convertSkillDataToSkill(skillData);
  }).filter((skill): skill is Skill => skill !== null);
}

/**
 * Convert SkillData to Skill
 */
function convertSkillDataToSkill(skillData: SkillData): Skill {
  return {
    id: skillData.id,
    name: skillData.name,
    description: skillData.description,
    mpCost: skillData.mpCost,
    cooldown: 0,
    currentCooldown: 0,
    effects: skillData.effects.map(effect => ({
      type: effect.type,
      value: effect.value,
      duration: effect.duration,
      stat: effect.stat as any,
    })),
    targetType: skillData.targetType as any,
  };
}

/**
 * Get class display information
 */
export function getClassInfo(classId: string) {
  const classData = dataLoader.getClass(classId);
  if (!classData) return null;

  return {
    id: classData.id,
    name: classData.name,
    description: classData.description,
    baseStats: classData.baseStats,
    passive: classData.passive,
    color: dataLoader.getCharacterColor(classId),
  };
}

/**
 * Get all available classes
 */
export function getAllClassesInfo() {
  return dataLoader.getAllClasses().map(cls => ({
    id: cls.id,
    name: cls.name,
    description: cls.description,
    baseStats: cls.baseStats,
    passive: cls.passive,
    color: dataLoader.getCharacterColor(cls.id),
  }));
}
