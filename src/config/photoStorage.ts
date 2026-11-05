export const PHOTO_BUCKET = 'request-photos';
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
export const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
export const SUPABASE_PUBLISHABLE_KEY = (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '').trim();
export const PHOTO_UPLOADS_AVAILABLE = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(SUPABASE_URL) && SUPABASE_PUBLISHABLE_KEY.startsWith('sb_publishable_');
export const PHOTO_UPLOAD_UNAVAILABLE_MESSAGE = 'Photo attachments are not configured. The project owner must complete Supabase setup. You can submit without a photo.';
