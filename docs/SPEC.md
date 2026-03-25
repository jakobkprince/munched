# Munch App — Feature Spec

## Overview

App for logging/rating restaurants and specific dishes you've tried (**Munched**), as well as creating restaurant and dish to-do lists (**Eat-List**).

---

## Tech Stack

### Frontend

- **Expo + React Native** with **TypeScript**
- `react-native-maps` for the Map tab
- `expo-image-picker` for dish/restaurant photos

### Backend

- **Supabase** (hosted Postgres + auto-generated REST API + Auth + File Storage)
  - All CRUD operations handled via Supabase client SDK — no custom backend server needed
  - **Supabase Storage** for dish/restaurant photos
  - **Supabase Auth** for user authentication (lightweight; supports future multi-user use)
  - **Supabase Edge Functions** for external API calls (keeps API keys server-side)

### External APIs (called via Supabase Edge Functions)

- **Google Places API (New)**: Text Search for restaurant search and auto-population (no autocomplete — user types a query and taps Search). Edge function deployed with `--no-verify-jwt`.
- **Yelp**: no API — link constructed client-side as a search URL (`https://www.yelp.com/search?find_desc=Restaurant+Name&find_loc=Address`)

### Key Dependencies

- `@supabase/supabase-js` — Supabase client SDK
- `react-native-maps` — map rendering
- `expo-image-picker` — photo capture/selection
- `expo-location` — user location for distance sorting and map centering

---

## Core Concepts

### Restaurants

- Added via **search** (not manual entry) — user types a restaurant name, taps Search, and selects from the results list
- Populated automatically with: name, address, coordinates, website, Yelp link, Apple Maps link
- Can be tagged with one or more cuisine/category tags
- Rated 1–5 stars (overall) + 1–5 stars (vibe)
- Can include notes, pictures, and a log date
- Can be re-logged (re-munched) over time; new log takes precedence but full log history is viewable
- Restaurant pages are always accessible as standalone references (populated from Google Places data) even if removed from a list

### Dishes

- Belong to a restaurant (navigable in both directions — dish → restaurant, restaurant → dish list)
- Can only be added through the restaurant page they belong to
- Can be tagged with one or more cuisine/category tags
- Rated 1–5 stars
- Can include notes, pictures, and a log date
- Can be re-logged (re-munched) over time; new log takes precedence but full log history is viewable

### Restaurant Search & Auto-Population

- **Google Places Text Search (New) API** (`places:searchText`) powers restaurant search
- User types a name and taps **Search** (or presses Return) — no live autocomplete
- If location permission is granted, current location is sent as a `locationBias` to rank nearby restaurants higher
- A single Text Search call returns all needed data: name, address, coordinates, website, and types — no separate Place Details call required
- **Apple Maps link** constructed from coordinates/address (`https://maps.apple.com/?q=...`)
- **Yelp link** constructed client-side as a search URL (`https://www.yelp.com/search?find_desc=Restaurant+Name&find_loc=Address`) — no API required
- Google Places category data used to **auto-suggest relevant tags** on the restaurant

### Tags (Cuisine/Category)

Tags are selected via a searchable dropdown list. Grouped as follows:

- Chinese, Dim Sum, Japanese/Sushi, Ramen, Korean, Thai, Vietnamese, Filipino, Burmese, Indian
- Mexican, Peruvian, Salvadoran, Brazilian
- Italian, Pizza, French, Spanish/Tapas
- Mediterranean
- Middle Eastern, Lebanese, Ethiopian, Moroccan
- American, BBQ, Burgers, Steakhouse
- Southern/Soul Food
- Seafood
- Brunch/Breakfast, Cafe
- Dessert, Ice Cream, Pastry
- Cocktail, Bar

---

## Adding Restaurants & Dishes

### Restaurant Page

- Displays restaurant name, Yelp link (if available), Apple Maps link, and website
- Has an **"Add" button**:
  - If the restaurant is not yet in Eat-List or Munched: two options appear — **"Add to Eat-List"** and **"Add to Munched"**
  - If the restaurant is already in Eat-List: only **"Add to Munched"** appears
- Has an **"Add Dish" button** once the restaurant is in Eat-List or Munched:
  - Two options: **"Add to Eat-List"** or **"Add to Munched"**
  - Dish name is entered manually
- Has an **"Add Tag" button** once the restaurant is in Eat-List or Munched (searchable dropdown)
- **3-dot menu** (top right corner):
  - **Eat-List items**: "Edit" and "Delete"
  - **Munched items**: "Edit", "Delete", and "View Previous Munches"

### Adding to Eat-List

- For restaurants: option to add notes and add dishes (manually by name, with optional notes per dish)
- Dishes added here are automatically added to the Eat-List
- Date added is automatically recorded

### Adding to Munched (Logging)

- For restaurants: add rating (1–5 stars), vibe rating (1–5 stars), notes, and photos
- For dishes: add rating (1–5 stars), notes, and photos
- Log date is automatically recorded

### Re-Munching

- Munched restaurant/dish pages have a **"Re-Munch"** button
- Opens the same logging flow (rating, notes, photos)
- New log becomes the default view; previous log moves into "View Previous Munches" history

---

## Eat-List → Munched Flow

- When you add an Eat-List item to Munched, it is **automatically removed from the Eat-List**
- **Notes and tags carry over** from Eat-List to Munched (pre-populated in the Munched entry)

---

## Editing & Deleting

### Edit (via 3-dot menu)

- **Eat-List items**: change notes, tags, etc.
- **Munched items**: changing a rating completely replaces the current rating (the old rating is not saved). You can add photos and notes — when doing so you must select a log date from previous logs (dropdown sorted by recency).

### Delete (via 3-dot menu)

- Removes the item from the **current list only** (not from both Eat-List and Munched)
- Deleting a restaurant does **not** cascade-delete its dishes

---

## Munched Item Display

- **Default view** shows: most recent rating, most recent log date, ALL photos and notes (aggregated from all logs) with their log dates next to them, sorted by recency
- **"View Previous Munches"** (via 3-dot menu): a compact dropdown list sorted by recency showing just the rating and log date of each previous log. Clicking one opens that individual log's page with only its rating, date, notes, and photos. A back arrow (top left) returns to the dropdown, then back to the normal Munched view.

---

## Tabs

### 1. Munched

Restaurants and dishes you've logged.

- **Toggle** between restaurants view and dishes view
- **Counts**: total number of restaurants logged (restaurant view) or total dishes logged (dish view)
- **Searchable** by name
- **Sortable** by:
  - Recency (both directions)
  - Rating (both directions)
  - Vibe — restaurants only (both directions)
  - Distance (both directions)
  - **Default sort**: rating, highest first
- **Filterable** by tag(s)
- Each entry displays: rating, notes, pictures, date logged
- Clicking a restaurant shows its dishes; clicking a dish shows its restaurant

### 2. Eat-List

Restaurants and dishes you want to try.

- **Toggle** between restaurants view and dishes view
- **Counts**: total number of restaurants (restaurant view) or total dishes (dish view)
- **Searchable** by name
- **Sortable** by:
  - Recency (both directions)
  - Distance (both directions)
  - **Default sort**: recency, most recent first
- **Filterable** by tag(s)
- Can include notes

### 3. Map

- Displays restaurant pins on a map
- **Toggle** between Eat-List restaurants (default) and Munched restaurants
- **Tapping a pin** shows:
  - Eat-List view: restaurant name
  - Munched view: restaurant name and most recent rating
- **Filterable** by:
  - Tag(s)
  - Rating: All, 2+, 3+, 4+, 5
