-- Sample data for the LOCAL development database only (`supabase db reset`).
-- Never runs against the real (hosted) project.
--
-- Local test login:  test@munched.test  /  munched-local-test

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'test@munched.test',
  extensions.crypt('munched-local-test', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''
);

INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
VALUES (
  gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"test@munched.test","email_verified":true}',
  'email', now(), now(), now()
);

INSERT INTO restaurants (id, google_place_id, name, address, lat, lng, website, apple_maps_url, yelp_url) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'seed_tartine', 'Tartine Bakery', '600 Guerrero St, San Francisco, CA 94110', 37.7614, -122.4241, 'https://tartinebakery.com', 'https://maps.apple.com/?q=Tartine%20Bakery&ll=37.7614,-122.4241', 'https://www.yelp.com/search?find_desc=Tartine%20Bakery&find_loc=600%20Guerrero%20St'),
  ('a0000000-0000-0000-0000-000000000002', 'seed_zuni', 'Zuni Café', '1658 Market St, San Francisco, CA 94102', 37.7736, -122.4216, 'https://zunicafe.com', 'https://maps.apple.com/?q=Zuni%20Caf%C3%A9&ll=37.7736,-122.4216', 'https://www.yelp.com/search?find_desc=Zuni%20Cafe&find_loc=1658%20Market%20St'),
  ('a0000000-0000-0000-0000-000000000003', 'seed_burma', 'Burma Superstar', '309 Clement St, San Francisco, CA 94118', 37.7830, -122.4627, 'https://burmasuperstar.com', 'https://maps.apple.com/?q=Burma%20Superstar&ll=37.7830,-122.4627', 'https://www.yelp.com/search?find_desc=Burma%20Superstar&find_loc=309%20Clement%20St'),
  ('a0000000-0000-0000-0000-000000000004', 'seed_lataq', 'La Taqueria', '2889 Mission St, San Francisco, CA 94110', 37.7509, -122.4181, NULL, 'https://maps.apple.com/?q=La%20Taqueria&ll=37.7509,-122.4181', 'https://www.yelp.com/search?find_desc=La%20Taqueria&find_loc=2889%20Mission%20St');

INSERT INTO restaurant_tags (restaurant_id, tag) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Pastry'),
  ('a0000000-0000-0000-0000-000000000001', 'Cafe'),
  ('a0000000-0000-0000-0000-000000000002', 'American'),
  ('a0000000-0000-0000-0000-000000000003', 'Burmese'),
  ('a0000000-0000-0000-0000-000000000004', 'Mexican');

-- Munched: Zuni + La Taqueria. Eat-List: Tartine + Burma Superstar.
INSERT INTO restaurant_logs (restaurant_id, user_id, rating, vibe_rating, notes, log_date) VALUES
  ('a0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 4.5, 5, '• Roast chicken lived up to the hype', '2026-09-12'),
  ('a0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 4, 3, '• Get it dorado style', '2026-08-02'),
  ('a0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 3.5, 3, NULL, '2026-03-05');

INSERT INTO eat_list_restaurants (restaurant_id, user_id, notes) VALUES
  ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Morning bun'),
  ('a0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', NULL);

INSERT INTO dishes (id, restaurant_id, name) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Roast Chicken'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'Tea Leaf Salad');

INSERT INTO dish_tags (dish_id, tag) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'American'),
  ('d0000000-0000-0000-0000-000000000002', 'Burmese');

INSERT INTO dish_logs (dish_id, user_id, rating, notes, log_date) VALUES
  ('d0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 5, '• Bread salad underneath is the best part', '2026-09-12');

INSERT INTO eat_list_dishes (dish_id, user_id, notes) VALUES
  ('d0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', NULL);
