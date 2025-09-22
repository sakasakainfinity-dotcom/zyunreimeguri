import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseRouteHandlerClient, createSupabaseServiceRoleClient } from '@/lib/supabase-server';

export const runtime = 'nodejs'; // ← Edgeじゃ動かん、Nodeで動かす
export const runtime = 'nodejs';

const schema = z.object({
  mission_id: z.string().min(1)
});

async function generateCertificateImage(options: {
  missionTitle: string;
  userLabel: string;
}): Promise<Buffer> {
  const { createCanvas, GlobalFonts } = await import('@napi-rs/canvas');
  if (GlobalFonts.get('Noto Sans JP') === undefined) {
    try {
      GlobalFonts.registerFromPath('/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc', 'Noto Sans JP');
    } catch (error) {
      console.warn('フォントの登録に失敗しました', error);
    }
  }
  const width = 1400;
  const height = 1000;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#1e3a8a';
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#1e40af';
  ctx.strokeRect(80, 80, width - 160, height - 160);

  ctx.fillStyle = '#1e3a8a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 72px "Noto Sans JP", sans-serif';
  ctx.fillText('巡礼達成証', width / 2, 220);

  ctx.fillStyle = '#0f172a';
  ctx.font = '48px "Noto Sans JP", sans-serif';
  ctx.fillText(options.missionTitle, width / 2, 360);

  ctx.font = '32px "Noto Sans JP", sans-serif';
  ctx.fillText(options.userLabel, width / 2, 470);
  ctx.fillText(`達成日: ${new Date().toLocaleDateString('ja-JP')}`, width / 2, 540);

  ctx.font = '24px "Noto Sans JP", sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('巡礼マップがあなたの挑戦を称えます。引き続き素敵な巡礼を！', width / 2, 660);

  return canvas.encode('png');
}

export async function POST(request: NextRequest) {
  try {
    const { mission_id: missionId } = schema.parse(await request.json());

    const supabase = createSupabaseRouteHandlerClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select('id, title')
      .eq('id', missionId)
      .single();
    if (missionError || !mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    const userLabel = `巡礼者: ${user.email ?? user.id}`;
    const pngBuffer = await generateCertificateImage({
      missionTitle: mission.title,
      userLabel
    });

    const service = createSupabaseServiceRoleClient();
    const path = `certificates/${user.id}/${missionId}-${Date.now()}.png`;
    const { error: uploadError } = await service.storage
      .from('certificates')
      .upload(path, pngBuffer, {
        contentType: 'image/png',
        upsert: true
      });
    if (uploadError) {
      throw uploadError;
    }

    const { data: inserted, error: insertError } = await service
      .from('certificates')
      .insert({
        user_id: user.id,
        mission_id: missionId,
        image_path: path
      })
      .select('id, image_path')
      .single();
    if (insertError) {
      throw insertError;
    }

    const { data: signed, error: signedError } = await service.storage
      .from('certificates')
      .createSignedUrl(inserted.image_path, 60 * 60 * 24 * 7);
    if (signedError || !signed) {
      throw signedError ?? new Error('Failed to create signed url');
    }

    return NextResponse.json({ url: signed.signedUrl });
  } catch (error) {
    console.error(error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create certificate' }, { status: 500 });
  }
}
