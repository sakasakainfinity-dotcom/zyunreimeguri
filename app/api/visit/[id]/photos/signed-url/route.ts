import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteHandlerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server';
import { sanitizeFileName } from '@/lib/upload';

export const runtime = 'nodejs';

const schema = z.object({
  files: z
    .array(
      z.object({
        name: z.string().min(1),
        type: z.string().min(1)
      })
    )
    .max(10)
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

    const { files } = schema.parse(await request.json());
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
    const signedUrls: { path: string; url: string }[] = [];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const cleanName = sanitizeFileName(file.name);
      const path = `visit-photos/${user.id}/${visitId}/${Date.now()}-${index}-${cleanName}`;
      const { data, error } = await service.storage.from('visit-photos').createSignedUploadUrl(path);
      if (error || !data) {
        throw error ?? new Error('Failed to create signed url');
      }
      signedUrls.push({ path, url: data.signedUrl });
    }

    return NextResponse.json({ signedUrls });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create signed urls' }, { status: 500 });
  }
}
