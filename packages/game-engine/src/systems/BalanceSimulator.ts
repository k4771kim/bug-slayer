/**
 * BalanceSimulator - Automated battle simulation for game balance testing
 *
 * Features:
 * - Headless combat simulation (no Phaser dependency)
 * - Auto-player AI with intelligent decision-making
 * - Statistical analysis across classes and chapters
 * - Automatic balance issue detection
 *
 * Usage:
 * ```
 * const report = await BalanceSimulator.simulate({
 *   numBattles: 500,
 *   classes: ['debugger', 'refactorer', 'fullstack', 'devops'],
 *   chapters: [1, 2],
 *   verbose: false
 * });
 * ```
 */

import { dataLoader, type ClassData, type BugData, type SkillData } from '../loaders/DataLoader';
import type { Item } from '@bug-slayer/shared';

// ============================================================================
// Configuration & Result Types
// ============================================================================

export interface SimulationConfig {
  numBattles: number;
  classes: string[];
  chapters: number[];
  verbose: boolean;
}

export interface BattleSimResult {
  playerClass: string;
  monsterName: string;
  won: boolean;
  turnsToWin: number;
  playerHPRemaining: number;
  playerMPUsed: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  critCount: number;
  evasionCount: number;
  skillsUsed: string[];
  focusCount: number;
}

export interface SimulationReport {
  totalBattles: number;
  winRate: number;
  avgTurnsToWin: number;
  avgHPRemaining: number;
  classSummary: Record<string, {
    winRate: number;
    avgTurns: number;
    avgDamageDealt: number;
    avgDamageTaken: number;
  }>;
  chapterSummary: Record<number, {
    winRate: number;
    avgTurns: number;
    hardestMonster: string;
    easiestMonster: string;
  }>;
  balanceIssues: string[];
}

// ============================================================================
// Simulation Entity Types
// ============================================================================

interface SimPlayer {
  id: string;
  name: string;
  classId: string;
  level: number;
  currentHP: number;
  maxHP: number;
  currentMP: number;
  maxMP: number;
  ATK: number;
  DEF: number;
  SPD: number;
  skills: SimSkill[];
  items: Item[];
  passive: string;
  focusActive: boolean;
  refactorerCounter: number;
  attackCount: number;       // gpu-warlock: track attack count for 200% burst
  nineLifeUsed: boolean;     // cat-summoner: one auto-revive per battle
  firstAttackDone: boolean;  // code-ninja: first strike bonus
}

interface SimMonster {
  id: string;
  name: string;
  type: 'bug' | 'boss';
  currentHP: number;
  maxHP: number;
  ATK: number;
  DEF: number;
  SPD: number;
  behaviorTree: BugData['behaviorTree'];
  turnCount: number;
  phase: number;
}

interface SimSkill {
  id: string;
  name: string;
  mpCost: number;
  baseDamage: number;
  effects: Array<{
    type: string;
    value: number;
    stat?: string;
    duration?: number;
  }>;
  targetType: string;
  cooldown: number;
  currentCooldown: number;
}

// ============================================================================
// Main Simulator Class
// ============================================================================

export class BalanceSimulator {
  /**
   * Run full simulation across multiple battles
   */
  static async simulate(config: SimulationConfig): Promise<SimulationReport> {
    const results: BattleSimResult[] = [];

    console.log(`Starting simulation: ${config.numBattles} battles`);
    console.log(`Classes: ${config.classes.join(', ')}`);
    console.log(`Chapters: ${config.chapters.join(', ')}`);

    // Run battles
    for (let i = 0; i < config.numBattles; i++) {
      // Random class selection
      const classId = config.classes[Math.floor(Math.random() * config.classes.length)];
      if (!classId) continue;

      // Random chapter selection
      const chapter = config.chapters[Math.floor(Math.random() * config.chapters.length)];
      if (chapter === undefined) continue;

      // Get monsters for this chapter
      const monsters = dataLoader.getBugsForChapter(chapter);
      if (monsters.length === 0) continue;

      // Random monster selection
      const bugData = monsters[Math.floor(Math.random() * monsters.length)];
      if (!bugData) continue;

      // Create simulation entities (scale player level by chapter)
      const playerLevelMap: Record<number, number> = { 1: 1, 2: 5, 3: 7, 4: 10 };
      const playerLevel = playerLevelMap[chapter] ?? 1;
      const player = this.createSimPlayer(classId, playerLevel);
      const monster = this.createSimMonster(bugData);

      // Run battle
      const result = this.simulateBattle(player, monster);
      results.push(result);

      if (config.verbose && i % 50 === 0) {
        console.log(`Progress: ${i}/${config.numBattles} battles completed`);
      }
    }

    // Generate report
    return this.generateReport(results);
  }

  /**
   * Run single battle simulation (headless)
   */
  static simulateBattle(player: SimPlayer, monster: SimMonster): BattleSimResult {
    const log: BattleSimResult = {
      playerClass: player.classId,
      monsterName: monster.name,
      won: false,
      turnsToWin: 0,
      playerHPRemaining: 0,
      playerMPUsed: 0,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      critCount: 0,
      evasionCount: 0,
      skillsUsed: [],
      focusCount: 0,
    };

    const maxTurns = 50; // Prevent infinite loops
    let turn = 0;

    while (turn < maxTurns && player.currentHP > 0 && monster.currentHP > 0) {
      turn++;
      monster.turnCount++;

      // Determine turn order based on SPD
      const playerFirst = player.SPD >= monster.SPD;

      if (playerFirst) {
        // Player turn
        this.executePlayerTurn(player, monster, log);
        if (monster.currentHP <= 0) break;

        // Monster turn
        this.executeMonsterTurn(monster, player, log);
      } else {
        // Monster turn
        this.executeMonsterTurn(monster, player, log);
        if (player.currentHP <= 0) break;

        // Player turn
        this.executePlayerTurn(player, monster, log);
      }

      // MP regeneration (5% per turn)
      const mpRegen = Math.floor(player.maxMP * 0.05);
      player.currentMP = Math.min(player.maxMP, player.currentMP + mpRegen);

      // Cooldown reduction
      player.skills.forEach(skill => {
        if (skill.currentCooldown > 0) {
          skill.currentCooldown--;
        }
      });
    }

    // Finalize results
    log.won = monster.currentHP <= 0 && player.currentHP > 0;
    log.turnsToWin = turn;
    log.playerHPRemaining = Math.max(0, player.currentHP);
    log.playerMPUsed = player.maxMP - player.currentMP;

    // Victory MP bonus
    if (log.won) {
      player.currentMP = player.maxMP;
    }

    return log;
  }

  /**
   * Execute player turn with AI decision-making
   */
  private static executePlayerTurn(player: SimPlayer, monster: SimMonster, log: BattleSimResult): void {
    const action = this.autoPlayerAction(player, monster);

    if (action === 'focus') {
      // Focus action: 15% MP + 20% DMG next turn
      const focusMP = Math.floor(player.maxMP * 0.15);
      player.currentMP = Math.min(player.maxMP, player.currentMP + focusMP);
      player.focusActive = true;
      log.focusCount++;
      return;
    }

    if (action === 'heal') {
      // Use heal item (Basic Potion restores 30 HP)
      const healAmount = 30;
      player.currentHP = Math.min(player.maxHP, player.currentHP + healAmount);
      return;
    }

    if (action.startsWith('skill:')) {
      // Use skill
      const skillId = action.substring(6);
      const skill = player.skills.find(s => s.id === skillId);
      if (skill && skill.currentCooldown === 0) {
        player.currentMP -= skill.mpCost;
        skill.currentCooldown = skill.cooldown;
        log.skillsUsed.push(skill.name);

        // Calculate damage (scale skill baseDamage by ATK, matching BattleScene)
        const scaledBaseDamage = Math.floor(player.ATK * (skill.baseDamage / 100));
        const damage = this.calculateDamage(player, monster, scaledBaseDamage);
        monster.currentHP -= damage;
        log.totalDamageDealt += damage;

        // Reset focus after attack
        player.focusActive = false;
        return;
      }
    }

    // Basic attack
    const damage = this.calculateDamage(player, monster, player.ATK);
    monster.currentHP -= damage;
    log.totalDamageDealt += damage;

    // Refactorer passive: Every 3rd attack deals 150% damage
    if (player.passive === 'refactorer') {
      player.refactorerCounter++;
      if (player.refactorerCounter >= 3) {
        const bonusDamage = Math.floor(damage * 0.5);
        monster.currentHP -= bonusDamage;
        log.totalDamageDealt += bonusDamage;
        player.refactorerCounter = 0;
      }
    }

    // GPU Warlock passive: Every 3rd attack deals 200% damage (CUDA Cores)
    if (player.passive === 'gpu-warlock') {
      player.attackCount++;
      if (player.attackCount >= 3) {
        const burstDamage = damage; // Double the damage (200% total = original + 100% bonus)
        monster.currentHP -= burstDamage;
        log.totalDamageDealt += burstDamage;
        player.attackCount = 0;
      }
    }

    // Code Ninja passive: First attack gets CRIT_MULTIPLIER (1.5x) bonus
    if (player.passive === 'code-ninja' && !player.firstAttackDone) {
      const firstStrikeBonus = Math.floor(damage * 0.5); // +50% on first hit
      monster.currentHP -= firstStrikeBonus;
      log.totalDamageDealt += firstStrikeBonus;
      player.firstAttackDone = true;
    }

    // Reset focus after attack
    player.focusActive = false;
  }

  /**
   * Execute monster turn
   */
  private static executeMonsterTurn(monster: SimMonster, player: SimPlayer, log: BattleSimResult): void {
    // Simple enemy AI: always basic attack for simulation
    // In real game, this would use EnemyAI system
    const damage = this.calculateDamage(monster, player, monster.ATK);

    // Debugger passive: 20% chance to reduce damage by 50%
    let finalDamage = damage;
    if (player.passive === 'debugger' && Math.random() < 0.2) {
      finalDamage = Math.floor(damage * 0.5);
    }

    player.currentHP -= finalDamage;
    log.totalDamageTaken += finalDamage;

    // Cat Summoner passive: Auto-revive once per battle at 30% HP (Nine Lives)
    if (player.currentHP <= 0 && player.passive === 'cat-summoner' && !player.nineLifeUsed) {
      player.currentHP = Math.floor(player.maxHP * 0.3);
      player.nineLifeUsed = true;
    }

    // Boss phase transitions at 75%, 50%, 25%
    if (monster.type === 'boss') {
      const hpPercent = (monster.currentHP / monster.maxHP) * 100;
      if (hpPercent <= 75 && monster.phase === 1) monster.phase = 2;
      else if (hpPercent <= 50 && monster.phase === 2) monster.phase = 3;
      else if (hpPercent <= 25 && monster.phase === 3) monster.phase = 4;
    }
  }

  /**
   * Calculate damage using GDD formulas
   */
  private static calculateDamage(
    attacker: SimPlayer | SimMonster,
    defender: SimPlayer | SimMonster,
    baseAtk: number
  ): number {
    // Base damage calculation (matching shared calculateDamage formula)
    const defReduction = 100 / (100 + defender.DEF * 0.7);
    let finalDmg = Math.max(1, Math.floor(baseAtk * defReduction));

    // Focus bonus (player only)
    if ('focusActive' in attacker && attacker.focusActive) {
      finalDmg = Math.floor(finalDmg * 1.2);
    }

    // FullStack passive: +20% damage when HP > 70%
    if ('passive' in attacker && attacker.passive === 'fullstack') {
      const hpPercent = (attacker.currentHP / attacker.maxHP) * 100;
      if (hpPercent > 70) {
        finalDmg = Math.floor(finalDmg * 1.2);
      }
    }

    // Critical hit calculation
    const baseCritRate = attacker.SPD * 0.02;
    const critRate = Math.min(0.3, baseCritRate); // Cap at 30%

    // DevOps passive: +5% crit rate
    let actualCritRate = critRate;
    if ('passive' in attacker && attacker.passive === 'devops') {
      actualCritRate = Math.min(0.3, critRate + 0.05);
    }

    // Code Ninja passive: +10% crit rate
    if ('passive' in attacker && attacker.passive === 'code-ninja') {
      actualCritRate = Math.min(0.3, actualCritRate + 0.1);
    }

    if (Math.random() < actualCritRate) {
      finalDmg = Math.floor(finalDmg * 1.5);
    }

    // Evasion calculation
    const spdDiff = defender.SPD - attacker.SPD;
    let evasionRate = Math.max(0, spdDiff * 0.02); // 2% per SPD diff

    // DevOps passive: +2% evasion per SPD diff
    if ('passive' in defender && defender.passive === 'devops') {
      evasionRate = Math.max(0, spdDiff * 0.04);
    }

    if (Math.random() < evasionRate) {
      return 0; // Evaded
    }

    return finalDmg;
  }

  /**
   * Auto-player AI strategy
   */
  private static autoPlayerAction(player: SimPlayer, monster: SimMonster): string {
    const hpPercent = (player.currentHP / player.maxHP) * 100;
    const mpPercent = (player.currentMP / player.maxMP) * 100;

    // Emergency heal if HP < 30% and has heal items
    if (hpPercent < 30 && player.items.length > 0) {
      return 'heal';
    }

    // Use strongest available skill if MP allows
    const availableSkills = player.skills
      .filter(s => s.mpCost <= player.currentMP && s.currentCooldown === 0)
      .sort((a, b) => b.baseDamage - a.baseDamage);

    const bestSkill = availableSkills[0];
    if (bestSkill && mpPercent > 25) {
      return `skill:${bestSkill.id}`;
    }

    // Focus if MP < 20%
    if (mpPercent < 20) {
      return 'focus';
    }

    // Basic attack
    return 'attack';
  }

  /**
   * Create simulation player from class data
   */
  private static createSimPlayer(classId: string, level: number): SimPlayer {
    const classData = dataLoader.getClass(classId);
    if (!classData) {
      throw new Error(`Class not found: ${classId}`);
    }

    const stats = this.calculateStats(classData, level);
    const skills = this.loadSimSkills(classData);

    return {
      id: 'player',
      name: classData.name,
      classId,
      level,
      currentHP: stats.HP,
      maxHP: stats.HP,
      currentMP: stats.MP,
      maxMP: stats.MP,
      ATK: stats.ATK,
      DEF: stats.DEF,
      SPD: stats.SPD,
      skills,
      items: [], // Simplified: no items in sim
      passive: classId,
      focusActive: false,
      refactorerCounter: 0,
      attackCount: 0,
      nineLifeUsed: false,
      firstAttackDone: false,
    };
  }

  /**
   * Create simulation monster from bug data
   */
  private static createSimMonster(bugData: BugData): SimMonster {
    return {
      id: bugData.id,
      name: bugData.name,
      type: bugData.type,
      currentHP: bugData.stats.HP,
      maxHP: bugData.stats.HP,
      ATK: bugData.stats.ATK,
      DEF: bugData.stats.DEF,
      SPD: bugData.stats.SPD,
      behaviorTree: bugData.behaviorTree,
      turnCount: 0,
      phase: 1,
    };
  }

  /**
   * Calculate character stats at given level
   */
  private static calculateStats(classData: ClassData, level: number) {
    const base = classData.baseStats;
    const growth = classData.statGrowth;

    return {
      HP: base.HP + growth.HP * (level - 1),
      ATK: base.ATK + growth.ATK * (level - 1),
      DEF: base.DEF + growth.DEF * (level - 1),
      SPD: base.SPD + growth.SPD * (level - 1),
      MP: base.MP + growth.MP * (level - 1),
    };
  }

  /**
   * Load skills for simulation
   */
  private static loadSimSkills(classData: ClassData): SimSkill[] {
    const skills: SimSkill[] = [];
    for (const skillId of classData.skillIds) {
      const skillData = dataLoader.getSkill(skillId);
      if (!skillData) continue;

      skills.push({
        id: skillData.id,
        name: skillData.name,
        mpCost: skillData.mpCost,
        baseDamage: skillData.baseDamage,
        effects: skillData.effects.map(e => ({
          type: e.type as string,
          value: e.value,
          stat: e.stat,
          duration: e.duration,
        })),
        targetType: skillData.targetType,
        cooldown: skillData.cooldown,
        currentCooldown: 0,
      });
    }
    return skills;
  }

  /**
   * Generate comprehensive report from battle results
   */
  private static generateReport(results: BattleSimResult[]): SimulationReport {
    const totalBattles = results.length;
    const wins = results.filter(r => r.won).length;
    const winRate = totalBattles > 0 ? (wins / totalBattles) * 100 : 0;

    // Calculate averages
    const winningBattles = results.filter(r => r.won);
    const avgTurnsToWin = winningBattles.length > 0
      ? winningBattles.reduce((sum, r) => sum + r.turnsToWin, 0) / winningBattles.length
      : 0;
    const avgHPRemaining = winningBattles.length > 0
      ? winningBattles.reduce((sum, r) => sum + r.playerHPRemaining, 0) / winningBattles.length
      : 0;

    // Class summary
    const classSummary: Record<string, any> = {};
    const classes = [...new Set(results.map(r => r.playerClass))];

    classes.forEach(classId => {
      const classResults = results.filter(r => r.playerClass === classId);
      const classWins = classResults.filter(r => r.won).length;
      const classWinRate = classResults.length > 0 ? (classWins / classResults.length) * 100 : 0;
      const classWinningBattles = classResults.filter(r => r.won);

      classSummary[classId] = {
        winRate: classWinRate,
        avgTurns: classWinningBattles.length > 0
          ? classWinningBattles.reduce((sum, r) => sum + r.turnsToWin, 0) / classWinningBattles.length
          : 0,
        avgDamageDealt: classResults.length > 0
          ? classResults.reduce((sum, r) => sum + r.totalDamageDealt, 0) / classResults.length
          : 0,
        avgDamageTaken: classResults.length > 0
          ? classResults.reduce((sum, r) => sum + r.totalDamageTaken, 0) / classResults.length
          : 0,
      };
    });

    // Chapter summary
    const chapterSummary: Record<number, any> = {};
    const chapters = [1, 2, 3, 4];

    chapters.forEach(chapter => {
      const chapterResults = results.filter(r => {
        // Determine chapter from monster name (basic heuristic)
        const bug = dataLoader.getBugsForChapter(chapter).find(b => b.name === r.monsterName);
        return bug !== undefined;
      });

      if (chapterResults.length === 0) return;

      const chapterWins = chapterResults.filter(r => r.won).length;
      const chapterWinRate = (chapterWins / chapterResults.length) * 100;
      const chapterWinningBattles = chapterResults.filter(r => r.won);

      // Find hardest/easiest monsters
      const monsterStats = new Map<string, { wins: number; total: number }>();
      chapterResults.forEach(r => {
        const stats = monsterStats.get(r.monsterName) || { wins: 0, total: 0 };
        stats.total++;
        if (r.won) stats.wins++;
        monsterStats.set(r.monsterName, stats);
      });

      let hardestMonster = '';
      let easiestMonster = '';
      let lowestWinRate = 100;
      let highestWinRate = 0;

      monsterStats.forEach((stats, name) => {
        const winRate = (stats.wins / stats.total) * 100;
        if (winRate < lowestWinRate) {
          lowestWinRate = winRate;
          hardestMonster = name;
        }
        if (winRate > highestWinRate) {
          highestWinRate = winRate;
          easiestMonster = name;
        }
      });

      chapterSummary[chapter] = {
        winRate: chapterWinRate,
        avgTurns: chapterWinningBattles.length > 0
          ? chapterWinningBattles.reduce((sum, r) => sum + r.turnsToWin, 0) / chapterWinningBattles.length
          : 0,
        hardestMonster,
        easiestMonster,
      };
    });

    // Detect balance issues
    const balanceIssues = this.detectIssues(results, classSummary, chapterSummary);

    return {
      totalBattles,
      winRate,
      avgTurnsToWin,
      avgHPRemaining,
      classSummary,
      chapterSummary,
      balanceIssues,
    };
  }

  /**
   * Detect balance issues from results
   */
  private static detectIssues(
    results: BattleSimResult[],
    classSummary: Record<string, any>,
    chapterSummary: Record<number, any>
  ): string[] {
    const issues: string[] = [];

    // Overall win rate issues
    const totalWins = results.filter(r => r.won).length;
    const overallWinRate = (totalWins / results.length) * 100;

    if (overallWinRate < 60) {
      issues.push(`Overall win rate too low (${overallWinRate.toFixed(1)}%) - Game may be too difficult`);
    }
    if (overallWinRate > 95) {
      issues.push(`Overall win rate too high (${overallWinRate.toFixed(1)}%) - Game may be too easy`);
    }

    // Turn count issues
    const winningBattles = results.filter(r => r.won);
    if (winningBattles.length > 0) {
      const avgTurns = winningBattles.reduce((sum, r) => sum + r.turnsToWin, 0) / winningBattles.length;

      if (avgTurns > 20) {
        issues.push(`Average battle length too long (${avgTurns.toFixed(1)} turns) - Combat may be tedious`);
      }
      if (avgTurns < 3) {
        issues.push(`Average battle length too short (${avgTurns.toFixed(1)} turns) - Combat may lack depth`);
      }
    }

    // Class balance issues
    const classWinRates = Object.entries(classSummary).map(([id, stats]) => ({
      id,
      winRate: stats.winRate,
    }));

    classWinRates.forEach(({ id, winRate }) => {
      if (winRate < 40) {
        issues.push(`Class "${id}" win rate too low (${winRate.toFixed(1)}%) - May need buffs`);
      }
      if (winRate > 90) {
        issues.push(`Class "${id}" win rate too high (${winRate.toFixed(1)}%) - May need nerfs`);
      }
    });

    // Class imbalance detection
    if (classWinRates.length > 1) {
      const maxWinRate = Math.max(...classWinRates.map(c => c.winRate));
      const minWinRate = Math.min(...classWinRates.map(c => c.winRate));

      if (maxWinRate - minWinRate > 20) {
        const strongest = classWinRates.find(c => c.winRate === maxWinRate);
        const weakest = classWinRates.find(c => c.winRate === minWinRate);
        issues.push(
          `Class imbalance detected: "${strongest?.id}" (${maxWinRate.toFixed(1)}%) vs "${weakest?.id}" (${minWinRate.toFixed(1)}%) - ${(maxWinRate - minWinRate).toFixed(1)}% gap`
        );
      }
    }

    // Chapter difficulty issues
    Object.entries(chapterSummary).forEach(([chapter, stats]) => {
      const chapterWinRate = stats.winRate;

      if (chapterWinRate < 40) {
        issues.push(`Chapter ${chapter} too difficult (${chapterWinRate.toFixed(1)}% win rate) - Consider rebalancing`);
      }
      if (chapterWinRate > 90) {
        issues.push(`Chapter ${chapter} too easy (${chapterWinRate.toFixed(1)}% win rate) - Consider increasing difficulty`);
      }
    });

    // Boss-specific issues
    const bossBattles = results.filter(r =>
      r.monsterName === 'OffByOneError' || r.monsterName === 'Heisenbug' ||
      r.monsterName === 'Concurrency Chaos' || r.monsterName === 'Spaghetti Code Dragon'
    );

    if (bossBattles.length > 0) {
      const bossWins = bossBattles.filter(r => r.won).length;
      const bossWinRate = (bossWins / bossBattles.length) * 100;

      if (bossWinRate < 40) {
        issues.push(`Boss battles too difficult (${bossWinRate.toFixed(1)}% win rate) - May frustrate players`);
      }
      if (bossWinRate > 90) {
        issues.push(`Boss battles too easy (${bossWinRate.toFixed(1)}% win rate) - Bosses should be challenging`);
      }
    }

    return issues;
  }
}
