'use client';

import React from 'react';
import type { Mission } from '@/lib/types';
import { getMissionColor } from '@/lib/missions';

type MissionLegendProps = {
  missions: Mission[];
  selected: string[];
  onChange: (next: string[]) => void;
};

export function MissionLegend({ missions, selected, onChange }: MissionLegendProps) {
  const handleToggle = (slug: string) => {
    const next = selected.includes(slug)
      ? selected.filter((s) => s !== slug)
      : [...selected, slug];
    onChange(next);
  };

  const handleSelectAll = () => {
    if (selected.length === missions.length) {
      onChange([]);
    } else {
      onChange(missions.map((mission) => mission.slug));
    }
  };

  return (
    <section
      aria-label="ミッション選択"
      style={{
        background: 'rgba(255,255,255,0.96)',
        borderRadius: '12px',
        boxShadow: '0 12px 24px rgba(15,23,42,0.15)',
        padding: '1rem',
        maxWidth: '280px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}
    >
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1rem', margin: 0 }}>ミッション</h2>
        <button
          type="button"
          onClick={handleSelectAll}
          style={{
            fontSize: '0.8rem',
            background: 'none',
            border: 'none',
            color: '#2563eb',
            cursor: 'pointer'
          }}
        >
          {selected.length === missions.length ? '全て解除' : '全て選択'}
        </button>
      </header>
      <div style={{ display: 'grid', gap: '0.5rem' }}>
        {missions.map((mission, index) => {
          const color = getMissionColor(mission, index);
          const isChecked = selected.includes(mission.slug) || (selected.length === 0 && index === 0);
          return (
            <label
              key={mission.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer'
              }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => handleToggle(mission.slug)}
                style={{ width: 16, height: 16 }}
              />
              <span
                aria-hidden
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '999px',
                  background: color,
                  display: 'inline-block'
                }}
              />
              <span style={{ fontSize: '0.9rem' }}>{mission.title}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

export default MissionLegend;
