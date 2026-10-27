import { useRef } from 'react';
import { Alert } from 'react-native';

/**
 * An Alert shown while a sheet (Modal) is closing gets dismissed along with it.
 * defer() stores the alert; call flush() from the sheet's onDismissed to show it.
 */
export function useDeferredAlert() {
  const pending = useRef<{ title: string; message?: string } | null>(null);
  return {
    defer(title: string, message?: string) {
      pending.current = { title, message };
    },
    flush() {
      const alert = pending.current;
      pending.current = null;
      if (alert) Alert.alert(alert.title, alert.message);
    },
  };
}
