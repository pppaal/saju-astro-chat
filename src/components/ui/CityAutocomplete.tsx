'use client';

import React, { useState, useEffect, useRef } from 'react';
import { searchCities } from '@/lib/cities';
import { formatCityForDropdown } from '@/lib/cities/formatter';
import tzLookup from 'tz-lookup';

interface CityResult {
  name: string;
  country: string;
  lat: number;
  lon: number;
}

interface CitySelectData {
  name: string;
  lat: number;
  lon: number;
  timezone: string;
}

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (city: CitySelectData) => void;
  placeholder?: string;
  className?: string;
  locale?: 'ko' | 'en';
}

// ===== Constants =====

const SEARCH_CONFIG = {
  MIN_QUERY_LENGTH: 2,
  DEBOUNCE_MS: 150,
  RESULTS_LIMIT: 20,
  DEFAULT_TIMEZONE: 'UTC',
} as const;

const KEYBOARD_KEYS = {
  ARROW_DOWN: 'ArrowDown',
  ARROW_UP: 'ArrowUp',
  ENTER: 'Enter',
  ESCAPE: 'Escape',
  TAB: 'Tab',
} as const;

const LOCALE_TEXTS = {
  searching: { ko: '검색 중...', en: 'Searching...' },
  noResults: { ko: '검색 결과가 없습니다', en: 'No results found' },
  tryDifferent: { ko: '다른 도시 이름을 시도해보세요', en: 'Try a different city name' },
} as const;

// ===== Dropdown Content Components =====

const LoadingSpinner = () => (
  <svg
    className="animate-spin h-4 w-4"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const LoadingState = ({ locale }: { locale: 'ko' | 'en' }) => (
  <div className="px-4 py-3 text-center text-slate-400 flex items-center justify-center gap-2">
    <LoadingSpinner />
    <span>{LOCALE_TEXTS.searching[locale]}</span>
  </div>
);

const EmptyState = ({ locale }: { locale: 'ko' | 'en' }) => (
  <div className="px-4 py-3 text-center text-slate-400">
    <div className="mb-1 text-2xl">🔍</div>
    <div className="text-sm">{LOCALE_TEXTS.noResults[locale]}</div>
    <div className="text-xs mt-1 text-slate-500">
      {LOCALE_TEXTS.tryDifferent[locale]}
    </div>
  </div>
);

export default function CityAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Search for a city...',
  className = '',
  locale = 'en',
}: CityAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CityResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper to reset search state
  const resetSearchState = () => {
    setSuggestions([]);
    setShowDropdown(false);
    setSelectedIndex(-1);
    setIsSearching(false);
    setHasSearched(false);
  };

  // Helper to set search complete state
  const setSearchComplete = (results: CityResult[]) => {
    setSuggestions(results);
    setShowDropdown(true);
    setSelectedIndex(-1);
    setIsSearching(false);
    setHasSearched(true);
  };

  // Search for cities when value changes
  useEffect(() => {
    if (isSelected) return;

    const query = value.trim();
    if (query.length < SEARCH_CONFIG.MIN_QUERY_LENGTH) {
      resetSearchState();
      return;
    }

    setIsSearching(true);
    setHasSearched(false);
    const timer = setTimeout(async () => {
      try {
        const items = (await searchCities(query, { limit: SEARCH_CONFIG.RESULTS_LIMIT })) as CityResult[];
        setSearchComplete(items);
      } catch {
        setSearchComplete([]);
      }
    }, SEARCH_CONFIG.DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value, isSelected]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTimezoneFromCoordinates = (lat: number, lon: number): string => {
    try {
      const tz = tzLookup(lat, lon);
      return (tz && typeof tz === 'string') ? tz : SEARCH_CONFIG.DEFAULT_TIMEZONE;
    } catch {
      return SEARCH_CONFIG.DEFAULT_TIMEZONE;
    }
  };

  const handleSelect = (city: CityResult) => {
    const displayName = `${city.name}, ${city.country}`;
    onChange(displayName);
    setIsSelected(true);
    setShowDropdown(false);
    setSuggestions([]);
    setHasSearched(false);

    const timezone = getTimezoneFromCoordinates(city.lat, city.lon);

    onSelect({
      name: displayName,
      lat: city.lat,
      lon: city.lon,
      timezone,
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsSelected(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case KEYBOARD_KEYS.ARROW_DOWN:
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;

      case KEYBOARD_KEYS.ARROW_UP:
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;

      case KEYBOARD_KEYS.ENTER:
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;

      case KEYBOARD_KEYS.ESCAPE:
        e.preventDefault();
        setShowDropdown(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;

      case KEYBOARD_KEYS.TAB:
        // Allow default tab behavior but close dropdown
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0 && !isSelected) {
            setShowDropdown(true);
          }
        }}
        placeholder={placeholder}
        className="w-full p-3 border border-slate-600 rounded-md text-base bg-slate-900 text-white
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-controls="city-listbox"
        aria-activedescendant={
          selectedIndex >= 0 ? `city-option-${selectedIndex}` : undefined
        }
      />

      {/* Dropdown with loading, empty, and results states */}
      {showDropdown && (
        <div
          id="city-listbox"
          role="listbox"
          className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-slate-800 border border-slate-600 rounded-md shadow-lg"
          aria-busy={isSearching}
          aria-live="polite"
        >
          {isSearching ? (
            <LoadingState locale={locale} />
          ) : suggestions.length > 0 ? (
            suggestions.map((city, index) => {
              const formattedCity = formatCityForDropdown(city.name, city.country, locale);
              const isSelectedItem = index === selectedIndex;
              return (
                <div
                  key={`${city.name}-${city.country}-${city.lat}-${city.lon}-${index}`}
                  id={`city-option-${index}`}
                  role="option"
                  aria-selected={isSelectedItem}
                  onClick={() => handleSelect(city)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`px-4 py-2 cursor-pointer text-white text-sm transition-colors ${
                    isSelectedItem ? 'bg-blue-600' : 'hover:bg-slate-700'
                  }`}
                >
                  {formattedCity}
                </div>
              );
            })
          ) : hasSearched ? (
            <EmptyState locale={locale} />
          ) : null}
        </div>
      )}
    </div>
  );
}
