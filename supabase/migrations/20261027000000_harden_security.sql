-- Tighten access rules so each user can only touch their own photos,
-- allow deleting dishes nobody uses, and clean up photo rows when a log is deleted.

-- ---------------------------------------------------------------------------
-- photos: only the owner of the log a photo belongs to can see/add/remove it
-- ---------------------------------------------------------------------------

DROP POLICY "Authenticated users can manage photos" ON photos;

CREATE POLICY "Users can manage photos on their own logs"
  ON photos FOR ALL
  USING (
    (log_type = 'restaurant_log' AND EXISTS (
      SELECT 1 FROM restaurant_logs l WHERE l.id = photos.log_id AND l.user_id = (SELECT auth.uid())
    ))
    OR (log_type = 'dish_log' AND EXISTS (
      SELECT 1 FROM dish_logs l WHERE l.id = photos.log_id AND l.user_id = (SELECT auth.uid())
    ))
  )
  WITH CHECK (
    (log_type = 'restaurant_log' AND EXISTS (
      SELECT 1 FROM restaurant_logs l WHERE l.id = photos.log_id AND l.user_id = (SELECT auth.uid())
    ))
    OR (log_type = 'dish_log' AND EXISTS (
      SELECT 1 FROM dish_logs l WHERE l.id = photos.log_id AND l.user_id = (SELECT auth.uid())
    ))
  );

-- Photo rows whose log no longer exists are unreachable; remove them.
DELETE FROM photos p
WHERE NOT EXISTS (SELECT 1 FROM restaurant_logs l WHERE l.id = p.log_id)
  AND NOT EXISTS (SELECT 1 FROM dish_logs l WHERE l.id = p.log_id);

-- When a log is deleted (directly or via cascade), delete its photo rows too.
CREATE FUNCTION public.delete_log_photos() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  DELETE FROM public.photos WHERE log_type = TG_ARGV[0] AND log_id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER restaurant_logs_delete_photos
  AFTER DELETE ON restaurant_logs
  FOR EACH ROW EXECUTE FUNCTION public.delete_log_photos('restaurant_log');

CREATE TRIGGER dish_logs_delete_photos
  AFTER DELETE ON dish_logs
  FOR EACH ROW EXECUTE FUNCTION public.delete_log_photos('dish_log');

-- ---------------------------------------------------------------------------
-- storage: users can only delete photo files they uploaded
-- ---------------------------------------------------------------------------

DROP POLICY "Users can delete their own photos" ON storage.objects;

CREATE POLICY "Users can delete their own photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'photos' AND owner_id = (SELECT auth.uid())::text);

-- ---------------------------------------------------------------------------
-- dishes: allow deleting a dish only when no user has it in a list
-- ---------------------------------------------------------------------------

CREATE FUNCTION public.dish_is_unused(p_dish_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT NOT EXISTS (SELECT 1 FROM public.dish_logs WHERE dish_id = p_dish_id)
     AND NOT EXISTS (SELECT 1 FROM public.eat_list_dishes WHERE dish_id = p_dish_id);
$$;

REVOKE EXECUTE ON FUNCTION public.dish_is_unused(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dish_is_unused(uuid) TO authenticated;

CREATE POLICY "Authenticated users can delete unused dishes"
  ON dishes FOR DELETE
  USING ((SELECT auth.role()) = 'authenticated' AND public.dish_is_unused(id));

-- ---------------------------------------------------------------------------
-- Performance: evaluate auth.uid()/auth.role() once per query, not per row
-- (Supabase advisor "auth_rls_initplan"). Same rules as before.
-- ---------------------------------------------------------------------------

ALTER POLICY "Authenticated users can read restaurants" ON restaurants
  USING ((SELECT auth.role()) = 'authenticated');
ALTER POLICY "Authenticated users can insert restaurants" ON restaurants
  WITH CHECK ((SELECT auth.role()) = 'authenticated');
ALTER POLICY "Authenticated users can read dishes" ON dishes
  USING ((SELECT auth.role()) = 'authenticated');
ALTER POLICY "Authenticated users can insert dishes" ON dishes
  WITH CHECK ((SELECT auth.role()) = 'authenticated');
ALTER POLICY "Users can manage their own eat list restaurants" ON eat_list_restaurants
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can manage their own restaurant logs" ON restaurant_logs
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can manage their own eat list dishes" ON eat_list_dishes
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can manage their own dish logs" ON dish_logs
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Authenticated users can manage restaurant tags" ON restaurant_tags
  USING ((SELECT auth.role()) = 'authenticated') WITH CHECK ((SELECT auth.role()) = 'authenticated');
ALTER POLICY "Authenticated users can manage dish tags" ON dish_tags
  USING ((SELECT auth.role()) = 'authenticated') WITH CHECK ((SELECT auth.role()) = 'authenticated');
ALTER POLICY "Authenticated users can upload photos" ON storage.objects
  WITH CHECK (bucket_id = 'photos' AND (SELECT auth.role()) = 'authenticated');
