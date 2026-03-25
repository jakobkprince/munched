import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Linking, Alert, Image, ActionSheetIOS, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRestaurant } from '../../hooks/use-restaurants';
import { useRestaurantActions } from '../../hooks/use-restaurant-actions';
import { useRestaurantDishes } from '../../hooks/use-dishes';
import { useDishActions } from '../../hooks/use-dish-actions';
import { useTags } from '../../hooks/use-tags';
import { usePhotos } from '../../hooks/use-photos';
import { StarRating } from '../../components/star-rating';
import { AddToEatListSheet } from '../../components/add-to-eat-list-sheet';
import { AddToMunchedSheet } from '../../components/add-to-munched-sheet';
import { TagPickerSheet } from '../../components/tag-picker-sheet';
import { PreviousMunchesSheet } from '../../components/previous-munches-sheet';
import { supabase } from '../../lib/supabase';
import { CUISINE_TAGS } from '../../constants/tags';
import { RestaurantLog, Photo } from '../../types';

export default function RestaurantPage() {
  const insets = useSafeAreaInsets();
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { restaurant, status, tags, loading, refresh } = useRestaurant(id);
  const { dishes, refresh: refreshDishes } = useRestaurantDishes(id);
  const actions = useRestaurantActions();
  const dishActions = useDishActions();
  const tagActions = useTags();
  const { getPublicUrl } = usePhotos();

  const [eatListSheet, setEatListSheet] = useState(false);
  const [munchedSheet, setMunchedSheet] = useState(false);
  const [tagSheet, setTagSheet] = useState(false);
  const [prevMunchesSheet, setPrevMunchesSheet] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [allLogs, setAllLogs] = useState<RestaurantLog[]>([]);
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Load all logs and photos for munched view
  const loadLogsAndPhotos = useCallback(async () => {
    if (!status.inMunched) return;
    const [logsRes, photosRes] = await Promise.all([
      supabase.from('restaurant_logs').select('*').eq('restaurant_id', id).order('log_date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('photos').select('*').eq('log_type', 'restaurant_log'),
    ]);
    const logs = logsRes.data ?? [];
    setAllLogs(logs);
    const logIds = logs.map((l) => l.id);
    setAllPhotos((photosRes.data ?? []).filter((p) => logIds.includes(p.log_id)));
  }, [id, status.inMunched]);

  useEffect(() => { loadLogsAndPhotos(); }, [loadLogsAndPhotos]);

  if (!restaurant) {
    return <View style={styles.center}><Text>Loading...</Text></View>;
  }

  const latestLog = allLogs[0];

  async function handleAddToEatList(notes: string) {
    setActionLoading(true);
    try {
      await actions.addToEatList(id, notes);
      await refresh();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to add');
    } finally {
      setActionLoading(false);
      setEatListSheet(false);
    }
  }

  async function handleAddToMunched(data: { rating: number; vibe_rating?: number; notes: string; log_date: string; photoUris: string[] }) {
    setActionLoading(true);
    try {
      await actions.addToMunched(id, { rating: data.rating, vibe_rating: data.vibe_rating, notes: data.notes, log_date: data.log_date, photoUris: data.photoUris });
      await refresh();
      await loadLogsAndPhotos();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to log');
    } finally {
      setActionLoading(false);
      setMunchedSheet(false);
    }
  }

  async function handleReMunch(data: { rating: number; vibe_rating?: number; notes: string; log_date: string; photoUris: string[] }) {
    setActionLoading(true);
    try {
      await actions.reMunch(id, { rating: data.rating, vibe_rating: data.vibe_rating, notes: data.notes, log_date: data.log_date, photoUris: data.photoUris });
      await refresh();
      await loadLogsAndPhotos();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to re-munch');
    } finally {
      setActionLoading(false);
      setMunchedSheet(false);
    }
  }

  async function handleAddTag(tag: string) {
    try {
      await tagActions.addRestaurantTag(id, tag);
      await refresh();
    } catch (e) {
      Alert.alert('Error', 'Failed to add tag');
    }
  }

  async function handleRemoveTag(tag: string) {
    try {
      await tagActions.removeRestaurantTag(id, tag);
      await refresh();
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
    }
  }

  async function handleEditMunched(data: { rating: number; vibe_rating?: number; notes: string; log_date: string; photoUris: string[] }) {
    if (!latestLog) return;
    setActionLoading(true);
    try {
      await actions.editRestaurantLog(latestLog.id, {
        rating: data.rating,
        vibe_rating: data.vibe_rating,
        notes: data.notes,
        log_date: data.log_date,
      });
      await refresh();
      await loadLogsAndPhotos();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to edit');
    } finally {
      setActionLoading(false);
      setMunchedSheet(false);
      setIsEditMode(false);
    }
  }

  async function handleEditEatList(notes: string) {
    if (!status.eatListEntry) return;
    setActionLoading(true);
    try {
      await actions.editEatListEntry(status.eatListEntry.id, notes);
      await refresh();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to edit');
    } finally {
      setActionLoading(false);
      setEatListSheet(false);
      setIsEditMode(false);
    }
  }

  async function handleMenuAction(action: string) {
    if (action === 'Edit') {
      setIsEditMode(true);
      if (status.inMunched) {
        setMunchedSheet(true);
      } else if (status.inEatList) {
        setEatListSheet(true);
      }
    } else if (action === 'Delete') {
      Alert.alert('Delete', `Remove this restaurant from ${status.inEatList ? 'Eat-List' : 'Munched'}?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            if (status.inEatList && status.eatListEntry) {
              await actions.deleteFromEatList(status.eatListEntry.id);
            } else if (status.inMunched && latestLog) {
              await actions.deleteLog(latestLog.id);
            }
            await refresh();
            await loadLogsAndPhotos();
          }
        },
      ]);
    } else if (action === 'View Previous Munches') {
      setPrevMunchesSheet(true);
    }
  }

  async function handleAddDish() {
    if (Platform.OS === 'ios') {
      Alert.prompt('Add Dish', 'Enter dish name:', async (name) => {
        if (!name?.trim()) return;
        try {
          const dishId = await dishActions.addDish(id, name.trim());
          Alert.alert('Add to...', '', [
            { text: 'Eat-List', onPress: async () => { await dishActions.addToEatList(dishId); refreshDishes(); } },
            { text: 'Munched', onPress: () => router.push(`/dish/${dishId}${from ? `?from=${from}` : ''}`) },
            { text: 'Cancel', style: 'cancel' },
          ]);
        } catch (e) {
          Alert.alert('Error', 'Failed to add dish');
        }
      });
    }
  }

  const inAnyList = status.inEatList || status.inMunched;

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
        <Text style={styles.name}>{restaurant.name}</Text>
        {inAnyList && (
          <TouchableOpacity onPress={showThreeDotMenu} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#333" />
          </TouchableOpacity>
        )}
      </View>

      {restaurant.address && <Text style={styles.address}>{restaurant.address}</Text>}

      {/* Cuisine */}
      {(() => {
        const cuisineTags = tags.filter((t) => CUISINE_TAGS.has(t));
        return cuisineTags.length > 0 ? (
          <Text style={styles.cuisine}>{cuisineTags.join(' · ')}</Text>
        ) : null;
      })()}

      {/* Links */}
      <View style={styles.linksRow}>
        {restaurant.apple_maps_url && (
          <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openURL(restaurant.apple_maps_url!)}>
            <Ionicons name="map" size={16} color="#FF6B35" />
            <Text style={styles.linkText}>Maps</Text>
          </TouchableOpacity>
        )}
        {restaurant.yelp_url && (
          <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openURL(restaurant.yelp_url!)}>
            <Text style={styles.linkText}>Yelp</Text>
          </TouchableOpacity>
        )}
        {restaurant.website && (
          <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openURL(restaurant.website!)}>
            <Ionicons name="globe" size={16} color="#FF6B35" />
            <Text style={styles.linkText}>Website</Text>
          </TouchableOpacity>
        )}
      </View>

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
                onLongPress={() => Alert.alert('Remove Tag', `Remove "${tag}"?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', onPress: () => handleRemoveTag(tag) },
                ])}
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
          {latestLog.vibe_rating != null && (
            <View style={styles.vibeRow}>
              <Text style={styles.vibeLabel}>Vibe: </Text>
              <StarRating value={latestLog.vibe_rating} size={18} />
            </View>
          )}
        </View>
      )}

      {/* Photos aggregated from all logs */}
      {status.inMunched && allPhotos.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.photoRow}>
              {allPhotos.map((photo) => (
                <Image key={photo.id} source={{ uri: getPublicUrl(photo.storage_path) }} style={styles.photo} />
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Notes aggregated from all logs */}
      {status.inMunched && allLogs.some((l) => l.notes) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          {allLogs.filter((l) => l.notes).map((log) => (
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

      {/* Dishes */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dishes</Text>
          <TouchableOpacity onPress={handleAddDish}>
            <Text style={styles.addBtn}>+ Add Dish</Text>
          </TouchableOpacity>
        </View>
        {dishes.map((dish) => (
          <TouchableOpacity key={dish.id} style={styles.dishRow} onPress={() => router.push(`/dish/${dish.id}${from ? `?from=${from}` : ''}`)}>
            <Text style={styles.dishName}>{dish.name}</Text>
            <Ionicons name="chevron-forward" size={16} color="#ccc" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Action buttons */}
      <View style={styles.actionArea}>
        {!status.inEatList && !status.inMunched && (
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setEatListSheet(true)}>
              <Text style={styles.secondaryBtnText}>Add to Eat-List</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setMunchedSheet(true)}>
              <Text style={styles.primaryBtnText}>Add to Munched</Text>
            </TouchableOpacity>
          </View>
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
        title={isEditMode ? 'Edit Eat-List Entry' : 'Add to Eat-List'}
        onConfirm={isEditMode ? handleEditEatList : handleAddToEatList}
        onClose={() => { setEatListSheet(false); setIsEditMode(false); }}
        loading={actionLoading}
      />
      <AddToMunchedSheet
        visible={munchedSheet}
        showVibeRating
        initialRating={isEditMode ? (latestLog?.rating ?? 0) : 0}
        initialVibeRating={isEditMode ? (latestLog?.vibe_rating ?? 0) : 0}
        initialNotes={isEditMode ? (latestLog?.notes ?? '') : (status.eatListEntry?.notes ?? '')}
        onConfirm={isEditMode ? handleEditMunched : (status.inMunched ? handleReMunch : handleAddToMunched)}
        onClose={() => { setMunchedSheet(false); setIsEditMode(false); }}
        loading={actionLoading}
        title={isEditMode ? 'Edit Munch' : (status.inMunched ? 'Re-Munch' : 'Log to Munched')}
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
        photos={allPhotos}
        onClose={() => setPrevMunchesSheet(false)}
      />
    </ScrollView>

      {/* Floating back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
        <Ionicons name="chevron-back" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  name: { fontSize: 24, fontWeight: '700', flex: 1, marginRight: 12 },
  address: { fontSize: 14, color: '#666', marginBottom: 4 },
  cuisine: { fontSize: 14, color: '#FF6B35', fontWeight: '500', marginBottom: 12 },
  linksRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f5f5f5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  linkText: { fontSize: 14, color: '#FF6B35', fontWeight: '500' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  addBtn: { fontSize: 14, color: '#FF6B35', fontWeight: '500' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  tagText: { fontSize: 13, color: '#333' },
  vibeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  vibeLabel: { fontSize: 14, color: '#666' },
  photoRow: { flexDirection: 'row', gap: 8 },
  photo: { width: 120, height: 120, borderRadius: 8 },
  noteItem: { marginBottom: 12 },
  noteDate: { fontSize: 12, color: '#999', marginBottom: 2 },
  noteText: { fontSize: 15, color: '#333', lineHeight: 22 },
  dishRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  dishName: { fontSize: 15, color: '#1a1a1a' },
  actionArea: { marginTop: 8 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  primaryBtn: { flex: 1, backgroundColor: '#FF6B35', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, alignItems: 'center' },
  secondaryBtnText: { color: '#FF6B35', fontSize: 16, fontWeight: '600' },
});
