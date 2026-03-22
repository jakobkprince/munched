import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Photo } from '../types';

export function usePhotos() {
  const [uploading, setUploading] = useState(false);

  function getPublicUrl(storagePath: string): string {
    const { data } = supabase.storage.from('photos').getPublicUrl(storagePath);
    return data.publicUrl;
  }

  async function uploadPhoto(
    uri: string,
    logType: 'restaurant_log' | 'dish_log',
    logId: string
  ): Promise<Photo> {
    setUploading(true);
    try {
      const filename = `${logType}/${logId}/${Date.now()}.jpg`;
      const response = await fetch(uri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filename, blob, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data, error: insertError } = await supabase
        .from('photos')
        .insert({ storage_path: filename, log_type: logType, log_id: logId })
        .select('*')
        .single();
      if (insertError) throw insertError;
      return data;
    } finally {
      setUploading(false);
    }
  }

  async function deletePhoto(photo: Photo): Promise<void> {
    const { error: storageError } = await supabase.storage.from('photos').remove([photo.storage_path]);
    if (storageError) throw storageError;
    const { error: dbError } = await supabase.from('photos').delete().eq('id', photo.id);
    if (dbError) throw dbError;
  }

  return { uploading, uploadPhoto, deletePhoto, getPublicUrl };
}
