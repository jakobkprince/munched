# Munch App

## Project Overview

A mobile app for logging/rating restaurants and dishes (Munched) and maintaining a restaurant/dish to-do list (Eat-List). See `docs/SPEC.md` for the full feature specification.

## Tech Stack

- **Frontend**: Expo + React Native with TypeScript
- **Backend**: Supabase (Postgres, Auth, Storage, Edge Functions)
- **External APIs**: Google Places API

## Environment Variables

All API keys and secrets live in `.env` at the project root. Required variables:

- `SUPABASE_URL` — Supabase project URL
- `SUPABASE_ANON_KEY` — Supabase anonymous/public key
- `GOOGLE_PLACES_API_KEY` — Google Places API key

Never hardcode keys in source files. Use `.env` and ensure it is in `.gitignore`.

## Project Structure

```
/
├── CLAUDE.md
├── .env
├── docs/
│   └── SPEC.md            # Full feature spec — read this first
├── app/                    # Expo Router screens and navigation
├── components/             # Reusable React Native components
├── lib/
│   └── supabase.ts         # Supabase client initialization
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript type definitions
├── constants/              # Tags list, enums, config values
├── supabase/
│   ├── migrations/         # SQL migration files for schema
│   └── functions/          # Supabase Edge Functions (Google Places)
└── assets/                 # Static assets (icons, images)
```

## Coding Conventions

- Use TypeScript strict mode
- Use functional components with hooks
- Name files in kebab-case (e.g., `restaurant-card.tsx`)
- Name types/interfaces in PascalCase (e.g., `Restaurant`, `DishLog`)
- Colocate styles with components using StyleSheet.create
- Handle all Supabase errors explicitly — never silently fail
- External API calls (Google Places) must go through Supabase Edge Functions, never called directly from the client
- Yelp links are constructed client-side as search URLs — no API call needed

## Key Patterns

- Supabase client is initialized once in `lib/supabase.ts` and imported everywhere
- Photos are uploaded to Supabase Storage and their public URLs are stored in the database
- Restaurant data is populated from Google Places API — never manually entered
- Dishes are always associated with a restaurant — no orphaned dishes

## When In Doubt

- Refer to `docs/SPEC.md` for feature behavior and UI details
- Ask before making assumptions about user flows not covered in the spec
