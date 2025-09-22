// app/api/places/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase-server';
import type { MissionPlaceFeature } from '@/lib/types';

export const runtime = 'edge';

// 返ってくる行の最低限の型
type PlaceRow = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  prefecture?: string | null;
  address?: string | null;
};

type MissionRow = {
  slug: string;
  title?: string | null;
};

type JoinedRow = {
  place: PlaceRow | null;
  mission: MissionRow | null;
};

function parseBBox(param: string | null): [number, number, number, number] | null {
  if (!param) return null;
  const parts = param.split(',').map((part) => Number.parseFloat(part));
  if (parts.length !== 4 || parts.some((value) => Number.isNaN(value))) {
    return null;
  }
  return [parts[0], parts[1], parts[2], parts[3]];
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const bbox = parseBBox(searchParams.get('bbox'));
  const missionSlugs = (searchParams.get('missions') ?? '')
    .split(',')
    .map((slug) => slug.trim())
    .filter(Boolean);

  if (!bbox) {
    return NextResponse.json({ error: 'Invalid bounding box' }, { status: 400 });
  }

  if (missionSlugs.length === 0) {
    return NextResponse.json([] satisfies MissionPlaceFeature[]);
  }

  try {
    const [minLng, minLat, maxLng, maxLat] = bbox;
    const supabase = createSupabaseRouteHandlerClient();

    // 結合のselect（place / mission を別名で取得）
    const query = supabase
      .from('mission_places')
      .select(
        `
        place:places!inner (
          id, name, latitude, longitude, prefecture, address
        ),
        mission:missions!inner (
          slug
        )
        `
      )
      // 範囲フィルタ
      .gte('place.latitude', minLat)
      .lte('place.latitude', maxLat)
      .gte('place.longitude', minLng)
      .lte('place.longitude', maxLng)
      .in('mission.slug', missionSlugs)
      .limit(1000);

    // ★ 型を注入してTSのnever化を防ぐ
    const { data, error } = await query.returns<JoinedRow[]>();
    if (error) throw error;

    const grouped = new Map<string, MissionPlaceFeature>();

    for (const row of data ?? []) {
      if (!row.place || !row.mission) continue;

      const existing = grouped.get(row.place.id);
      if (existing) {
        if (!existing.missionSlugs.includes(row.mission.slug)) {
          existing.missionSlugs.push(row.mission.slug);
        }
      } else {
        grouped.set(row.place.id, {
          place: {
            id: row.place.id,
            name: row.place.name,
            latitude: row.place.latitude,
            longitude: row.place.longitude,
            prefecture: row.place.prefecture ?? undefined,
            address: row.place.address ?? undefined,
          },
          missionSlugs: [row.mission.slug],
        });
      }
    }

    return NextResponse.json(Array.from(grouped.values()));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to fetch places' }, { status: 500 });
  }
}

