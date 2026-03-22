import { useState, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { PLACES_TYPE_TO_TAG } from '../constants/tags';
import { useRestaurantActions } from '../hooks/use-restaurant-actions';

interface Prediction {
  place_id: string;
  description: string;
}

interface Props {
  onRestaurantSelected: (restaurantId: string) => void;
  placeholder?: string;
}

export function RestaurantSearch({ onRestaurantSelected, placeholder = 'Search for a restaurant...' }: Props) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionToken = useRef(generateSessionToken());
  const { upsertRestaurant, autoSuggestTags } = useRestaurantActions();

  const search = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.trim().length < 2) {
      setPredictions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('places-autocomplete', {
          body: { query: text, sessiontoken: sessionToken.current },
        });
        if (error) throw error;
        setPredictions(data.predictions ?? []);
      } catch (e) {
        console.error('Autocomplete error:', e);
        setPredictions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  async function selectPlace(prediction: Prediction) {
    setLoading(true);
    setPredictions([]);
    setQuery('');

    try {
      const { data, error } = await supabase.functions.invoke('places-details', {
        body: { place_id: prediction.place_id, sessiontoken: sessionToken.current },
      });
      if (error) throw error;

      // Rotate session token after use
      sessionToken.current = generateSessionToken();

      const appleMapsUrl = data.lat && data.lng
        ? `https://maps.apple.com/?q=${encodeURIComponent(data.name)}&ll=${data.lat},${data.lng}`
        : `https://maps.apple.com/?q=${encodeURIComponent(data.name)}`;

      const yelpUrl = `https://www.yelp.com/search?find_desc=${encodeURIComponent(data.name)}&find_loc=${encodeURIComponent(data.address ?? '')}`;

      const restaurantId = await upsertRestaurant({
        google_place_id: prediction.place_id,
        name: data.name,
        address: data.address ?? null,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        website: data.website ?? null,
        apple_maps_url: appleMapsUrl,
        yelp_url: yelpUrl,
      });

      // Auto-suggest tags from Google Places types
      if (data.types && data.types.length > 0) {
        await autoSuggestTags(restaurantId, data.types);
      }

      onRestaurantSelected(restaurantId);
    } catch (e) {
      console.error('Place details error:', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={search}
          placeholder={placeholder}
          autoFocus
          clearButtonMode="while-editing"
        />
        {loading && <ActivityIndicator style={styles.spinner} color="#FF6B35" />}
      </View>

      <FlatList
        data={predictions}
        keyExtractor={(item) => item.place_id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.result} onPress={() => selectPlace(item)}>
            <Text style={styles.resultText}>{item.description}</Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

function generateSessionToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#f5f5f5',
  },
  spinner: { marginLeft: 8 },
  result: { paddingHorizontal: 16, paddingVertical: 14 },
  resultText: { fontSize: 15, color: '#1a1a1a' },
  separator: { height: 1, backgroundColor: '#eee', marginLeft: 16 },
});
