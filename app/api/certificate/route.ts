// app/api/certificate/route.ts
export const runtime = 'nodejs';

export async function POST() {
  // 一時停止中のダミーAPI。ビルド通すための最低限。
  return new Response(JSON.stringify({ disabled: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

