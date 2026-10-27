-- Keep helper functions out of the public API (Supabase advisor warnings
-- "*_security_definer_function_executable"). Behavior is unchanged.

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

-- Trigger-only function: nobody needs to call it directly.
ALTER FUNCTION public.delete_log_photos() SET SCHEMA private;
REVOKE EXECUTE ON FUNCTION private.delete_log_photos() FROM PUBLIC, anon, authenticated;

-- Used by the dishes DELETE policy, which runs as the signed-in user.
ALTER FUNCTION public.dish_is_unused(uuid) SET SCHEMA private;
