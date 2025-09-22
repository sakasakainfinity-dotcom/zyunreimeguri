'use client';

import 'leaflet/dist/leaflet.css';
import '@/styles/mission-pin.css';

import L from 'leaflet';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import type { Mission, MissionPlaceFeature, ProgressResponse, BoundingBox, Place } from '@/lib/types';
import { getMissionColor, getPrimaryMissionSlug } from '@/lib/missions';
import MissionLegend from './MissionLegend';
import MissionProgress from './MissionProgress';
import VisitModal from './VisitModal';

const INITIAL_CENTER: [number, number] = [35.681236, 139.767125];
const INITIAL_ZOOM = 6;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'
});

type MapEventsProps = {
  onBoundsChange: (bounds: BoundingBox) => void;
};

function MapEvents({ onBoundsChange }: MapEventsProps) {
  useMapEvents({
    load: (event) => {
      const bounds = event.target.getBounds();
      onBoundsChange({
        minLng: bounds.getWest(),
        minLat: bounds.getSouth(),
        maxLng: bounds.getEast(),
        maxLat: bounds.getNorth()
      });
    },
    moveend: (event) => {
      const bounds = event.target.getBounds();
      onBoundsChange({
        minLng: bounds.getWest(),
        minLat: bounds.getSouth(),
        maxLng: bounds.getEast(),
        maxLat: bounds.getNorth()
      });
    },
    zoomend: (event) => {
      const bounds = event.target.getBounds();
      onBoundsChange({
        minLng: bounds.getWest(),
        minLat: bounds.getSouth(),
        maxLng: bounds.getEast(),
        maxLat: bounds.getNorth()
      });
    }
  });
  return null;
}

function createMissionDivIcon(options: {
  color: string;
  visited: boolean;
  hanamaru: boolean;
}): L.DivIcon {
  const classNames = ['mission-pin'];
  if (options.visited) {
    classNames.push('mission-pin--visited');
  }
  if (options.hanamaru) {
    classNames.push('mission-pin--hanamaru');
  }
  const html = `
    <div class="${classNames.join(' ')}" style="color:${options.color}">
      <span class="mission-pin__ring"></span>
      <span class="mission-pin__core">
        ${options.visited ? '<span class="mission-pin__label">済</span>' : ''}
      </span>
    </div>
  `;
  return L.divIcon({
    html,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
}

function placeToPopupContent(place: Place) {
  return (
    <div style={{ display: 'grid', gap: '0.25rem', fontSize: '0.9rem' }}>
      <strong>{place.name}</strong>
      {place.prefecture && <span>{place.prefecture}</span>}
      {place.address && <span style={{ color: '#6b7280' }}>{place.address}</span>}
    </div>
  );
}

export default function MapLeaflet() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedMissionSlugs, setSelectedMissionSlugs] = useState<string[]>([]);
  const [places, setPlaces] = useState<MissionPlaceFeature[]>([]);
  const [progress, setProgress] = useState<ProgressResponse | null>(null);
  const [bounds, setBounds] = useState<BoundingBox | null>(null);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [visitModalPlace, setVisitModalPlace] = useState<Place | null>(null);
  const [completedMissions, setCompletedMissions] = useState<Set<string>>(new Set());
  const [progressLoading, setProgressLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchMissions = async () => {
      const response = await fetch('/api/missions', { cache: 'no-store' });
      if (!response.ok) {
        console.error('ミッション一覧の取得に失敗しました');
        return;
      }
      const data = (await response.json()) as Mission[];
      if (!mounted) return;
      setMissions(data);
      if (data.length > 0) {
        setSelectedMissionSlugs((prev) => (prev.length > 0 ? prev : [data[0].slug]));
      }
    };
    fetchMissions().catch((error) => console.error(error));
    return () => {
      mounted = false;
    };
  }, []);

  const missionBySlug = useMemo(() => {
    return new Map(missions.map((mission) => [mission.slug, mission]));
  }, [missions]);

  const activeMissionSlugs = useMemo(() => {
    if (selectedMissionSlugs.length > 0) {
      return selectedMissionSlugs;
    }
    return missions.map((mission) => mission.slug);
  }, [missions, selectedMissionSlugs]);

  const issueCertificate = useCallback(async (missionId: string, missionTitle: string) => {
    try {
      const response = await fetch('/api/certificate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mission_id: missionId })
      });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || '証明書の発行に失敗しました');
      }
      const data = (await response.json()) as { url: string };
      window.setTimeout(() => {
        window.alert(`「${missionTitle}」を達成しました！\n証明書: ${data.url}`);
      }, 0);
    } catch (error) {
      console.error(error);
    }
  }, []);

  const refreshCompletedMissions = useCallback(
    (data: ProgressResponse) => {
      setCompletedMissions((prev) => {
        const next = new Set<string>();
        for (const slug of activeMissionSlugs) {
          const entry = data.byMission[slug];
          if (entry && entry.total > 0 && entry.completed >= entry.total) {
            next.add(slug);
          }
        }
        const newlyCompleted = Array.from(next).filter((slug) => !prev.has(slug));
        if (newlyCompleted.length > 0) {
          newlyCompleted.forEach((slug) => {
            const mission = missionBySlug.get(slug);
            if (mission) {
              void issueCertificate(mission.id, mission.title);
            }
          });
        }
        return next;
      });
    },
    [activeMissionSlugs, issueCertificate, missionBySlug]
  );

  useEffect(() => {
    if (activeMissionSlugs.length === 0) return;
    setProgressLoading(true);
    const abort = new AbortController();
    fetch('/api/progress', {
      method: 'POST',
      signal: abort.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missionSlugs: activeMissionSlugs })
    })
      .then(async (response) => {
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || '進捗の取得に失敗しました');
        }
        const data = (await response.json()) as ProgressResponse;
        setProgress(data);
        refreshCompletedMissions(data);
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        console.error(error);
      })
      .finally(() => {
        setProgressLoading(false);
      });
    return () => {
      abort.abort();
    };
  }, [activeMissionSlugs, refreshCompletedMissions]);

  useEffect(() => {
    if (!bounds || activeMissionSlugs.length === 0) return;
    setLoadingPlaces(true);
    const abort = new AbortController();
    const params = new URLSearchParams();
    params.set('bbox', `${bounds.minLng},${bounds.minLat},${bounds.maxLng},${bounds.maxLat}`);
    params.set('missions', activeMissionSlugs.join(','));
    fetch(`/api/places?${params.toString()}`, { signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || '寺社の取得に失敗しました');
        }
        const data = (await response.json()) as MissionPlaceFeature[];
        setPlaces(data);
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        console.error(error);
      })
      .finally(() => {
        setLoadingPlaces(false);
      });
    return () => {
      abort.abort();
    };
  }, [bounds, activeMissionSlugs]);

  const visitedPlaceSet = useMemo(() => {
    return new Set(progress?.visitedAllPlaceIds ?? []);
  }, [progress]);

  const hanamaruSlugs = useMemo(() => completedMissions, [completedMissions]);

  const handleBoundsChange = useCallback((nextBounds: BoundingBox) => {
    setBounds(nextBounds);
  }, []);

  const handleRefreshProgress = useCallback(() => {
    setProgressLoading(true);
    fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ missionSlugs: activeMissionSlugs })
    })
      .then(async (response) => {
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || '進捗の取得に失敗しました');
        }
        const data = (await response.json()) as ProgressResponse;
        setProgress(data);
        refreshCompletedMissions(data);
      })
      .catch((error) => {
        console.error(error);
      })
      .finally(() => setProgressLoading(false));
  }, [activeMissionSlugs, refreshCompletedMissions]);

  return (
    <div className="map-layout">
      <MissionLegend
        missions={missions}
        selected={selectedMissionSlugs}
        onChange={(next) => setSelectedMissionSlugs(next)}
      />
      <div style={{ position: 'relative', minHeight: '70vh', borderRadius: '16px', overflow: 'hidden' }}>
        <MapContainer center={INITIAL_CENTER} zoom={INITIAL_ZOOM} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <MapEvents onBoundsChange={handleBoundsChange} />
          {places.map((feature) => {
            const primarySlug = getPrimaryMissionSlug(feature.missionSlugs, activeMissionSlugs);
            const mission = primarySlug ? missionBySlug.get(primarySlug) : null;
            const color = mission ? getMissionColor(mission, missions.indexOf(mission)) : '#3b82f6';
            const visited = visitedPlaceSet.has(feature.place.id);
            const hanamaru = feature.missionSlugs.some((slug) => hanamaruSlugs.has(slug));
            const icon = mission ? createMissionDivIcon({ color, visited, hanamaru }) : new L.Icon.Default();
            return (
              <Marker
                key={`${feature.place.id}-${feature.missionSlugs.join(',')}`}
                position={[feature.place.latitude, feature.place.longitude]}
                icon={icon}
              >
                <Popup>
                  <div style={{ display: 'grid', gap: '0.75rem', minWidth: '200px' }}>
                    {placeToPopupContent(feature.place)}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {feature.missionSlugs.map((slug) => {
                        const m = missionBySlug.get(slug);
                        if (!m) return null;
                        const colorToken = getMissionColor(m, missions.indexOf(m));
                        return (
                          <span
                            key={`${feature.place.id}-${slug}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '999px',
                              background: `${colorToken}22`,
                              color: colorToken,
                              fontSize: '0.75rem'
                            }}
                          >
                            {m.title}
                          </span>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setVisitModalPlace(feature.place)}
                      style={{
                        border: 'none',
                        background: '#2563eb',
                        color: '#fff',
                        padding: '0.5rem 1rem',
                        borderRadius: '999px',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      訪問を記録する
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
        {loadingPlaces && (
          <div
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'rgba(255,255,255,0.9)',
              padding: '0.5rem 0.75rem',
              borderRadius: '12px',
              boxShadow: '0 10px 20px rgba(15,23,42,0.15)'
            }}
          >
            読み込み中…
          </div>
        )}
      </div>
      <MissionProgress missions={missions} selected={activeMissionSlugs} progress={progress} />
      <VisitModal
        open={Boolean(visitModalPlace)}
        place={visitModalPlace}
        onClose={() => setVisitModalPlace(null)}
        onCompleted={() => {
          handleRefreshProgress();
          setVisitModalPlace(null);
        }}
      />
      {(progressLoading || loadingPlaces) && (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            bottom: '1rem',
            right: '1rem',
            background: 'rgba(37,99,235,0.92)',
            color: '#fff',
            padding: '0.6rem 1rem',
            borderRadius: '999px',
            boxShadow: '0 12px 24px rgba(37,99,235,0.35)',
            fontSize: '0.85rem'
          }}
        >
          更新中…
        </div>
      )}
    </div>
  );
}
