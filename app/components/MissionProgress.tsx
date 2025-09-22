'use client';

import React, { useMemo } from 'react';
import type { Mission, ProgressResponse } from '@/lib/types';
import { getMissionColor } from '@/lib/missions';

type MissionProgressProps = {
  missions: Mission[];
  selected: string[];
  progress: ProgressResponse | null;
};

function formatProgressLabel(completed: number, total: number) {
  if (total === 0) return '0%';
  return `${Math.round((completed / total) * 100)}%`;
}

export function MissionProgress({ missions, selected, progress }: MissionProgressProps) {
  const visibleMissions = useMemo(() => {
    if (missions.length === 0) return [] as Mission[];
    if (selected.length === 0) {
      return [missions[0]];
    }
    return missions.filter((mission) => selected.includes(mission.slug));
  }, [missions, selected]);

  const total = visibleMissions.reduce(
    (acc, mission) => {
      const entry = progress?.byMission[mission.slug];
      if (!entry) return acc;
      return {
        completed: acc.completed + entry.completed,
        total: acc.total + entry.total
      };
    },
    { completed: 0, total: 0 }
  );

  return (
    <section
      aria-label="進捗状況"
      style={{
        background: 'rgba(255,255,255,0.96)',
        borderRadius: '12px',
        boxShadow: '0 12px 24px rgba(15,23,42,0.12)',
        padding: '1rem',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}
    >
      <header>
        <h2 style={{ fontSize: '1rem', margin: 0 }}>進捗</h2>
        <p style={{ fontSize: '0.85rem', margin: '0.25rem 0 0', color: '#6b7280' }}>
          {visibleMissions.length > 1 ? '選択中ミッションの合計' : 'ミッションの達成度'}
        </p>
      </header>
      <div>
        <div
          style={{
            height: '12px',
            borderRadius: '999px',
            background: '#e5e7eb',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <div
            style={{
              width: `${total.total === 0 ? 0 : Math.min(100, (total.completed / total.total) * 100)}%`,
              background: '#2563eb',
              height: '100%',
              transition: 'width 0.4s ease'
            }}
          />
        </div>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#1f2933' }}>
          {total.completed} / {total.total} ({formatProgressLabel(total.completed, total.total)})
        </p>
      </div>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {visibleMissions.map((mission, index) => {
          const entry = progress?.byMission[mission.slug] ?? { completed: 0, total: 0 };
          const percent = entry.total === 0 ? 0 : Math.min(100, (entry.completed / entry.total) * 100);
          const color = getMissionColor(mission, index);
          return (
            <article key={mission.id} style={{ display: 'grid', gap: '0.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    aria-hidden
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: color,
                      display: 'inline-block'
                    }}
                  />
                  <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{mission.title}</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#4b5563' }}>
                  {entry.completed} / {entry.total}
                </span>
              </div>
              <div
                aria-hidden
                style={{
                  height: 6,
                  borderRadius: '999px',
                  background: '#e5e7eb',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: `${percent}%`,
                    height: '100%',
                    background: color,
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default MissionProgress;
