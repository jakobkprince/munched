export type SortDirection = 'asc' | 'desc';

export type MunchedRestaurantSortField = 'recency' | 'rating' | 'vibe' | 'distance';
export type MunchedDishSortField = 'recency' | 'rating' | 'distance';
export type EatListSortField = 'recency' | 'distance';

export interface SortOption<T extends string> {
  field: T;
  direction: SortDirection;
  label: string;
}

export const MUNCHED_RESTAURANT_SORT_OPTIONS: SortOption<MunchedRestaurantSortField>[] = [
  { field: 'rating', direction: 'desc', label: 'Rating: High to Low' },
  { field: 'rating', direction: 'asc', label: 'Rating: Low to High' },
  { field: 'recency', direction: 'desc', label: 'Most Recent' },
  { field: 'recency', direction: 'asc', label: 'Oldest First' },
  { field: 'vibe', direction: 'desc', label: 'Vibe: High to Low' },
  { field: 'vibe', direction: 'asc', label: 'Vibe: Low to High' },
  { field: 'distance', direction: 'asc', label: 'Nearest First' },
  { field: 'distance', direction: 'desc', label: 'Farthest First' },
];

export const MUNCHED_DISH_SORT_OPTIONS: SortOption<MunchedDishSortField>[] = [
  { field: 'rating', direction: 'desc', label: 'Rating: High to Low' },
  { field: 'rating', direction: 'asc', label: 'Rating: Low to High' },
  { field: 'recency', direction: 'desc', label: 'Most Recent' },
  { field: 'recency', direction: 'asc', label: 'Oldest First' },
  { field: 'distance', direction: 'asc', label: 'Nearest First' },
  { field: 'distance', direction: 'desc', label: 'Farthest First' },
];

export const EAT_LIST_SORT_OPTIONS: SortOption<EatListSortField>[] = [
  { field: 'recency', direction: 'desc', label: 'Most Recent' },
  { field: 'recency', direction: 'asc', label: 'Oldest First' },
  { field: 'distance', direction: 'asc', label: 'Nearest First' },
  { field: 'distance', direction: 'desc', label: 'Farthest First' },
];

export const DEFAULT_MUNCHED_RESTAURANT_SORT = MUNCHED_RESTAURANT_SORT_OPTIONS[0];
export const DEFAULT_MUNCHED_DISH_SORT = MUNCHED_DISH_SORT_OPTIONS[0];
export const DEFAULT_EAT_LIST_SORT = EAT_LIST_SORT_OPTIONS[0];
