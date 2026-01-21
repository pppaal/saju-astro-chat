'use client';

import React, { useState, useEffect, useRef } from 'react';
import { searchCities } from '@/lib/cities';
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
}

export default function CityAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Search for a city...',
  className = '',
}: CityAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CityResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSelected, setIsSelected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search for cities when value changes
  useEffect(() => {
    if (isSelected) return;

    const query = value.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const items = (await searchCities(query, { limit: 20 })) as CityResult[];
        setSuggestions(items);
        setShowDropdown(items.length > 0);
      } catch {
        setSuggestions([]);
        setShowDropdown(false);
      }
    }, 150);

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

  const handleSelect = (city: CityResult) => {
    const displayName = `${city.name}, ${city.country}`;
    onChange(displayName);
    setIsSelected(true);
    setShowDropdown(false);
    setSuggestions([]);

    // Get timezone from coordinates
    let timezone = 'UTC';
    try {
      const tz = tzLookup(city.lat, city.lon);
      if (tz && typeof tz === 'string') {
        timezone = tz;
      }
    } catch {
      // Use UTC as fallback
    }

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

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => {
          if (suggestions.length > 0 && !isSelected) {
            setShowDropdown(true);
          }
        }}
        placeholder={placeholder}
        className="w-full p-3 border border-slate-600 rounded-md text-base bg-slate-900 text-white
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        autoComplete="off"
      />
      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 max-h-60 overflow-auto bg-slate-800 border border-slate-600 rounded-md shadow-lg">
          {suggestions.map((city, index) => (
            <li
              key={`${city.name}-${city.country}-${city.lat}-${city.lon}-${index}`}
              onClick={() => handleSelect(city)}
              className="px-4 py-2 cursor-pointer hover:bg-slate-700 text-white text-sm"
            >
              {city.name}, {city.country}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
