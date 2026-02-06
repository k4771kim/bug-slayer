#!/usr/bin/env ts-node
/**
 * Balance Simulation Runner Script
 *
 * Usage: npx ts-node packages/game-engine/scripts/run-simulation.ts
 *
 * Runs 500 battles across all classes and chapters,
 * then prints a formatted report with balance issues highlighted.
 */

import { BalanceSimulator } from '../src/systems/BalanceSimulator';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatNumber(value: number): string {
  return value.toFixed(1);
}

async function main() {
  console.log(`${colors.bright}${colors.cyan}╔════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}║   Bug Slayer - Balance Simulation Report      ║${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}╚════════════════════════════════════════════════╝${colors.reset}\n`);

  // Run simulation
  console.log(`${colors.blue}Starting simulation...${colors.reset}\n`);

  const report = await BalanceSimulator.simulate({
    numBattles: 500,
    classes: ['debugger', 'refactorer', 'fullstack', 'devops'],
    chapters: [1, 2],
    verbose: true,
  });

  console.log(`\n${colors.green}Simulation complete!${colors.reset}\n`);

  // Print overall statistics
  console.log(`${colors.bright}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}OVERALL STATISTICS${colors.reset}`);
  console.log(`${colors.bright}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`Total Battles:        ${report.totalBattles}`);
  console.log(`Overall Win Rate:     ${formatPercent(report.winRate)}`);
  console.log(`Avg Turns to Win:     ${formatNumber(report.avgTurnsToWin)}`);
  console.log(`Avg HP Remaining:     ${formatNumber(report.avgHPRemaining)}`);
  console.log('');

  // Print class summary
  console.log(`${colors.bright}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}CLASS PERFORMANCE${colors.reset}`);
  console.log(`${colors.bright}═══════════════════════════════════════════════════${colors.reset}`);

  Object.entries(report.classSummary).forEach(([classId, stats]) => {
    const winRateColor = stats.winRate < 60 ? colors.red :
                         stats.winRate > 90 ? colors.yellow :
                         colors.green;

    console.log(`\n${colors.bright}${classId.toUpperCase()}${colors.reset}`);
    console.log(`  Win Rate:         ${winRateColor}${formatPercent(stats.winRate)}${colors.reset}`);
    console.log(`  Avg Turns:        ${formatNumber(stats.avgTurns)}`);
    console.log(`  Avg Damage Dealt: ${formatNumber(stats.avgDamageDealt)}`);
    console.log(`  Avg Damage Taken: ${formatNumber(stats.avgDamageTaken)}`);
  });
  console.log('');

  // Print chapter summary
  console.log(`${colors.bright}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}CHAPTER DIFFICULTY${colors.reset}`);
  console.log(`${colors.bright}═══════════════════════════════════════════════════${colors.reset}`);

  Object.entries(report.chapterSummary).forEach(([chapter, stats]) => {
    const winRateColor = stats.winRate < 50 ? colors.red :
                         stats.winRate > 85 ? colors.yellow :
                         colors.green;

    console.log(`\n${colors.bright}CHAPTER ${chapter}${colors.reset}`);
    console.log(`  Win Rate:         ${winRateColor}${formatPercent(stats.winRate)}${colors.reset}`);
    console.log(`  Avg Turns:        ${formatNumber(stats.avgTurns)}`);
    console.log(`  Hardest Monster:  ${colors.red}${stats.hardestMonster}${colors.reset}`);
    console.log(`  Easiest Monster:  ${colors.green}${stats.easiestMonster}${colors.reset}`);
  });
  console.log('');

  // Print balance issues
  console.log(`${colors.bright}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}BALANCE ISSUES${colors.reset}`);
  console.log(`${colors.bright}═══════════════════════════════════════════════════${colors.reset}`);

  if (report.balanceIssues.length === 0) {
    console.log(`\n${colors.green}✓ No critical balance issues detected!${colors.reset}\n`);
  } else {
    console.log(`\n${colors.red}⚠ ${report.balanceIssues.length} issue(s) detected:${colors.reset}\n`);
    report.balanceIssues.forEach((issue, index) => {
      console.log(`${colors.red}${index + 1}. ${issue}${colors.reset}`);
    });
    console.log('');
  }

  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);
}

// Run the script
main().catch(error => {
  console.error(`${colors.red}Error running simulation:${colors.reset}`, error);
  process.exit(1);
});
