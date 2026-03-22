import { View, Text, StyleSheet } from 'react-native';

export default function MunchedRestaurants() {
  return (
    <View style={styles.container}>
      <Text>Munched — Restaurants (Phase 11)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
