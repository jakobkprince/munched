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
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.body}>
          <View style={styles.notesBottom}>
          <Text style={styles.label}>Notes</Text>
          <BulletTextInput
            style={styles.input}
            value={notes}
            onChangeText={setNotes}
            placeholder="what's the tea?"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            autoFocus
          />
          </View>
        </View>
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveBtn, loading && styles.disabled]} onPress={handleConfirm} disabled={loading}>
            <Text style={styles.saveText}>Save</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 16, borderBottomWidth: 1, borderColor: '#eee', alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '600' },
  body: { flex: 1, padding: 16, justifyContent: 'flex-end' },
  notesBottom: {},
  label: { fontSize: 14, fontWeight: '500', color: '#444', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 15, minHeight: 100 },
  footer: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderColor: '#eee', paddingBottom: 32 },
  cancelBtn: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center', backgroundColor: '#f5f5f5' },
  cancelText: { fontSize: 16, fontWeight: '600', color: '#666' },
  saveBtn: { flex: 1, borderRadius: 12, padding: 16, alignItems: 'center', backgroundColor: '#FF6B35' },
  saveText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  disabled: { opacity: 0.4 },
});
