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
import { useEatListRestaurants } from '../../../hooks/use-restaurants';
import { useLocation } from '../../../hooks/use-location';
import { SortPicker } from '../../../components/sort-picker';
import { TagFilter } from '../../../components/tag-filter';
import {
  EAT_LIST_SORT_OPTIONS,
  DEFAULT_EAT_LIST_SORT,
  EatListSortField,
  SortDirection,
} from '../../../constants/sort-options';
import { EatListRestaurantView } from '../../../types';

const SORT_OPTIONS = EAT_LIST_SORT_OPTIONS.map((o) => ({
  label: o.label.replace(/ (Most Recent|Oldest First|Nearest First|Farthest First)$/, ''),
  value: o.field,
})).filter((o, i, arr) => arr.findIndex((x) => x.value === o.value) === i);

function EatListRestaurantCard({ item }: { item: EatListRestaurantView }) {
  const router = useRouter();
  const notesPreview = item.entry.notes ? item.entry.notes.slice(0, 80) + (item.entry.notes.length > 80 ? '…' : '') : null;
  const dateAdded = new Date(item.entry.date_added).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <TouchableOpacity
      style={cardStyles.card}
      onPress={() => router.push(`/restaurant/${item.restaurant.id}`)}
      activeOpacity={0.75}
    >
      <View style={cardStyles.row}>
        <Text style={cardStyles.name} numberOfLines={1}>{item.restaurant.name}</Text>
        <Text style={cardStyles.date}>{dateAdded}</Text>
      </View>
      {notesPreview ? (
        <Text style={cardStyles.notes} numberOfLines={2}>{notesPreview}</Text>
      ) : (
        <Text style={cardStyles.noNotes}>No notes</Text>
      )}
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 5,
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    flex: 1,
  },
  date: {
    fontSize: 12,
    color: '#888',
    flexShrink: 0,
  },
  notes: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  noNotes: {
    fontSize: 13,
    color: '#bbb',
    fontStyle: 'italic',
  },
});

export default function EatListRestaurants() {
  const router = useRouter();

  const [sortField, setSortField] = useState<EatListSortField>(DEFAULT_EAT_LIST_SORT.field);
  const [sortDirection, setSortDirection] = useState<SortDirection>(DEFAULT_EAT_LIST_SORT.direction);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [search, setSearch] = useState('');

  const { location } = useLocation();
  const { data, loading, error, refresh } = useEatListRestaurants(sortField, sortDirection, tagFilter, location);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const filtered = useMemo<EatListRestaurantView[]>(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((r) => r.restaurant.name.toLowerCase().includes(q));
  }, [data, search]);

  function handleSortChange(value: string, direction: 'asc' | 'desc') {
    setSortField(value as EatListSortField);
    setSortDirection(direction);
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Eat-List</Text>
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
          onPress={() => router.push('/(tabs)/eat-list/dishes')}
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
          keyExtractor={(item) => item.entry.id}
          renderItem={({ item }) => <EatListRestaurantCard item={item} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {search.trim() ? 'No restaurants match your search.' : 'No restaurants on your Eat-List yet.'}
            </Text>
          }
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/search')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
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
    paddingBottom: 100,
  },
  emptyText: {
    textAlign: 'center',
    color: '#888',
    marginTop: 60,
    fontSize: 15,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
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
});
