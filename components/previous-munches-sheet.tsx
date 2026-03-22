import { View, Text, TouchableOpacity, FlatList, StyleSheet, Modal } from 'react-native';
import { RestaurantLog, DishLog } from '../types';
import { StarRating } from './star-rating';

type Log = RestaurantLog | DishLog;

interface Props {
  visible: boolean;
  logs: Log[];
  onClose: () => void;
}

export function PreviousMunchesSheet({ visible, logs, onClose }: Props) {
  const sorted = [...logs].sort(
    (a, b) => new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Previous Munches</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>Done</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View>
                <StarRating value={item.rating ?? 0} size={18} />
                {item.notes ? <Text style={styles.notes} numberOfLines={2}>{item.notes}</Text> : null}
              </View>
              <Text style={styles.date}>{formatDate(item.log_date)}</Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={styles.list}
        />
      </View>
    </Modal>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontSize: 18, fontWeight: '600' },
  close: { fontSize: 16, color: '#FF6B35', fontWeight: '600' },
  list: { padding: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 12 },
  notes: { fontSize: 13, color: '#666', marginTop: 4, maxWidth: '80%' },
  date: { fontSize: 14, color: '#888' },
  sep: { height: 1, backgroundColor: '#f0f0f0' },
});
