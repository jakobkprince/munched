import { supabase } from '../lib/supabase';

export function useTags() {
  /** Tags a restaurant, and also every dish you've added there. */
  async function addRestaurantTags(restaurantId: string, tags: string[]): Promise<void> {
    if (tags.length === 0) return;
    const { error } = await supabase
      .from('restaurant_tags')
      .upsert(tags.map((tag) => ({ restaurant_id: restaurantId, tag })), { onConflict: 'restaurant_id,tag', ignoreDuplicates: true });
    if (error) throw error;

    const { data: dishes, error: dishesError } = await supabase.from('dishes').select('id').eq('restaurant_id', restaurantId);
    if (dishesError) throw dishesError;
    if (dishes.length === 0) return;
    const { error: dishTagsError } = await supabase
      .from('dish_tags')
      .upsert(
        dishes.flatMap((d) => tags.map((tag) => ({ dish_id: d.id, tag }))),
        { onConflict: 'dish_id,tag', ignoreDuplicates: true }
      );
    if (dishTagsError) throw dishTagsError;
  }

  async function removeRestaurantTag(restaurantId: string, tag: string): Promise<void> {
    const { error } = await supabase
      .from('restaurant_tags')
      .delete()
      .eq('restaurant_id', restaurantId)
      .eq('tag', tag);
    if (error) throw error;
  }

  async function addDishTags(dishId: string, tags: string[]): Promise<void> {
    if (tags.length === 0) return;
    const { error } = await supabase
      .from('dish_tags')
      .upsert(tags.map((tag) => ({ dish_id: dishId, tag })), { onConflict: 'dish_id,tag', ignoreDuplicates: true });
    if (error) throw error;
  }

  async function removeDishTags(dishId: string, tags: string[]): Promise<void> {
    if (tags.length === 0) return;
    const { error } = await supabase
      .from('dish_tags')
      .delete()
      .eq('dish_id', dishId)
      .in('tag', tags);
    if (error) throw error;
  }

  return { addRestaurantTags, removeRestaurantTag, addDishTags, removeDishTags };
}
