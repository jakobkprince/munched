-- Backfill dish_tags by inheriting restaurant_tags for all existing dishes
INSERT INTO dish_tags (dish_id, tag)
SELECT DISTINCT d.id, rt.tag
FROM dishes d
JOIN restaurant_tags rt ON rt.restaurant_id = d.restaurant_id
LEFT JOIN dish_tags dt ON dt.dish_id = d.id AND dt.tag = rt.tag
WHERE dt.dish_id IS NULL;
