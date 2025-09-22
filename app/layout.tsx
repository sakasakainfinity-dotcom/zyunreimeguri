import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';
import React from 'react';

export const metadata: Metadata = {
  title: '巡礼マップ',
  description: '全国の寺社巡礼を達成して、称号と証明書を集めよう。'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1.5rem',
            background: '#fff',
            borderBottom: '1px solid #e5e7eb',
            position: 'sticky',
            top: 0,
            zIndex: 100
          }}
        >
          <Link href="/" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            巡礼マップ
          </Link>
          <nav style={{ display: 'flex', gap: '1rem', fontSize: '0.95rem' }}>
            <Link href="/missions">ミッション</Link>
            <Link href="/me">マイページ</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
