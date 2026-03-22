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
