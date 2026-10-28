import { useEffect, useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, FlatList, ScrollView, StyleSheet, Alert, ActivityIndicator, useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Photo } from '../types';
import { photoUrl, deletePhoto } from '../lib/photos';
import { formatDate } from '../lib/format';

interface Props {
  photos: Photo[];
  /** The photo to open at, or null when the viewer is closed */
  startIndex: number | null;
  /** Each photo's visit date (by log id), shown as a caption */
  logDates?: Record<string, string>;
  onClose: () => void;
  /** Called after a photo is deleted, so the page can reload its photos */
  onDeleted: () => void;
}

/** Full-screen photos: swipe between them, pinch to zoom, and delete. */
export function PhotoViewer({ photos, startIndex, logDates, onClose, onDeleted }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (startIndex !== null) setIndex(startIndex);
  }, [startIndex]);

  // After a delete the list is shorter; stay on a photo that still exists
  const current = Math.min(index, photos.length - 1);
  const photo = photos[current];
  const date = photo && logDates?.[photo.log_id];

  function confirmDelete() {
    if (!photo) return;
    Alert.alert('Delete Photo', 'Permanently delete this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setDeleting(true);
          try {
            await deletePhoto(photo);
            if (photos.length === 1) onClose();
            onDeleted();
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete photo');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }

  return (
    <Modal visible={startIndex !== null} animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={styles.container}>
        {startIndex !== null && (
          <FlatList
            data={photos}
            keyExtractor={(p) => p.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={Math.min(startIndex, photos.length - 1)}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <ScrollView
                style={{ width, height }}
                contentContainerStyle={styles.page}
                maximumZoomScale={3}
                minimumZoomScale={1}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                centerContent
              >
                <Image source={{ uri: photoUrl(item.storage_path) }} style={{ width, height }} contentFit="contain" />
              </ScrollView>
            )}
          />
        )}

        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          <View style={styles.caption}>
            {date ? <Text style={styles.captionText}>{formatDate(date)}</Text> : null}
            {photos.length > 1 && <Text style={styles.counter}>{current + 1} of {photos.length}</Text>}
          </View>
          {deleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <TouchableOpacity onPress={confirmDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="trash-outline" size={26} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  page: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  caption: { alignItems: 'center' },
  captionText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  counter: { color: '#ccc', fontSize: 13, marginTop: 2 },
});
