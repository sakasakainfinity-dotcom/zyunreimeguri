import type { SignedUrlResponse } from './types';

export function sanitizeFileName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
}

export async function uploadToSignedUrl(file: File, signedUrl: string): Promise<Response> {
  return fetch(signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type
    },
    body: file
  });
}

export async function uploadFilesWithSignedUrls(
  files: File[],
  signedUrls: SignedUrlResponse[]
): Promise<string[]> {
  if (files.length !== signedUrls.length) {
    throw new Error('ファイル数と署名URLの数が一致しません');
  }
  const uploadedPaths: string[] = [];
  for (let i = 0; i < files.length; i += 1) {
    const response = await uploadToSignedUrl(files[i], signedUrls[i].url);
    if (!response.ok) {
      throw new Error(`画像アップロードに失敗しました (${response.status})`);
    }
    uploadedPaths.push(signedUrls[i].path);
  }
  return uploadedPaths;
}
