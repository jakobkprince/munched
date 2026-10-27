import { useState, useEffect, useRef, type ComponentRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { BulletTextInput } from './bullet-text-input';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { StarRating } from './star-rating';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

function daysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate();
}

function todayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

function formatDisplay(iso: string) {
  const { year, month, day } = parseDate(iso);
  return `${MONTHS[month]} ${day}, ${year}`;
}

interface ScrollPickerProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

function ScrollPicker({ items, selectedIndex, onSelect }: ScrollPickerProps) {
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const currentIndex = useRef(selectedIndex);

  useEffect(() => {
    setTimeout(() => {
      ref.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
    }, 50);
  }, [selectedIndex, items.length]);

  return (
    <View style={pickerStyles.column}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
          const clamped = Math.max(0, Math.min(index, items.length - 1));
          currentIndex.current = clamped;
          onSelect(clamped);
        }}
      >
        <View style={{ height: ITEM_HEIGHT * 2 }} />
        {items.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={pickerStyles.item}
            onPress={() => {
              ref.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
              currentIndex.current = index;
              onSelect(index);
            }}
            activeOpacity={0.7}
          >
            <Text style={[pickerStyles.itemText, index === selectedIndex && pickerStyles.itemTextSelected]}>
              {item}
            </Text>
          </TouchableOpacity>
        ))}
        <View style={{ height: ITEM_HEIGHT * 2 }} />
      </ScrollView>
      <View pointerEvents="none" style={pickerStyles.highlight} />
    </View>
  );
}

const pickerStyles = StyleSheet.create({
  column: { flex: 1, height: PICKER_HEIGHT, overflow: 'hidden' },
  item: { height: ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontSize: 17, color: '#aaa' },
  itemTextSelected: { color: '#111', fontWeight: '600' },
  highlight: {
    position: 'absolute',
    top: ITEM_HEIGHT * 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
});

interface Props {
  visible: boolean;
  showVibeRating?: boolean;
  initialRating?: number;
  initialVibeRating?: number;
  initialNotes?: string;
  initialLogDate?: string;
  /** When set, shows an editable Name field (used when editing a dish). */
  initialName?: string;
  onConfirm: (data: { rating: number; vibe_rating?: number; notes: string; log_date: string; photoUris: string[]; name?: string }) => void;
  onClose: () => void;
  /** Called once the sheet has fully closed — safe to show an Alert or another sheet. */
  onDismissed?: () => void;
  loading?: boolean;
  title?: string;
}

export function AddToMunchedSheet({ visible, showVibeRating = true, initialRating = 0, initialVibeRating = 0, initialNotes = '', initialLogDate, initialName, onConfirm, onClose, onDismissed, loading, title = 'Log to Munched' }: Props) {
  const [rating, setRating] = useState(initialRating);
  const [vibeRating, setVibeRating] = useState(initialVibeRating);
  const [notes, setNotes] = useState(initialNotes);
  const [name, setName] = useState(initialName ?? '');
  const showName = initialName !== undefined;
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const defaultDate = initialLogDate ?? todayString();
  const [logDate, setLogDate] = useState(defaultDate);
  const parsed = parseDate(logDate);
  const [pickerMonth, setPickerMonth] = useState(parsed.month);
  const [pickerDay, setPickerDay] = useState(parsed.day - 1);
  const [pickerYear, setPickerYear] = useState(0);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => String(currentYear - 5 + i));

  useEffect(() => {
    if (visible) {
      setRating(initialRating);
      setVibeRating(initialVibeRating);
      setNotes(initialNotes);
      setName(initialName ?? '');
      setPhotoUris([]);
      setShowDatePicker(false);
      const d = parseDate(initialLogDate ?? todayString());
      setLogDate(initialLogDate ?? todayString());
      setPickerMonth(d.month);
      setPickerDay(d.day - 1);
      setPickerYear(years.indexOf(String(d.year)));
    }
  }, [visible]);

  function commitPickerDate() {
    const y = Number(years[pickerYear] ?? currentYear);
    const m = pickerMonth;
    const maxDay = daysInMonth(m, y);
    const d = Math.min(pickerDay + 1, maxDay);
    const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    setLogDate(iso);
    setShowDatePicker(false);
  }

  const numDays = daysInMonth(pickerMonth, Number(years[pickerYear] ?? currentYear));
  const days = Array.from({ length: numDays }, (_, i) => String(i + 1));

  function handleConfirm() {
    if (showName && !name.trim()) {
      Alert.alert('Name required', 'Please enter a dish name.');
      return;
    }
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
      name: showName ? name.trim() : undefined,
    });
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUris((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose} onDismiss={onDismissed}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}><Text style={styles.cancel}>Cancel</Text></TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={handleConfirm} disabled={loading}>
            <Text style={[styles.save, loading && styles.disabled]}>Save</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          {showName && (
            <>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="Dish name"
                maxLength={200}
                autoCorrect={false}
                autoCapitalize="words"
                returnKeyType="done"
              />
            </>
          )}
          <Text style={styles.label}>Rating *</Text>
          <StarRating value={rating} onChange={setRating} size={36} />

          {showVibeRating && (
            <>
              <Text style={[styles.label, { marginTop: 20 }]}>Vibe</Text>
              <StarRating value={vibeRating} onChange={setVibeRating} size={36} />
            </>
          )}

          <Text style={[styles.label, { marginTop: 20 }]}>Date</Text>
          <TouchableOpacity
            style={styles.dateRow}
            onPress={() => setShowDatePicker((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.dateValue}>{formatDisplay(logDate)}</Text>
            <Ionicons name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={16} color="#999" />
          </TouchableOpacity>

          {showDatePicker && (
            <View style={styles.pickerContainer}>
              <View style={styles.pickerRow}>
                <ScrollPicker
                  items={MONTHS}
                  selectedIndex={pickerMonth}
                  onSelect={(i) => { setPickerMonth(i); }}
                />
                <ScrollPicker
                  key={`day-${pickerMonth}-${pickerYear}`}
                  items={days}
                  selectedIndex={Math.min(pickerDay, days.length - 1)}
                  onSelect={(i) => setPickerDay(i)}
                />
                <ScrollPicker
                  items={years}
                  selectedIndex={Math.max(0, pickerYear)}
                  onSelect={(i) => setPickerYear(i)}
                />
              </View>
              <TouchableOpacity style={styles.doneBtn} onPress={commitPickerDate}>
                <Text style={styles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
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
  nameInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 20 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 32 },
  photoWrapper: { position: 'relative' },
  photo: { width: 80, height: 80, borderRadius: 8 },
  removePhoto: { position: 'absolute', top: -6, right: -6 },
  addPhoto: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 4,
  },
  dateValue: { fontSize: 15, color: '#111' },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    marginBottom: 4,
    overflow: 'hidden',
    backgroundColor: '#fafafa',
  },
  pickerRow: { flexDirection: 'row', paddingHorizontal: 8 },
  doneBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  doneBtnText: { fontSize: 15, color: '#FF6B35', fontWeight: '600' },
});
