/**
 * Balance Simulation Runner - All 8 Classes
 * Run with: npx tsx src/systems/run-balance-sim.ts
 */

import { BalanceSimulator } from './BalanceSimulator';

async function main() {
  console.log('='.repeat(70));
  console.log('  Bug Slayer: Balance Simulation - All 8 Classes');
  console.log('='.repeat(70));
  console.log('');

  const allClasses = [
    'debugger', 'refactorer', 'fullstack', 'devops',
    'gpu-warlock', 'cat-summoner', 'code-ninja', 'light-mage'
  ];

  const report = await BalanceSimulator.simulate({
    numBattles: 1000,
    classes: allClasses,
    chapters: [1, 2],
    verbose: false,
  });

  // Print results
  console.log('\n' + '='.repeat(70));
  console.log('  SIMULATION RESULTS');
  console.log('='.repeat(70));
  console.log(`Total Battles: ${report.totalBattles}`);
  console.log(`Overall Win Rate: ${report.winRate.toFixed(1)}%`);
  console.log(`Avg Turns to Win: ${report.avgTurnsToWin.toFixed(1)}`);
  console.log(`Avg HP Remaining: ${report.avgHPRemaining.toFixed(0)}`);

  // Class rankings
  console.log('\n' + '-'.repeat(70));
  console.log('  CLASS RANKINGS (sorted by win rate)');
  console.log('-'.repeat(70));
  console.log(
    'Class'.padEnd(16) +
    'Win%'.padStart(8) +
    'AvgTurns'.padStart(10) +
    'AvgDmgDealt'.padStart(13) +
    'AvgDmgTaken'.padStart(13)
  );
  console.log('-'.repeat(60));

  const sorted = Object.entries(report.classSummary)
    .sort((a, b) => b[1].winRate - a[1].winRate);

  for (const [classId, stats] of sorted) {
    console.log(
      classId.padEnd(16) +
      `${stats.winRate.toFixed(1)}%`.padStart(8) +
      stats.avgTurns.toFixed(1).padStart(10) +
      stats.avgDamageDealt.toFixed(0).padStart(13) +
      stats.avgDamageTaken.toFixed(0).padStart(13)
    );
  }

  // Chapter summary
  console.log('\n' + '-'.repeat(70));
  console.log('  CHAPTER DIFFICULTY');
  console.log('-'.repeat(70));

  for (const [chapter, stats] of Object.entries(report.chapterSummary)) {
    console.log(`Chapter ${chapter}: Win Rate ${stats.winRate.toFixed(1)}% | Avg Turns ${stats.avgTurns.toFixed(1)}`);
    console.log(`  Hardest: ${stats.hardestMonster} | Easiest: ${stats.easiestMonster}`);
  }

  // Balance issues
  console.log('\n' + '-'.repeat(70));
  console.log('  BALANCE ISSUES');
  console.log('-'.repeat(70));

  if (report.balanceIssues.length === 0) {
    console.log('No balance issues detected!');
  } else {
    for (const issue of report.balanceIssues) {
      console.log(`  [!] ${issue}`);
    }
  }

  // Win rate spread analysis
  const winRates = Object.entries(report.classSummary).map(([id, s]) => ({ id, wr: s.winRate }));
  const maxWR = Math.max(...winRates.map(c => c.wr));
  const minWR = Math.min(...winRates.map(c => c.wr));
  const spread = maxWR - minWR;

  console.log('\n' + '-'.repeat(70));
  console.log('  BALANCE VERDICT');
  console.log('-'.repeat(70));
  console.log(`Win Rate Spread: ${spread.toFixed(1)}% (${minWR.toFixed(1)}% ~ ${maxWR.toFixed(1)}%)`);

  if (spread <= 10) {
    console.log('Verdict: EXCELLENT balance - all classes within 10% spread');
  } else if (spread <= 20) {
    console.log('Verdict: GOOD balance - classes within 20% spread');
  } else if (spread <= 30) {
    console.log('Verdict: NEEDS TUNING - some classes over/under-performing');
  } else {
    console.log('Verdict: POOR balance - significant class imbalance detected');
  }

  console.log('\n' + '='.repeat(70));
}

main().catch(console.error);
