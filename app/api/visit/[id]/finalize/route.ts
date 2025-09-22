import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteHandlerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server';

export const runtime = 'nodejs';

const schema = z.object({
  paths: z.array(z.string().min(1)).max(10)
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const visitId = params.id;
    if (!visitId) {
      return NextResponse.json({ error: 'Visit id is required' }, { status: 400 });
    }

    const { paths } = schema.parse(await request.json());
    const supabase = createSupabaseRouteHandlerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .select('id')
      .eq('id', visitId)
      .eq('user_id', user.id)
      .single();
    if (visitError || !visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    const service = createSupabaseServiceRoleClient();

    if (paths.length > 0) {
      const photoPayload = paths.map((path) => ({
        visit_id: visitId,
        path,
        storage_bucket: 'visit-photos'
      }));
      const { error: insertError } = await service.from('visit_photos').insert(photoPayload);
      if (insertError) {
        throw insertError;
      }
    }

    const { error: updateError } = await service
      .from('visits')
      .update({ photos_count: paths.length })
      .eq('id', visitId);
    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to finalize visit' }, { status: 500 });
  }
}
