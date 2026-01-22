import React from 'react';
import { formatCityForDropdown } from '@/lib/cities/formatter';
import type { CityResult } from '@/lib/cities/types';
import styles from '../../Compatibility.module.css';

interface CityAutocompleteFieldProps {
  /** Unique ID for the input field */
  id: string;
  /** Current city query value */
  value: string;
  /** Array of city suggestions */
  suggestions: CityResult[];
  /** Whether to show the dropdown */
  showDropdown: boolean;
  /** Current locale for formatting */
  locale: string;
  /** Callback when input value changes */
  onChange: (value: string) => void;
  /** Callback when input gains focus */
  onFocus: () => void;
  /** Callback when input loses focus */
  onBlur: () => void;
  /** Callback when a city is selected */
  onSelect: (city: CityResult) => void;
  /** Translation function */
  t: (key: string, fallback: string) => string;
}

/**
 * CityAutocompleteField Component
 *
 * City input field with autocomplete dropdown functionality.
 * Shows city suggestions from the OpenWeather API and allows selection.
 */
export const CityAutocompleteField: React.FC<CityAutocompleteFieldProps> = React.memo(({
  id,
  value,
  suggestions,
  showDropdown,
  locale,
  onChange,
  onFocus,
  onBlur,
  onSelect,
  t,
}) => {
  return (
    <div className={styles.relative}>
      <label htmlFor={id} className={styles.label}>
        {t('compatibilityPage.cityOfBirth', 'City of Birth')}
      </label>
      <input
        id={id}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={() => setTimeout(onBlur, 200)}
        placeholder={t('compatibilityPage.cityPlaceholder', 'e.g., Seoul, KR')}
        className={styles.input}
      />
      {suggestions.length > 0 && showDropdown && (
        <ul className={styles.dropdown}>
          {suggestions.map((c, i) => {
            const formattedCity = formatCityForDropdown(c.name, c.country, locale);
            return (
              <li
                key={`${c.name}-${c.country}-${i}`}
                className={styles.dropdownItem}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(c);
                }}
              >
                {formattedCity}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});

CityAutocompleteField.displayName = 'CityAutocompleteField';
