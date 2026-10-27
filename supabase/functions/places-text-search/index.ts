// Restaurant search via Google Places Text Search (New).
// Keeps the Google API key on the server. Only signed-in app users may call it.
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlaceResult {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  website: string | null;
  types: string[];
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
);

async function isSignedIn(req: Request): Promise<boolean> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token) return false;
  const { data, error } = await supabase.auth.getUser(token);
  return !error && !!data.user;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!(await isSignedIn(req))) {
      return json({ error: 'Please sign in to search.' }, 401);
    }

    const { textQuery, latitude, longitude } = await req.json();

    if (!textQuery || textQuery.trim().length === 0) {
      return json({ places: [] });
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      throw new Error('GOOGLE_PLACES_API_KEY not configured');
    }

    const body: Record<string, unknown> = {
      textQuery: textQuery.trim(),
      maxResultCount: 10,
    };

    if (typeof latitude === 'number' && typeof longitude === 'number') {
      body.locationBias = {
        circle: {
          center: { latitude, longitude },
          radius: 10000.0,
        },
      };
    }

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.websiteUri,places.types',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Google Places API error: ${response.status} ${errText}`);
    }

    const data = await response.json();

    const places: PlaceResult[] = (data.places ?? []).map((p: {
      id: string;
      displayName?: { text: string };
      formattedAddress?: string;
      location?: { latitude: number; longitude: number };
      websiteUri?: string;
      types?: string[];
    }) => ({
      id: p.id,
      name: p.displayName?.text ?? '',
      address: p.formattedAddress ?? null,
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      website: p.websiteUri ?? null,
      types: p.types ?? [],
    }));

    return json({ places });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
