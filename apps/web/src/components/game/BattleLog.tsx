'use client';

import { useEffect, useRef } from 'react';
import { useBattleStore } from '@/stores/useBattleStore';

const colors = {
  panel: '#252526',
  border: '#3c3c3c',
  blue: '#4a90e2',
  red: '#ef4444',
  green: '#4ade80',
  dimText: '#858585',
  text: '#d4d4d4',
};

const typeColors: Record<string, string> = {
  player: colors.green,
  enemy: colors.red,
  system: colors.blue,
};

export function BattleLog() {
  const { logs, isBattleActive } = useBattleStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new log
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isBattleActive) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 52,
        right: 8,
        width: 220,
        maxHeight: 160,
        padding: '6px 8px',
        backgroundColor: colors.panel,
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        opacity: 0.88,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ fontSize: 11, color: colors.dimText, marginBottom: 4, fontWeight: 'bold' }}>
        Battle Log
      </div>
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          fontSize: 10,
          lineHeight: '14px',
          scrollbarWidth: 'thin',
          scrollbarColor: `${colors.border} transparent`,
        }}
      >
        {logs.length === 0 && (
          <div style={{ color: colors.dimText, fontStyle: 'italic' }}>Battle started...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} style={{ color: typeColors[log.type] || colors.text, marginBottom: 2 }}>
            <span style={{ color: colors.dimText, marginRight: 4 }}>
              {log.type === 'player' ? '>' : log.type === 'enemy' ? '!' : '*'}
            </span>
            {log.message}
          </div>
        ))}
      </div>
    </div>
  );
}
