import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  error: string | null;
  onRetry: () => void;
}

/** Shown while a restaurant or dish page loads, or when it couldn't load. */
export function PageStatus({ error, onRetry }: Props) {
  return (
    <View style={styles.center}>
      {error ? (
        <>
          <Text style={styles.error}>Couldn’t load this page.</Text>
          <Text style={styles.detail}>{error}</Text>
          <TouchableOpacity style={styles.retry} onPress={onRetry}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </>
      ) : (
        <Text>Loading...</Text>
      )}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
        <Ionicons name="chevron-back" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#fff' },
  error: { fontSize: 17, fontWeight: '600', color: '#111', marginBottom: 6 },
  detail: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 20 },
  retry: { backgroundColor: '#FF6B35', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backBtn: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
