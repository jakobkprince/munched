// ─── Database row types (mirror DB schema exactly) ───────────────────────────

export interface Restaurant {
  id: string;
  google_place_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  website: string | null;
  apple_maps_url: string | null;
  yelp_url: string | null;
  created_at: string;
}

export interface EatListRestaurant {
  id: string;
  restaurant_id: string;
  user_id: string;
  notes: string | null;
  date_added: string;
  restaurant: Restaurant;
}

export interface RestaurantLog {
  id: string;
  restaurant_id: string;
  user_id: string;
  rating: number | null;
  vibe_rating: number | null;
  notes: string | null;
  log_date: string;
  created_at: string;
}

export interface Dish {
  id: string;
  restaurant_id: string;
  name: string;
  created_at: string;
}

export interface EatListDish {
  id: string;
  dish_id: string;
  user_id: string;
  notes: string | null;
  date_added: string;
  dish: Dish & { restaurant: Restaurant };
}

export interface DishLog {
  id: string;
  dish_id: string;
  user_id: string;
  rating: number | null;
  notes: string | null;
  log_date: string;
  created_at: string;
}

export interface Photo {
  id: string;
  storage_path: string;
  log_type: 'restaurant_log' | 'dish_log';
  log_id: string;
  created_at: string;
}

export interface RestaurantTag {
  restaurant_id: string;
  tag: string;
}

export interface DishTag {
  dish_id: string;
  tag: string;
}

// ─── Computed/view types (for UI layer) ──────────────────────────────────────

/** Status of a restaurant relative to the current user's lists */
export interface RestaurantStatus {
  inEatList: boolean;
  inMunched: boolean;
  eatListEntry: EatListRestaurant | null;
}

/** A restaurant as shown in the Munched tab — most recent log + all photos */
export interface MunchedRestaurant {
  restaurant: Restaurant;
  latestLog: RestaurantLog;
  allLogs: RestaurantLog[];
  photos: Photo[];
  tags: string[];
}

/** A dish as shown in the Munched tab — most recent log + all photos */
export interface MunchedDish {
  dish: Dish;
  restaurant: Restaurant;
  latestLog: DishLog;
  allLogs: DishLog[];
  photos: Photo[];
  tags: string[];
}

/** A restaurant as shown in the Eat-List tab */
export interface EatListRestaurantView {
  entry: EatListRestaurant;
  restaurant: Restaurant;
  tags: string[];
  distanceKm?: number;
}

/** A dish as shown in the Eat-List tab */
export interface EatListDishView {
  entry: EatListDish;
  dish: Dish;
  restaurant: Restaurant;
  tags: string[];
}

/** Input for logging a restaurant (used in AddToMunchedSheet) */
export interface RestaurantLogInput {
  rating: number;
  vibe_rating?: number;
  notes?: string;
  log_date: string;
  photoUris?: string[];
}

/** Input for logging a dish */
export interface DishLogInput {
  rating: number;
  notes?: string;
  log_date: string;
  photoUris?: string[];
}

/** User coordinates */
export interface Coordinates {
  latitude: number;
  longitude: number;
}
