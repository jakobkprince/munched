# Munched

An iPhone app for logging and rating restaurants and dishes you've eaten (**Munched**) and keeping a to-try list (**Eat-List**), with a **Map** tab. The product spec is in [docs/SPEC.md](docs/SPEC.md).

## Working with the owner

The owner is **non-technical** and delegates every technical decision to Claude.

- Make implementation decisions yourself; don't ask about them. Ask only about **product** behavior (what the app does or looks like) that the spec doesn't cover.
- Work autonomously. Stop only when the owner must physically do something (log in somewhere, install a build on their phone, approve something on Apple's or Expo's site).
- When you do need them, give numbered steps or exact copy-paste commands with no jargon, and say what they'll see when it worked.
- Verify changes yourself in the iOS Simulator before calling them done (see "Testing").

## Stack

- **App:** Expo SDK 58 + React Native + TypeScript (strict), Expo Router (file-based routes in `app/`)
- **Backend:** Supabase (Postgres, Auth, Storage, one Edge Function), project ref `dvguczmgurehwyarhboj`
- **Restaurant search:** Google Places API (New) Text Search, called only from the `places-text-search` Edge Function (the key stays server-side)
- **Releases:** EAS Build (installable builds) + EAS Update (over-the-air updates) on the `preview` channel

## Layout

```
app/                 Screens (Expo Router). (tabs)/ = Eat-List, Map, Munched
components/          Reusable UI (kebab-case files)
hooks/               Data loading + mutations (use-*-actions.ts write, use-restaurants/use-dishes read)
lib/supabase.ts      The one Supabase client + requireUserId()
lib/photos.ts        Photo upload (auto-downscaled), delete, public URL — always use these
lib/format.ts        formatDate() — always use for displaying dates (see Gotchas)
constants/           Tags, sort options
types/index.ts       DB row types + view types
supabase/migrations/ SQL schema history (apply in order; never edit an applied one)
supabase/functions/places-text-search/   Google Places search (signed-in users only)
supabase/seed.sql    Sample data + test login for the LOCAL database only
scripts/start-local.sh  Runs the app against the local database
```

## Commands

| What | Command |
|---|---|
| Type-check | `npm run typecheck` |
| Run app against **local** database (safe for testing) | `npm run start:local` |
| Run app against the **real** database | `npm start` |
| Reset local database to migrations + sample data | `supabase db reset --local` |
| Check the database for security/performance issues | `supabase db advisors --local` (or `--linked`) |
| Read-only query of the real database | `supabase db query --linked "select ..."` |

`.env` (gitignored) holds `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `GOOGLE_PLACES_API_KEY`. See `.env.example`.

## Testing

Test every change end to end in the iOS Simulator against the **local** database, never the owner's real data:

1. Docker must be running. `npm run start:local` (run it in the background) starts the local Supabase stack and Metro on port 8081.
2. The simulator needs **Expo Go for SDK 58**. If it isn't installed, download the `iosClientUrl` for `58.0.0` listed at `https://api.expo.dev/v2/versions/latest`, extract the archive into a folder named `Expo-Go.app`, then run `xcrun simctl install booted <that folder>`.
3. Open the app with `xcrun simctl openurl booted exp://127.0.0.1:8081`.
4. Sign in with the local test login from `supabase/seed.sql`.
5. Expo Go draws a floating gear button at the bottom-left of the screen. It can cover UI, so tap around it.

Database changes: add a new file `supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql`, run `supabase db reset --local`, test, then run `supabase db advisors --local` (it should come back clean).

## Shipping to the owner's phone

The phone runs an internal-distribution ("preview") build. Commit everything before any build or update: uncommitted files change the fingerprint and updates silently stop reaching the phone.

1. **Backend changes go first**, and must stay compatible with the app version already on the phone:
   - Migrations: `supabase db push`
   - Function: `supabase functions deploy places-text-search` (JWT settings come from `supabase/config.toml`)
2. **App changes:**
   - **JavaScript/TypeScript-only change** (the usual case): `eas update --channel preview --environment preview --platform ios --message "<what changed>"`. The phone picks it up the next time the app opens: it checks, downloads and reloads.
   - **Native change** (new native package, `app.config.ts` plugins/permissions/icons, Expo SDK upgrade): the runtime fingerprint changes, so an update won't reach the old build. Run `eas build --profile preview --platform ios --non-interactive --no-wait`, then send the owner the install link from the build page. `eas update` warns when no build matches the current fingerprint; treat that warning as "a new build is needed".
3. Merge to `main` and push.

## Coding conventions

- Functional components + hooks; styles colocated via `StyleSheet.create`; kebab-case file names; PascalCase types.
- Handle every Supabase error explicitly: check `error` and throw or show an `Alert`. Never fail silently.
- External APIs only via Edge Functions. Yelp, Apple Maps and Infatuation links are plain URLs built in the app.
- Restaurants come from Google Places search, or from manual entry (stored with a `manual_…` `google_place_id`).
- Dishes always belong to a restaurant. New dishes inherit the restaurant's tags.
- Match the existing UI style: light mode only, brand orange `#FF6B35`.

## Gotchas

- **Log dates are date-only strings** (`2026-03-05`). `new Date("2026-03-05")` parses as UTC and shows the *previous day* in US time zones, so always format with `lib/format.ts`.
- **Photos:** stored in the public `photos` bucket at `<log_type>/<log_id>/<file>.jpg`. Upload and delete only through `lib/photos.ts`, which downsizes images and removes the files. Deleting a log removes its photo rows (database trigger); the files must be removed by the app first, as `deleteLog`/`deleteAllLogs` already do.
- **Access rules (RLS):** restaurants, dishes and tags are shared reference data. Eat-List entries, logs and photos are per-user. A dish can be deleted only when nobody has it in a list.
- **`useFocusEffect` callbacks must be stable.** Wrap refresh functions in `useCallback`, or the screen refetches in a loop.
- The `restaurants` table has no UPDATE rule: insert first, and on a duplicate-key conflict select the existing row (see `upsertRestaurant`).
