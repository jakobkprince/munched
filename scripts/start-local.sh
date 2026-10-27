#!/bin/sh
# Runs the app against a LOCAL copy of the backend (Docker), so testing never
# touches real data. Sample data + test login are in supabase/seed.sql.
# Usage: npm run start:local   (add -- --ios to open the iOS Simulator)
set -e
cd "$(dirname "$0")/.."

# Load the Google key from .env so the local search function can use it
set -a; . ./.env; set +a

supabase start >/dev/null
eval "$(supabase status -o env | grep -E '^(API_URL|ANON_KEY)=')"

EXPO_PUBLIC_SUPABASE_URL="$API_URL" EXPO_PUBLIC_SUPABASE_ANON_KEY="$ANON_KEY" exec npx expo start "$@"
