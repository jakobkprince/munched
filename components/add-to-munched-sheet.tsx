import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Modal, KeyboardAvoidingView, Platform, Image, Alert,
} from 'react-native';
import { BulletTextInput } from './bullet-text-input';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { StarRating } from './star-rating';

interface Props {
  visible: boolean;
  showVibeRating?: boolean;
  initialRating?: number;
  initialVibeRating?: number;
  initialNotes?: string;
  onConfirm: (data: { rating: number; vibe_rating?: number; notes: string; log_date: string; photoUris: string[] }) => void;
  onClose: () => void;
  loading?: boolean;
  title?: string;
}

export function AddToMunchedSheet({ visible, showVibeRating = true, initialRating = 0, initialVibeRating = 0, initialNotes = '', onConfirm, onClose, loading, title = 'Log to Munched' }: Props) {
  const [rating, setRating] = useState(initialRating);
  const [vibeRating, setVibeRating] = useState(initialVibeRating);
  const [notes, setNotes] = useState(initialNotes);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const logDate = new Date().toISOString().split('T')[0];

  // Sync state whenever the sheet opens so initial values are always fresh
  useEffect(() => {
    if (visible) {
      setRating(initialRating);
      setVibeRating(initialVibeRating);
      setNotes(initialNotes);
      setPhotoUris([]);
    }
  }, [visible]);

  function handleClose() {
    onClose();
  }

  function handleConfirm() {
    if (rating === 0) {
      Alert.alert('Rating required', 'Please select a star rating before saving.');
      return;
    }
    onConfirm({
      rating,
      vibe_rating: showVibeRating && vibeRating > 0 ? vibeRating : undefined,
      notes,
      log_date: logDate,
      photoUris,
    });
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUris((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={handleConfirm} disabled={loading}>
            <Text style={[styles.save, loading && styles.disabled]}>Save</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Rating *</Text>
          <StarRating value={rating} onChange={setRating} size={36} />

          {showVibeRating && (
            <>
              <Text style={[styles.label, { marginTop: 20 }]}>Vibe</Text>
              <StarRating value={vibeRating} onChange={setVibeRating} size={36} />
            </>
          )}

          <Text style={[styles.label, { marginTop: 20 }]}>Notes</Text>
          <BulletTextInput
            style={styles.input}
            value={notes}
            onChangeText={setNotes}
            placeholder="How was it?"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={[styles.label, { marginTop: 20 }]}>Photos</Text>
          <View style={styles.photoRow}>
            {photoUris.map((uri, i) => (
              <View key={i} style={styles.photoWrapper}>
                <Image source={{ uri }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.removePhoto}
                  onPress={() => setPhotoUris((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <Ionicons name="close-circle" size={20} color="#FF6B35" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addPhoto} onPress={pickPhoto}>
              <Ionicons name="add" size={28} color="#999" />
            </TouchableOpacity>
          </View>

          <Text style={styles.dateText}>Log date: {logDate}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontSize: 17, fontWeight: '600' },
  cancel: { fontSize: 16, color: '#666' },
  save: { fontSize: 16, color: '#FF6B35', fontWeight: '600' },
  disabled: { opacity: 0.4 },
  body: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 15, minHeight: 100 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoWrapper: { position: 'relative' },
  photo: { width: 80, height: 80, borderRadius: 8 },
  removePhoto: { position: 'absolute', top: -6, right: -6 },
  addPhoto: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  dateText: { fontSize: 13, color: '#999', marginTop: 16 },
});
