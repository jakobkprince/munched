import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { textQuery, latitude, longitude } = await req.json();

    if (!textQuery || textQuery.trim().length === 0) {
      return new Response(JSON.stringify({ places: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    return new Response(JSON.stringify({ places }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
