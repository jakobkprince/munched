import { supabase } from '../lib/supabase';
import { DishLogInput } from '../types';

async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error('Not authenticated');
  return session.user.id;
}

export function useDishActions() {
  async function addDish(restaurantId: string, name: string): Promise<string> {
    const { data, error } = await supabase
      .from('dishes')
      .insert({ restaurant_id: restaurantId, name })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  async function addToEatList(dishId: string, notes?: string): Promise<void> {
    const userId = await getUserId();
    const { error } = await supabase
      .from('eat_list_dishes')
      .insert({ dish_id: dishId, user_id: userId, notes: notes ?? null });
    if (error) throw error;
  }

  async function addToMunched(dishId: string, log: DishLogInput): Promise<void> {
    const userId = await getUserId();
    const { data: eatListEntry } = await supabase
      .from('eat_list_dishes')
      .select('id, notes')
      .eq('dish_id', dishId)
      .maybeSingle();

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

    if (log.photoUris && log.photoUris.length > 0) {
      for (const uri of log.photoUris) {
        const filename = `dish_log/${newLog.id}/${Date.now()}.jpg`;
        const response = await fetch(uri);
        const arrayBuffer = await response.arrayBuffer();
        const { error: uploadError } = await supabase.storage.from('photos').upload(filename, arrayBuffer, { contentType: 'image/jpeg' });
        if (uploadError) throw uploadError;
        const { error: insertError } = await supabase.from('photos').insert({ storage_path: filename, log_type: 'dish_log', log_id: newLog.id });
        if (insertError) throw insertError;
      }
    }

    if (eatListEntry) {
      await supabase.from('eat_list_dishes').delete().eq('id', eatListEntry.id);
    }
  }

  async function reMunch(dishId: string, log: DishLogInput): Promise<void> {
    const userId = await getUserId();
    const { data: newLog, error } = await supabase
      .from('dish_logs')
      .insert({ dish_id: dishId, user_id: userId, rating: log.rating, notes: log.notes ?? null, log_date: log.log_date })
      .select('id')
      .single();
    if (error) throw error;

    if (log.photoUris && log.photoUris.length > 0) {
      for (const uri of log.photoUris) {
        const filename = `dish_log/${newLog.id}/${Date.now()}.jpg`;
        const response = await fetch(uri);
        const arrayBuffer = await response.arrayBuffer();
        const { error: uploadError } = await supabase.storage.from('photos').upload(filename, arrayBuffer, { contentType: 'image/jpeg' });
        if (uploadError) throw uploadError;
        const { error: insertError } = await supabase.from('photos').insert({ storage_path: filename, log_type: 'dish_log', log_id: newLog.id });
        if (insertError) throw insertError;
      }
    }
  }

  async function deleteFromEatList(id: string): Promise<void> {
    const { error } = await supabase.from('eat_list_dishes').delete().eq('id', id);
    if (error) throw error;
  }

  async function deleteLog(logId: string): Promise<void> {
    const { error } = await supabase.from('dish_logs').delete().eq('id', logId);
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
  }

  return { addDish, addToEatList, addToMunched, reMunch, deleteFromEatList, deleteLog, editEatListEntry, editDishLog };
}
