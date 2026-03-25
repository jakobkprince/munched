import { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useRestaurantActions } from '../hooks/use-restaurant-actions';
import { useLocation } from '../hooks/use-location';

interface PlaceResult {
  id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  website: string | null;
  types: string[];
}

interface Props {
  onRestaurantSelected: (restaurantId: string) => void;
  placeholder?: string;
}

export function RestaurantSearch({ onRestaurantSelected, placeholder = 'Search for a restaurant...' }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { upsertRestaurant, autoSuggestTags } = useRestaurantActions();
  const { location } = useLocation();

  const runSearch = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (trimmed.length < 2) return;

    setLoading(true);
    setResults([]);
    try {
      const body: Record<string, unknown> = { textQuery: trimmed };
      if (location) {
        body.latitude = location.latitude;
        body.longitude = location.longitude;
      }
      const { data, error } = await supabase.functions.invoke('places-text-search', { body });
      if (error) throw error;
      setResults(data.places ?? []);
    } catch (e: unknown) {
      let msg = 'Unknown error';
      if (e && typeof e === 'object' && 'context' in e) {
        try { msg = await (e as { context: Response }).context.text(); } catch { msg = String(e); }
      } else if (e instanceof Error) {
        msg = e.message;
      }
      Alert.alert('Search Error', msg);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [location]);

  async function selectPlace(place: PlaceResult) {
    setLoading(true);
    setResults([]);
    setQuery('');

    try {
      const appleMapsUrl = place.lat && place.lng
        ? `https://maps.apple.com/?q=${encodeURIComponent(place.name)}&ll=${place.lat},${place.lng}`
        : `https://maps.apple.com/?q=${encodeURIComponent(place.name)}`;

      const yelpUrl = `https://www.yelp.com/search?find_desc=${encodeURIComponent(place.name)}&find_loc=${encodeURIComponent(place.address ?? '')}`;

      const restaurantId = await upsertRestaurant({
        google_place_id: place.id,
        name: place.name,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        website: place.website,
        apple_maps_url: appleMapsUrl,
        yelp_url: yelpUrl,
      });

      if (place.types.length > 0) {
        await autoSuggestTags(restaurantId, place.types);
      }

      onRestaurantSelected(restaurantId);
    } catch (e) {
      console.error('Place select error:', e);
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
          onChangeText={setQuery}
          placeholder={placeholder}
          autoFocus
          clearButtonMode="while-editing"
          returnKeyType="search"
          onSubmitEditing={() => runSearch(query)}
        />
        <TouchableOpacity
          style={[styles.searchBtn, loading && styles.searchBtnDisabled]}
          onPress={() => runSearch(query)}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.searchBtnText}>Search</Text>
          }
        </TouchableOpacity>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.result} onPress={() => selectPlace(item)}>
            <Text style={styles.resultName}>{item.name}</Text>
            {item.address && <Text style={styles.resultAddress}>{item.address}</Text>}
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
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
  searchBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 72,
  },
  searchBtnDisabled: { opacity: 0.6 },
  searchBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  result: { paddingHorizontal: 16, paddingVertical: 12 },
  resultName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  resultAddress: { fontSize: 13, color: '#666', marginTop: 2 },
  separator: { height: 1, backgroundColor: '#eee', marginLeft: 16 },
});
