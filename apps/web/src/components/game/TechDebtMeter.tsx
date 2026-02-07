'use client';

import { useBattleStore } from '@/stores/useBattleStore';

const colors = {
  panel: '#252526',
  border: '#3c3c3c',
  green: '#4ade80',
  yellow: '#dcdcaa',
  orange: '#f59e0b',
  red: '#ef4444',
  dimText: '#858585',
};

function getDebtColor(debt: number): string {
  if (debt < 30) return colors.green;
  if (debt < 60) return colors.yellow;
  if (debt < 80) return colors.orange;
  return colors.red;
}

function getDebtLabel(debt: number): string {
  if (debt < 30) return 'Low';
  if (debt < 60) return 'Medium';
  if (debt < 80) return 'High';
  return 'Critical';
}

export function TechDebtMeter() {
  const { techDebt, isBattleActive, chapter, stage } = useBattleStore();

  if (!isBattleActive) return null;

  const debtColor = getDebtColor(techDebt);
  const debtLabel = getDebtLabel(techDebt);
  const pct = Math.min(100, techDebt);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 52,
        left: 8,
        width: 180,
        padding: '6px 8px',
        backgroundColor: colors.panel,
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        opacity: 0.92,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: colors.dimText, fontWeight: 'bold' }}>Tech Debt</span>
        <span style={{ color: colors.dimText, fontSize: 10 }}>Ch.{chapter} S.{stage}</span>
      </div>

      {/* Gauge */}
      <div style={{ height: 10, backgroundColor: '#2a2a2a', borderRadius: 5, overflow: 'hidden', marginBottom: 4 }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: debtColor,
            borderRadius: 5,
            transition: 'width 0.3s ease, background-color 0.3s ease',
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
        <span style={{ color: debtColor, fontWeight: 'bold' }}>{debtLabel}</span>
        <span style={{ color: colors.dimText }}>{techDebt}/100</span>
      </div>
    </div>
  );
}
