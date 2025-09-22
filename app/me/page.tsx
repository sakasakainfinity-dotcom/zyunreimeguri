'use client';

import React, { useEffect, useState } from 'react';
import type { Mission } from '@/lib/types';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';

type BadgeRecord = {
  id: string;
  unlocked_at: string;
  badge: {
    id: string;
    slug: string;
    title: string;
    description: string | null;
  } | null;
};

type CertificateRecord = {
  id: string;
  created_at: string;
  mission: Mission | null;
  image_path: string;
  url?: string;
};

export default function MePage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [badges, setBadges] = useState<BadgeRecord[]>([]);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
          error: userError
        } = await supabase.auth.getUser();
        if (userError || !user) {
          throw userError ?? new Error('not logged in');
        }
        if (mounted) {
          setUserEmail(user.email ?? user.id);
        }

        const [{ data: badgeRows, error: badgeError }, { data: certificateRows, error: certificateError }] =
          await Promise.all([
            supabase
              .from('user_badges')
              .select('id, unlocked_at, badge:badges(id, slug, title, description)')
              .eq('user_id', user.id)
              .order('unlocked_at', { ascending: false }),
            supabase
              .from('certificates')
              .select('id, created_at, image_path, mission:missions(id, slug, title, color)')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
          ]);

        if (badgeError) throw badgeError;
        if (certificateError) throw certificateError;

        if (mounted) {
          setBadges(badgeRows ?? []);
          setCertificates(certificateRows ?? []);
        }

        const certificateUrls = await Promise.all(
          (certificateRows ?? []).map(async (certificate) => {
            const { data, error: urlError } = await supabase.storage
              .from('certificates')
              .createSignedUrl(certificate.image_path, 60 * 60);
            if (urlError || !data) {
              return { id: certificate.id, url: null };
            }
            return { id: certificate.id, url: data.signedUrl };
          })
        );
        if (mounted) {
          setCertificates((prev) =>
            prev.map((item) => {
              const found = certificateUrls.find((url) => url.id === item.id);
              return found ? { ...item, url: found.url ?? undefined } : item;
            })
          );
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setError('ユーザー情報の取得に失敗しました');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load().catch((err) => console.error(err));
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '2rem 1.5rem' }}>
        <p>読み込み中です…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem 1.5rem' }}>
        <p style={{ color: '#ef4444' }}>{error}</p>
      </div>
    );
  }

  if (!userEmail) {
    return (
      <div style={{ padding: '2rem 1.5rem' }}>
        <p>ログインすると称号と証明書を確認できます。</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem 1.5rem', display: 'grid', gap: '2rem' }}>
      <section
        style={{
          background: '#fff',
          padding: '1.5rem',
          borderRadius: '16px',
          boxShadow: '0 12px 32px rgba(15,23,42,0.15)',
          display: 'grid',
          gap: '0.5rem'
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.6rem' }}>マイページ</h1>
        <p style={{ margin: 0, color: '#64748b' }}>{userEmail}</p>
      </section>
      <section style={{ display: 'grid', gap: '1rem' }}>
        <h2 style={{ margin: 0 }}>称号</h2>
        {badges.length === 0 ? (
          <p style={{ color: '#64748b' }}>まだ称号がありません。巡礼を進めて獲得しましょう！</p>
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
            {badges.map((badge) => (
              <li
                key={badge.id}
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '1rem',
                  boxShadow: '0 8px 24px rgba(15,23,42,0.1)',
                  display: 'grid',
                  gap: '0.5rem'
                }}
              >
                <strong>{badge.badge?.title ?? badge.badge?.slug}</strong>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {badge.unlocked_at ? new Date(badge.unlocked_at).toLocaleDateString('ja-JP') : '取得日不明'}
                </span>
                {badge.badge?.description && <p style={{ margin: 0 }}>{badge.badge.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section style={{ display: 'grid', gap: '1rem' }}>
        <h2 style={{ margin: 0 }}>証明書</h2>
        {certificates.length === 0 ? (
          <p style={{ color: '#64748b' }}>証明書はまだ発行されていません。</p>
        ) : (
          <div
            style={{
              display: 'grid',
              gap: '1rem',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))'
            }}
          >
            {certificates.map((certificate) => (
              <article
                key={certificate.id}
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '1rem',
                  boxShadow: '0 10px 28px rgba(15,23,42,0.12)',
                  display: 'grid',
                  gap: '0.5rem'
                }}
              >
                <strong>{certificate.mission?.title ?? 'ミッション'}</strong>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  {new Date(certificate.created_at).toLocaleDateString('ja-JP')}
                </span>
                {certificate.url ? (
                  <a
                    href={certificate.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#2563eb', fontSize: '0.9rem' }}
                  >
                    証明書を表示
                  </a>
                ) : (
                  <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>URLを生成できませんでした</span>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
