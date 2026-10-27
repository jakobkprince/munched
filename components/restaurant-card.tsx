import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { formatDate } from '../lib/format';
import { useRouter } from 'expo-router';
import { MunchedRestaurant } from '../types';
import { StarRating } from './star-rating';
import { photoUrl } from '../lib/photos';

interface Props {
  item: MunchedRestaurant;
}


export function RestaurantCard({ item }: Props) {
  const router = useRouter();
  const { restaurant, latestLog, photos, tags } = item;

  const firstPhoto = photos[0];
  const thumbnailUrl = firstPhoto ? photoUrl(firstPhoto.storage_path) : null;

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
      {thumbnailUrl ? (
        <Image source={{ uri: thumbnailUrl }} style={styles.thumbnail} />
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
        {tags.length > 0 && (
          <Text style={styles.tags} numberOfLines={1}>{tags.join(' · ')}</Text>
        )}
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
  tags: {
    fontSize: 12,
    color: '#999',
  },
});
