import { useEffect } from 'react';
import { searchCities } from '@/lib/cities';
import type { PersonForm, CityItem } from '@/app/compatibility/lib';

export function useCityAutocomplete(
  persons: PersonForm[],
  setPersons: React.Dispatch<React.SetStateAction<PersonForm[]>>
) {
  // Extract cityQuery values to avoid re-triggering when suggestions change
  const cityQueries = persons.map((p) => p.cityQuery);
  const citySelected = persons.map((p) => p.lat !== null && p.lon !== null);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    cityQueries.forEach((query, idx) => {
      const q = query.trim();
      // Skip if city already selected or query too short
      if (citySelected[idx] || q.length < 2) {
        setPersons((prev) => {
          if (prev[idx].suggestions.length === 0) {return prev;}
          const next = [...prev];
          next[idx] = { ...next[idx], suggestions: [], showDropdown: false };
          return next;
        });
        return;
      }
      const t = setTimeout(async () => {
        try {
          const items = (await searchCities(q, { limit: 20 })) as CityItem[];
          setPersons((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], suggestions: items, showDropdown: true };
            return next;
          });
        } catch {
          setPersons((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], suggestions: [] };
            return next;
          });
        }
      }, 150);
      timers.push(t);
    });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityQueries.join('|'), citySelected.join('|')]);
}
