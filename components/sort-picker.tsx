import { TouchableOpacity, Text, StyleSheet, Platform, ActionSheetIOS, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SortOption {
  label: string;
  value: string;
}

interface Props {
  options: SortOption[];
  value: string;
  direction: 'asc' | 'desc';
  onChange: (value: string, direction: 'asc' | 'desc') => void;
}

export function SortPicker({ options, value, direction, onChange }: Props) {
  const currentOption = options.find((o) => o.value === value);
  const dirLabel = direction === 'desc' ? '↓' : '↑';
  const buttonLabel = currentOption ? `${currentOption.label} ${dirLabel}` : 'Sort';

  function openSheet() {
    // Build action sheet entries: each option gets both asc and desc
    const actions: { label: string; value: string; direction: 'asc' | 'desc' }[] = [];
    for (const opt of options) {
      actions.push({ label: `${opt.label} ↓`, value: opt.value, direction: 'desc' });
      actions.push({ label: `${opt.label} ↑`, value: opt.value, direction: 'asc' });
    }

    const titles = actions.map((a) => a.label);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...titles, 'Cancel'],
          cancelButtonIndex: titles.length,
          title: 'Sort By',
        },
        (buttonIndex) => {
          if (buttonIndex < actions.length) {
            const chosen = actions[buttonIndex];
            onChange(chosen.value, chosen.direction);
          }
        }
      );
    } else {
      // Android fallback via Alert
      Alert.alert(
        'Sort By',
        undefined,
        [
          ...actions.map((a) => ({
            text: a.label,
            onPress: () => onChange(a.value, a.direction),
          })),
          { text: 'Cancel', style: 'cancel' as const },
        ]
      );
    }
  }

  return (
    <TouchableOpacity style={styles.button} onPress={openSheet} activeOpacity={0.7}>
      <Ionicons name="funnel-outline" size={14} color="#FF6B35" />
      <Text style={styles.label}>{buttonLabel}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff3ee',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  label: {
    fontSize: 13,
    color: '#FF6B35',
    fontWeight: '500',
  },
});
