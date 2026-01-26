import { useState, useMemo } from 'react';
import type { Post, SortKey } from '../types';

/**
 * Filters and sorts posts based on category, search query, and sort tab
 *
 * @param posts - Array of posts to filter
 * @param category - Category filter
 * @param searchQuery - Search query string
 * @param tab - Sort key ("new" or "top")
 * @returns Filtered and sorted posts array
 */
export function filterAndSort(
  posts: Post[],
  category: string,
  searchQuery: string,
  tab: SortKey
): Post[] {
  let list = posts.filter(p => p.parentId === null && p.status !== "hidden");

  // Category filter
  if (category !== "all") {list = list.filter(p => p.category === category);}

  // Search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    list = list.filter(p =>
      p.title.toLowerCase().includes(query) ||
      p.body?.toLowerCase().includes(query) ||
      p.author.toLowerCase().includes(query) ||
      p.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }

  list = [...list];

  // Sort
  if (tab === "new") {list.sort((a, b) => b.createdAt - a.createdAt);}
  else {list.sort((a, b) => b.likes - a.likes || b.createdAt - a.createdAt);}

  return list;
}

/**
 * Custom hook for managing posts state with filtering and sorting
 *
 * @param initialPosts - Initial posts array
 * @returns Object containing posts state, setPosts function, and getFilteredPosts function
 */
export function usePostsState(initialPosts: Post[]): {
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  getFilteredPosts: (category: string, searchQuery: string, tab: SortKey) => Post[];
} {
  const [posts, setPosts] = useState<Post[]>(initialPosts);

  const getFilteredPosts = useMemo(
    () => (category: string, searchQuery: string, tab: SortKey) =>
      filterAndSort(posts, category, searchQuery, tab),
    [posts]
  );

  return {
    posts,
    setPosts,
    getFilteredPosts,
  };
}
