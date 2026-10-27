import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase } from './supabase';

export type LogType = 'restaurant_log' | 'dish_log';

// Photos are downscaled before upload: phone cameras produce 4000px+ images,
// which are slow to upload and load, and fill up storage.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.7;

export function photoUrl(storagePath: string): string {
  return supabase.storage.from('photos').getPublicUrl(storagePath).data.publicUrl;
}

async function compress(uri: string): Promise<ArrayBuffer> {
  const image = await ImageManipulator
    .manipulate(uri, { maxWidth: MAX_DIMENSION, maxHeight: MAX_DIMENSION })
    .renderAsync();
  const result = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  const response = await fetch(result.uri);
  return response.arrayBuffer();
}

/** Uploads photos and attaches them to a log. The log itself must already be saved. */
export async function uploadLogPhotos(uris: string[], logType: LogType, logId: string): Promise<void> {
  try {
    for (const uri of uris) {
      const path = `${logType}/${logId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const body = await compress(uri);
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(path, body, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;
      const { error: insertError } = await supabase
        .from('photos')
        .insert({ storage_path: path, log_type: logType, log_id: logId });
      if (insertError) throw insertError;
    }
  } catch (e) {
    console.error('Photo upload failed:', e);
    throw new Error('Your munch was saved, but a photo failed to upload. Use Edit to try adding it again.');
  }
}

/** Removes the photo files and rows for the given logs. Call before deleting the logs. */
export async function deleteLogPhotos(logType: LogType, logIds: string[]): Promise<void> {
  if (logIds.length === 0) return;
  const { data: photos, error } = await supabase
    .from('photos')
    .select('id, storage_path')
    .eq('log_type', logType)
    .in('log_id', logIds);
  if (error) throw error;
  if (!photos || photos.length === 0) return;

  const { error: storageError } = await supabase.storage
    .from('photos')
    .remove(photos.map((p) => p.storage_path));
  if (storageError) throw storageError;
  const { error: deleteError } = await supabase
    .from('photos')
    .delete()
    .in('id', photos.map((p) => p.id));
  if (deleteError) throw deleteError;
}
