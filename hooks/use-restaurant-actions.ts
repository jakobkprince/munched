import { supabase } from '../lib/supabase';
import { Restaurant, RestaurantLogInput } from '../types';
import { PLACES_TYPE_TO_TAG } from '../constants/tags';

async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');
  return session.user.id;
}

export function useRestaurantActions() {
  async function upsertRestaurant(restaurant: Omit<Restaurant, 'id' | 'created_at'>): Promise<string> {
    // Try insert first; if the restaurant already exists (unique conflict), select it instead.
    // Avoids upsert which triggers UPDATE RLS check.
    const { data: inserted, error: insertError } = await supabase
      .from('restaurants')
      .insert(restaurant)
      .select('id')
      .single();
    if (!insertError) return inserted.id;

    if (insertError.code === '23505') {
      const { data: existing, error: selectError } = await supabase
        .from('restaurants')
        .select('id')
        .eq('google_place_id', restaurant.google_place_id)
        .single();
      if (selectError) throw selectError;
      return existing.id;
    }
    throw insertError;
  }

  async function addToEatList(restaurantId: string, notes?: string): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase
      .from('eat_list_restaurants')
      .insert({ restaurant_id: restaurantId, user_id: userId, notes: notes ?? null });
    if (error) throw error;
  }

  async function addToMunched(restaurantId: string, log: RestaurantLogInput): Promise<void> {
    const userId = await getUserId();
    // Check if eat-list entry exists — if so, carry over notes + tags, then delete it
    const { data: eatListEntry } = await supabase
      .from('eat_list_restaurants')
      .select('id, notes')
      .eq('restaurant_id', restaurantId)
      .maybeSingle();

    // Insert the log
    const { data: newLog, error: logError } = await supabase
      .from('restaurant_logs')
      .insert({
        restaurant_id: restaurantId,
        user_id: userId,
        rating: log.rating,
        vibe_rating: log.vibe_rating ?? null,
        notes: log.notes ?? eatListEntry?.notes ?? null,
        log_date: log.log_date,
      })
      .select('id')
      .single();
    if (logError) throw logError;

    // Upload photos if any
    if (log.photoUris && log.photoUris.length > 0) {
      await uploadPhotos(log.photoUris, 'restaurant_log', newLog.id);
    }

    // Remove from eat-list if present
    if (eatListEntry) {
      const { error: deleteError } = await supabase
        .from('eat_list_restaurants')
        .delete()
        .eq('id', eatListEntry.id);
      if (deleteError) throw deleteError;
    }
  }

  async function reMunch(restaurantId: string, log: RestaurantLogInput): Promise<void> {
    const userId = await getUserId();
    const { data: newLog, error } = await supabase
      .from('restaurant_logs')
      .insert({
        restaurant_id: restaurantId,
        user_id: userId,
        rating: log.rating,
        vibe_rating: log.vibe_rating ?? null,
        notes: log.notes ?? null,
        log_date: log.log_date,
      })
      .select('id')
      .single();
    if (error) throw error;

    if (log.photoUris && log.photoUris.length > 0) {
      await uploadPhotos(log.photoUris, 'restaurant_log', newLog.id);
    }
  }

  async function deleteFromEatList(eatListId: string): Promise<void> {
    const { error } = await supabase
      .from('eat_list_restaurants')
      .delete()
      .eq('id', eatListId);
    if (error) throw error;
  }

  async function deleteLog(logId: string): Promise<void> {
    const { error } = await supabase
      .from('restaurant_logs')
      .delete()
      .eq('id', logId);
    if (error) throw error;
  }

  async function editEatListEntry(id: string, notes: string): Promise<void> {
    const { error } = await supabase
      .from('eat_list_restaurants')
      .update({ notes })
      .eq('id', id);
    if (error) throw error;
  }

  async function editRestaurantLog(logId: string, updates: Partial<RestaurantLogInput>): Promise<void> {
    const { error } = await supabase
      .from('restaurant_logs')
      .update({
        ...(updates.rating !== undefined && { rating: updates.rating }),
        ...(updates.vibe_rating !== undefined && { vibe_rating: updates.vibe_rating }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
        ...(updates.log_date !== undefined && { log_date: updates.log_date }),
      })
      .eq('id', logId);
    if (error) throw error;
  }

  async function autoSuggestTags(restaurantId: string, placeTypes: string[]): Promise<void> {
    const suggestedTags = placeTypes
      .map((t) => PLACES_TYPE_TO_TAG[t])
      .filter((t): t is string => !!t);
    const unique = [...new Set(suggestedTags)];
    if (unique.length === 0) return;
    await supabase
      .from('restaurant_tags')
      .upsert(unique.map((tag) => ({ restaurant_id: restaurantId, tag })), { onConflict: 'restaurant_id,tag', ignoreDuplicates: true });
  }

  return {
    upsertRestaurant,
    addToEatList,
    addToMunched,
    reMunch,
    deleteFromEatList,
    deleteLog,
    editEatListEntry,
    editRestaurantLog,
    autoSuggestTags,
  };
}

async function uploadPhotos(uris: string[], logType: 'restaurant_log' | 'dish_log', logId: string): Promise<void> {
  for (const uri of uris) {
    const filename = `${logType}/${logId}/${Date.now()}.jpg`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const { error: uploadError } = await supabase.storage.from('photos').upload(filename, blob, { contentType: 'image/jpeg' });
    if (uploadError) throw uploadError;
    const { error: insertError } = await supabase
      .from('photos')
      .insert({ storage_path: filename, log_type: logType, log_id: logId });
    if (insertError) throw insertError;
  }
}
