import { useState } from 'react';
import type { SortKey } from '../types';

/**
 * Custom hook for managing filter state (tab, category, searchQuery)
 *
 * @returns Object containing filter state and setter functions
 */
export function useFilterState(): {
  tab: SortKey;
  setTab: React.Dispatch<React.SetStateAction<SortKey>>;
  category: string;
  setCategory: React.Dispatch<React.SetStateAction<string>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
} {
  const [tab, setTab] = useState<SortKey>("new");
  const [category, setCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  return {
    tab,
    setTab,
    category,
    setCategory,
    searchQuery,
    setSearchQuery,
  };
}
