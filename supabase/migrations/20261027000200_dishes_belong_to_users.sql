-- Dishes are entered by hand and belong to the person who created them
-- (restaurants stay shared). Each user sees and manages only their own
-- dishes and dish tags.

ALTER TABLE dishes ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid();

UPDATE dishes d SET user_id = coalesce(
  (SELECT user_id FROM dish_logs WHERE dish_id = d.id LIMIT 1),
  (SELECT user_id FROM eat_list_dishes WHERE dish_id = d.id LIMIT 1),
  (SELECT id FROM auth.users ORDER BY created_at LIMIT 1)
);

ALTER TABLE dishes ALTER COLUMN user_id SET NOT NULL;
CREATE INDEX idx_dishes_user ON dishes(user_id);

DROP POLICY "Authenticated users can read dishes" ON dishes;
DROP POLICY "Authenticated users can insert dishes" ON dishes;
DROP POLICY "Authenticated users can delete unused dishes" ON dishes;
DROP FUNCTION private.dish_is_unused(uuid);

CREATE POLICY "Users can manage their own dishes"
  ON dishes FOR ALL
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Authenticated users can manage dish tags" ON dish_tags
  USING (EXISTS (SELECT 1 FROM dishes d WHERE d.id = dish_id AND d.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM dishes d WHERE d.id = dish_id AND d.user_id = (SELECT auth.uid())));
ALTER POLICY "Authenticated users can manage dish tags" ON dish_tags
  RENAME TO "Users can manage tags on their own dishes";
