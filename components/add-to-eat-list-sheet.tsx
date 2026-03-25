import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { BulletTextInput } from './bullet-text-input';

interface Props {
  visible: boolean;
  initialNotes?: string;
  title?: string;
  onConfirm: (notes: string) => void;
  onClose: () => void;
  loading?: boolean;
}

export function AddToEatListSheet({ visible, initialNotes = '', title = 'Add to Eat-List', onConfirm, onClose, loading }: Props) {
  const [notes, setNotes] = useState(initialNotes);

  useEffect(() => {
    if (visible) setNotes(initialNotes);
  }, [visible]);

  function handleConfirm() {
    onConfirm(notes);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={handleConfirm} disabled={loading}>
            <Text style={[styles.save, loading && styles.disabled]}>Save</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.body}>
          <Text style={styles.label}>Notes (optional)</Text>
          <BulletTextInput
            style={styles.input}
            value={notes}
            onChangeText={setNotes}
            placeholder="What do you want to try?"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
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
  label: { fontSize: 14, fontWeight: '500', color: '#444', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 15, minHeight: 100 },
});
