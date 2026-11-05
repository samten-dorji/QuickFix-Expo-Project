import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { randomUUID } from 'expo-crypto';
import { auth } from './firebase';
import { photoClient, photoIdentity } from './supabase';
import { PHOTO_BUCKET, MAX_PHOTO_BYTES } from '../config/photoStorage';
import { rememberPhoto } from './photoQueue';
import type { PhotoAttachment } from '../types';

export interface UploadOptions { signal?: AbortSignal }
export interface PreparedPhoto { uri: string; width: number; height: number; size: number }
export async function photoBytes(uri: string) {
  return Platform.OS === 'web' ? (await fetch(uri)).arrayBuffer() : new File(uri).arrayBuffer();
}
export async function preparePhoto(uri: string, width: number, height: number): Promise<PreparedPhoto> {
  if (!(width > 0 && height > 0)) throw new Error('Cannot read this image. Choose another photo.');
  for (const edge of [1600, 1200, 800]) {
    const scale = Math.min(1, edge / Math.max(width, height));
    const context = ImageManipulator.manipulate(uri);
    context.resize({ width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) });
    const rendered = await context.renderAsync();
    try {
      for (const compress of [.8, .6, .4]) {
        const image = await rendered.saveAsync({ format: SaveFormat.JPEG, compress });
        const size = (await photoBytes(image.uri)).byteLength;
        if (size > 0 && size <= MAX_PHOTO_BYTES) return { uri: image.uri, width: image.width, height: image.height, size };
        if (Platform.OS !== 'web') new File(image.uri).delete();
      }
    } finally { rendered.release(); context.release(); }
  }
  throw new Error('This image could not be compressed below 2 MB. Choose another photo.');
}
export async function uploadPhoto(requestId: string, image: PreparedPhoto, options: UploadOptions = {}): Promise<PhotoAttachment> {
  const uid = await photoIdentity();
  if (options.signal?.aborted) throw new Error('Photo upload canceled. Retry or submit without a photo.');
  const bytes = await photoBytes(image.uri);
  const signature = new Uint8Array(bytes);
  if (!bytes.byteLength || bytes.byteLength > MAX_PHOTO_BYTES || signature[0] !== 255 || signature[1] !== 216 || signature[2] !== 255) throw new Error('Select a JPEG photo smaller than 2 MB.');
  const photo: PhotoAttachment = { provider: 'supabase', bucket: PHOTO_BUCKET, path: `requests/${uid}/${requestId}/${randomUUID()}.jpg`, mimeType: 'image/jpeg', size: bytes.byteLength, width: image.width, height: image.height };
  // Queue before starting: an interrupted HTTP response may still leave a finalized object.
  await rememberPhoto(photo);
  const { error } = await photoClient(options.signal).storage.from(photo.bucket).upload(photo.path, bytes, { contentType: 'image/jpeg', upsert: false, cacheControl: '120' });
  if (error) throw new Error(`Photo upload failed: ${error.message}. Retry or submit without a photo.`, { cause: error });
  if (options.signal?.aborted || auth.currentUser?.uid !== uid) throw new Error('Upload interrupted. No request was submitted. Retry after signing in.');
  return photo;
}
export async function removePhoto(photo: PhotoAttachment) {
  await photoIdentity();
  const { error } = await photoClient().storage.from(photo.bucket).remove([photo.path]);
  if (error) throw error;
}
const urls = new Map<string, { url: string; expires: number }>();
export async function signedPhoto(photo: PhotoAttachment, force = false) {
  const uid = await photoIdentity();
  const key = `${uid}:${photo.bucket}:${photo.path}`;
  const cached = urls.get(key);
  if (!force && cached && cached.expires > Date.now() + 15000) return cached;
  const { data, error } = await photoClient().storage.from(photo.bucket).createSignedUrl(photo.path, 120);
  if (error) throw new Error(`Photo unavailable: ${error.message}`, { cause: error });
  if (auth.currentUser?.uid !== uid) throw new Error('Account changed.');
  const value = { url: data.signedUrl, expires: Date.now() + 120000 };
  urls.set(key, value);
  return value;
}
