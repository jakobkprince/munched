-- The photos bucket is public, so photo URLs load without any read rule. The
-- old read rule also let anyone (even signed out) list every file in the
-- bucket. Only the person who uploaded a file can now see it in a listing,
-- which deleting a file also requires.

DROP POLICY "Photos are publicly readable" ON storage.objects;

CREATE POLICY "Users can see their own photo files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'photos' AND owner_id = (SELECT auth.uid())::text);
