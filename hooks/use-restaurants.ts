import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Restaurant, MunchedRestaurant, EatListRestaurantView, RestaurantStatus, RestaurantLog, Photo } from '../types';
import { MunchedRestaurantSortField, EatListSortField, SortDirection } from '../constants/sort-options';
import { getDistanceKm } from './use-location';
import { Coordinates } from '../types';

export function useRestaurant(id: string) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [status, setStatus] = useState<RestaurantStatus>({ inEatList: false, inMunched: false, eatListEntry: null });
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [restaurantRes, eatListRes, logsRes, tagsRes] = await Promise.all([
        supabase.from('restaurants').select('*').eq('id', id).single(),
        supabase.from('eat_list_restaurants').select('*, restaurant:restaurants(*)').eq('restaurant_id', id).maybeSingle(),
        supabase.from('restaurant_logs').select('id').eq('restaurant_id', id).limit(1),
        supabase.from('restaurant_tags').select('tag').eq('restaurant_id', id),
      ]);
      if (restaurantRes.error) throw restaurantRes.error;
      setRestaurant(restaurantRes.data);
      setStatus({
        inEatList: !!eatListRes.data,
        inMunched: (logsRes.data?.length ?? 0) > 0,
        eatListEntry: eatListRes.data ?? null,
      });
      setTags((tagsRes.data ?? []).map((t) => t.tag));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load restaurant');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetch(); }, [fetch]);

  return { restaurant, status, tags, loading, error, refresh: fetch };
}

export function useMunchedRestaurants(
  sortField: MunchedRestaurantSortField,
  sortDirection: SortDirection,
  tagFilter: string[],
  userLocation: Coordinates | null
) {
  const [data, setData] = useState<MunchedRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: logs, error: logsErr } = await supabase
        .from('restaurant_logs')
        .select('*, restaurant:restaurants(*)')
        .order('log_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (logsErr) throw logsErr;

      // Group logs by restaurant_id
      const byRestaurant = new Map<string, { restaurant: Restaurant; logs: RestaurantLog[] }>();
      for (const log of logs ?? []) {
        const existing = byRestaurant.get(log.restaurant_id);
        if (existing) {
          existing.logs.push(log);
        } else {
          byRestaurant.set(log.restaurant_id, { restaurant: log.restaurant, logs: [log] });
        }
      }

      const restaurantIds = Array.from(byRestaurant.keys());
      if (restaurantIds.length === 0) { setData([]); return; }

      const [photosRes, tagsRes] = await Promise.all([
        supabase.from('photos').select('*').eq('log_type', 'restaurant_log').in('log_id', logs?.map(l => l.id) ?? []),
        supabase.from('restaurant_tags').select('*').in('restaurant_id', restaurantIds),
      ]);

      let result: MunchedRestaurant[] = Array.from(byRestaurant.values()).map(({ restaurant, logs }) => ({
        restaurant,
        latestLog: logs[0],
        allLogs: logs,
        photos: (photosRes.data ?? []).filter((p) => logs.some((l) => l.id === p.log_id)),
        tags: (tagsRes.data ?? []).filter((t) => t.restaurant_id === restaurant.id).map((t) => t.tag),
      }));

      // Filter by tags
      if (tagFilter.length > 0) {
        result = result.filter((r) => tagFilter.every((t) => r.tags.includes(t)));
      }

      // Sort
      result.sort((a, b) => {
        const dir = sortDirection === 'asc' ? 1 : -1;
        switch (sortField) {
          case 'rating': return dir * ((a.latestLog.rating ?? 0) - (b.latestLog.rating ?? 0));
          case 'vibe': return dir * ((a.latestLog.vibe_rating ?? 0) - (b.latestLog.vibe_rating ?? 0));
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

  return { data, loading, error, refresh: fetch };
}

export function useEatListRestaurants(
  sortField: EatListSortField,
  sortDirection: SortDirection,
  tagFilter: string[],
  userLocation: Coordinates | null
) {
  const [data, setData] = useState<EatListRestaurantView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: entries, error: err } = await supabase
        .from('eat_list_restaurants')
        .select('*, restaurant:restaurants(*)')
        .order('date_added', { ascending: false });
      if (err) throw err;

      const restaurantIds = (entries ?? []).map((e) => e.restaurant_id);
      const tagsRes = restaurantIds.length > 0
        ? await supabase.from('restaurant_tags').select('*').in('restaurant_id', restaurantIds)
        : { data: [] };

      let result: EatListRestaurantView[] = (entries ?? []).map((entry) => ({
        entry,
        restaurant: entry.restaurant,
        tags: (tagsRes.data ?? []).filter((t) => t.restaurant_id === entry.restaurant_id).map((t) => t.tag),
        distanceKm: userLocation && entry.restaurant.lat != null
          ? getDistanceKm(userLocation, { latitude: entry.restaurant.lat, longitude: entry.restaurant.lng! })
          : undefined,
      }));

      if (tagFilter.length > 0) {
        result = result.filter((r) => tagFilter.every((t) => r.tags.includes(t)));
      }

      result.sort((a, b) => {
        const dir = sortDirection === 'asc' ? 1 : -1;
        if (sortField === 'recency') return dir * (new Date(a.entry.date_added).getTime() - new Date(b.entry.date_added).getTime());
        if (sortField === 'distance' && a.distanceKm != null && b.distanceKm != null) return dir * (a.distanceKm - b.distanceKm);
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

  return { data, loading, error, refresh: fetch };
}
