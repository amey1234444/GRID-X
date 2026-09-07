import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Re-reads a screen's data when the user comes back to it, skipping the first
 * focus so the initial fetch is not duplicated. Returning from a form that
 * changed a record must not show the old record.
 */
export function useFocusRefresh(refresh: () => void): void {
  const firstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      refresh();
    }, [refresh]),
  );
}
