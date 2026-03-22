import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
} from 'react-native';
import { TAG_GROUPS } from '../constants/tags';

interface Props {
  visible: boolean;
  selectedTags: string[];
  onAdd: (tag: string) => void;
  onClose: () => void;
}

export function TagPickerSheet({ visible, selectedTags, onAdd, onClose }: Props) {
  const [search, setSearch] = useState('');

  const filtered = TAG_GROUPS.map((group) => ({
    ...group,
    tags: group.tags.filter(
      (t) =>
        t.toLowerCase().includes(search.toLowerCase()) &&
        !selectedTags.includes(t)
    ),
  })).filter((g) => g.tags.length > 0);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Tag</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>Done</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.search}
          placeholder="Search tags..."
          value={search}
          onChangeText={setSearch}
          autoFocus
        />
        <ScrollView keyboardShouldPersistTaps="handled">
          {filtered.map((group) => (
            <View key={group.label}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              <View style={styles.tagRow}>
                {group.tags.map((tag) => (
                  <TouchableOpacity
                    key={tag}
                    style={styles.tag}
                    onPress={() => { onAdd(tag); onClose(); }}
                  >
                    <Text style={styles.tagText}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontSize: 18, fontWeight: '600' },
  close: { fontSize: 16, color: '#FF6B35', fontWeight: '600' },
  search: { margin: 16, padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, fontSize: 15 },
  groupLabel: { fontSize: 13, fontWeight: '600', color: '#888', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, textTransform: 'uppercase' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, paddingBottom: 8 },
  tag: { backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  tagText: { fontSize: 14, color: '#333' },
});
