import { View, Text, StyleSheet } from 'react-native';

const BULLET = '• ';

/**
 * Displays saved notes. Each line is its own row and its text gets an explicit
 * width (flex: 1), because on a real iPhone a single long <Text> was drawn on
 * one line and cut off at the screen edge. Bulleted lines get a hanging indent.
 */
export function NoteText({ notes }: { notes: string | null }) {
  if (!notes) return null;
  return (
    <View style={styles.container}>
      {notes.split('\n').map((line, i) => {
        const bulleted = line.startsWith(BULLET);
        return (
          <View key={i} style={styles.row}>
            {bulleted && <Text style={styles.text}>•</Text>}
            <Text style={[styles.text, styles.body]}>
              {bulleted ? line.slice(BULLET.length) : line || ' '}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch', gap: 2 },
  row: { flexDirection: 'row', gap: 6 },
  text: { fontSize: 15, color: '#333' },
  body: { flex: 1 },
});
