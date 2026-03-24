import { useState, useMemo, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMunchedRestaurants } from '../../../hooks/use-restaurants';
import { useLocation } from '../../../hooks/use-location';
import { RestaurantCard } from '../../../components/restaurant-card';
import { SortPicker } from '../../../components/sort-picker';
import { TagFilter } from '../../../components/tag-filter';
import {
  MUNCHED_RESTAURANT_SORT_OPTIONS,
  DEFAULT_MUNCHED_RESTAURANT_SORT,
  MunchedRestaurantSortField,
  SortDirection,
} from '../../../constants/sort-options';
import { MunchedRestaurant } from '../../../types';

const SORT_OPTIONS = MUNCHED_RESTAURANT_SORT_OPTIONS.map((o) => ({
  label: o.label.replace(/ (High to Low|Low to High|Most Recent|Oldest First|Nearest First|Farthest First)$/, ''),
  value: o.field,
})).filter((o, i, arr) => arr.findIndex((x) => x.value === o.value) === i);

export default function MunchedRestaurants() {
  const router = useRouter();

  const [sortField, setSortField] = useState<MunchedRestaurantSortField>(DEFAULT_MUNCHED_RESTAURANT_SORT.field);
  const [sortDirection, setSortDirection] = useState<SortDirection>(DEFAULT_MUNCHED_RESTAURANT_SORT.direction);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const { location } = useLocation();
  const { data, loading, error, refresh } = useMunchedRestaurants(sortField, sortDirection, tagFilter, location);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const filtered = useMemo<MunchedRestaurant[]>(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((r) => r.restaurant.name.toLowerCase().includes(q));
  }, [data, search]);

  function handleSortChange(value: string, direction: 'asc' | 'desc') {
    setSortField(value as MunchedRestaurantSortField);
    setSortDirection(direction);
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Munched</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{data.length}</Text>
        </View>
      </View>

      {/* Toggle */}
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

      {/* Search */}
      <TextInput
        style={styles.searchBar}
        placeholder="Search restaurants…"
        value={search}
        onChangeText={setSearch}
        clearButtonMode="while-editing"
        returnKeyType="search"
      />

      {/* Sort + Tag filters */}
      <View style={styles.filterRow}>
        <SortPicker
          options={SORT_OPTIONS}
          value={sortField}
          direction={sortDirection}
          onChange={handleSortChange}
        />
      </View>
      <TagFilter selectedTags={tagFilter} onChange={setTagFilter} />

      {/* List */}
      {loading ? (
        <ActivityIndicator style={styles.spinner} color="#FF6B35" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.restaurant.id}
          renderItem={({ item }) => <RestaurantCard item={item} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {search.trim() ? 'No restaurants match your search.' : 'No munched restaurants yet.'}
            </Text>
          }
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
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
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 12,
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
    margin: 12,
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
  spinner: {
    marginTop: 60,
  },
  errorText: {
    color: '#c00',
    textAlign: 'center',
    marginTop: 40,
    paddingHorizontal: 24,
    fontSize: 14,
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 32,
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 60,
    fontSize: 15,
  },
});
