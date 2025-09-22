import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createSupabaseRouteHandlerClient,
  createSupabaseServiceRoleClient,
} from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    // 入力
    const { mission_id: missionId } = schema.parse(await request.json());

    // 認証
    const supabase = createSupabaseRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 型（ミッション行）
    type MissionRow = { id: string; title: string };

    // ミッション取得（型付き single）
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select('id, title')
      .eq('id', missionId)
      .single<MissionRow>();

    if (missionError || !mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    // ★ ここで1回だけ宣言
    const userLabel = `巡礼者: ${user.email ?? user.id}`;

    // 証明書画像生成
    const pngBytes = await generateCertificateImage({
      missionTitle: mission.title,
      userLabel,
    });

    // 保存（Storage）
    const service = createSupabaseServiceRoleClient();
    const path = `certificates/${user.id}/${missionId}-${Date.now()}.png`;

    const { error: uploadError } = await service.storage
      .from('certificates')
      .upload(path, pngBytes, {
        contentType: 'image/png',
        upsert: true,
      });
    if (uploadError) throw uploadError;

    // メタ保存（任意）
    const { data: inserted, error: insertError } = await service
      .from('certificates')
      .insert({
        user_id: user.id,
        mission_id: missionId,
        image_path: path,
      })
      .select('id, image_path')
      .single();
    if (insertError) throw insertError;

    // 署名URL（1週間）
    const { data: signed, error: signedError } = await service.storage
      .from('certificates')
      .createSignedUrl(inserted.image_path, 60 * 60 * 24 * 7);
    if (signedError || !signed) throw signedError ?? new Error('Failed to create signed url');

    return NextResponse.json({ url: signed.signedUrl });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create certificate' }, { status: 500 });
  }
}
