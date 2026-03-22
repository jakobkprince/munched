import { router } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { RestaurantSearch } from '../components/restaurant-search';

export default function SearchScreen() {
  function handleRestaurantSelected(restaurantId: string) {
    router.replace(`/restaurant/${restaurantId}`);
  }

  return (
    <View style={styles.container}>
      <RestaurantSearch onRestaurantSelected={handleRestaurantSelected} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});
