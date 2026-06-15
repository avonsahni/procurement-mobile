import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

const BUCKET = 'package-documents';
const MAX_DIM = 1920;        // longest side, px
const QUALITY = 0.85;

export const MAX_PHOTOS = 10;

export interface PickedPhoto {
  uri: string;
  width?: number;
  height?: number;
  fileName?: string | null;
}

// NOTE: uses the SDK 51 manipulateAsync API. When this app moves to Expo SDK 52+,
// switch to the modern useImageManipulator / manipulate().renderAsync().saveAsync() API.
export async function compressAndUploadPhotos(
  photos: PickedPhoto[],
  opts: { orgId: string; packageId: string },
): Promise<{ paths: string[]; totalBytes: number }> {
  // WebP on Android; iOS manipulator does not reliably support WebP on SDK 51,
  // so fall back to JPEG there (with matching extension + contentType per file).
  const isAndroid = Platform.OS === 'android';
  const format = isAndroid ? ImageManipulator.SaveFormat.WEBP : ImageManipulator.SaveFormat.JPEG;
  const ext = isAndroid ? 'webp' : 'jpg';
  const contentType = isAndroid ? 'image/webp' : 'image/jpeg';

  const paths: string[] = [];
  let totalBytes = 0;

  for (const photo of photos) {
    // Resize only when the longest side exceeds the cap (preserve aspect ratio).
    const actions: ImageManipulator.Action[] = [];
    const w = photo.width ?? 0;
    const h = photo.height ?? 0;
    if (w && h && Math.max(w, h) > MAX_DIM) {
      actions.push(w >= h ? { resize: { width: MAX_DIM } } : { resize: { height: MAX_DIM } });
    }

    const result = await ImageManipulator.manipulateAsync(photo.uri, actions, {
      compress: QUALITY,
      format,
    });

    const base64 = await FileSystem.readAsStringAsync(result.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const arrayBuffer = decode(base64);
    totalBytes += arrayBuffer.byteLength;

    const safeName = (photo.fileName || 'photo').replace(/[^a-zA-Z0-9._-]/g, '_');
    // CRITICAL: first path segment must be the orgId or storage RLS rejects the upload.
    const path = `${opts.orgId}/${opts.packageId}/remarks/${Crypto.randomUUID()}_${safeName}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
      contentType,
      cacheControl: '3600',
      upsert: false,
    });
    if (error) throw error;

    paths.push(path);
  }

  return { paths, totalBytes };
}

// Resolve storage paths to temporary signed URLs (the bucket is private).
export async function signPaths(paths: string[]): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  if (paths.length === 0) return map;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
  (data || []).forEach(item => {
    if (item.signedUrl && item.path) map[item.path] = item.signedUrl;
  });
  return map;
}
