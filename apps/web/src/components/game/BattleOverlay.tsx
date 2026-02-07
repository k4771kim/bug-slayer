'use client';

import { HealthBar } from './HealthBar';
import { SkillPanel } from './SkillPanel';
import { BattleLog } from './BattleLog';
import { TechDebtMeter } from './TechDebtMeter';

/**
 * BattleOverlay - Positions React UI components over the Phaser canvas.
 *
 * Uses absolute positioning to layer HTML elements on top of the
 * game canvas. Pointer events pass through to Phaser except on
 * interactive UI elements.
 */
export function BattleOverlay() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10,
        fontFamily: "'Segoe UI', 'Consolas', monospace",
        color: '#d4d4d4',
      }}
    >
      {/* Each child re-enables pointer events on its own container */}
      <div style={{ pointerEvents: 'auto' }}>
        <HealthBar />
      </div>
      <div style={{ pointerEvents: 'auto' }}>
        <TechDebtMeter />
      </div>
      <div style={{ pointerEvents: 'auto' }}>
        <BattleLog />
      </div>
      <div style={{ pointerEvents: 'auto' }}>
        <SkillPanel />
      </div>
    </div>
  );
}
