/**
 * Accessibility System Demo and Validation
 *
 * This demonstrates the AccessibilitySystem features and validates
 * the VS Code Dark+ palette against WCAG AA standards.
 */

import { AccessibilitySystem } from '../AccessibilitySystem';
import paletteData from '../../data/palette.json';

// Demo 1: Color+Icon Pairing
console.log('=== Color+Icon Pairing Demo ===\n');

console.log('Character Stats:');
['HP', 'MP', 'ATK', 'DEF', 'SPD'].forEach(stat => {
  const pair = AccessibilitySystem.getStatusPair(stat);
  console.log(`${stat}: ${pair.icon} ${pair.color} - ${pair.label}`);
});

console.log('\nItem Rarity:');
['common', 'rare', 'epic'].forEach(rarity => {
  const pair = AccessibilitySystem.getRarityPair(rarity);
  console.log(`${rarity}: ${pair.icon} ${pair.color} - ${pair.label}`);
});

console.log('\nTech Debt Levels:');
['low', 'medium', 'high', 'critical'].forEach(level => {
  const pair = AccessibilitySystem.getTechDebtPair(level);
  console.log(`${level}: ${pair.icon} ${pair.color} - ${pair.label}`);
});

console.log('\nCombat Actions:');
['attack', 'skill', 'focus', 'item', 'flee'].forEach(action => {
  const pair = AccessibilitySystem.getCombatActionPair(action);
  console.log(`${action}: ${pair.icon} ${pair.color} - ${pair.label}`);
});

console.log('\nStage Status:');
['completed', 'current', 'locked'].forEach(status => {
  const pair = AccessibilitySystem.getStageStatusPair(status);
  console.log(`${status}: ${pair.icon} ${pair.color} - ${pair.label}`);
});

// Demo 2: Contrast Ratio Validation
console.log('\n=== WCAG AA Contrast Validation ===\n');

const bgColor = '#1e1e1e'; // VS Code Dark+ background

// Test key colors
const testColors = [
  { name: 'HP (green)', color: '#4ec9b0' },
  { name: 'MP (blue)', color: '#569cd6' },
  { name: 'ATK (red)', color: '#f48771' },
  { name: 'DEF (yellow)', color: '#dcdcaa' },
  { name: 'SPD (lightblue)', color: '#9cdcfe' },
  { name: 'Rare (blue)', color: '#569cd6' },
  { name: 'Epic (pink)', color: '#c586c0' },
  { name: 'Success (green)', color: '#89d185' },
  { name: 'Warning (yellow)', color: '#cca700' },
  { name: 'Error (red)', color: '#f48771' },
  { name: 'Muted (gray)', color: '#858585' },
];

console.log(`Background: ${bgColor}\n`);
console.log('Color                 Ratio    AA (4.5:1)  AA Large (3:1)');
console.log('─'.repeat(60));

testColors.forEach(({ name, color }) => {
  const ratio = AccessibilitySystem.contrastRatio(color, bgColor);
  const passesAA = ratio >= 4.5;
  const passesAALarge = ratio >= 3.0;

  const ratioStr = ratio.toFixed(2).padEnd(8);
  const aaStr = passesAA ? '✓' : '✗';
  const aaLargeStr = passesAALarge ? '✓' : '✗';

  console.log(`${name.padEnd(20)} ${ratioStr} ${aaStr}           ${aaLargeStr}`);
});

// Demo 3: Palette Validation
console.log('\n=== Full Palette Validation ===\n');

const validation = AccessibilitySystem.validatePalette(paletteData.colors, bgColor);

console.log(`Overall WCAG AA Large Compliance: ${validation.passed ? '✓ PASS' : '✗ FAIL'}\n`);

const failedAA = validation.results.filter(r => !r.passesAA);
const failedAALarge = validation.results.filter(r => !r.passesAALarge);

console.log(`Colors meeting AA Normal (4.5:1): ${validation.results.length - failedAA.length}/${validation.results.length}`);
console.log(`Colors meeting AA Large (3:1): ${validation.results.length - failedAALarge.length}/${validation.results.length}`);

if (failedAA.length > 0) {
  console.log('\nColors requiring icon pairing or large text:');
  failedAA.forEach(r => {
    console.log(`  ${r.name}: ${r.contrastRatio.toFixed(2)}:1 - ${r.suggestion}`);
  });
}

// Demo 4: Color Blindness Simulation
console.log('\n=== Color Blindness Simulation ===\n');

const testColor = '#4ec9b0'; // HP green
console.log(`Original color: ${testColor}`);
console.log(`Protanopia (red-blind): ${AccessibilitySystem.simulateColorBlindness(testColor, 'protanopia')}`);
console.log(`Deuteranopia (green-blind): ${AccessibilitySystem.simulateColorBlindness(testColor, 'deuteranopia')}`);
console.log(`Tritanopia (blue-blind): ${AccessibilitySystem.simulateColorBlindness(testColor, 'tritanopia')}`);

// Demo 5: Accessible Text Color Selection
console.log('\n=== Accessible Text Color Selection ===\n');

const backgrounds = ['#1e1e1e', '#ffffff', '#569cd6', '#f48771'];
backgrounds.forEach(bg => {
  const textColor = AccessibilitySystem.getAccessibleTextColor(bg);
  console.log(`Background ${bg} -> Text ${textColor}`);
});

console.log('\n=== Validation Complete ===\n');
