export type SortDirection = 'asc' | 'desc';
export type SortField = 'rating' | 'recency' | 'vibe' | 'distance';

export interface SortFieldOption {
  label: string;
  value: SortField;
}

const RATING: SortFieldOption = { label: 'Rating', value: 'rating' };
const DATE: SortFieldOption = { label: 'Date', value: 'recency' };
const VIBE: SortFieldOption = { label: 'Vibe', value: 'vibe' };
const DISTANCE: SortFieldOption = { label: 'Distance', value: 'distance' };

// Sort fields shown in each list's picker
export const MUNCHED_RESTAURANT_SORT_FIELDS = [RATING, DATE, VIBE, DISTANCE];
export const MUNCHED_DISH_SORT_FIELDS = [RATING, DATE, DISTANCE];
// Eat-List entries have no ratings
export const EAT_LIST_SORT_FIELDS = [DATE, DISTANCE];

// Default direction when a sort field is selected
export const DEFAULT_SORT_DIRECTIONS: Record<SortField, SortDirection> = {
  rating: 'desc',
  recency: 'desc',
  vibe: 'desc',
  distance: 'asc',
};
