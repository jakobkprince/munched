import { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { useLocation } from '@/hooks/use-location';
import { useMunchedRestaurants } from '@/hooks/use-restaurants';
import { useEatListRestaurants } from '@/hooks/use-restaurants';
import { TagFilter } from '@/components/tag-filter';
import { StarRating } from '@/components/star-rating';

const DEFAULT_LOCATION = { latitude: 37.7749, longitude: -122.4194 };
const BRAND_COLOR = '#FF6B35';

type ViewMode = 'eat-list' | 'munched';
type RatingFilter = 'all' | '2+' | '3+' | '4+' | '5';

const RATING_OPTIONS: RatingFilter[] = ['all', '2+', '3+', '4+', '5'];

function ratingThreshold(filter: RatingFilter): number {
  switch (filter) {
    case '2+': return 2;
    case '3+': return 3;
    case '4+': return 4;
    case '5': return 5;
    default: return 0;
  }
}

export default function MapScreen() {
  const router = useRouter();
  const { location } = useLocation();
  const [viewMode, setViewMode] = useState<ViewMode>('eat-list');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all');

  const { data: munchedData } = useMunchedRestaurants(
    'recency',
    'desc',
    tagFilter,
    null
  );

  const { data: eatListData } = useEatListRestaurants(
    'recency',
    'desc',
    tagFilter,
    null
  );

  const mapRegion = useMemo(() => {
    const center = location ?? DEFAULT_LOCATION;
    return {
      latitude: center.latitude,
      longitude: center.longitude,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  }, [location]);

  const eatListMarkers = useMemo(() => {
    return eatListData.filter(
      (item) => item.restaurant.lat != null && item.restaurant.lng != null
    );
  }, [eatListData]);

  const munchedMarkers = useMemo(() => {
    const threshold = ratingThreshold(ratingFilter);
    return munchedData.filter((item) => {
      if (item.restaurant.lat == null || item.restaurant.lng == null) return false;
      if (threshold > 0) {
        const rating = item.latestLog.rating ?? 0;
        if (ratingFilter === '5') return rating === 5;
        return rating >= threshold;
      }
      return true;
    });
  }, [munchedData, ratingFilter]);

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={mapRegion}>
        {viewMode === 'eat-list' &&
          eatListMarkers.map((item) => (
            <Marker
              key={item.entry.id}
              coordinate={{
                latitude: item.restaurant.lat!,
                longitude: item.restaurant.lng!,
              }}
              pinColor={BRAND_COLOR}
            >
              <Callout onPress={() => router.push(`/restaurant/${item.restaurant.id}`)}>
                <View style={styles.callout}>
                  <Text style={styles.calloutName}>{item.restaurant.name}</Text>
                  <Text style={styles.calloutTap}>Tap to view</Text>
                </View>
              </Callout>
            </Marker>
          ))}

        {viewMode === 'munched' &&
          munchedMarkers.map((item) => (
            <Marker
              key={item.restaurant.id}
              coordinate={{
                latitude: item.restaurant.lat!,
                longitude: item.restaurant.lng!,
              }}
              pinColor={BRAND_COLOR}
            >
              <Callout onPress={() => router.push(`/restaurant/${item.restaurant.id}`)}>
                <View style={styles.callout}>
                  <Text style={styles.calloutName}>{item.restaurant.name}</Text>
                  {item.latestLog.rating != null && (
                    <StarRating value={item.latestLog.rating} size={14} />
                  )}
                  <Text style={styles.calloutTap}>Tap to view</Text>
                </View>
              </Callout>
            </Marker>
          ))}
      </MapView>

      {/* Controls overlay */}
      <View style={styles.overlay}>
        {/* Toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'eat-list' && styles.toggleBtnActive]}
            onPress={() => setViewMode('eat-list')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, viewMode === 'eat-list' && styles.toggleTextActive]}>
              Eat-List
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'munched' && styles.toggleBtnActive]}
            onPress={() => setViewMode('munched')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleText, viewMode === 'munched' && styles.toggleTextActive]}>
              Munched
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tag filter */}
        <View style={styles.filterRow}>
          <TagFilter selectedTags={tagFilter} onChange={setTagFilter} />
        </View>

        {/* Rating filter — Munched only */}
        {viewMode === 'munched' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.ratingFilterContent}
            style={styles.ratingFilterScroll}
          >
            {RATING_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.ratingChip,
                  ratingFilter === option && styles.ratingChipActive,
                ]}
                onPress={() => setRatingFilter(option)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.ratingChipText,
                    ratingFilter === option && styles.ratingChipTextActive,
                  ]}
                >
                  {option === 'all' ? 'All' : option}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  toggleBtnActive: {
    backgroundColor: BRAND_COLOR,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
  },
  toggleTextActive: {
    color: '#fff',
  },
  filterRow: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
  },
  ratingFilterScroll: {
    flexShrink: 0,
    marginHorizontal: 16,
  },
  ratingFilterContent: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 6,
    alignItems: 'center',
  },
  ratingChip: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ratingChipActive: {
    backgroundColor: BRAND_COLOR,
    borderColor: BRAND_COLOR,
  },
  ratingChipText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  ratingChipTextActive: {
    color: '#fff',
  },
  callout: {
    minWidth: 140,
    maxWidth: 220,
    padding: 8,
    alignItems: 'flex-start',
  },
  calloutName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  calloutTap: {
    fontSize: 11,
    color: BRAND_COLOR,
    marginTop: 4,
  },
});
