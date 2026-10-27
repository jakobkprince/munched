import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAG_GROUPS } from '../constants/tags';

interface Props {
  visible: boolean;
  selectedTags: string[];
  onAdd?: (tag: string) => void;
  onClose: () => void;
  // Pre-select initialTags in multi-select mode; Done calls onDone with final selection
  initialTags?: string[];
  onDone?: (tags: string[]) => void;
}

export function TagPickerSheet({ visible, selectedTags, onAdd, onClose, initialTags, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [pending, setPending] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      setPending(new Set(initialTags?.filter((t) => !selectedTags.includes(t)) ?? []));
    }
    if (!visible) setSearch('');
  }, [visible]);

  const filtered = TAG_GROUPS.map((group) => ({
    ...group,
    tags: group.tags.filter(
      (t) => t.toLowerCase().includes(search.toLowerCase()) && !selectedTags.includes(t)
    ),
  })).filter((g) => g.tags.length > 0);

  function toggleTag(tag: string) {
    setPending((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function handleDone() {
    if (onDone) {
      onDone(Array.from(pending));
    } else {
      pending.forEach((tag) => onAdd?.(tag));
      onClose();
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Add Tags</Text>
        </View>
        <TextInput
          style={styles.search}
          placeholder="Search tags..."
          value={search}
          onChangeText={setSearch}
        />
        <ScrollView keyboardShouldPersistTaps="handled">
          {filtered.map((group) => (
            <View key={group.label}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              <View style={styles.tagRow}>
                {group.tags.map((tag) => {
                  const isSelected = pending.has(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tag, isSelected && styles.tagSelected]}
                      onPress={() => toggleTag(tag)}
                    >
                      <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>{tag}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '600' },
  search: { margin: 16, padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, fontSize: 15 },
  groupLabel: { fontSize: 13, fontWeight: '600', color: '#888', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, textTransform: 'uppercase' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, paddingBottom: 8 },
  tag: { backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  tagSelected: { backgroundColor: '#FF6B35' },
  tagText: { fontSize: 14, color: '#333' },
  tagTextSelected: { color: '#fff', fontWeight: '600' },
  footer: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 12, paddingHorizontal: 16 },
  doneBtn: { backgroundColor: '#FF6B35', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
