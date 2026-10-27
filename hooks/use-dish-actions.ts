import { supabase, requireUserId } from '../lib/supabase';
import { uploadLogPhotos, deleteLogPhotos } from '../lib/photos';
import { DishLogInput } from '../types';

export function useDishActions() {
  async function addDish(restaurantId: string, name: string): Promise<string> {
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from('dishes')
      .insert({ restaurant_id: restaurantId, user_id: userId, name })
      .select('id')
      .single();
    if (error) throw error;

    // New dishes inherit the restaurant's tags
    const { data: restaurantTags, error: tagsError } = await supabase
      .from('restaurant_tags')
      .select('tag')
      .eq('restaurant_id', restaurantId);
    if (tagsError) throw tagsError;
    if (restaurantTags && restaurantTags.length > 0) {
      const { error: upsertError } = await supabase
        .from('dish_tags')
        .upsert(
          restaurantTags.map(({ tag }) => ({ dish_id: data.id, tag })),
          { onConflict: 'dish_id,tag', ignoreDuplicates: true }
        );
      if (upsertError) throw upsertError;
    }

    return data.id;
  }

  async function addToEatList(dishId: string, notes?: string): Promise<void> {
    const userId = await requireUserId();
    const { error } = await supabase
      .from('eat_list_dishes')
      .insert({ dish_id: dishId, user_id: userId, notes: notes ?? null });
    if (error) throw error;
  }

  async function addToMunched(dishId: string, log: DishLogInput): Promise<void> {
    const userId = await requireUserId();
    const { data: eatListEntry, error: eatListError } = await supabase
      .from('eat_list_dishes')
      .select('id, notes')
      .eq('dish_id', dishId)
      .maybeSingle();
    if (eatListError) throw eatListError;

    const { data: newLog, error: logError } = await supabase
      .from('dish_logs')
      .insert({
        dish_id: dishId,
        user_id: userId,
        rating: log.rating,
        notes: log.notes ?? eatListEntry?.notes ?? null,
        log_date: log.log_date,
      })
      .select('id')
      .single();
    if (logError) throw logError;

    if (eatListEntry) {
      const { error: deleteError } = await supabase.from('eat_list_dishes').delete().eq('id', eatListEntry.id);
      if (deleteError) throw deleteError;
    }

    if (log.photoUris && log.photoUris.length > 0) {
      await uploadLogPhotos(log.photoUris, 'dish_log', newLog.id);
    }
  }

  async function reMunch(dishId: string, log: DishLogInput): Promise<void> {
    const userId = await requireUserId();
    const { data: newLog, error } = await supabase
      .from('dish_logs')
      .insert({ dish_id: dishId, user_id: userId, rating: log.rating, notes: log.notes ?? null, log_date: log.log_date })
      .select('id')
      .single();
    if (error) throw error;

    if (log.photoUris && log.photoUris.length > 0) {
      await uploadLogPhotos(log.photoUris, 'dish_log', newLog.id);
    }
  }

  async function renameDish(dishId: string, name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Dish name can’t be empty.');
    const { data, error } = await supabase.from('dishes').update({ name: trimmed }).eq('id', dishId).select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('This dish could not be renamed.');
  }

  async function deleteDish(dishId: string): Promise<void> {
    const { data, error } = await supabase.from('dishes').delete().eq('id', dishId).select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('This dish could not be deleted.');
  }

  async function deleteFromEatList(id: string): Promise<void> {
    const { error } = await supabase.from('eat_list_dishes').delete().eq('id', id);
    if (error) throw error;
  }

  async function deleteLog(logId: string): Promise<void> {
    await deleteLogPhotos('dish_log', [logId]);
    const { error } = await supabase.from('dish_logs').delete().eq('id', logId);
    if (error) throw error;
  }

  async function deleteAllLogs(dishId: string): Promise<void> {
    const { data: logs, error: selectError } = await supabase.from('dish_logs').select('id').eq('dish_id', dishId);
    if (selectError) throw selectError;
    await deleteLogPhotos('dish_log', (logs ?? []).map((l) => l.id));
    const { error } = await supabase.from('dish_logs').delete().eq('dish_id', dishId);
    if (error) throw error;
  }

  async function editEatListEntry(id: string, notes: string): Promise<void> {
    const { error } = await supabase.from('eat_list_dishes').update({ notes }).eq('id', id);
    if (error) throw error;
  }

  async function editDishLog(logId: string, updates: Partial<DishLogInput>): Promise<void> {
    const { error } = await supabase
      .from('dish_logs')
      .update({
        ...(updates.rating !== undefined && { rating: updates.rating }),
        ...(updates.notes !== undefined && { notes: updates.notes }),
        ...(updates.log_date !== undefined && { log_date: updates.log_date }),
      })
      .eq('id', logId);
    if (error) throw error;

    if (updates.photoUris && updates.photoUris.length > 0) {
      await uploadLogPhotos(updates.photoUris, 'dish_log', logId);
    }
  }

  return { addDish, addToEatList, addToMunched, reMunch, renameDish, deleteDish, deleteFromEatList, deleteLog, deleteAllLogs, editEatListEntry, editDishLog };
}
