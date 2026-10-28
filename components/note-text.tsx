import { View, Text, StyleSheet } from 'react-native';

const BULLET = '• ';

/**
 * Displays saved notes, one row per line, with a hanging indent for bullets.
 *
 * On the owner's iPhone (iOS 27), iOS sizes multi-line text for every line but
 * draws only the first, both in <Text> and in a read-only TextInput. So we
 * never ask iOS to wrap: each word is its own single-line <Text>, and the
 * layout engine (flexWrap) moves words onto the next line.
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
            <WrappedLine text={bulleted ? line.slice(BULLET.length) : line} />
          </View>
        );
      })}
    </View>
  );
}

function WrappedLine({ text }: { text: string }) {
  const words = text.split(' ').filter(Boolean);
  return (
    <View style={styles.words} accessible accessibilityLabel={text}>
      {words.length === 0 ? (
        <Text style={styles.text}> </Text>
      ) : (
        words.map((word, i) => (
          <Text key={i} style={styles.text}>
            {word}
          </Text>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch', gap: 2 },
  row: { flexDirection: 'row', gap: 6 },
  // columnGap stands in for the space between words
  words: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', columnGap: 4 },
  text: { fontSize: 15, color: '#333' },
});
