import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  tags: string[];
  onRemove: (tag: string) => void;
}

/** A restaurant's or dish's tags; tap a tag's × to remove it. */
export function TagChips({ tags, onRemove }: Props) {
  return (
    <View style={styles.row}>
      {tags.map((tag) => (
        <View key={tag} style={styles.chip}>
          <Text style={styles.text}>{tag}</Text>
          <TouchableOpacity
            onPress={() => onRemove(tag)}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
            accessibilityLabel={`Remove ${tag}`}
          >
            <Ionicons name="close" size={15} color="#888" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 9,
    paddingVertical: 6,
  },
  text: { fontSize: 13, color: '#333' },
});
