import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Dish, MunchedDish, EatListDishView, Restaurant, DishLog } from '../types';
import { MunchedDishSortField, EatListSortField, SortDirection } from '../constants/sort-options';
import { getDistanceKm } from './use-location';
import { Coordinates } from '../types';

export function useRestaurantDishes(restaurantId: string) {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('dishes')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('name');
    setDishes(data ?? []);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { dishes, loading, refresh: fetch };
}

export function useMunchedDishes(
  sortField: MunchedDishSortField,
  sortDirection: SortDirection,
  tagFilter: string[],
  userLocation: Coordinates | null
) {
  const [data, setData] = useState<MunchedDish[]>([]);
  const [tagCounts, setTagCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: logs, error: err } = await supabase
        .from('dish_logs')
        .select('*, dish:dishes(*, restaurant:restaurants(*))')
        .order('log_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (err) throw err;

      const byDish = new Map<string, { dish: Dish; restaurant: Restaurant; logs: DishLog[] }>();
      for (const log of logs ?? []) {
        const existing = byDish.get(log.dish_id);
        if (existing) {
          existing.logs.push(log);
        } else {
          byDish.set(log.dish_id, { dish: log.dish, restaurant: log.dish.restaurant, logs: [log] });
        }
      }

      const dishIds = Array.from(byDish.keys());
      if (dishIds.length === 0) { setData([]); setTagCounts({}); return; }

      const [photosRes, tagsRes] = await Promise.all([
        supabase.from('photos').select('*').eq('log_type', 'dish_log').in('log_id', logs?.map(l => l.id) ?? []),
        supabase.from('dish_tags').select('*').in('dish_id', dishIds),
      ]);

      let result: MunchedDish[] = Array.from(byDish.values()).map(({ dish, restaurant, logs }) => ({
        dish,
        restaurant,
        latestLog: logs[0],
        allLogs: logs,
        photos: (photosRes.data ?? []).filter((p) => logs.some((l) => l.id === p.log_id)),
        tags: (tagsRes.data ?? []).filter((t) => t.dish_id === dish.id).map((t) => t.tag),
      }));

      // Compute tag counts before filtering
      const counts: Record<string, number> = {};
      for (const item of result) {
        for (const tag of item.tags) {
          counts[tag] = (counts[tag] ?? 0) + 1;
        }
      }
      setTagCounts(counts);

      if (tagFilter.length > 0) {
        result = result.filter((r) => tagFilter.every((t) => r.tags.includes(t)));
      }

      result.sort((a, b) => {
        const dir = sortDirection === 'asc' ? 1 : -1;
        switch (sortField) {
          case 'rating': return dir * ((a.latestLog.rating ?? 0) - (b.latestLog.rating ?? 0));
          case 'recency': return dir * (new Date(a.latestLog.log_date).getTime() - new Date(b.latestLog.log_date).getTime());
          case 'distance': {
            if (!userLocation || a.restaurant.lat == null || b.restaurant.lat == null) return 0;
            const dA = getDistanceKm(userLocation, { latitude: a.restaurant.lat, longitude: a.restaurant.lng! });
            const dB = getDistanceKm(userLocation, { latitude: b.restaurant.lat, longitude: b.restaurant.lng! });
            return dir * (dA - dB);
          }
        }
      });

      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [sortField, sortDirection, tagFilter, userLocation]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, tagCounts, loading, error, refresh: fetch };
}

export function useEatListDishes(
  sortField: EatListSortField,
  sortDirection: SortDirection,
  tagFilter: string[],
  userLocation: Coordinates | null
) {
  const [data, setData] = useState<EatListDishView[]>([]);
  const [tagCounts, setTagCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: entries, error: err } = await supabase
        .from('eat_list_dishes')
        .select('*, dish:dishes(*, restaurant:restaurants(*))')
        .order('date_added', { ascending: false });
      if (err) throw err;

      const dishIds = (entries ?? []).map((e) => e.dish_id);
      const tagsRes = dishIds.length > 0
        ? await supabase.from('dish_tags').select('*').in('dish_id', dishIds)
        : { data: [] };

      let result: EatListDishView[] = (entries ?? []).map((entry) => ({
        entry,
        dish: entry.dish,
        restaurant: entry.dish.restaurant,
        tags: (tagsRes.data ?? []).filter((t) => t.dish_id === entry.dish_id).map((t) => t.tag),
      }));

      // Compute tag counts before filtering
      const counts: Record<string, number> = {};
      for (const item of result) {
        for (const tag of item.tags) {
          counts[tag] = (counts[tag] ?? 0) + 1;
        }
      }
      setTagCounts(counts);

      if (tagFilter.length > 0) {
        result = result.filter((r) => tagFilter.every((t) => r.tags.includes(t)));
      }

      result.sort((a, b) => {
        const dir = sortDirection === 'asc' ? 1 : -1;
        if (sortField === 'recency') return dir * (new Date(a.entry.date_added).getTime() - new Date(b.entry.date_added).getTime());
        if (sortField === 'distance' && userLocation && a.restaurant.lat != null && b.restaurant.lat != null) {
          const dA = getDistanceKm(userLocation, { latitude: a.restaurant.lat, longitude: a.restaurant.lng! });
          const dB = getDistanceKm(userLocation, { latitude: b.restaurant.lat, longitude: b.restaurant.lng! });
          return dir * (dA - dB);
        }
        // rating/vibe not applicable to eat-list entries
        return 0;
      });

      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [sortField, sortDirection, tagFilter, userLocation]);

  useEffect(() => { fetch(); }, [fetch]);
  return { data, tagCounts, loading, error, refresh: fetch };
}
