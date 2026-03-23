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

## Phase 11: Munched Tab Screens — COMPLETE
- Files created: components/restaurant-card.tsx, components/dish-card.tsx, components/sort-picker.tsx, components/tag-filter.tsx
- Files modified: app/(tabs)/munched/index.tsx, app/(tabs)/munched/dishes.tsx
- RestaurantCard: photo thumbnail (Supabase Storage public URL), name, StarRating (read-only), formatted log date, notes preview (80 chars)
- DishCard: dish name, tappable restaurant name link, StarRating (read-only); tapping whole card navigates to /dish/[id]
- SortPicker: ActionSheetIOS on iOS, Alert.alert fallback on Android; shows current selection with ↑/↓ direction indicator
- TagFilter: horizontal chip scroll with "+ Tags" opener; full-screen modal with search + grouped tags; selected tags highlighted #FF6B35 and tappable to deselect
- MunchedRestaurants (index.tsx): header with count badge, toggle row (Restaurants active), search bar, SortPicker + TagFilter, FlatList of RestaurantCards; uses useMunchedRestaurants + useLocation
- MunchedDishes (dishes.tsx): same layout, toggle row (Dishes active), FlatList of DishCards; uses useMunchedDishes + useLocation; no Vibe sort option
- Key decisions:
  - SORT_OPTIONS deduped by field so each field appears once in the picker; both directions selectable per field
  - Dishes toggle uses router.back() to return to restaurants index
  - Client-side name filter applied after hook data using useMemo
  - Count badge reflects hook data length (respects tag filter, not search)
- TypeScript check: pass (0 errors)
- Expo export: pass

## Phase 12: Eat-List Tab Screens — COMPLETE
- Files modified: app/(tabs)/eat-list/index.tsx, app/(tabs)/eat-list/dishes.tsx
- EatListRestaurantCard (inline): restaurant name, date added (right-aligned), notes preview (80 chars) or "No notes" placeholder; tapping navigates to /restaurant/[id]
- EatListDishCard (inline): dish name, date added (right-aligned), tappable restaurant name link (orange, navigates to /restaurant/[restaurantId]), notes preview or "No notes"; tapping card navigates to /dish/[id]
- EatListRestaurants (index.tsx): header "Eat-List" + count badge, toggle row (Restaurants active → Dishes navigates to dishes.tsx), search bar, SortPicker + TagFilter, FlatList, FAB → /search; uses useEatListRestaurants + useLocation
- EatListDishes (dishes.tsx): same layout, toggle row (Dishes active → Restaurants uses router.back()), FlatList of dish cards, FAB → /search; uses useEatListDishes + useLocation
- Sort options: Recency ↑↓, Distance ↑↓ (default: recency desc); no rating/vibe sort per spec
- Key decisions:
  - Card UI built inline in each screen (not shared components) — Eat-List cards differ from Munched cards (no rating, show date added instead)
  - SORT_OPTIONS deduped by field using same pattern as Phase 11
  - Dishes toggle uses router.back() to return to restaurants index
  - Count badge reflects hook data length (respects tag filter, not search)
  - listContent paddingBottom: 100 to ensure last card isn't hidden behind FAB
- TypeScript check: pass (0 errors)
- Expo export: pass

## Phase 13: Map Tab — COMPLETE
- Files modified: app/(tabs)/map.tsx
- MapView from react-native-maps fills the screen; overlay contains toggle + filters
- Map centers on user location (useLocation hook); falls back to San Francisco (37.7749, -122.4194)
- Toggle: Eat-List (default) | Munched; switches data source and marker set
- Eat-List markers: Callout shows restaurant name only
- Munched markers: Callout shows restaurant name + StarRating (read-only, size 14)
- Tapping any callout navigates to /restaurant/[id] via router.push
- TagFilter reused from components/tag-filter.tsx; applies to both views
- Rating filter (Munched only): horizontal chips "All | 2+ | 3+ | 4+ | 5"; filters on latestLog.rating
- Restaurants with null lat or lng are excluded from markers
- useMunchedRestaurants + useEatListRestaurants called with sortField: 'recency', direction: 'desc', userLocation: null
- Key decisions:
  - Controls rendered as position: absolute overlay at top with paddingTop: 60 for safe area clearance
  - Toggle uses background color swap (white/inactive vs #FF6B35/active) within a shared rounded container
  - TagFilter wrapped in a semi-transparent rounded card for legibility over map
  - Rating filter "5" uses exact equality check (=== 5), all other thresholds use >=
- TypeScript check: pass (0 errors)
- Expo export: pass

---

## BUILD COMPLETE

All 13 phases implemented. The Munch app is fully built:
- Phase 1: Scaffolding
- Phase 2: Database Schema
- Phase 3: TypeScript Types & Constants
- Phase 4: Supabase Client & Edge Functions
- Phase 5: Navigation Structure
- Phase 6: Auth
- Phase 7: Data Hooks
- Phase 8: Restaurant Search
- Phase 9: Restaurant Page
- Phase 10: Dish Page
- Phase 11: Munched Tab Screens
- Phase 12: Eat-List Tab Screens
- Phase 13: Map Tab
