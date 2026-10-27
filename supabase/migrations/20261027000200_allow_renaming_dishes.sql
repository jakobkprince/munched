-- Let users rename a dish. Dishes are shared rows, so only allow it when the
-- dish is in the caller's lists and in no other user's, and only the name may change.

CREATE FUNCTION private.dish_used_only_by_me(p_dish_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT (EXISTS (
            SELECT 1 FROM public.dish_logs
            WHERE dish_id = p_dish_id AND user_id = (SELECT auth.uid()))
          OR EXISTS (
            SELECT 1 FROM public.eat_list_dishes
            WHERE dish_id = p_dish_id AND user_id = (SELECT auth.uid())))
     AND NOT EXISTS (
           SELECT 1 FROM public.dish_logs
           WHERE dish_id = p_dish_id AND user_id <> (SELECT auth.uid()))
     AND NOT EXISTS (
           SELECT 1 FROM public.eat_list_dishes
           WHERE dish_id = p_dish_id AND user_id <> (SELECT auth.uid()));
$$;

REVOKE EXECUTE ON FUNCTION private.dish_used_only_by_me(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.dish_used_only_by_me(uuid) TO authenticated;

CREATE POLICY "Users can rename dishes only they use"
  ON dishes FOR UPDATE
  USING ((SELECT auth.role()) = 'authenticated' AND private.dish_used_only_by_me(id))
  WITH CHECK ((SELECT auth.role()) = 'authenticated' AND private.dish_used_only_by_me(id));

-- Only the name column is editable.
REVOKE UPDATE ON dishes FROM anon, authenticated;
GRANT UPDATE (name) ON dishes TO authenticated;

ALTER TABLE dishes ADD CONSTRAINT dishes_name_length CHECK (length(trim(name)) BETWEEN 1 AND 200);
