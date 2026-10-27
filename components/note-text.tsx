import { useState } from 'react';
import { View, Text, StyleSheet, TextLayoutEvent } from 'react-native';

const BULLET = '• ';

/**
 * Displays saved notes, one row per line, with a hanging indent for bullets.
 *
 * On iOS 27, React Native can give a paragraph slightly less height than iOS
 * needs to draw it. iOS then doesn't wrap the last line that fits: it puts the
 * rest of the text on that line and clips it at the screen edge. Each line's
 * text therefore gets a little extra height beyond its measured lines.
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
            <RoomyText>{bulleted ? line.slice(BULLET.length) : line || ' '}</RoomyText>
          </View>
        );
      })}
    </View>
  );
}

function RoomyText({ children }: { children: string }) {
  const [minHeight, setMinHeight] = useState<number>();

  function handleTextLayout(e: TextLayoutEvent) {
    const { lines } = e.nativeEvent;
    const height = Math.ceil(lines.reduce((sum, l) => sum + l.height, 0) + 4 * lines.length);
    if (height !== minHeight) setMinHeight(height);
  }

  return (
    <Text style={[styles.text, styles.body, minHeight !== undefined && { minHeight }]} onTextLayout={handleTextLayout}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch', gap: 2 },
  row: { flexDirection: 'row', gap: 6 },
  text: { fontSize: 15, color: '#333' },
  body: { flex: 1 },
});
