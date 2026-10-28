import { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../lib/supabase';
import { countTags, filterByTags, photosByLog } from '../lib/lists';
import { Restaurant, MunchedRestaurant, EatListRestaurantView, RestaurantStatus, RestaurantLog } from '../types';
import { SortField, SortDirection } from '../constants/sort-options';
import { distanceTo, compareDistance } from './use-location';
import { useFocusedQuery } from './use-focused-query';
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
      if (eatListRes.error) throw eatListRes.error;
      if (logsRes.error) throw logsRes.error;
      if (tagsRes.error) throw tagsRes.error;
      setRestaurant(restaurantRes.data);
      setStatus({
        inEatList: !!eatListRes.data,
        inMunched: logsRes.data.length > 0,
        eatListEntry: eatListRes.data ?? null,
      });
      setTags(tagsRes.data.map((t) => t.tag));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load restaurant');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Reload on return, e.g. after the restaurant was munched from one of its dishes
  useFocusEffect(useCallback(() => { fetch(); }, [fetch]));

  return { restaurant, status, tags, loading, error, refresh: fetch };
}

// Restaurant rows embed their tags; split them back out
type RestaurantWithTags = Restaurant & { restaurant_tags: { tag: string }[] };

function splitTags({ restaurant_tags, ...restaurant }: RestaurantWithTags): { restaurant: Restaurant; tags: string[] } {
  return { restaurant, tags: restaurant_tags.map((t) => t.tag) };
}

async function loadMunchedRestaurants(): Promise<MunchedRestaurant[]> {
  const [logsRes, photosRes] = await Promise.all([
    supabase
      .from('restaurant_logs')
      .select('*, restaurant:restaurants(*, restaurant_tags(tag))')
      .order('log_date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('photos')
      .select('*')
      .eq('log_type', 'restaurant_log')
      .order('created_at', { ascending: false }),
  ]);
  if (logsRes.error) throw logsRes.error;
  if (photosRes.error) throw photosRes.error;

  // Group logs by restaurant (newest first, so logs[0] is the latest)
  const byRestaurant = new Map<string, { restaurant: RestaurantWithTags; logs: RestaurantLog[] }>();
  for (const { restaurant, ...log } of logsRes.data) {
    const existing = byRestaurant.get(log.restaurant_id);
    if (existing) existing.logs.push(log);
    else byRestaurant.set(log.restaurant_id, { restaurant, logs: [log] });
  }

  const photos = photosByLog(photosRes.data);
  return Array.from(byRestaurant.values()).map(({ restaurant, logs }) => ({
    ...splitTags(restaurant),
    latestLog: logs[0],
    allLogs: logs,
    // Photos from the most recent visit come first
    photos: logs.flatMap((l) => photos.get(l.id) ?? []),
  }));
}

export function useMunchedRestaurants(
  sortField: SortField,
  sortDirection: SortDirection,
  tagFilter: string[],
  userLocation: Coordinates | null
) {
  const { data: all, loading, error, refresh } = useFocusedQuery(loadMunchedRestaurants);
  const tagCounts = useMemo(() => countTags(all ?? []), [all]);

  const data = useMemo(() => {
    const dir = sortDirection === 'asc' ? 1 : -1;
    return [...filterByTags(all ?? [], tagFilter)].sort((a, b) => {
      switch (sortField) {
        case 'rating': return dir * ((a.latestLog.rating ?? 0) - (b.latestLog.rating ?? 0));
        case 'vibe': return dir * ((a.latestLog.vibe_rating ?? 0) - (b.latestLog.vibe_rating ?? 0));
        case 'recency': return dir * a.latestLog.log_date.localeCompare(b.latestLog.log_date);
        case 'distance':
          return compareDistance(distanceTo(userLocation, a.restaurant), distanceTo(userLocation, b.restaurant), dir);
      }
    });
  }, [all, tagFilter, sortField, sortDirection, userLocation]);

  return { data, tagCounts, loading, error, refresh };
}

async function loadEatListRestaurants(): Promise<EatListRestaurantView[]> {
  const { data, error } = await supabase
    .from('eat_list_restaurants')
    .select('*, restaurant:restaurants(*, restaurant_tags(tag))')
    .order('date_added', { ascending: false });
  if (error) throw error;
  return data.map((row) => {
    const { restaurant, tags } = splitTags(row.restaurant);
    return { entry: { ...row, restaurant }, restaurant, tags };
  });
}

export function useEatListRestaurants(
  sortField: SortField,
  sortDirection: SortDirection,
  tagFilter: string[],
  userLocation: Coordinates | null
) {
  const { data: all, loading, error, refresh } = useFocusedQuery(loadEatListRestaurants);
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
