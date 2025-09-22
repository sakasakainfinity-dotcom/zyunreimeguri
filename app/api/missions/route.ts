import { NextResponse } from 'next/server';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase-server';

export const runtime = 'edge';

export async function GET() {
  try {
    const supabase = createSupabaseRouteHandlerClient();
    const { data, error } = await supabase
      .from('missions')
      .select('id, slug, title, color')
      .order('sort_index', { ascending: true });
    if (error) {
      throw error;
    }
    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to fetch missions' },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' }
      }
    );
  }
}
