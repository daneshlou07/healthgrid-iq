import { useState, useEffect } from 'react';

/**
 * Delays updating the returned value until `delay` ms have elapsed
 * since the last change to `value`. Use this to avoid running expensive
 * filter operations on every keystroke.
 *
 * @param value  The raw value to debounce (typically a search string)
 * @param delay  Debounce delay in milliseconds (default: 180ms)
 */
export function useDebounce<T>(value: T, delay = 180): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
