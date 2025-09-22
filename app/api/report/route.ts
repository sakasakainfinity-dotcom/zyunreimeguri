import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteHandlerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

const schema = z.object({
  target_type: z.enum(['visit', 'place']),
  target_id: z.string().min(1),
  reason: z.string().min(5).max(1000)
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
    const { error } = await service.from('reports').insert({
      user_id: user.id,
      target_type: payload.target_type,
      target_id: payload.target_id,
      reason: payload.reason
    });
    if (error) {
      throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}
