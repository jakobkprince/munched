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

## Phase 6: Auth — COMPLETE
- Files created/modified: hooks/use-auth.ts, app/_layout.tsx, app/auth/sign-in.tsx, app/auth/sign-up.tsx
- useAuth hook: getSession on mount + onAuthStateChange subscription
- AuthGate component in root layout: redirects unauthed → /auth/sign-in, redirects authed away from auth screens
- Sign in: email/password with Alert error handling
- Sign up: email/password/confirm with 6-char minimum, confirmation email alert
- Brand color: #FF6B35
- TypeScript check: pass
- Expo export: pass

## Phase 7: Data Hooks — COMPLETE
- Files created: hooks/use-location.ts, hooks/use-restaurants.ts, hooks/use-dishes.ts, hooks/use-restaurant-actions.ts, hooks/use-dish-actions.ts, hooks/use-tags.ts, hooks/use-photos.ts
- Spec cross-check: addToMunched carries over eat-list notes + deletes eat-list row; deleteFromEatList does not touch dishes; reMunch inserts new log
- TypeScript check: pass

## Phase 8: Restaurant Search — COMPLETE
- Files created: components/restaurant-search.tsx, app/search.tsx
- Autocomplete: debounced 300ms, calls places-autocomplete Edge Function
- Place details: calls places-details Edge Function, constructs Apple Maps + Yelp URLs
- Auto-suggests tags from Google Places types array
- Session token generated per search session, rotated after place selection
- TypeScript check: pass
- Expo export: pass

## Phase 9: Restaurant Page — COMPLETE
- Files created: components/star-rating.tsx, components/tag-picker-sheet.tsx, components/add-to-eat-list-sheet.tsx, components/add-to-munched-sheet.tsx, components/previous-munches-sheet.tsx, app/restaurant/[id].tsx
- Button states: not-in-list (Add to Eat-List + Add to Munched), eat-list-only (Add to Munched), munched (Re-Munch)
- 3-dot menu: Eat-List (Edit/Delete), Munched (Edit/Delete/View Previous Munches)
- Photos and notes aggregated from all logs
- Tag picker with search and grouping
- TypeScript check: pass
- Expo export: pass

## Phase 10: Dish Page — COMPLETE
- Files modified: app/dish/[id].tsx
- Inline data loading (no separate hook needed): fetches dish + joined restaurant, eat_list_dishes, dish_logs, dish_tags, and photos in one async function
- Header: dish name + tappable restaurant name navigating to /restaurant/[restaurantId]
- Tags section with Add Tag button (shown when dish is in any list); long-press to remove tag
- Munched display: most recent StarRating, all photos sorted by recency, all notes with log dates sorted by recency
- Eat-List display: notes from eat_list_dishes entry
- Action buttons: Add to Munched (not-in-list or eat-list-only), Re-Munch (munched state)
- AddToMunchedSheet passed showVibeRating={false} — dishes have no vibe rating
- 3-dot menu: ActionSheetIOS on iOS, Alert.alert fallback on Android; Munched state adds "View Previous Munches" option
- PreviousMunchesSheet and TagPickerSheet reused from Phase 9 components
- Key decision: dish status determined inline (inMunched = dish_logs.length > 0, inEatList = eat_list_dishes row exists)
- TypeScript check: pass
- Expo export: pass
