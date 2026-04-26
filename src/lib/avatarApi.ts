import { supabase } from './supabase';

const BUCKET = 'avatars';

export async function uploadAvatar(blob: Blob, userId: string): Promise<string> {
  const ext = blobExt(blob.type);
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    cacheControl: '3600',
    upsert: false,
    contentType: blob.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteAvatar(url: string, userId: string): Promise<void> {
  const path = pathFromPublicUrl(url);
  if (!path) return;
  if (!path.startsWith(`${userId}/`)) return;
  await supabase.storage.from(BUCKET).remove([path]);
}

function blobExt(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

function pathFromPublicUrl(url: string): string | null {
  const marker = '/avatars/';
  const i = url.indexOf(marker);
  if (i === -1) return null;
  const tail = url.slice(i + marker.length);
  const q = tail.indexOf('?');
  return q === -1 ? tail : tail.slice(0, q);
}
