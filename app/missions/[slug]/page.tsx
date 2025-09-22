'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import type { Mission, MissionPlaceFeature, ProgressResponse } from '@/lib/types';
import { getMissionColor } from '@/lib/missions';

const JAPAN_BBOX = '122.0,20.0,154.0,46.5';

type MissionDetailProps = {
  params: { slug: string };
};

export default function MissionDetailPage({ params }: MissionDetailProps) {
  const { slug } = params;
  const [mission, setMission] = useState<Mission | null>(null);
  const [places, setPlaces] = useState<MissionPlaceFeature[]>([]);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetch('/api/missions')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('mission');
        }
        const data = (await response.json()) as Mission[];
        const found = data.find((item) => item.slug === slug) ?? null;
        if (mounted) {
          setMission(found);
        }
      })
      .catch((err) => {
        console.error(err);
        if (mounted) setError('ミッション情報を取得できませんでした');
      });

    fetch(`/api/places?bbox=${encodeURIComponent(JAPAN_BBOX)}&missions=${slug}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('places');
        }
        const data = (await response.json()) as MissionPlaceFeature[];
        if (mounted) {
          setPlaces(data);
        }
      })
      .catch((err) => {
        console.error(err);
        if (mounted) setError('寺社の一覧を取得できませんでした');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!mission) return;
    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missionSlugs: [mission.slug] })
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('progress');
        }
        const data = (await response.json()) as ProgressResponse;
        setProgress(data);
      })
      .catch((err) => {
        console.error(err);
        setError('進捗の取得に失敗しました');
      });
  }, [mission]);

  const visitedSet = useMemo(() => {
    if (!mission || !progress) return new Set<string>();
    return new Set(progress.byMission[mission.slug]?.visitedPlaceIds ?? []);
  }, [mission, progress]);

  const totalPlaces = mission ? progress?.byMission[mission.slug]?.total ?? places.length : places.length;
  const completed = mission ? progress?.byMission[mission.slug]?.completed ?? visitedSet.size : visitedSet.size;
  const percent = totalPlaces === 0 ? 0 : Math.round((completed / totalPlaces) * 100);

  return (
    <div style={{ padding: '2rem 1.5rem', display: 'grid', gap: '1.5rem' }}>
      <Link href="/missions" style={{ color: '#2563eb', fontSize: '0.9rem' }}>
        ← ミッション一覧に戻る
      </Link>
      {mission ? (
        <header style={{ display: 'grid', gap: '0.75rem' }}>
          <h1 style={{ margin: 0, fontSize: '2rem' }}>{mission.title}</h1>
          <div>
            <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem' }}>
              達成状況: {completed} / {totalPlaces} ({percent}%)
            </p>
            <div
              style={{
                marginTop: '0.5rem',
                height: '12px',
                borderRadius: '999px',
                background: '#e2e8f0',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  width: `${percent}%`,
                  height: '100%',
                  background: getMissionColor(mission, 0),
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>
        </header>
      ) : (
        <h1>ミッションを読み込んでいます…</h1>
      )}
      {error && <p style={{ color: '#ef4444' }}>{error}</p>}
      {loading && <p>読み込み中です…</p>}
      <section style={{ display: 'grid', gap: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.3rem' }}>寺社リスト</h2>
        <ul
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'grid',
            gap: '0.75rem'
          }}
        >
          {places.map((feature) => {
            const isVisited = visitedSet.has(feature.place.id);
            return (
              <li
                key={`${feature.place.id}`}
                style={{
                  borderRadius: '12px',
                  padding: '0.75rem 1rem',
                  background: '#fff',
                  boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'grid' }}>
                  <span style={{ fontWeight: 600 }}>{feature.place.name}</span>
                  {feature.place.prefecture && (
                    <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                      {feature.place.prefecture}
                    </span>
                  )}
                </div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '72px',
                    height: '32px',
                    borderRadius: '999px',
                    background: isVisited ? '#2563eb' : '#e2e8f0',
                    color: isVisited ? '#fff' : '#475569',
                    fontSize: '0.85rem'
                  }}
                >
                  {isVisited ? '済' : '未' }
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
