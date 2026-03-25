import { useEffect, useRef, useState } from 'react';
import { TextInput, TextInputProps } from 'react-native';

interface Props extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (text: string) => void;
}

const BULLET = '• ';

/**
 * A multiline TextInput with two automatic bullet behaviours:
 *  1. Typing "- " at the start of a line converts it to "• "
 *  2. Pressing Return at the end of a non-empty bulleted line starts the next line with "• "
 */
export function BulletTextInput({ value, onChangeText, ...rest }: Props) {
  const cursorRef = useRef(0);
  const pendingBullet = useRef(false);
  const [forcedSelection, setForcedSelection] = useState<{ start: number; end: number } | undefined>();

  // Release the forced cursor position after one render cycle
  useEffect(() => {
    if (!forcedSelection) return;
    const t = setTimeout(() => setForcedSelection(undefined), 32);
    return () => clearTimeout(t);
  }, [forcedSelection]);

  function handleKeyPress({ nativeEvent: { key } }: { nativeEvent: { key: string } }) {
    if (key !== 'Enter') return;
    const before = value.slice(0, cursorRef.current);
    const lineStart = before.lastIndexOf('\n') + 1;
    const currentLine = before.slice(lineStart);
    // Only continue if the line has content beyond "• "
    pendingBullet.current = currentLine.startsWith(BULLET) && currentLine.length > BULLET.length;
  }

  function handleChangeText(newText: string) {
    // Convert "- " at the start of any line to "• "
    let result = newText.replace(/(^|\n)- /g, '$1• ');

    // Auto-continue bullet on the new line
    if (pendingBullet.current) {
      pendingBullet.current = false;
      const insertAt = cursorRef.current + 1; // skip past the \n
      result = result.slice(0, insertAt) + BULLET + result.slice(insertAt);
      const newCursor = insertAt + BULLET.length;
      setForcedSelection({ start: newCursor, end: newCursor });
    }

    onChangeText(result);
  }

  return (
    <TextInput
      {...rest}
      value={value}
      onChangeText={handleChangeText}
      onKeyPress={handleKeyPress}
      onSelectionChange={({ nativeEvent: { selection } }) => {
        cursorRef.current = selection.start;
      }}
      {...(forcedSelection !== undefined ? { selection: forcedSelection } : {})}
    />
  );
}
