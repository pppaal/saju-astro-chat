import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

/**
 * Custom hook for managing saved posts state with localStorage persistence
 * Automatically loads saved posts from localStorage on mount
 *
 * @returns Object containing savedPosts Set and setter function
 */
export function useSavedPosts(): {
  savedPosts: Set<string>;
  setSavedPosts: React.Dispatch<React.SetStateAction<Set<string>>>;
} {
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());

  // Load saved posts from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("savedPosts");
    if (saved) {
      try {
        const savedArray = JSON.parse(saved);
        setSavedPosts(new Set(savedArray));
      } catch (e) {
        logger.error("Failed to load saved posts", e);
      }
    }
  }, []);

  return {
    savedPosts,
    setSavedPosts,
  };
}
