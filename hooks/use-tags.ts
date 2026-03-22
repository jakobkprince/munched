import { supabase } from '../lib/supabase';

export function useTags() {
  async function addRestaurantTag(restaurantId: string, tag: string): Promise<void> {
    const { error } = await supabase
      .from('restaurant_tags')
      .upsert({ restaurant_id: restaurantId, tag }, { onConflict: 'restaurant_id,tag', ignoreDuplicates: true });
    if (error) throw error;
  }

  async function removeRestaurantTag(restaurantId: string, tag: string): Promise<void> {
    const { error } = await supabase
      .from('restaurant_tags')
      .delete()
      .eq('restaurant_id', restaurantId)
      .eq('tag', tag);
    if (error) throw error;
  }

  async function addDishTag(dishId: string, tag: string): Promise<void> {
    const { error } = await supabase
      .from('dish_tags')
      .upsert({ dish_id: dishId, tag }, { onConflict: 'dish_id,tag', ignoreDuplicates: true });
    if (error) throw error;
  }

  async function removeDishTag(dishId: string, tag: string): Promise<void> {
    const { error } = await supabase
      .from('dish_tags')
      .delete()
      .eq('dish_id', dishId)
      .eq('tag', tag);
    if (error) throw error;
  }

  return { addRestaurantTag, removeRestaurantTag, addDishTag, removeDishTag };
}
