import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteHandlerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server';
import type { ProgressResponse } from '@/lib/types';

// 追加：missions の行の型
type MissionRow = { id: string; slug: string; title?: string | null };
type VisitRow = { place_id: string };


export const runtime = 'nodejs';

const bodySchema = z.object({
  missionSlugs: z.array(z.string()).min(1)
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { missionSlugs } = bodySchema.parse(json);

    const supabase = createSupabaseRouteHandlerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

   const { data: missionRows, error: missionsErr } = await supabase
  .from('missions')
  .select('id, slug')          // title も要るなら 'id, slug, title'
  .in('slug', missionSlugs)
  .returns<MissionRow[]>();    // ★ 型を注入

if (missionsErr) {
  throw missionsErr;
}

const missionIds = missionRows?.map((m) => m.id) ?? [];

    if (missionIds.length === 0) {
      const empty: ProgressResponse = { byMission: {}, visitedAllPlaceIds: [] };
      return NextResponse.json(empty);
    }

    const service = createSupabaseServiceRoleClient();

    const { data: missionPlaces, error: placesError } = await service
      .from('mission_places')
      .select('mission_id, place_id')
      .in('mission_id', missionIds);
    if (placesError) {
      throw placesError;
    }

    const { data: visits, error: visitsError } = await service
      .from('visits')
      .select('place_id')
      .eq('user_id', user.id);
    if (visitsError) {
      throw visitsError;
    }

 // ★ visits の取得（型を注入して never を回避）
const { data: visits, error: visitsErr } = await supabase
  .from('visits')
  .select('place_id')
  // もしユーザー別やミッション別で絞るなら .eq / .in をここに追加
  // .eq('user_id', user.id)
  // .in('mission_id', missionIds)
  .returns<VisitRow[]>(); // ← これがポイント

if (visitsErr) {
  throw visitsErr;
}

const visitedPlaceSet = new Set<string>();
for (const visit of visits ?? []) {
  if (visit.place_id) {
    visitedPlaceSet.add(visit.place_id);
  }
}


    const missionMap = new Map<string, { missionId: string; placeIds: Set<string> }>();
    const missionIdToSlug = new Map<string, string>();
    for (const mission of missionRows ?? []) {
      missionMap.set(mission.slug, { missionId: mission.id, placeIds: new Set() });
      missionIdToSlug.set(mission.id, mission.slug);
    }

    for (const row of missionPlaces ?? []) {
      if (!row.mission_id || !row.place_id) continue;
      const slug = missionIdToSlug.get(row.mission_id);
      if (!slug) continue;
      const entry = missionMap.get(slug);
      entry?.placeIds.add(row.place_id);
    }

    const byMission: ProgressResponse['byMission'] = {};
    const visitedAllPlaceIds: string[] = [];

    for (const [slug, { placeIds }] of missionMap.entries()) {
      const total = placeIds.size;
      let completed = 0;
      const visitedPlaceIds: string[] = [];
      placeIds.forEach((placeId) => {
        if (visitedPlaceSet.has(placeId)) {
          completed += 1;
          visitedPlaceIds.push(placeId);
          if (!visitedAllPlaceIds.includes(placeId)) {
            visitedAllPlaceIds.push(placeId);
          }
        }
      });
      byMission[slug] = { total, completed, visitedPlaceIds };
    }

    const response: ProgressResponse = {
      byMission,
      visitedAllPlaceIds
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to compute progress' }, { status: 500 });
  }
}
