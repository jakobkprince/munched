import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { MunchedDish } from '../types';
import { StarRating } from './star-rating';

interface Props {
  item: MunchedDish;
}

export function DishCard({ item }: Props) {
  const router = useRouter();
  const { dish, restaurant, latestLog } = item;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/dish/${dish.id}?from=munched` as const)}
      activeOpacity={0.75}
    >
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{dish.name}</Text>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            router.push(`/restaurant/${restaurant.id}?from=munched` as const);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={styles.restaurantName} numberOfLines={1}>{restaurant.name}</Text>
        </TouchableOpacity>
        <StarRating value={latestLog.rating ?? 0} size={16} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    gap: 4,
  },
  info: {
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  restaurantName: {
    fontSize: 13,
    color: '#FF6B35',
    fontWeight: '500',
  },
});
