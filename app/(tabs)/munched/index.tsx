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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useMunchedRestaurants } from '../../../hooks/use-restaurants';
import { useLocation } from '../../../hooks/use-location';
import { RestaurantCard } from '../../../components/restaurant-card';
import { SortPicker } from '../../../components/sort-picker';
import { TagFilter } from '../../../components/tag-filter';
import {
  SORT_FIELD_OPTIONS,
  DEFAULT_SORT_DIRECTIONS,
  DEFAULT_MUNCHED_RESTAURANT_SORT,
  MunchedRestaurantSortField,
  SortDirection,
} from '../../../constants/sort-options';
import { MunchedRestaurant } from '../../../types';

export default function MunchedRestaurants() {
  const router = useRouter();

  const [sortField, setSortField] = useState<MunchedRestaurantSortField>(DEFAULT_MUNCHED_RESTAURANT_SORT.field);
  const [sortDirection, setSortDirection] = useState<SortDirection>(DEFAULT_MUNCHED_RESTAURANT_SORT.direction);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const { location } = useLocation();
  const { data, tagCounts, loading, error, refresh } = useMunchedRestaurants(sortField, sortDirection, tagFilter, location);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const filtered = useMemo<MunchedRestaurant[]>(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((r) => r.restaurant.name.toLowerCase().includes(q));
  }, [data, search]);

  function handleSortChange(value: string) {
    setSortField(value as MunchedRestaurantSortField);
    setSortDirection(DEFAULT_SORT_DIRECTIONS[value] ?? 'desc');
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
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/search')}
          activeOpacity={0.85}
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
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
            options={SORT_FIELD_OPTIONS}
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
        </View>
        <TagFilter selectedTags={tagFilter} onChange={setTagFilter} tagCounts={tagCounts} />
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
    marginTop: 40,
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
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabIcon: {
    fontSize: 30,
    color: '#fff',
    lineHeight: 34,
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
