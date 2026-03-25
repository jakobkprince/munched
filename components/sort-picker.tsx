import { TouchableOpacity, Text, StyleSheet, Platform, ActionSheetIOS, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SortOption {
  label: string;
  value: string;
}

interface Props {
  options: SortOption[];
  value: string;
  onChange: (value: string) => void;
}

export function SortPicker({ options, value, onChange }: Props) {
  const currentOption = options.find((o) => o.value === value);
  const buttonLabel = currentOption ? currentOption.label : 'Sort';

  function openSheet() {
    const titles = options.map((o) => o.label);

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...titles, 'Cancel'],
          cancelButtonIndex: titles.length,
          title: 'Sort By',
        },
        (buttonIndex) => {
          if (buttonIndex < options.length) {
            onChange(options[buttonIndex].value);
          }
        }
      );
    } else {
      Alert.alert(
        'Sort By',
        undefined,
        [
          ...options.map((o) => ({
            text: o.label,
            onPress: () => onChange(o.value),
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
