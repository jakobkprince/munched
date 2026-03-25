import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  color?: string;
}

export function StarRating({ value, onChange, size = 24, color = '#FF6B35' }: Props) {
  function handlePress(star: number) {
    if (!onChange) return;
    // Tapping the same whole-number star steps it down to a half star
    onChange(value === star ? star - 0.5 : star);
  }

  function iconName(star: number): 'star' | 'star-half' | 'star-outline' {
    if (value >= star) return 'star';
    if (value >= star - 0.5) return 'star-half';
    return 'star-outline';
  }

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => handlePress(star)}
          disabled={!onChange}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Ionicons
            name={iconName(star)}
            size={size}
            color={value >= star - 0.5 ? color : '#ccc'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
});
