import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Image, ActionSheetIOS, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDishActions } from '../../hooks/use-dish-actions';
import { useTags } from '../../hooks/use-tags';
import { usePhotos } from '../../hooks/use-photos';
import { StarRating } from '../../components/star-rating';
import { AddToMunchedSheet } from '../../components/add-to-munched-sheet';
import { TagPickerSheet } from '../../components/tag-picker-sheet';
import { PreviousMunchesSheet } from '../../components/previous-munches-sheet';
import { supabase } from '../../lib/supabase';
import { Dish, Restaurant, DishLog, EatListDish, Photo } from '../../types';

interface DishStatus {
  inEatList: boolean;
  inMunched: boolean;
  eatListEntry: EatListDish | null;
}

export default function DishPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const actions = useDishActions();
  const tagActions = useTags();
  const { getPublicUrl } = usePhotos();

  const [dish, setDish] = useState<Dish | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [status, setStatus] = useState<DishStatus>({ inEatList: false, inMunched: false, eatListEntry: null });
  const [tags, setTags] = useState<string[]>([]);
  const [allLogs, setAllLogs] = useState<DishLog[]>([]);
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  const [munchedSheet, setMunchedSheet] = useState(false);
  const [tagSheet, setTagSheet] = useState(false);
  const [prevMunchesSheet, setPrevMunchesSheet] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const loadDish = useCallback(async () => {
    setLoading(true);
    try {
      const [dishRes, eatListRes, logsRes, tagsRes] = await Promise.all([
        supabase.from('dishes').select('*, restaurant:restaurants(*)').eq('id', id).single(),
        supabase.from('eat_list_dishes').select('*, dish:dishes(*, restaurant:restaurants(*))').eq('dish_id', id).maybeSingle(),
        supabase.from('dish_logs').select('*').eq('dish_id', id).order('log_date', { ascending: false }),
        supabase.from('dish_tags').select('tag').eq('dish_id', id),
      ]);
      if (dishRes.error) throw dishRes.error;

      const dishData = dishRes.data as Dish & { restaurant: Restaurant };
      setDish(dishData);
      setRestaurant(dishData.restaurant);

      const logs: DishLog[] = logsRes.data ?? [];
      setAllLogs(logs);
      setStatus({
        inEatList: !!eatListRes.data,
        inMunched: logs.length > 0,
        eatListEntry: eatListRes.data ?? null,
      });
      setTags((tagsRes.data ?? []).map((t) => t.tag));

      if (logs.length > 0) {
        const logIds = logs.map((l) => l.id);
        const photosRes = await supabase
          .from('photos')
          .select('*')
          .eq('log_type', 'dish_log')
          .in('log_id', logIds);
        setAllPhotos(photosRes.data ?? []);
      } else {
        setAllPhotos([]);
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to load dish');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadDish(); }, [loadDish]);

  if (loading || !dish || !restaurant) {
    return <View style={styles.center}><Text>Loading...</Text></View>;
  }

  const latestLog = allLogs[0] ?? null;
  const inAnyList = status.inEatList || status.inMunched;

  async function handleAddToMunched(data: { rating: number; vibe_rating?: number; notes: string; log_date: string; photoUris: string[] }) {
    setActionLoading(true);
    try {
      await actions.addToMunched(id, {
        rating: data.rating,
        notes: data.notes,
        log_date: data.log_date,
        photoUris: data.photoUris,
      });
      await loadDish();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to log dish');
    } finally {
      setActionLoading(false);
      setMunchedSheet(false);
    }
  }

  async function handleReMunch(data: { rating: number; vibe_rating?: number; notes: string; log_date: string; photoUris: string[] }) {
    setActionLoading(true);
    try {
      await actions.reMunch(id, {
        rating: data.rating,
        notes: data.notes,
        log_date: data.log_date,
        photoUris: data.photoUris,
      });
      await loadDish();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to re-munch');
    } finally {
      setActionLoading(false);
      setMunchedSheet(false);
    }
  }

  async function handleAddTag(tag: string) {
    try {
      await tagActions.addDishTag(id, tag);
      await loadDish();
    } catch (e) {
      Alert.alert('Error', 'Failed to add tag');
    }
  }

  async function handleRemoveTag(tag: string) {
    try {
      await tagActions.removeDishTag(id, tag);
      await loadDish();
    } catch (e) {
      Alert.alert('Error', 'Failed to remove tag');
    }
  }

  function showThreeDotMenu() {
    const options = status.inMunched
      ? ['Edit', 'Delete', 'View Previous Munches', 'Cancel']
      : ['Edit', 'Delete', 'Cancel'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1, destructiveButtonIndex: 1 },
        (index) => handleMenuAction(options[index])
      );
    } else {
      Alert.alert('Options', '', [
        { text: 'Edit', onPress: () => handleMenuAction('Edit') },
        { text: 'Delete', style: 'destructive', onPress: () => handleMenuAction('Delete') },
        ...(status.inMunched ? [{ text: 'View Previous Munches', onPress: () => handleMenuAction('View Previous Munches') }] : []),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  }

  async function handleMenuAction(action: string) {
    if (action === 'Delete') {
      const listName = status.inMunched ? 'Munched' : 'Eat-List';
      Alert.alert('Delete', `Remove this dish from ${listName}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              if (status.inEatList && status.eatListEntry) {
                await actions.deleteFromEatList(status.eatListEntry.id);
              } else if (status.inMunched && latestLog) {
                await actions.deleteLog(latestLog.id);
              }
              await loadDish();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete');
            }
          },
        },
      ]);
    } else if (action === 'View Previous Munches') {
      setPrevMunchesSheet(true);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.name}>{dish.name}</Text>
        {inAnyList && (
          <TouchableOpacity onPress={showThreeDotMenu} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#333" />
          </TouchableOpacity>
        )}
      </View>

      {/* Restaurant link */}
      <TouchableOpacity onPress={() => router.push(`/restaurant/${restaurant.id}`)} style={styles.restaurantLink}>
        <Ionicons name="restaurant-outline" size={14} color="#FF6B35" />
        <Text style={styles.restaurantName}>{restaurant.name}</Text>
        <Ionicons name="chevron-forward" size={14} color="#FF6B35" />
      </TouchableOpacity>

      {/* Tags */}
      {inAnyList && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <TouchableOpacity onPress={() => setTagSheet(true)}>
              <Text style={styles.addBtn}>+ Add</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tagRow}>
            {tags.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={styles.tag}
                onLongPress={() =>
                  Alert.alert('Remove Tag', `Remove "${tag}"?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', onPress: () => handleRemoveTag(tag) },
                  ])
                }
              >
                <Text style={styles.tagText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Munched rating display */}
      {status.inMunched && latestLog && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rating</Text>
          <StarRating value={latestLog.rating ?? 0} size={28} />
        </View>
      )}

      {/* Photos aggregated from all logs */}
      {status.inMunched && allPhotos.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.photoRow}>
              {allPhotos
                .slice()
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((photo) => (
                  <Image key={photo.id} source={{ uri: getPublicUrl(photo.storage_path) }} style={styles.photo} />
                ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Notes aggregated from all logs, with dates, sorted by recency */}
      {status.inMunched && allLogs.some((l) => l.notes) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          {allLogs
            .filter((l) => l.notes)
            .map((log) => (
              <View key={log.id} style={styles.noteItem}>
                <Text style={styles.noteDate}>{formatDate(log.log_date)}</Text>
                <Text style={styles.noteText}>{log.notes}</Text>
              </View>
            ))}
        </View>
      )}

      {/* Eat-List notes */}
      {status.inEatList && status.eatListEntry?.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.noteText}>{status.eatListEntry.notes}</Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actionArea}>
        {!status.inEatList && !status.inMunched && (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setMunchedSheet(true)}>
            <Text style={styles.primaryBtnText}>Add to Munched</Text>
          </TouchableOpacity>
        )}
        {status.inEatList && !status.inMunched && (
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setMunchedSheet(true)}>
            <Text style={styles.primaryBtnText}>Add to Munched</Text>
          </TouchableOpacity>
        )}
        {status.inMunched && (
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setMunchedSheet(true)}>
            <Text style={styles.secondaryBtnText}>Re-Munch</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sheets */}
      <AddToMunchedSheet
        visible={munchedSheet}
        showVibeRating={false}
        initialNotes={status.eatListEntry?.notes ?? ''}
        onConfirm={status.inMunched ? handleReMunch : handleAddToMunched}
        onClose={() => setMunchedSheet(false)}
        loading={actionLoading}
        title={status.inMunched ? 'Re-Munch' : 'Log to Munched'}
      />
      <TagPickerSheet
        visible={tagSheet}
        selectedTags={tags}
        onAdd={handleAddTag}
        onClose={() => setTagSheet(false)}
      />
      <PreviousMunchesSheet
        visible={prevMunchesSheet}
        logs={allLogs}
        onClose={() => setPrevMunchesSheet(false)}
      />
    </ScrollView>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  name: { fontSize: 24, fontWeight: '700', flex: 1, marginRight: 12 },
  restaurantLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 20 },
  restaurantName: { fontSize: 14, color: '#FF6B35', fontWeight: '500' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  addBtn: { fontSize: 14, color: '#FF6B35', fontWeight: '500' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  tagText: { fontSize: 13, color: '#333' },
  photoRow: { flexDirection: 'row', gap: 8 },
  photo: { width: 120, height: 120, borderRadius: 8 },
  noteItem: { marginBottom: 12 },
  noteDate: { fontSize: 12, color: '#999', marginBottom: 2 },
  noteText: { fontSize: 15, color: '#333', lineHeight: 22 },
  actionArea: { marginTop: 8 },
  primaryBtn: { backgroundColor: '#FF6B35', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, alignItems: 'center' },
  secondaryBtnText: { color: '#FF6B35', fontSize: 16, fontWeight: '600' },
});
