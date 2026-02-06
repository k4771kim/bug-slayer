/**
 * BalanceSimulator Tests
 * Basic sanity tests for balance simulation system
 */

import { describe, it, expect } from 'vitest';
import { BalanceSimulator } from './BalanceSimulator';

describe('BalanceSimulator', () => {
  it('should run a small simulation and generate a valid report', async () => {
    const report = await BalanceSimulator.simulate({
      numBattles: 10,
      classes: ['debugger', 'refactorer'],
      chapters: [1],
      verbose: false,
    });

    // Check report structure
    expect(report).toBeDefined();
    expect(report.totalBattles).toBe(10);
    expect(report.winRate).toBeGreaterThanOrEqual(0);
    expect(report.winRate).toBeLessThanOrEqual(100);
    expect(report.classSummary).toBeDefined();
    expect(report.chapterSummary).toBeDefined();
    expect(report.balanceIssues).toBeInstanceOf(Array);
  });

  it('should calculate win rates for each class', async () => {
    const report = await BalanceSimulator.simulate({
      numBattles: 20,
      classes: ['debugger', 'fullstack', 'devops'],
      chapters: [1],
      verbose: false,
    });

    // Each class should have summary data
    Object.keys(report.classSummary).forEach(classId => {
      const summary = report.classSummary[classId];
      expect(summary.winRate).toBeGreaterThanOrEqual(0);
      expect(summary.winRate).toBeLessThanOrEqual(100);
      expect(summary.avgDamageDealt).toBeGreaterThanOrEqual(0);
      expect(summary.avgDamageTaken).toBeGreaterThanOrEqual(0);
    });
  });

  it('should detect balance issues', async () => {
    const report = await BalanceSimulator.simulate({
      numBattles: 50,
      classes: ['debugger', 'refactorer', 'fullstack', 'devops'],
      chapters: [1, 2],
      verbose: false,
    });

    // Balance issues should be an array (may be empty)
    expect(report.balanceIssues).toBeInstanceOf(Array);

    // If issues exist, they should be strings
    report.balanceIssues.forEach(issue => {
      expect(typeof issue).toBe('string');
      expect(issue.length).toBeGreaterThan(0);
    });
  });

  it('should generate chapter-specific statistics', async () => {
    const report = await BalanceSimulator.simulate({
      numBattles: 30,
      classes: ['debugger'],
      chapters: [1, 2],
      verbose: false,
    });

    // Should have stats for chapters
    expect(Object.keys(report.chapterSummary).length).toBeGreaterThan(0);

    Object.values(report.chapterSummary).forEach((chapterStats: any) => {
      expect(chapterStats.winRate).toBeGreaterThanOrEqual(0);
      expect(chapterStats.winRate).toBeLessThanOrEqual(100);
      expect(typeof chapterStats.hardestMonster).toBe('string');
      expect(typeof chapterStats.easiestMonster).toBe('string');
    });
  });
});
