import { View, Text, StyleSheet } from 'react-native';

export default function MunchedDishes() {
  return (
    <View style={styles.container}>
      <Text>Munched — Dishes (Phase 11)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
