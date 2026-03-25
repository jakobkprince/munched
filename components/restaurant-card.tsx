import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MunchedRestaurant } from '../types';
import { StarRating } from './star-rating';
import { supabase } from '../lib/supabase';

interface Props {
  item: MunchedRestaurant;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function RestaurantCard({ item }: Props) {
  const router = useRouter();
  const { restaurant, latestLog, photos } = item;

  const firstPhoto = photos[0];
  const photoUrl = firstPhoto
    ? supabase.storage.from('photos').getPublicUrl(firstPhoto.storage_path).data.publicUrl
    : null;

  const notesPreview = latestLog.notes
    ? latestLog.notes.length > 80
      ? latestLog.notes.slice(0, 80) + '…'
      : latestLog.notes
    : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/restaurant/${restaurant.id}?from=munched` as const)}
      activeOpacity={0.75}
    >
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.thumbnail} />
      ) : (
        <View style={styles.thumbnailPlaceholder} />
      )}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
        <StarRating value={latestLog.rating ?? 0} size={16} />
        <Text style={styles.date}>{formatDate(latestLog.log_date)}</Text>
        {notesPreview ? (
          <Text style={styles.notes} numberOfLines={2}>{notesPreview}</Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  thumbnail: {
    width: 90,
    height: 90,
  },
  thumbnailPlaceholder: {
    width: 90,
    height: 90,
    backgroundColor: '#f0f0f0',
  },
  info: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  date: {
    fontSize: 12,
    color: '#888',
  },
  notes: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
});
