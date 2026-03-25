import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAG_GROUPS } from '../constants/tags';

interface Props {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  tagCounts?: Record<string, number>;
}

export function TagFilter({ selectedTags, onChange, tagCounts }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<'category' | 'quantity'>('category');
  const insets = useSafeAreaInsets();

  function toggleTag(tag: string) {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  }

  const filteredGroups = TAG_GROUPS.map((group) => ({
    ...group,
    tags: group.tags.filter((t) => t.toLowerCase().includes(search.toLowerCase())),
  })).filter((g) => g.tags.length > 0);

  const quantityTags = useMemo(() => {
    if (!tagCounts) return [];
    return Object.entries(tagCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  }, [tagCounts]);

  const filteredQuantityTags = useMemo(() => {
    if (!search.trim()) return quantityTags;
    const q = search.toLowerCase();
    return quantityTags.filter(({ tag }) => tag.toLowerCase().includes(q));
  }, [quantityTags, search]);

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scroll}
      >
        <TouchableOpacity
          style={styles.addChip}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.addChipText}>+ Tags</Text>
        </TouchableOpacity>

        {selectedTags.map((tag) => (
          <TouchableOpacity
            key={tag}
            style={styles.selectedChip}
            onPress={() => toggleTag(tag)}
            activeOpacity={0.7}
          >
            <Text style={styles.selectedChipText}>{tag} ×</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter by Tag</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalDone}>Done</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder="Search tags..."
            value={search}
            onChangeText={setSearch}
          />

          <ScrollView keyboardShouldPersistTaps="handled">
            {sortMode === 'category' ? (
              filteredGroups.map((group) => (
                <View key={group.label}>
                  <Text style={styles.groupLabel}>{group.label}</Text>
                  <View style={styles.tagRow}>
                    {group.tags.map((tag) => {
                      const selected = selectedTags.includes(tag);
                      return (
                        <TouchableOpacity
                          key={tag}
                          style={[styles.tagChip, selected && styles.tagChipSelected]}
                          onPress={() => toggleTag(tag)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.tagChipText, selected && styles.tagChipTextSelected]}>
                            {tag}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))
            ) : (
              <View style={[styles.tagRow, styles.quantityTagRow]}>
                {filteredQuantityTags.map(({ tag, count }) => {
                  const selected = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tagChip, styles.tagChipQuantity, selected && styles.tagChipSelected]}
                      onPress={() => toggleTag(tag)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.tagChipText, selected && styles.tagChipTextSelected]}>
                        {tag}
                      </Text>
                      <View style={[styles.countBadge, selected && styles.countBadgeSelected]}>
                        <Text style={[styles.countBadgeText, selected && styles.countBadgeTextSelected]}>
                          {count}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
                {filteredQuantityTags.length === 0 && (
                  <Text style={styles.emptyText}>No tags found.</Text>
                )}
              </View>
            )}
          </ScrollView>

          <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 12 }]}>
            <TouchableOpacity
              style={styles.sortModeBtn}
              onPress={() => setSortMode((m) => (m === 'category' ? 'quantity' : 'category'))}
              activeOpacity={0.75}
            >
              <Text style={styles.sortModeBtnText}>
                {sortMode === 'category' ? 'Quantity' : 'Category'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexShrink: 0,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  addChip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  addChipText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  selectedChip: {
    backgroundColor: '#FF6B35',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  selectedChipText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalDone: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '600',
  },
  searchInput: {
    margin: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    fontSize: 15,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    textTransform: 'uppercase',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    paddingBottom: 8,
  },
  quantityTagRow: {
    paddingTop: 12,
  },
  tagChip: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tagChipQuantity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagChipSelected: {
    backgroundColor: '#FF6B35',
  },
  tagChipText: {
    fontSize: 14,
    color: '#333',
  },
  tagChipTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  countBadge: {
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  countBadgeSelected: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  countBadgeTextSelected: {
    color: '#fff',
  },
  emptyText: {
    color: '#aaa',
    fontSize: 14,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  // Footer
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
    paddingHorizontal: 12,
    alignItems: 'flex-end',
  },
  sortModeBtn: {
    backgroundColor: '#FF6B35',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sortModeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
