-- Allow half-star ratings (e.g. 1.5, 2.5) by changing rating columns from
-- smallint to numeric(3,1). Existing integer values are preserved.

ALTER TABLE restaurant_logs
  ALTER COLUMN rating TYPE numeric(3,1),
  ALTER COLUMN vibe_rating TYPE numeric(3,1);

ALTER TABLE dish_logs
  ALTER COLUMN rating TYPE numeric(3,1);
