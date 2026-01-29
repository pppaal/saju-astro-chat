# Lazy Loading Migration Guide

This guide explains how to migrate from synchronous data imports to lazy-loaded data for better bundle optimization.

## 🎯 Overview

Large static data files have been extracted to JSON and can be loaded on-demand, reducing initial bundle size by 85-93%.

## 📦 Available Lazy Loaders

### 1. I Ching Enhanced Data

**Location**: `src/lib/iChing/enhancedDataLoader.ts`

#### Migration Example

**Before (Synchronous - 293KB loaded immediately)**:
```typescript
import { enhancedHexagramData, enhancedHexagramDataKo } from '@/lib/iChing/enhancedData';

function MyComponent({ hexagramNumber, language }) {
  const data = language === 'ko'
    ? enhancedHexagramDataKo[hexagramNumber]
    : enhancedHexagramData[hexagramNumber];

  return <div>{data?.quickSummary.oneLiner}</div>;
}
```

**After (Asynchronous - ~40KB loaded on-demand)**:
```typescript
import { useEffect, useState } from 'react';
import { getEnhancedHexagramData, getEnhancedHexagramDataKo } from '@/lib/iChing/enhancedDataLoader';

function MyComponent({ hexagramNumber, language }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const result = language === 'ko'
        ? await getEnhancedHexagramDataKo(hexagramNumber)
        : await getEnhancedHexagramData(hexagramNumber);
      setData(result);
      setLoading(false);
    };
    loadData();
  }, [hexagramNumber, language]);

  if (loading) return <div>Loading...</div>;
  return <div>{data?.quickSummary.oneLiner}</div>;
}
```

**Better: Using the Async Hook**:
```typescript
import { useHexagramDataAsync } from '@/components/iching/hooks/useHexagramDataAsync';

function MyComponent({ result, language }) {
  const {
    enhancedData,
    enhancedDataLoading,
    premiumData,
    luckyInfo
  } = useHexagramDataAsync({ result, language });

  if (enhancedDataLoading) return <div>Loading...</div>;
  return <div>{enhancedData?.quickSummary.oneLiner}</div>;
}
```

#### API Reference

```typescript
// Get single hexagram data
const data = await getEnhancedHexagramData(hexagramNumber); // English
const dataKo = await getEnhancedHexagramDataKo(hexagramNumber); // Korean

// Preload multiple hexagrams (for performance)
await preloadHexagramRange(1, 16, 'both'); // Preload hexagrams 1-16

// Clear cache (for memory management)
clearEnhancedDataCache();

// Get cache statistics
const stats = getCacheStats();
console.log(stats); // { enChunksLoaded: 2, koChunksLoaded: 1, totalChunksLoaded: 3 }
```

### 2. Blog Posts

**Location**: `src/data/blogPostLoader.ts`

#### Migration Example

**Before (Synchronous - 103KB loaded immediately)**:
```typescript
import { blogPosts } from '@/data/blog-posts';

function BlogList() {
  const posts = blogPosts;
  return (
    <ul>
      {posts.map(post => (
        <li key={post.slug}>{post.title}</li>
      ))}
    </ul>
  );
}
```

**After (Asynchronous - 6.67KB index loaded, full posts on-demand)**:
```typescript
import { useEffect, useState } from 'react';
import { getBlogPostsIndex } from '@/data/blogPostLoader';

function BlogList() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPosts = async () => {
      const data = await getBlogPostsIndex();
      setPosts(data);
      setLoading(false);
    };
    loadPosts();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <ul>
      {posts.map(post => (
        <li key={post.slug}>{post.title}</li>
      ))}
    </ul>
  );
}
```

**For Detail Page**:
```typescript
import { useEffect, useState } from 'react';
import { getBlogPost } from '@/data/blogPostLoader';

function BlogPost({ slug }) {
  const [post, setPost] = useState(null);

  useEffect(() => {
    const loadPost = async () => {
      const data = await getBlogPost(slug);
      setPost(data);
    };
    loadPost();
  }, [slug]);

  if (!post) return <div>Loading...</div>;

  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>
    </article>
  );
}
```

#### API Reference

```typescript
// Get blog posts index (metadata only, 6.67KB)
const posts = await getBlogPostsIndex();

// Get full blog post with content
const post = await getBlogPost('what-is-saju-four-pillars-destiny');

// Get featured posts
const featured = await getFeaturedPosts();

// Get posts by category
const sajuPosts = await getPostsByCategory('Saju');

// Get recent posts
const recent = await getRecentPosts(5);

// Preload multiple posts
await preloadBlogPosts(['slug-1', 'slug-2', 'slug-3']);

// Clear cache
clearBlogPostCache();

// Get cache statistics
const stats = getBlogCacheStats();
console.log(stats); // { postsLoaded: 3, indexLoaded: true }
```

## 🎨 UI Patterns

### Loading States

**Skeleton Loader**:
```typescript
function EnhancedDataDisplay({ hexagramNumber, language }) {
  const { enhancedData, enhancedDataLoading } = useHexagramDataAsync({
    result: { primaryHexagram: { number: hexagramNumber } },
    language
  });

  if (enhancedDataLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  return <div>{enhancedData?.quickSummary.essence}</div>;
}
```

**Spinner**:
```typescript
if (loading) {
  return (
    <div className="flex justify-center items-center p-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
    </div>
  );
}
```

### Error Handling

```typescript
function SafeDataLoader({ hexagramNumber, language }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getEnhancedHexagramData(hexagramNumber);
        setData(result);
      } catch (err) {
        setError(err.message);
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [hexagramNumber]);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!data) return <EmptyState />;

  return <DataDisplay data={data} />;
}
```

## 🚀 Performance Tips

### 1. Preloading

Preload data when you know it will be needed soon:

```typescript
function HexagramList({ hexagrams }) {
  useEffect(() => {
    // Preload data for all hexagrams in the list
    const numbers = hexagrams.map(h => h.number);
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    preloadHexagramRange(min, max, 'ko');
  }, [hexagrams]);

  return <div>{/* render list */}</div>;
}
```

### 2. Caching Strategy

The loaders use in-memory caching. Data is cached until:
- Page refresh
- Manual cache clear
- Component unmount (no effect on cache)

For long-running sessions, consider clearing cache periodically:

```typescript
// Clear cache after 30 minutes
useEffect(() => {
  const interval = setInterval(() => {
    clearEnhancedDataCache();
    clearBlogPostCache();
  }, 30 * 60 * 1000);

  return () => clearInterval(interval);
}, []);
```

### 3. Server-Side Rendering

For better SEO and initial load:

```typescript
// In a Next.js page
export async function getServerSideProps({ params }) {
  const post = await fetch(`https://yoursite.com/data/blog/${params.slug}.json`)
    .then(res => res.json());

  return {
    props: { post }
  };
}
```

### 4. Static Generation

For blog posts that don't change often:

```typescript
export async function getStaticProps({ params }) {
  const fs = require('fs');
  const path = require('path');

  const filePath = path.join(process.cwd(), 'public/data/blog', `${params.slug}.json`);
  const post = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  return {
    props: { post },
    revalidate: 3600 // Revalidate every hour
  };
}

export async function getStaticPaths() {
  const fs = require('fs');
  const path = require('path');

  const indexPath = path.join(process.cwd(), 'public/data/blog/index.json');
  const posts = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

  return {
    paths: posts.map(post => ({ params: { slug: post.slug } })),
    fallback: false
  };
}
```

## 🔍 Debugging

### Check if data is loading

```typescript
import { getCacheStats } from '@/lib/iChing/enhancedDataLoader';

useEffect(() => {
  console.log('Cache stats:', getCacheStats());
}, []);
```

### Verify JSON files exist

```bash
# Check I Ching data
ls public/data/iching/

# Check blog posts
ls public/data/blog/
```

### Network tab

Open browser DevTools → Network tab → Filter by "JSON" to see:
- Which files are being loaded
- Load times
- Cache hits

## 📝 Checklist for Migration

When migrating a component to use lazy loading:

- [ ] Replace synchronous import with async loader
- [ ] Add loading state
- [ ] Add error handling
- [ ] Test with slow network (DevTools throttling)
- [ ] Verify data loads correctly
- [ ] Check console for errors
- [ ] Update tests
- [ ] Document changes

## ⚠️ Common Pitfalls

### 1. Not handling loading state
```typescript
// ❌ Bad - no loading state
const data = await getData();
return <div>{data.field}</div>; // Crashes if data is null

// ✅ Good
if (!data) return <Loading />;
return <div>{data.field}</div>;
```

### 2. Not cleaning up async operations
```typescript
// ❌ Bad - memory leak
useEffect(() => {
  loadData().then(setData);
}, []);

// ✅ Good - cleanup on unmount
useEffect(() => {
  let cancelled = false;
  loadData().then(result => {
    if (!cancelled) setData(result);
  });
  return () => { cancelled = true; };
}, []);
```

### 3. Loading in render
```typescript
// ❌ Bad - infinite loop
function Component() {
  const [data, setData] = useState(null);
  loadData().then(setData); // Runs on every render!
  return <div>{data}</div>;
}

// ✅ Good - use useEffect
function Component() {
  const [data, setData] = useState(null);
  useEffect(() => {
    loadData().then(setData);
  }, []);
  return <div>{data}</div>;
}
```

## 📚 Related Documentation

- [Bundle Optimization Guide](./BUNDLE_OPTIMIZATION.md)
- [Performance Best Practices](./PERFORMANCE.md)
- Next.js [Dynamic Imports](https://nextjs.org/docs/advanced-features/dynamic-import)
- React [Suspense](https://react.dev/reference/react/Suspense)

---

**Last Updated**: 2026-01-26
