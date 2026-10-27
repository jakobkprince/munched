import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActionSheetIOS, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { formatDate } from '../../lib/format';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDishActions } from '../../hooks/use-dish-actions';
import { useRestaurantActions } from '../../hooks/use-restaurant-actions';
import { useTags } from '../../hooks/use-tags';
import { photoUrl, PhotoUploadError } from '../../lib/photos';
import { useDeferredAlert } from '../../hooks/use-deferred-alert';
import { StarRating } from '../../components/star-rating';
import { AddToMunchedSheet } from '../../components/add-to-munched-sheet';
import { AddToEatListSheet } from '../../components/add-to-eat-list-sheet';
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
  const insets = useSafeAreaInsets();
  // askRestaurant=1: we just munched this dish from the Eat-List (see handleAddToMunched)
  const { id, from, askRestaurant } = useLocalSearchParams<{ id: string; from?: string; askRestaurant?: string }>();
  const actions = useDishActions();
  const restaurantActions = useRestaurantActions();
  const tagActions = useTags();
  const deferredAlert = useDeferredAlert();

  const [dish, setDish] = useState<Dish | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [status, setStatus] = useState<DishStatus>({ inEatList: false, inMunched: false, eatListEntry: null });
  const [tags, setTags] = useState<string[]>([]);
  const [allLogs, setAllLogs] = useState<DishLog[]>([]);
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  const [munchedSheet, setMunchedSheet] = useState(false);
  const [eatListSheet, setEatListSheet] = useState(false);
  const [tagSheet, setTagSheet] = useState(false);
  const [prevMunchesSheet, setPrevMunchesSheet] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [restaurantMunchSheet, setRestaurantMunchSheet] = useState(false);
  const [restaurantEatListNotes, setRestaurantEatListNotes] = useState('');
  const [promptWhenSheetCloses, setPromptWhenSheetCloses] = useState(false);
  const askedAboutRestaurant = useRef(false);

  const loadDish = useCallback(async () => {
    setLoading(true);
    try {
      const [dishRes, eatListRes, logsRes, tagsRes] = await Promise.all([
        supabase.from('dishes').select('*, restaurant:restaurants(*)').eq('id', id).single(),
        supabase.from('eat_list_dishes').select('*, dish:dishes(*, restaurant:restaurants(*))').eq('dish_id', id).maybeSingle(),
        supabase.from('dish_logs').select('*').eq('dish_id', id).order('log_date', { ascending: false }).order('created_at', { ascending: false }),
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

  // After munching a dish whose restaurant is on the Eat-List (and not yet munched),
  // offer to munch the restaurant too. "Later" just leaves you on the dish.
  const promptToMunchRestaurant = useCallback(async (r: Restaurant) => {
    const [eatListRes, logsRes] = await Promise.all([
      supabase.from('eat_list_restaurants').select('notes').eq('restaurant_id', r.id).maybeSingle(),
      supabase.from('restaurant_logs').select('id').eq('restaurant_id', r.id).limit(1),
    ]);
    if (eatListRes.error || logsRes.error) {
      console.error('Failed to check restaurant status:', eatListRes.error ?? logsRes.error);
      return;
    }
    const restaurantInEatList = !!eatListRes.data;
    const restaurantInMunched = (logsRes.data ?? []).length > 0;
    if (!restaurantInEatList || restaurantInMunched) return;

    setRestaurantEatListNotes(eatListRes.data?.notes ?? '');
    Alert.alert(`Add ${r.name} to Munched?`, undefined, [
      { text: 'Later', style: 'cancel' },
      { text: 'Yes', onPress: () => setRestaurantMunchSheet(true) },
    ]);
  }, []);

  useEffect(() => {
    if (askRestaurant !== '1' || !restaurant || askedAboutRestaurant.current) return;
    askedAboutRestaurant.current = true;
    router.setParams({ askRestaurant: undefined });
    promptToMunchRestaurant(restaurant);
  }, [askRestaurant, restaurant, promptToMunchRestaurant]);

  if (!dish || !restaurant) {
    return <View style={styles.center}><Text>Loading...</Text></View>;
  }

  const latestLog = allLogs[0] ?? null;
  const inAnyList = status.inEatList || status.inMunched;

  // A failed photo upload happens after the munch itself is saved: close the
  // sheet (so Save can't create a duplicate) and show the message once it's gone.
  function showSaveError(e: unknown, fallback: string, closeSheet: () => void) {
    if (e instanceof PhotoUploadError) {
      deferredAlert.defer('Photo not uploaded', e.message);
      closeSheet();
      loadDish();
      return;
    }
    Alert.alert('Error', e instanceof Error ? e.message : fallback);
  }

  async function handleAddToMunched(data: { rating: number; vibe_rating?: number; notes: string; log_date: string; photoUris: string[] }) {
    setActionLoading(true);
    try {
      await actions.addToMunched(id, {
        rating: data.rating,
        notes: data.notes,
        log_date: data.log_date,
        photoUris: data.photoUris,
      });
      if (from === 'eat-list') {
        setMunchedSheet(false);
        // Move to the Munched tab; the dish page there asks about the restaurant
        router.navigate('/(tabs)/munched/dishes');
        router.push(`/dish/${id}?from=munched&askRestaurant=1`);
        return;
      }
      await loadDish();
      // An Alert shown while the sheet is closing gets dismissed with it, so wait
      setPromptWhenSheetCloses(true);
      setMunchedSheet(false);
    } catch (e) {
      showSaveError(e, 'Failed to log dish', () => setMunchedSheet(false));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddRestaurantToMunched(data: { rating: number; vibe_rating?: number; notes: string; log_date: string; photoUris: string[] }) {
    if (!restaurant) return;
    setActionLoading(true);
    try {
      await restaurantActions.addToMunched(restaurant.id, {
        rating: data.rating,
        vibe_rating: data.vibe_rating,
        notes: data.notes,
        log_date: data.log_date,
        photoUris: data.photoUris,
      });
      setRestaurantMunchSheet(false);
    } catch (e) {
      showSaveError(e, 'Failed to log restaurant', () => setRestaurantMunchSheet(false));
    } finally {
      setActionLoading(false);
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
      setMunchedSheet(false);
    } catch (e) {
      showSaveError(e, 'Failed to re-munch', () => setMunchedSheet(false));
    } finally {
      setActionLoading(false);
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
    const orphaned = !status.inEatList && !status.inMunched;
    const options = orphaned
      ? ['Delete Dish', 'Cancel']
      : status.inMunched
        ? ['Edit', 'Delete', 'View Previous Munches', 'Cancel']
        : ['Edit', 'Delete', 'Cancel'];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1, destructiveButtonIndex: options.findIndex((o) => o.startsWith('Delete')) },
        (index) => handleMenuAction(options[index])
      );
    } else {
      Alert.alert('Options', '', [
        ...(orphaned
          ? [{ text: 'Delete Dish', style: 'destructive' as const, onPress: () => handleMenuAction('Delete Dish') }]
          : [
              { text: 'Edit', onPress: () => handleMenuAction('Edit') },
              { text: 'Delete', style: 'destructive' as const, onPress: () => handleMenuAction('Delete') },
              ...(status.inMunched ? [{ text: 'View Previous Munches', onPress: () => handleMenuAction('View Previous Munches') }] : []),
            ]
        ),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  }

  async function handleEditMunched(data: { rating: number; vibe_rating?: number; notes: string; log_date: string; photoUris: string[]; name?: string }) {
    if (!latestLog) return;
    setActionLoading(true);
    try {
      if (data.name && data.name !== dish?.name) await actions.renameDish(id, data.name);
      await actions.editDishLog(latestLog.id, {
        rating: data.rating,
        notes: data.notes,
        log_date: data.log_date,
        photoUris: data.photoUris,
      });
      await loadDish();
      setMunchedSheet(false);
      setIsEditMode(false);
    } catch (e) {
      showSaveError(e, 'Failed to edit', () => { setMunchedSheet(false); setIsEditMode(false); });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEditEatList(notes: string, name?: string) {
    if (!status.eatListEntry) return;
    setActionLoading(true);
    try {
      if (name && name !== dish?.name) await actions.renameDish(id, name);
      await actions.editEatListEntry(status.eatListEntry.id, notes);
      await loadDish();
      setEatListSheet(false);
      setIsEditMode(false);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to edit');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleMenuAction(action: string) {
    if (action === 'Edit') {
      setIsEditMode(true);
      if (status.inMunched) {
        setMunchedSheet(true);
      } else {
        setEatListSheet(true);
      }
    } else if (action === 'Delete') {
      if (status.inMunched) {
        Alert.alert('Delete All Munches?', 'This will permanently delete all munch history for this dish.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete', style: 'destructive', onPress: async () => {
              try {
                await actions.deleteAllLogs(id);
                await loadDish();
              } catch (e) {
                Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete');
              }
            },
          },
        ]);
      } else if (status.inEatList && status.eatListEntry) {
        Alert.alert('Delete', 'Remove this dish from Eat-List?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete', style: 'destructive', onPress: async () => {
              try {
                await actions.deleteFromEatList(status.eatListEntry!.id);
                if (from === 'eat-list') {
                  router.back();
                } else {
                  await loadDish();
                }
              } catch (e) {
                Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete');
              }
            },
          },
        ]);
      }
    } else if (action === 'Delete Dish') {
      Alert.alert('Delete Dish', 'Permanently delete this dish?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              await actions.deleteDish(id);
              router.back();
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
    <View style={[styles.page, { paddingTop: insets.top }]}>
      {from && (
        <View style={styles.contextBanner}>
          <Text style={styles.contextBannerText}>
            {from === 'munched' ? 'Munched' : 'Eat-List'}
          </Text>
        </View>
      )}
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.name}>{dish.name}</Text>
        <TouchableOpacity onPress={showThreeDotMenu} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Restaurant link */}
      <TouchableOpacity onPress={() => router.push(`/restaurant/${restaurant.id}${from ? `?from=${from}` : ''}`)} style={styles.restaurantLink}>
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
                  <Image key={photo.id} source={{ uri: photoUrl(photo.storage_path) }} style={styles.photo} />
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
      <AddToEatListSheet
        visible={eatListSheet}
        initialNotes={isEditMode ? (status.eatListEntry?.notes ?? '') : ''}
        initialName={isEditMode ? dish.name : undefined}
        title={isEditMode ? 'Edit Eat-List Entry' : 'Add to Eat-List'}
        onConfirm={handleEditEatList}
        onClose={() => { setEatListSheet(false); setIsEditMode(false); }}
        loading={actionLoading}
      />
      <AddToMunchedSheet
        visible={munchedSheet}
        showVibeRating={false}
        initialRating={isEditMode ? (latestLog?.rating ?? 0) : 0}
        initialNotes={isEditMode ? (latestLog?.notes ?? '') : (status.eatListEntry?.notes ?? '')}
        initialLogDate={isEditMode ? (latestLog?.log_date ?? undefined) : undefined}
        initialName={isEditMode ? dish.name : undefined}
        onConfirm={isEditMode ? handleEditMunched : (status.inMunched ? handleReMunch : handleAddToMunched)}
        onClose={() => { setMunchedSheet(false); setIsEditMode(false); }}
        onDismissed={() => {
          deferredAlert.flush();
          if (!promptWhenSheetCloses) return;
          setPromptWhenSheetCloses(false);
          promptToMunchRestaurant(restaurant);
        }}
        loading={actionLoading}
        title={isEditMode ? 'Edit Munch' : (status.inMunched ? 'Re-Munch' : 'Log to Munched')}
      />
      <TagPickerSheet
        visible={tagSheet}
        selectedTags={tags}
        onAdd={handleAddTag}
        onClose={() => setTagSheet(false)}
      />
      <AddToMunchedSheet
        visible={restaurantMunchSheet}
        showVibeRating
        initialNotes={restaurantEatListNotes}
        onConfirm={handleAddRestaurantToMunched}
        onClose={() => setRestaurantMunchSheet(false)}
        onDismissed={deferredAlert.flush}
        loading={actionLoading}
        title={`Log ${restaurant?.name ?? 'Restaurant'}`}
      />
      <PreviousMunchesSheet
        visible={prevMunchesSheet}
        logs={allLogs}
        photos={allPhotos}
        onClose={() => setPrevMunchesSheet(false)}
        onDeleteLog={async (logId) => {
          await actions.deleteLog(logId);
          await loadDish();
        }}
      />
    </ScrollView>

      {/* Floating back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
        <Ionicons name="chevron-back" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}


const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#fff' },
  backBtn: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  contextBanner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#fff8f5', borderBottomWidth: 1, borderBottomColor: '#ffe0d0' },
  contextBannerText: { fontSize: 13, fontWeight: '700', color: '#FF6B35', textTransform: 'uppercase', letterSpacing: 0.5 },
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 110 },
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
  // No lineHeight: on a real iPhone it made long notes draw on one line, cut off
  noteText: { fontSize: 15, color: '#333', flexShrink: 1 },
  actionArea: { marginTop: 8 },
  primaryBtn: { backgroundColor: '#FF6B35', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, alignItems: 'center' },
  secondaryBtnText: { color: '#FF6B35', fontSize: 16, fontWeight: '600' },
});
