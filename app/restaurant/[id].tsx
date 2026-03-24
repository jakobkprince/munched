import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Linking, Alert, Image, ActionSheetIOS, Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
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
import { RestaurantLog, Photo } from '../../types';

export default function RestaurantPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
  const [allLogs, setAllLogs] = useState<RestaurantLog[]>([]);
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Load all logs and photos for munched view
  const loadLogsAndPhotos = useCallback(async () => {
    if (!status.inMunched) return;
    const [logsRes, photosRes] = await Promise.all([
      supabase.from('restaurant_logs').select('*').eq('restaurant_id', id).order('log_date', { ascending: false }),
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

  async function handleMenuAction(action: string) {
    if (action === 'Delete') {
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
            { text: 'Munched', onPress: () => router.push(`/dish/${dishId}`) },
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
      {inAnyList && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dishes</Text>
            <TouchableOpacity onPress={handleAddDish}>
              <Text style={styles.addBtn}>+ Add Dish</Text>
            </TouchableOpacity>
          </View>
          {dishes.map((dish) => (
            <TouchableOpacity key={dish.id} style={styles.dishRow} onPress={() => router.push(`/dish/${dish.id}`)}>
              <Text style={styles.dishName}>{dish.name}</Text>
              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>
      )}

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
        onConfirm={handleAddToEatList}
        onClose={() => setEatListSheet(false)}
        loading={actionLoading}
      />
      <AddToMunchedSheet
        visible={munchedSheet}
        showVibeRating
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  name: { fontSize: 24, fontWeight: '700', flex: 1, marginRight: 12 },
  address: { fontSize: 14, color: '#666', marginBottom: 12 },
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
