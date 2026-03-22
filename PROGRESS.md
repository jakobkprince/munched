# Munch App — Build Progress

## Phase 1: Scaffolding — COMPLETE
- Files created/modified: package.json, app.config.ts, tsconfig.json, .env.example, .gitignore, PROGRESS.md
- Directories created: lib/, hooks/, types/, constants/, supabase/migrations/, supabase/functions/
- Key decisions:
  - Used `tabs` Expo Router template as base
  - app.config.ts reads SUPABASE_URL, SUPABASE_ANON_KEY, GOOGLE_PLACES_API_KEY, GOOGLE_MAPS_API_KEY from process.env
  - TypeScript strict mode enabled in tsconfig.json
  - Supabase CLI initialized (config.toml created); link to project ref dvguczmgurehwyarhboj requires `npx supabase login` first (non-blocking)
  - app.json replaced with app.config.ts for dynamic env var support
  - Android adaptive icon config uses actual template assets (foreground/background/monochrome PNGs)
- Issues fixed:
  - create-expo-app refused to scaffold into directory with existing files; temporarily moved CLAUDE.md and docs/, scaffolded, then restored
  - Supabase link requires interactive login (access token not available in CI); user must run `npx supabase login` then `npx supabase link --project-ref dvguczmgurehwyarhboj` manually
- TODO for user: Copy .env.example to .env and fill in your actual API keys before starting the app
- TODO for user: Run `npx supabase login` then `npx supabase link --project-ref dvguczmgurehwyarhboj` to link Supabase CLI

## Phase 2: Database Schema — COMPLETE
- Files created: supabase/migrations/20240001000000_initial_schema.sql
- Tables: restaurants, eat_list_restaurants, restaurant_logs, dishes, eat_list_dishes, dish_logs, restaurant_tags, dish_tags, photos (9 tables)
- RLS enabled on all tables
- Storage bucket 'photos' created as public
- Key decisions:
  - restaurants/dishes have no user_id — shared reference data, any authenticated user can read/insert
  - Tags use composite PK (entity_id, tag) — no separate tags lookup table
  - photos uses polymorphic log_type + log_id reference (no FK — flexible)
  - eat_list_restaurants has UNIQUE(restaurant_id, user_id) to prevent duplicates

## Phase 3: TypeScript Types & Constants — COMPLETE
- Files created: types/index.ts, constants/tags.ts, constants/sort-options.ts
- 36 tags across 11 groups in TAG_GROUPS
- PLACES_TYPE_TO_TAG mapping for auto-tag suggestions from Google Places
- Sort options for Munched restaurants, Munched dishes, Eat-List
- TypeScript check: pass (0 errors)

## Phase 4: Supabase Client & Edge Functions — COMPLETE
- Files created: lib/supabase.ts, supabase/functions/places-autocomplete/index.ts, supabase/functions/places-details/index.ts
- Supabase client uses AsyncStorage for session persistence
- places-autocomplete: calls Google Places Autocomplete API, filters to establishments
- places-details: calls Google Places Details API, returns name/address/lat/lng/website/types
- GOOGLE_PLACES_API_KEY set as Supabase secret
- Edge Functions deployed with --no-verify-jwt
- TypeScript check: pass
- Key decisions:
  - Edge Functions use Deno (not Node) — standard for Supabase
  - --no-verify-jwt so the app can call functions with just the anon key
  - CORS headers included for web compatibility
  - supabase/functions excluded from tsconfig.json to avoid Deno/Node type conflicts

## Phase 5: Navigation Structure — COMPLETE
- Files created: all screens listed in build order (stubs)
- Deleted template files: app/(tabs)/index.tsx, app/(tabs)/two.tsx, app/modal.tsx
- Tab bar: Munched / Eat-List / Map with Ionicons
- Stack navigators within each tab (munched/_layout.tsx, eat-list/_layout.tsx)
- auth/sign-in and auth/sign-up stubs ready for Phase 6
- TypeScript check: pass
- Expo export: pass
