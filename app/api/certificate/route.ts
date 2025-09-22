// app/api/certificate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  createSupabaseRouteHandlerClient,
  createSupabaseServiceRoleClient,
} from '@/lib/supabase-server';

export const runtime = 'nodejs'; // Edgeじゃ動かん。Nodeで実行

const schema = z.object({
  mission_id: z.string().min(1),
});

async function generateCertificateImage(opts: {
  missionTitle: string;
  userLabel: string;
}): Promise<Uint8Array> {
  // ここが超重要：ビルド時に .node を抱え込ませない
  const { createCanvas, GlobalFonts } = await import(
    /* webpackIgnore: true */ '@napi-rs/canvas'
  );

  // フォント登録（無くても動くよう try/catch）
  if (!GlobalFonts.has('Noto Sans JP')) {
    try {
      GlobalFonts.registerFromPath(
        '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc',
        'Noto Sans JP',
      );
    } catch (err) {
      console.warn('フォントの登録に失敗しました', err);
    }
  }

  const width = 1400;
  const height = 1000;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // 背景
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, width, height);

  // 枠
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#1e40af';
  ctx.strokeRect(80, 80, width - 160, height - 160);

  // タイトル
  ctx.fillStyle = '#1e3a8a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 72px "Noto Sans JP", sans-serif';
  ctx.fillText('巡礼達成証', width / 2, 220);

  // ミッション名
  ctx.fillStyle = '#0f172a';
  ctx.font = '48px "Noto Sans JP", sans-serif';
  ctx.fillText(opts.missionTitle, width / 2, 360);

  // ユーザー／日付
  ctx.font = '32px "Noto Sans JP", sans-serif';
  ctx.fillText(opts.userLabel, width / 2, 470);
  ctx.fillText(`達成日: ${new Date().toLocaleDateString('ja-JP')}`, width / 2, 540);

  // ひと言
  ctx.font = '24px "Noto Sans JP", sans-serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('巡礼マップがあなたの挑戦を称えます。引き続き素敵な巡礼を！', width / 2, 660);

  // PNG のバイト列（Uint8Array）
  return await canvas.encode('png');
}

export async function POST(request: NextRequest) {
  try {
    // 入力チェック
    const { mission_id: missionId } = schema.parse(await request.json());

    // 認証（ユーザー取得）
    const supabase = createSupabaseRouteHandlerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

  // ★ 追加：型を上に書く
type MissionRow = { id: string; title: string };

const { data: mission, error: missionError } = await supabase
  .from('missions')
  .select('id, title')
  .eq('id', missionId)
  .single<MissionRow>();

if (missionError || !mission) {
  return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
}

const userLabel = `巡礼者: ${user.email ?? user.id}`;
const pngBuffer = await generateCertificateImage({
  missionTitle: mission.title,
  userLabel,
});

    const userLabel = `巡礼者: ${user.email ?? user.id}`;
    const pngBytes = await generateCertificateImage({
      missionTitle: mission.title,
      userLabel,
    });

    // サービスロールで保存（Storage）
    const service = createSupabaseServiceRoleClient();
    const path = `certificates/${user.id}/${missionId}-${Date.now()}.png`;

    const { error: uploadError } = await service.storage
      .from('certificates')
      .upload(path, pngBytes, {
        contentType: 'image/png',
        upsert: true,
      });
    if (uploadError) throw uploadError;

    // DB にメタ登録（使ってるなら）
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

    // 署名 URL（1 週間）
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
