import type { SignedUrlResponse } from './types';

const MAX_FILENAME_LENGTH = 120;
const FALLBACK_FILENAME = 'upload';

function sanitizeExtension(extension: string): string {
  return extension
    .normalize('NFKD')
    .replace(/[^\w-]+/g, '')
    .slice(0, 20)
    .toLowerCase();
}

export function sanitizeFileName(name: string): string {
  const trimmed = name.trim();
  const sanitized = trimmed
    .normalize('NFKD')
    .replace(/[^\w.\-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, MAX_FILENAME_LENGTH);

  if (sanitized.length > 0) {
    return sanitized;
  }

  const extensionMatch = trimmed.match(/\.([A-Za-z0-9]+)$/);
  const safeExtension = extensionMatch ? sanitizeExtension(extensionMatch[1]) : '';
  const truncatedBase = safeExtension
    ? FALLBACK_FILENAME.slice(0, Math.max(1, MAX_FILENAME_LENGTH - (safeExtension.length + 1)))
    : FALLBACK_FILENAME.slice(0, MAX_FILENAME_LENGTH);

  return safeExtension ? `${truncatedBase}.${safeExtension}` : truncatedBase;
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
  const uploads = files.map(async (file, index) => {
    const { url, path } = signedUrls[index];
    const response = await uploadToSignedUrl(file, url);
    if (!response.ok) {
      throw new Error(`画像アップロードに失敗しました (${response.status})`);
    }
    return path;
  });
  return Promise.all(uploads);
}
