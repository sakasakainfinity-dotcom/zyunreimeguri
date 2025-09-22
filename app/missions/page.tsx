'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import type { Mission } from '@/lib/types';
import { getMissionColor } from '@/lib/missions';

export default function MissionsPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch('/api/missions')
      .then(async (response) => {
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || 'ミッションの取得に失敗しました');
        }
        const data = (await response.json()) as Mission[];
        if (mounted) {
          setMissions(data);
        }
      })
      .catch((err) => {
        console.error(err);
        if (mounted) {
          setError('ミッションを読み込めませんでした');
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div style={{ padding: '2rem 1.5rem', display: 'grid', gap: '1.5rem' }}>
      <header style={{ display: 'grid', gap: '0.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', margin: 0 }}>ミッション一覧</h1>
        <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
          参加したい巡礼ミッションを選んで地図で進捗を確認しましょう。
        </p>
      </header>
      {loading && <p>読み込み中です…</p>}
      {error && <p style={{ color: '#ef4444' }}>{error}</p>}
      <div
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))'
        }}
      >
        {missions.map((mission, index) => {
          const color = getMissionColor(mission, index);
          return (
            <Link
              href={`/missions/${mission.slug}`}
              key={mission.id}
              style={{
                borderRadius: '16px',
                padding: '1.25rem',
                background: '#fff',
                boxShadow: '0 10px 30px rgba(15,23,42,0.12)',
                display: 'grid',
                gap: '0.75rem',
                textDecoration: 'none'
              }}
            >
              <span
                aria-hidden
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '999px',
                  background: `${color}22`,
                  display: 'grid',
                  placeItems: 'center',
                  color
                }}
              >
                ★
              </span>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>{mission.title}</h2>
              <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>詳細を見る →</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
