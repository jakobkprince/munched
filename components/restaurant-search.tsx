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
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
  const [hasSearched, setHasSearched] = useState(false);
  const [manualVisible, setManualVisible] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualAddress, setManualAddress] = useState('');
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
      setHasSearched(true);
    } catch (e: unknown) {
      let msg = 'Unknown error';
      if (e && typeof e === 'object' && 'context' in e) {
        try { msg = await (e as { context: Response }).context.text(); } catch { msg = String(e); }
      } else if (e instanceof Error) {
        msg = e.message;
      }
      Alert.alert('Search Error', msg);
      setResults([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  }, [location]);

  async function addManually() {
    const name = manualName.trim();
    if (!name) {
      Alert.alert('Name required', 'Please enter a restaurant name.');
      return;
    }
    setLoading(true);
    setManualVisible(false);
    try {
      const placeId = `manual_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const address = manualAddress.trim() || null;
      const appleMapsUrl = address
        ? `https://maps.apple.com/?q=${encodeURIComponent(name)}&address=${encodeURIComponent(address)}`
        : `https://maps.apple.com/?q=${encodeURIComponent(name)}`;
      const yelpUrl = `https://www.yelp.com/search?find_desc=${encodeURIComponent(name)}&find_loc=${encodeURIComponent(address ?? '')}`;

      const restaurantId = await upsertRestaurant({
        google_place_id: placeId,
        name,
        address,
        lat: null,
        lng: null,
        website: null,
        apple_maps_url: appleMapsUrl,
        yelp_url: yelpUrl,
      });

      setManualName('');
      setManualAddress('');
      onRestaurantSelected(restaurantId);
    } catch (e) {
      console.error('Manual add error:', e);
      Alert.alert('Error', 'Could not add restaurant.');
    } finally {
      setLoading(false);
    }
  }

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
        contentContainerStyle={hasSearched ? styles.listContent : undefined}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.result} onPress={() => selectPlace(item)}>
            <Text style={styles.resultName}>{item.name}</Text>
            {item.address && <Text style={styles.resultAddress}>{item.address}</Text>}
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {hasSearched && (
        <TouchableOpacity
          style={styles.manualBtn}
          onPress={() => setManualVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.manualBtnText}>Add Manually</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={manualVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setManualVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setManualVisible(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalWrapper}
          >
            <Pressable style={styles.modalSheet}>
              <Text style={styles.modalTitle}>Add Restaurant Manually</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Restaurant name *"
                value={manualName}
                onChangeText={setManualName}
                autoFocus
                returnKeyType="next"
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Address (optional)"
                value={manualAddress}
                onChangeText={setManualAddress}
                returnKeyType="done"
                onSubmitEditing={addManually}
              />
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={addManually}>
                <Text style={styles.modalSubmitText}>Add Restaurant</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setManualVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
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
  listContent: { paddingBottom: 72 },
  manualBtn: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
    marginBottom: 12,
  },
  manualBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalWrapper: { justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  modalInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    backgroundColor: '#f5f5f5',
  },
  modalSubmitBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  modalSubmitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalCancelBtn: { alignItems: 'center', paddingVertical: 10 },
  modalCancelText: { color: '#888', fontSize: 15 },
});
