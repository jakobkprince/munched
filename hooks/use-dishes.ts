import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { countTags, filterByTags, photosByLog } from '../lib/lists';
import { Dish, MunchedDish, EatListDishView, Restaurant, DishLog } from '../types';
import { SortField, SortDirection } from '../constants/sort-options';
import { distanceTo, compareDistance } from './use-location';
import { useFocusedQuery } from './use-focused-query';
import { Coordinates } from '../types';

// latestRating: the rating from the most recent munch (null if never munched or unrated)
export type RestaurantDish = Dish & { latestRating: number | null };

/** The dishes on a restaurant's page; reloads whenever the page comes into focus. */
export function useRestaurantDishes(restaurantId: string) {
  const [munchedDishes, setMunchedDishes] = useState<RestaurantDish[]>([]);
  const [eatListDishes, setEatListDishes] = useState<Dish[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from('dishes')
      .select('*, eat_list_dishes(id), dish_logs(rating, log_date, created_at)')
      .eq('restaurant_id', restaurantId)
      .order('name');
    if (error) {
      setError(error.message);
      return;
    }
    setError(null);
    // A dish that has been munched counts as Munched, even if it's also on the Eat-List
    setMunchedDishes(
      data
        .filter((d) => d.dish_logs.length > 0)
        .map(({ dish_logs, eat_list_dishes, ...dish }) => {
          const latest = [...dish_logs].sort((a, b) =>
            b.log_date.localeCompare(a.log_date) || b.created_at.localeCompare(a.created_at)
          )[0];
          return { ...dish, latestRating: latest.rating };
        })
    );
    setEatListDishes(
      data
        .filter((d) => d.dish_logs.length === 0 && d.eat_list_dishes.length > 0)
        .map(({ dish_logs, eat_list_dishes, ...dish }) => dish)
    );
  }, [restaurantId]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  return { munchedDishes, eatListDishes, error, refresh };
}

// Dish rows embed their restaurant and tags; split them back out
type DishRow = Dish & { restaurant: Restaurant; dish_tags: { tag: string }[] };

function splitDish({ restaurant, dish_tags, ...dish }: DishRow): { dish: Dish; restaurant: Restaurant; tags: string[] } {
  return { dish, restaurant, tags: dish_tags.map((t) => t.tag) };
}

async function loadMunchedDishes(): Promise<MunchedDish[]> {
  const [logsRes, photosRes] = await Promise.all([
    supabase
      .from('dish_logs')
      .select('*, dish:dishes(*, restaurant:restaurants(*), dish_tags(tag))')
      .order('log_date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('photos')
      .select('*')
      .eq('log_type', 'dish_log')
      .order('created_at', { ascending: false }),
  ]);
  if (logsRes.error) throw logsRes.error;
  if (photosRes.error) throw photosRes.error;

  // Group logs by dish (newest first, so logs[0] is the latest)
  const byDish = new Map<string, { dish: DishRow; logs: DishLog[] }>();
  for (const { dish, ...log } of logsRes.data) {
    const existing = byDish.get(log.dish_id);
    if (existing) existing.logs.push(log);
    else byDish.set(log.dish_id, { dish, logs: [log] });
  }

  const photos = photosByLog(photosRes.data);
  return Array.from(byDish.values()).map(({ dish, logs }) => ({
    ...splitDish(dish),
    latestLog: logs[0],
    allLogs: logs,
    // Photos from the most recent munch come first
    photos: logs.flatMap((l) => photos.get(l.id) ?? []),
  }));
}

export function useMunchedDishes(
  sortField: SortField,
  sortDirection: SortDirection,
  tagFilter: string[],
  userLocation: Coordinates | null
) {
  const { data: all, loading, error, refresh } = useFocusedQuery(loadMunchedDishes);
  const tagCounts = useMemo(() => countTags(all ?? []), [all]);

  const data = useMemo(() => {
    const dir = sortDirection === 'asc' ? 1 : -1;
    return [...filterByTags(all ?? [], tagFilter)].sort((a, b) => {
      switch (sortField) {
        case 'recency': return dir * a.latestLog.log_date.localeCompare(b.latestLog.log_date);
        case 'distance':
          return compareDistance(distanceTo(userLocation, a.restaurant), distanceTo(userLocation, b.restaurant), dir);
        default: return dir * ((a.latestLog.rating ?? 0) - (b.latestLog.rating ?? 0));
      }
    });
  }, [all, tagFilter, sortField, sortDirection, userLocation]);

  return { data, tagCounts, loading, error, refresh };
}

async function loadEatListDishes(): Promise<EatListDishView[]> {
  const { data, error } = await supabase
    .from('eat_list_dishes')
    .select('*, dish:dishes(*, restaurant:restaurants(*), dish_tags(tag))')
    .order('date_added', { ascending: false });
  if (error) throw error;
  return data.map((row) => {
    const { dish, restaurant, tags } = splitDish(row.dish);
    return { entry: { ...row, dish: { ...dish, restaurant } }, dish, restaurant, tags };
  });
}

export function useEatListDishes(
  sortField: SortField,
  sortDirection: SortDirection,
  tagFilter: string[],
  userLocation: Coordinates | null
) {
  const { data: all, loading, error, refresh } = useFocusedQuery(loadEatListDishes);
  const tagCounts = useMemo(() => countTags(all ?? []), [all]);

  const data = useMemo(() => {
    const dir = sortDirection === 'asc' ? 1 : -1;
    return [...filterByTags(all ?? [], tagFilter)].sort((a, b) => {
      if (sortField === 'distance') {
        return compareDistance(distanceTo(userLocation, a.restaurant), distanceTo(userLocation, b.restaurant), dir);
      }
      return dir * a.entry.date_added.localeCompare(b.entry.date_added);
    });
  }, [all, tagFilter, sortField, sortDirection, userLocation]);

  return { data, tagCounts, loading, error, refresh };
}
