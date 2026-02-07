'use client';

import { useBattleStore } from '@/stores/useBattleStore';

const colors = {
  bg: '#1e1e1e',
  panel: '#252526',
  border: '#3c3c3c',
  blue: '#4a90e2',
  red: '#ef4444',
  green: '#4ade80',
  yellow: '#dcdcaa',
  purple: '#c586c0',
  text: '#d4d4d4',
  dimText: '#858585',
};

function Bar({
  current,
  max,
  color,
  label,
  showText = true,
}: {
  current: number;
  max: number;
  color: string;
  label: string;
  showText?: boolean;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;

  return (
    <div style={{ marginBottom: 4 }}>
      {showText && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: colors.dimText, marginBottom: 2 }}>
          <span>{label}</span>
          <span>{current}/{max}</span>
        </div>
      )}
      <div style={{ height: 8, backgroundColor: '#2a2a2a', borderRadius: 4, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            backgroundColor: color,
            borderRadius: 4,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}

export function HealthBar() {
  const {
    playerName, playerHP, playerMaxHP, playerMP, playerMaxMP, playerLevel, playerExp, playerExpNext,
    monsterName, monsterHP, monsterMaxHP, monsterType, bossPhase,
    statusEffects, isBattleActive,
  } = useBattleStore();

  if (!isBattleActive) return null;

  const playerEffects = statusEffects.filter((e) => e.target === 'player');
  const monsterEffects = statusEffects.filter((e) => e.target === 'monster');

  return (
    <>
      {/* Player Panel - top left */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          width: 200,
          padding: '8px 10px',
          backgroundColor: colors.panel,
          border: `1px solid ${colors.border}`,
          borderRadius: 6,
          opacity: 0.92,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 'bold', color: colors.blue }}>{playerName}</span>
          <span style={{ fontSize: 11, color: colors.dimText }}>Lv.{playerLevel}</span>
        </div>
        <Bar current={playerHP} max={playerMaxHP} color={colors.green} label="HP" />
        <Bar current={playerMP} max={playerMaxMP} color={colors.blue} label="MP" />
        <Bar current={playerExp} max={playerExpNext} color={colors.yellow} label="EXP" />
        {playerEffects.length > 0 && (
          <div style={{ fontSize: 10, color: colors.purple, marginTop: 4 }}>
            {playerEffects.map((e, i) => (
              <span key={i} style={{ marginRight: 6 }}>
                {e.type === 'stun' ? '⚡' : '❓'} {e.type.toUpperCase()} ({e.turnsRemaining}t)
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Monster Panel - top right */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 200,
          padding: '8px 10px',
          backgroundColor: colors.panel,
          border: `1px solid ${colors.border}`,
          borderRadius: 6,
          opacity: 0.92,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 'bold', color: colors.red }}>{monsterName}</span>
          {monsterType === 'boss' && (
            <span style={{ fontSize: 10, color: colors.yellow }}>P{bossPhase}</span>
          )}
        </div>
        <Bar current={monsterHP} max={monsterMaxHP} color={colors.red} label="HP" />
        {monsterEffects.length > 0 && (
          <div style={{ fontSize: 10, color: colors.purple, marginTop: 4 }}>
            {monsterEffects.map((e, i) => (
              <span key={i} style={{ marginRight: 6 }}>
                {e.type === 'stun' ? '⚡' : '❓'} {e.type.toUpperCase()} ({e.turnsRemaining}t)
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
