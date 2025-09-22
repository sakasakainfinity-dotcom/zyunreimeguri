import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteHandlerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

const schema = z.object({
  place_id: z.string().min(1),
  visited_at: z.string().datetime().optional(),
  note: z.string().max(2000).optional()
});

export async function POST(request: NextRequest) {
  try {
    const payload = schema.parse(await request.json());
    const supabase = createSupabaseRouteHandlerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = createSupabaseServiceRoleClient();
    const { data, error } = await service
      .from('visits')
      .insert({
        user_id: user.id,
        place_id: payload.place_id,
        visited_at: payload.visited_at ?? null,
        note: payload.note ?? null,
        photos_count: 0
      })
      .select('id')
      .single();
    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true, visit_id: data.id });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create visit' }, { status: 500 });
  }
}
