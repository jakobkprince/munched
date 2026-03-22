-- =============================================================================
-- Munch App — Initial Schema Migration
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Tables (in dependency order)
-- ---------------------------------------------------------------------------

-- restaurants: source of truth from Google Places, shared across users
CREATE TABLE restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  google_place_id text UNIQUE NOT NULL,
  name text NOT NULL,
  address text,
  lat float8,
  lng float8,
  website text,
  apple_maps_url text,
  yelp_url text,
  created_at timestamptz DEFAULT now()
);

-- eat_list_restaurants: restaurants a user wants to try
CREATE TABLE eat_list_restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notes text,
  date_added timestamptz DEFAULT now(),
  UNIQUE(restaurant_id, user_id)
);

-- restaurant_logs: each time a user munches a restaurant
CREATE TABLE restaurant_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint CHECK (rating >= 1 AND rating <= 5),
  vibe_rating smallint CHECK (vibe_rating >= 1 AND vibe_rating <= 5),
  notes text,
  log_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- dishes: belong to a restaurant, named manually
CREATE TABLE dishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- eat_list_dishes: dishes a user wants to try
CREATE TABLE eat_list_dishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id uuid NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notes text,
  date_added timestamptz DEFAULT now(),
  UNIQUE(dish_id, user_id)
);

-- dish_logs: each time a user munches a dish
CREATE TABLE dish_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id uuid NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint CHECK (rating >= 1 AND rating <= 5),
  notes text,
  log_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

-- restaurant_tags: tags on restaurants
CREATE TABLE restaurant_tags (
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  tag text NOT NULL,
  PRIMARY KEY (restaurant_id, tag)
);

-- dish_tags: tags on dishes
CREATE TABLE dish_tags (
  dish_id uuid NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  tag text NOT NULL,
  PRIMARY KEY (dish_id, tag)
);

-- photos: photos attached to restaurant or dish logs
-- Uses polymorphic log_type + log_id (no FK constraint — flexible across log types)
CREATE TABLE photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  log_type text NOT NULL CHECK (log_type IN ('restaurant_log', 'dish_log')),
  log_id uuid NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX idx_eat_list_restaurants_user ON eat_list_restaurants(user_id);
CREATE INDEX idx_eat_list_restaurants_restaurant ON eat_list_restaurants(restaurant_id);
CREATE INDEX idx_restaurant_logs_user ON restaurant_logs(user_id);
CREATE INDEX idx_restaurant_logs_restaurant ON restaurant_logs(restaurant_id);
CREATE INDEX idx_restaurant_logs_log_date ON restaurant_logs(log_date DESC);
CREATE INDEX idx_eat_list_dishes_user ON eat_list_dishes(user_id);
CREATE INDEX idx_eat_list_dishes_dish ON eat_list_dishes(dish_id);
CREATE INDEX idx_dish_logs_user ON dish_logs(user_id);
CREATE INDEX idx_dish_logs_dish ON dish_logs(dish_id);
CREATE INDEX idx_dish_logs_log_date ON dish_logs(log_date DESC);
CREATE INDEX idx_dishes_restaurant ON dishes(restaurant_id);
CREATE INDEX idx_restaurant_tags_restaurant ON restaurant_tags(restaurant_id);
CREATE INDEX idx_dish_tags_dish ON dish_tags(dish_id);
CREATE INDEX idx_photos_log ON photos(log_type, log_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

-- restaurants: shared reference data — any authenticated user can read/insert
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read restaurants"
  ON restaurants FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert restaurants"
  ON restaurants FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- dishes: shared reference data
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read dishes"
  ON dishes FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert dishes"
  ON dishes FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- eat_list_restaurants: user-scoped
ALTER TABLE eat_list_restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own eat list restaurants"
  ON eat_list_restaurants FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- restaurant_logs: user-scoped
ALTER TABLE restaurant_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own restaurant logs"
  ON restaurant_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- eat_list_dishes: user-scoped
ALTER TABLE eat_list_dishes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own eat list dishes"
  ON eat_list_dishes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- dish_logs: user-scoped
ALTER TABLE dish_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own dish logs"
  ON dish_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- restaurant_tags: any authenticated user can manage
ALTER TABLE restaurant_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage restaurant tags"
  ON restaurant_tags FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- dish_tags: any authenticated user can manage
ALTER TABLE dish_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage dish tags"
  ON dish_tags FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- photos: any authenticated user can manage
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage photos"
  ON photos FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- Storage bucket
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'photos' AND auth.role() = 'authenticated');

CREATE POLICY "Photos are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'photos');

CREATE POLICY "Users can delete their own photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'photos' AND auth.role() = 'authenticated');
