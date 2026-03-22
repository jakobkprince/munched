import { View, Text, StyleSheet } from 'react-native';

export default function EatListDishes() {
  return (
    <View style={styles.container}>
      <Text>Eat-List — Dishes (Phase 12)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
