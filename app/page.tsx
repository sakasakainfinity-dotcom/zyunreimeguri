import dynamic from 'next/dynamic';
import React from 'react';

const MapLeaflet = dynamic(() => import('./components/MapLeaflet'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: 'calc(100vh - 56px)'
      }}
    >
      <p style={{ color: '#6b7280' }}>地図を読み込んでいます…</p>
    </div>
  )
});

export default function HomePage() {
  return <MapLeaflet />;
}
