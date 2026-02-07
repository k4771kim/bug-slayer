'use client';

import { useBattleStore } from '@/stores/useBattleStore';

const colors = {
  panel: '#252526',
  border: '#3c3c3c',
  blue: '#4a90e2',
  dimText: '#858585',
  text: '#d4d4d4',
  disabled: '#4a4a4a',
  cooldown: '#f59e0b',
};

export function SkillPanel() {
  const { skills, playerMP, isPlayerTurn, isBattleActive } = useBattleStore();

  if (!isBattleActive || skills.length === 0) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 8,
        left: 8,
        right: 8,
        maxWidth: 500,
        margin: '0 auto',
        padding: '6px 8px',
        backgroundColor: colors.panel,
        border: `1px solid ${colors.border}`,
        borderRadius: 6,
        opacity: 0.92,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
        justifyContent: 'center',
      }}
    >
      {skills.map((skill) => {
        const canAfford = playerMP >= skill.mpCost;
        const onCooldown = skill.cooldown > 0;
        const canUse = isPlayerTurn && canAfford && !onCooldown;

        return (
          <button
            key={skill.id}
            disabled={!canUse}
            title={skill.description}
            onClick={() => {
              if (canUse) {
                window.dispatchEvent(
                  new CustomEvent('battle:action', { detail: { type: 'skill', skillId: skill.id } })
                );
              }
            }}
            style={{
              padding: '4px 8px',
              fontSize: 11,
              borderRadius: 4,
              border: `1px solid ${canUse ? colors.blue : colors.disabled}`,
              backgroundColor: canUse ? '#2a4a6a' : '#1a1a2a',
              color: canUse ? colors.text : colors.dimText,
              cursor: canUse ? 'pointer' : 'default',
              opacity: canUse ? 1 : 0.6,
              position: 'relative',
              minWidth: 80,
              textAlign: 'center',
            }}
          >
            <div style={{ fontWeight: 'bold' }}>{skill.name}</div>
            <div style={{ fontSize: 10, color: colors.dimText }}>
              {skill.mpCost} MP
              {onCooldown && (
                <span style={{ color: colors.cooldown, marginLeft: 4 }}>CD:{skill.cooldown}</span>
              )}
            </div>
            {/* Cooldown overlay */}
            {onCooldown && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 'bold',
                  color: colors.cooldown,
                }}
              >
                {skill.cooldown}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
