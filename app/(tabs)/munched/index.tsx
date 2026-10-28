import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMunchedRestaurants } from '../../../hooks/use-restaurants';
import { useLocation } from '../../../hooks/use-location';
import { RestaurantCard } from '../../../components/restaurant-card';
import { SortPicker } from '../../../components/sort-picker';
import { TagFilter, ClearTagsButton } from '../../../components/tag-filter';
import { useSharedTagFilter } from '../../../hooks/use-shared-tag-filter';
import {
  MUNCHED_RESTAURANT_SORT_FIELDS,
  DEFAULT_SORT_DIRECTIONS,
  SortField,
  SortDirection,
} from '../../../constants/sort-options';
import { MunchedRestaurant } from '../../../types';

export default function MunchedRestaurants() {
  const router = useRouter();

  const [sortField, setSortField] = useState<SortField>('rating');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [tagFilter, setTagFilter] = useSharedTagFilter();
  const [search, setSearch] = useState('');

  const { location } = useLocation();
  const { data, tagCounts, loading, error } = useMunchedRestaurants(sortField, sortDirection, tagFilter, location);

  const filtered = useMemo<MunchedRestaurant[]>(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((r) => r.restaurant.name.toLowerCase().includes(q));
  }, [data, search]);

  function handleSortChange(value: string) {
    setSortField(value as SortField);
    setSortDirection(DEFAULT_SORT_DIRECTIONS[value as SortField]);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Munched</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{data.length}</Text>
        </View>
      </View>

      {/* List + FAB */}
      <View style={styles.listWrapper}>
        {loading ? (
          <ActivityIndicator style={styles.spinner} color="#FF6B35" />
        ) : (
          <FlatList
            // A failed refresh keeps showing the last loaded list, with the error above it
            ListHeaderComponent={error ? <Text style={styles.errorText}>{error}</Text> : undefined}
            data={filtered}
            keyExtractor={(item) => item.restaurant.id}
            renderItem={({ item }) => <RestaurantCard item={item} />}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={error ? undefined : (
              <Text style={styles.emptyText}>
                {search.trim() ? 'No restaurants match your search.' : 'No munched restaurants yet.'}
              </Text>
            )}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>

      {/* Bottom controls */}
      <View style={styles.bottomBar}>
        <View style={styles.toggle}>
          <View style={[styles.toggleBtn, styles.toggleBtnActive]}>
            <Text style={[styles.toggleText, styles.toggleTextActive]}>Restaurants</Text>
          </View>
          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => router.push('/(tabs)/munched/dishes')}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleText}>Dishes</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.searchBar}
          placeholder="Search restaurants…"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />

        <View style={styles.filterRow}>
          <SortPicker
            options={MUNCHED_RESTAURANT_SORT_FIELDS}
            value={sortField}
            onChange={handleSortChange}
          />
          <TouchableOpacity
            style={styles.dirButton}
            onPress={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
            activeOpacity={0.7}
          >
            <Ionicons
              name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'}
              size={16}
              color="#FF6B35"
            />
          </TouchableOpacity>
          <ClearTagsButton selectedTags={tagFilter} onChange={setTagFilter} />
        </View>
        <View style={styles.tagFilterRow}>
          <TagFilter selectedTags={tagFilter} onChange={setTagFilter} tagCounts={tagCounts} />
          <TouchableOpacity style={styles.fab} onPress={() => router.push('/search')} activeOpacity={0.85}>
            <Text style={styles.fabIcon}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 8,
    gap: 10,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
  },
  badge: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  spinner: {
    marginTop: 60,
  },
  errorText: {
    color: '#c00',
    textAlign: 'center',
    marginVertical: 16,
    paddingHorizontal: 24,
    fontSize: 14,
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 80,
  },
  tagFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  fabIcon: {
    fontSize: 28,
    color: '#fff',
    lineHeight: 32,
    fontWeight: '300',
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 60,
    fontSize: 15,
  },
  bottomBar: {
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#d0d0d0',
    paddingTop: 10,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  toggle: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  toggleBtnActive: {
    backgroundColor: '#FF6B35',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  toggleTextActive: {
    color: '#fff',
  },
  searchBar: {
    marginHorizontal: 12,
    marginBottom: 4,
    padding: 11,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 15,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
    alignItems: 'center',
  },
  dirButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#fff3ee',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
});
