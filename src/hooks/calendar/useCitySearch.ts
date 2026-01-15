// src/hooks/calendar/useCitySearch.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { searchCities } from '@/lib/cities';
import tzLookup from 'tz-lookup';
import { logger } from '@/lib/logger';

interface CityHit {
  name: string;
  country: string;
  lat: number;
  lon: number;
  timezone?: string;
}

interface UseCitySearchReturn {
  suggestions: CityHit[];
  selectedCity: CityHit | null;
  openSug: boolean;
  isUserTyping: boolean;
  cityErr: string | null;
  setOpenSug: (open: boolean) => void;
  setSelectedCity: (city: CityHit | null) => void;
  handleCityInputChange: (value: string) => void;
  handleCitySelect: (city: CityHit) => void;
}

/**
 * Hook for city search with suggestions and timezone lookup
 */
export function useCitySearch(): UseCitySearchReturn {
  const [suggestions, setSuggestions] = useState<CityHit[]>([]);
  const [selectedCity, setSelectedCity] = useState<CityHit | null>(null);
  const [openSug, setOpenSug] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [cityErr, setCityErr] = useState<string | null>(null);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const handleCityInputChange = useCallback((value: string) => {
    setIsUserTyping(true);
    setOpenSug(false);
    setCityErr(null);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    const trimmed = value.trim();

    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        const results = await searchCities(trimmed);

        if (results.length === 0) {
          setCityErr('도시를 찾을 수 없습니다');
          setSuggestions([]);
        } else {
          setSuggestions(results);
          setOpenSug(true);
        }
      } catch (err) {
        logger.error('[useCitySearch] Search failed', {
          error: err instanceof Error ? err.message : 'Unknown',
        });
        setCityErr('검색 실패');
        setSuggestions([]);
      } finally {
        setIsUserTyping(false);
      }
    }, 300);
  }, []);

  const handleCitySelect = useCallback((city: CityHit) => {
    try {
      const tz = city.timezone || tzLookup(city.lat, city.lon);
      const enrichedCity = { ...city, timezone: tz };

      setSelectedCity(enrichedCity);
      setOpenSug(false);
      setSuggestions([]);
      setCityErr(null);

      logger.info('[useCitySearch] City selected', {
        city: city.name,
        timezone: tz,
      });
    } catch (err) {
      logger.error('[useCitySearch] Timezone lookup failed', {
        error: err instanceof Error ? err.message : 'Unknown',
      });
      setCityErr('타임존 조회 실패');
    }
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    suggestions,
    selectedCity,
    openSug,
    isUserTyping,
    cityErr,
    setOpenSug,
    setSelectedCity,
    handleCityInputChange,
    handleCitySelect,
  };
}
