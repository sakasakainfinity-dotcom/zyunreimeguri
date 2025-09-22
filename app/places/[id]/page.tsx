'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import type { Mission, Place } from '@/lib/types';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';
import { getMissionColor } from '@/lib/missions';

type VisitRecord = {
  id: string;
  visited_at: string | null;
  note: string | null;
  photos_count: number;
};

type PlaceDetailProps = {
  params: { id: string };
};

export default function PlaceDetailPage({ params }: PlaceDetailProps) {
  const { id } = params;
  const [place, setPlace] = useState<Place | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const [{ data: placeRow, error: placeError }, { data: missionRows, error: missionError }] = await Promise.all([
          supabase
            .from('places')
            .select('id, name, latitude, longitude, prefecture, address')
            .eq('id', id)
            .maybeSingle<Place>(),
          supabase
            .from('mission_places')
            .select('mission:missions(id, slug, title, color)')
            .eq('place_id', id)
            .returns<{ mission: Mission | null }[]>()
        ]);

        if (placeError || !placeRow) {
          throw placeError ?? new Error('place not found');
        }

        if (missionError) {
          throw missionError;
        }

        const missionsList = (missionRows ?? [])
          .map((row) => row.mission)
          .filter((mission): mission is Mission => Boolean(mission));

        if (mounted) {
          setPlace(placeRow);
          setMissions(missionsList);
        }

        const { data: visitRows, error: visitError } = await supabase
          .from('visits')
          .select('id, visited_at, note, photos_count')
          .eq('place_id', id)
          .order('visited_at', { ascending: false });
        if (visitError) {
          throw visitError;
        }
        if (mounted) {
          setVisits(visitRows ?? []);
        }
      } catch (err) {
        console.error(err);
        if (mounted) setError('寺社情報の取得に失敗しました');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData().catch((err) => console.error(err));
    return () => {
      mounted = false;
    };
  }, [id]);

  return (
    <div style={{ padding: '2rem 1.5rem', display: 'grid', gap: '1.5rem' }}>
      <Link href="/" style={{ color: '#2563eb', fontSize: '0.9rem' }}>
        ← 地図に戻る
      </Link>
      {loading && <p>読み込み中です…</p>}
      {error && <p style={{ color: '#ef4444' }}>{error}</p>}
      {place && (
        <section
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 12px 32px rgba(15,23,42,0.15)',
            display: 'grid',
            gap: '1rem'
          }}
        >
          <header>
            <h1 style={{ margin: 0, fontSize: '1.8rem' }}>{place.name}</h1>
            <p style={{ margin: '0.25rem 0 0', color: '#64748b' }}>{place.address ?? place.prefecture}</p>
          </header>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {missions.map((mission, index) => {
              const color = getMissionColor(mission, index);
              return (
                <span
                  key={mission.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '999px',
                    background: `${color}22`,
                    color,
                    fontSize: '0.85rem'
                  }}
                >
                  {mission.title}
                </span>
              );
            })}
          </div>
          <div>
            <p style={{ margin: 0, color: '#475569', fontSize: '0.9rem' }}>
              緯度: {place.latitude.toFixed(5)} / 経度: {place.longitude.toFixed(5)}
            </p>
          </div>
        </section>
      )}
      <section style={{ display: 'grid', gap: '1rem' }}>
        <h2 style={{ margin: 0 }}>訪問履歴</h2>
        {visits.length === 0 ? (
          <p style={{ color: '#64748b' }}>まだ訪問記録がありません。</p>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gap: '1rem'
            }}
          >
            {visits.map((visit) => (
              <li
                key={visit.id}
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '1rem',
                  boxShadow: '0 8px 24px rgba(15,23,42,0.1)',
                  display: 'grid',
                  gap: '0.5rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600 }}>
                    {visit.visited_at ? new Date(visit.visited_at).toLocaleDateString('ja-JP') : '訪問日未設定'}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    写真: {visit.photos_count}枚
                  </span>
                </div>
                {visit.note && <p style={{ margin: 0, color: '#475569' }}>{visit.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
