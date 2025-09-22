// app/api/progress/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createSupabaseRouteHandlerClient,
  createSupabaseServiceRoleClient,
} from '@/lib/supabase-server';
import type { ProgressResponse } from '@/lib/types';

export const runtime = 'nodejs';

// ===== 型（最低限） =====
type MissionRow = { id: string; slug: string; title?: string | null };
type MissionPlaceRow = { mission_id: string; place_id: string };
type VisitRow = { place_id: string };

const bodySchema = z.object({
  missionSlugs: z.array(z.string()).min(1),
});

export async function POST(request: NextRequest) {
  try {
    // 入力
    const { missionSlugs } = bodySchema.parse(await request.json());

    // 認証（ユーザー）
    const supabase = createSupabaseRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // missions をスラッグから取得（型付き）
    const { data: missionRows, error: missionsErr } = await supabase
      .from('missions')
      .select('id, slug') // titleも要るなら 'id, slug, title'
      .in('slug', missionSlugs)
      .returns<MissionRow[]>();
    if (missionsErr) throw missionsErr;

    const missionIds = (missionRows ?? []).map((m) => m.id);
    if (missionIds.length === 0) {
      const empty: ProgressResponse = { byMission: {}, visitedAllPlaceIds: [] };
      return NextResponse.json(empty);
    }

    // 結果格納用マップ
    const missionMap = new Map<string, { missionId: string; placeIds: Set<string> }>();
    const missionIdToSlug = new Map<string, string>();
    for (const m of missionRows) {
      missionMap.set(m.slug, { missionId: m.id, placeIds: new Set() });
      missionIdToSlug.set(m.id, m.slug);
    }

    // mission_places（対象ミッションの全スポット）— 型付きで取得
    const service = createSupabaseServiceRoleClient();
    const { data: missionPlaces, error: placesErr } = await service
      .from('mission_places')
      .select('mission_id, place_id')
      .in('mission_id', missionIds)
      .returns<MissionPlaceRow[]>();
    if (placesErr) throw placesErr;

    for (const row of missionPlaces ?? []) {
      if (!row.mission_id || !row.place_id) continue;
      const slug = missionIdToSlug.get(row.mission_id);
      if (!slug) continue;
      missionMap.get(slug)?.placeIds.add(row.place_id);
    }

    // このユーザーの訪問実績（RLS尊重で routeHandler client を使う）
    const { data: visits, error: visitsErr } = await supabase
      .from('visits')
      .select('place_id')
      .eq('user_id', user.id)
      .returns<VisitRow[]>();
    if (visitsErr) throw visitsErr;

    const visitedPlaceSet = new Set<string>();
    for (const v of visits ?? []) {
      if (v.place_id) visitedPlaceSet.add(v.place_id);
    }

    // 集計
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

    const response: ProgressResponse = { byMission, visitedAllPlaceIds };
    return NextResponse.json(response);
  } catch (err) {
    console.error(err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to compute progress' }, { status: 500 });
  }
}
