import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, ScrollView,
  StyleSheet, Modal, Image,
} from 'react-native';
import { RestaurantLog, DishLog, Photo } from '../types';
import { StarRating } from './star-rating';
import { usePhotos } from '../hooks/use-photos';

type Log = RestaurantLog | DishLog;

interface Props {
  visible: boolean;
  logs: Log[];
  photos: Photo[];
  onClose: () => void;
}

export function PreviousMunchesSheet({ visible, logs, photos, onClose }: Props) {
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const { getPublicUrl } = usePhotos();

  // Reset detail view whenever the sheet is closed
  useEffect(() => {
    if (!visible) setSelectedLog(null);
  }, [visible]);

  const sorted = [...logs].sort(
    (a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
  );

  const logPhotos = selectedLog
    ? photos.filter((p) => p.log_id === selectedLog.id)
    : [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={selectedLog ? () => setSelectedLog(null) : onClose}
    >
      <View style={styles.container}>
        {selectedLog ? (
          <>
            {/* Detail header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => setSelectedLog(null)}>
                <Text style={styles.back}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.title}>{formatDate(selectedLog.log_date)}</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.close}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* Detail content */}
            <ScrollView contentContainerStyle={styles.detail}>
              <StarRating value={selectedLog.rating ?? 0} size={28} />

              {'vibe_rating' in selectedLog && selectedLog.vibe_rating != null && (
                <View style={styles.vibeRow}>
                  <Text style={styles.vibeLabel}>Vibe</Text>
                  <StarRating value={selectedLog.vibe_rating} size={20} />
                </View>
              )}

              {selectedLog.notes ? (
                <Text style={styles.notesDetail}>{selectedLog.notes}</Text>
              ) : (
                <Text style={styles.empty}>No notes for this visit.</Text>
              )}

              {logPhotos.length > 0 && (
                <View style={styles.photoGrid}>
                  {logPhotos.map((photo) => (
                    <Image
                      key={photo.id}
                      source={{ uri: getPublicUrl(photo.storage_path) }}
                      style={styles.photo}
                    />
                  ))}
                </View>
              )}
            </ScrollView>
          </>
        ) : (
          <>
            {/* List header */}
            <View style={styles.header}>
              <Text style={styles.title}>Previous Munches</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={styles.close}>Done</Text>
              </TouchableOpacity>
            </View>

            {/* Log list */}
            <FlatList
              data={sorted}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => setSelectedLog(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowLeft}>
                    <StarRating value={item.rating ?? 0} size={18} />
                    {item.notes ? (
                      <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text>
                    ) : null}
                  </View>
                  <View style={styles.rowRight}>
                    <Text style={styles.date}>{formatDate(item.log_date)}</Text>
                    <Text style={styles.chevron}>›</Text>
                  </View>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.sep} />}
              contentContainerStyle={styles.list}
            />
          </>
        )}
      </View>
    </Modal>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  title: { fontSize: 18, fontWeight: '600', flex: 1, textAlign: 'center' },
  close: { fontSize: 16, color: '#FF6B35', fontWeight: '600' },
  back: { fontSize: 16, color: '#FF6B35', fontWeight: '500' },
  list: { padding: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowLeft: { flex: 1, gap: 4 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 12 },
  notes: { fontSize: 13, color: '#666', maxWidth: '90%' },
  date: { fontSize: 14, color: '#888' },
  chevron: { fontSize: 20, color: '#ccc', lineHeight: 22 },
  sep: { height: 1, backgroundColor: '#f0f0f0' },
  // Detail view
  detail: { padding: 20, gap: 16 },
  vibeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vibeLabel: { fontSize: 14, color: '#666', fontWeight: '500' },
  notesDetail: { fontSize: 15, color: '#333', lineHeight: 22 },
  empty: { fontSize: 14, color: '#aaa', fontStyle: 'italic' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { width: 120, height: 120, borderRadius: 8 },
});
