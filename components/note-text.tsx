import { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';

const BULLET = '• ';

/**
 * Displays saved notes, one row per line, with a hanging indent for bullets.
 *
 * On the owner's iPhone (iOS 27), a long <Text> was drawn on one line and cut
 * off at the screen edge, while the multiline TextInput in the edit sheets
 * wrapped fine. So each line is shown in a read-only multiline TextInput,
 * at least as tall as the content height iOS reports.
 */
export function NoteText({ notes }: { notes: string | null }) {
  if (!notes) return null;
  return (
    <View style={styles.container}>
      {notes.split('\n').map((line, i) => {
        const bulleted = line.startsWith(BULLET);
        return (
          <View key={i} style={styles.row}>
            {bulleted && <Text style={[styles.text, styles.bullet]}>•</Text>}
            <WrappedLine text={bulleted ? line.slice(BULLET.length) : line} />
          </View>
        );
      })}
    </View>
  );
}

function WrappedLine({ text }: { text: string }) {
  const [contentHeight, setContentHeight] = useState<number>();
  return (
    <TextInput
      value={text}
      editable={false}
      multiline
      scrollEnabled={false}
      pointerEvents="none"
      onContentSizeChange={(e) => setContentHeight(Math.ceil(e.nativeEvent.contentSize.height))}
      style={[styles.text, styles.line, contentHeight !== undefined && { minHeight: contentHeight }]}
    />
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch', gap: 2 },
  row: { flexDirection: 'row', gap: 6 },
  text: { fontSize: 15, color: '#333' },
  bullet: { lineHeight: 20 },
  line: { flex: 1, padding: 0, paddingTop: 0, paddingBottom: 0, minHeight: 20 },
});
