import { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, ScrollView, StyleSheet, Modal, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { formatDate } from '../lib/format';
import { RestaurantLog, DishLog, Photo } from '../types';
import { StarRating } from './star-rating';
import { NoteText } from './note-text';
import { photoUrl } from '../lib/photos';

type Log = RestaurantLog | DishLog;

interface Props {
  visible: boolean;
  logs: Log[];
  photos: Photo[];
  onClose: () => void;
  onDeleteLog?: (logId: string) => Promise<void>;
}

export function PreviousMunchesSheet({ visible, logs, photos, onClose, onDeleteLog }: Props) {
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);

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
            {/* Detail header — title only */}
            <View style={styles.header}>
              <Text style={styles.title}>{formatDate(selectedLog.log_date)}</Text>
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
                <NoteText notes={selectedLog.notes} />
              ) : (
                <Text style={styles.empty}>No notes for this visit.</Text>
              )}

              {logPhotos.length > 0 && (
                <View style={styles.photoGrid}>
                  {logPhotos.map((photo) => (
                    <Image
                      key={photo.id}
                      source={{ uri: photoUrl(photo.storage_path) }}
                      style={styles.photo}
                    />
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Bottom buttons */}
            <View style={styles.bottomBar}>
              <TouchableOpacity style={styles.bottomBtn} onPress={() => setSelectedLog(null)}>
                <Text style={styles.back}>← Back</Text>
              </TouchableOpacity>
              {onDeleteLog && (
                <TouchableOpacity
                  style={styles.bottomBtn}
                  onPress={() => {
                    Alert.alert('Delete Munch', 'Delete this munch log?', [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete', style: 'destructive', onPress: async () => {
                          await onDeleteLog(selectedLog!.id);
                          setSelectedLog(null);
                        },
                      },
                    ]);
                  }}
                >
                  <Text style={styles.deleteBtn}>Delete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.bottomBtn} onPress={onClose}>
                <Text style={styles.close}>Done</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {/* List header */}
            <View style={styles.header}>
              <Text style={styles.title}>Previous Munches</Text>
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

            {/* Bottom Done button */}
            <View style={styles.bottomBar}>
              <TouchableOpacity style={[styles.bottomBtn, { marginLeft: 'auto' }]} onPress={onClose}>
                <Text style={styles.close}>Done</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
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
  empty: { fontSize: 14, color: '#aaa', fontStyle: 'italic' },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { width: 120, height: 120, borderRadius: 8 },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  bottomBtn: { padding: 4 },
  deleteBtn: { fontSize: 16, color: '#c00', fontWeight: '600' },
});
