import { useEffect, useRef, useCallback } from 'react';

export interface UseFormAutoSaveOptions<T> {
  /** Unique key for localStorage */
  key: string;
  /** Form data to save */
  data: T;
  /** Debounce delay in ms (default: 1000) */
  delay?: number;
  /** Whether to enable auto-save (default: true) */
  enabled?: boolean;
  /** Callback when data is saved */
  onSave?: (data: T) => void;
  /** Callback when data is loaded */
  onLoad?: (data: T) => void;
}

/**
 * Hook for auto-saving form data to localStorage
 *
 * @example
 * ```tsx
 * const [formData, setFormData] = useState({ name: '', email: '' });
 *
 * const { clearSavedData, hasSavedData } = useFormAutoSave({
 *   key: 'contact-form',
 *   data: formData,
 *   delay: 1000,
 *   onLoad: (savedData) => setFormData(savedData),
 * });
 *
 * // Clear saved data after successful submission
 * const handleSubmit = async () => {
 *   await submitForm(formData);
 *   clearSavedData();
 * };
 * ```
 */
export function useFormAutoSave<T>({
  key,
  data,
  delay = 1000,
  enabled = true,
  onSave,
  onLoad,
}: UseFormAutoSaveOptions<T>) {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isInitialMount = useRef(true);
  const storageKey = `form-autosave-${key}`;

  // Load saved data on mount
  useEffect(() => {
    if (!enabled) {return;}

    try {
      const savedData = localStorage.getItem(storageKey);
      if (savedData) {
        const parsed = JSON.parse(savedData) as T;
        onLoad?.(parsed);
      }
    } catch (error) {
      console.error('[useFormAutoSave] Failed to load saved data:', error);
    }
  }, [storageKey, enabled]); // Only run on mount

  // Save data with debounce
  useEffect(() => {
    if (!enabled) {return;}

    // Skip save on initial mount (data is being loaded)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      try {
        const serialized = JSON.stringify(data);
        localStorage.setItem(storageKey, serialized);
        onSave?.(data);
      } catch (error) {
        console.error('[useFormAutoSave] Failed to save data:', error);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, enabled, storageKey]); // Run when data changes

  // Clear saved data
  const clearSavedData = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('[useFormAutoSave] Failed to clear saved data:', error);
    }
  }, [storageKey]);

  // Check if there's saved data
  const hasSavedData = useCallback(() => {
    try {
      return localStorage.getItem(storageKey) !== null;
    } catch (error) {
      console.error('[useFormAutoSave] Failed to check saved data:', error);
      return false;
    }
  }, [storageKey]);

  // Get saved data without triggering load
  const getSavedData = useCallback(() => {
    try {
      const savedData = localStorage.getItem(storageKey);
      return savedData ? (JSON.parse(savedData) as T) : null;
    } catch (error) {
      console.error('[useFormAutoSave] Failed to get saved data:', error);
      return null;
    }
  }, [storageKey]);

  return {
    clearSavedData,
    hasSavedData,
    getSavedData,
  };
}
