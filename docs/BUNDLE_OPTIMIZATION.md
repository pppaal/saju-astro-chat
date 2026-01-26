# Bundle Size Optimization Guide

This document explains the bundle optimization strategies implemented in this project.

## 📊 Problem Statement

The original codebase had several large data files that were being bundled entirely:

- `enhancedData.ts`: **293KB** (6,822 lines) - I Ching hexagram data
- `blog-posts.ts`: **103KB** (2,783 lines) - Blog post content
- Other large static data files

These files were imported directly in React components, causing:
- 🐌 Slow initial page load
- 📦 Large JavaScript bundle size
- 💾 Unnecessary data loaded on every page

## ✅ Solutions Implemented

### 1. Data Extraction to JSON

Large TypeScript data files have been extracted to static JSON files:

#### I Ching Enhanced Data
- **Before**: Single 293KB TypeScript file
- **After**: 17 JSON files (8 chunks × 2 languages + index)
- **Location**: `public/data/iching/`
- **Chunk size**: ~30-40KB per chunk

```
public/data/iching/
├── index.json
├── enhanced-data-en-1-8.json (48KB)
├── enhanced-data-en-9-16.json (43KB)
├── ...
└── enhanced-data-ko-1-8.json (30KB)
```

#### Blog Posts
- **Before**: Single 103KB TypeScript file with all content
- **After**: 12 JSON files (11 posts + 1 index)
- **Location**: `public/data/blog/`
- **Index size**: 6.67KB (only metadata)
- **Full posts**: Loaded on-demand

```
public/data/blog/
├── index.json (6.67KB - metadata only)
├── what-is-saju-four-pillars-destiny.json
├── tarot-card-meanings-beginners-guide.json
└── ...
```

### 2. Lazy Loading Implementation

#### I Ching Data Loader
- **File**: `src/lib/iChing/enhancedDataLoader.ts`
- **Features**:
  - On-demand chunk loading
  - Client-side caching
  - Preload API for performance
  - Support for both English and Korean

**Usage Example**:
```typescript
import { getEnhancedHexagramData } from '@/lib/iChing/enhancedDataLoader';

// Load data on-demand
const data = await getEnhancedHexagramData(1); // Loads only chunk 1-8

// Preload multiple hexagrams
await preloadHexagramRange(1, 16, 'both'); // Preloads chunks 1-16
```

#### React Hook (Async Version)
- **File**: `src/components/iching/hooks/useHexagramDataAsync.ts`
- **Benefits**:
  - Non-blocking data loading
  - Loading state management
  - Automatic cleanup on unmount

**Migration Example**:
```typescript
// Before (synchronous, loads all 293KB)
import { enhancedHexagramData } from '@/lib/iChing/enhancedData';
const data = enhancedHexagramData[hexagramNumber];

// After (asynchronous, loads only needed chunk)
import { useHexagramDataAsync } from '@/components/iching/hooks/useHexagramDataAsync';
const { enhancedData, enhancedDataLoading } = useHexagramDataAsync({
  result,
  language: 'ko'
});
```

#### Blog Post Loader
- **File**: `src/data/blogPostLoader.ts`
- **Features**:
  - Lightweight index for listing
  - On-demand full post loading
  - Helper functions for filtering

**Usage Example**:
```typescript
import { getBlogPostsIndex, getBlogPost } from '@/data/blogPostLoader';

// List page - load only metadata
const posts = await getBlogPostsIndex();

// Detail page - load full content
const post = await getBlogPost(slug);
```

### 3. Next.js Configuration Optimizations

#### Code Splitting Strategy
The `next.config.ts` includes custom webpack splitChunks configuration:

```typescript
splitChunks: {
  cacheGroups: {
    // Separate large library directories
    iching: { /* I Ching library */ },
    tarot: { /* Tarot library */ },
    saju: { /* Saju library */ },
    // Vendor separation
    react: { /* React + ReactDOM */ },
    vendors: { /* Other node_modules */ }
  }
}
```

#### Package Import Optimization
```typescript
experimental: {
  optimizePackageImports: [
    'framer-motion',
    'chart.js',
    'recharts',
    'react-markdown',
    'remark-gfm',
    'zod',
  ]
}
```

### 4. Build Scripts

#### Extract Data Scripts
Run these scripts to regenerate JSON files:

```bash
# Extract I Ching data
npx tsx scripts/extract-enhanced-data.ts

# Extract blog posts
npx tsx scripts/extract-blog-posts.ts
```

**Note**: These scripts should be run whenever source data changes.

## 📈 Performance Impact

### Bundle Size Reduction
- **I Ching**: 293KB → ~40KB per route (85% reduction)
- **Blog**: 103KB → 6.67KB index + on-demand posts (93% initial reduction)

### Load Time Improvement
- Initial bundle loads faster (less JavaScript to parse)
- Data loads only when needed
- Better caching (static JSON files)

### User Experience
- ✅ Faster initial page load
- ✅ Better mobile performance
- ✅ Reduced memory usage
- ✅ Progressive enhancement

## 🚀 Best Practices

### When to Use Lazy Loading

**DO use lazy loading for**:
- ✅ Large static data (>50KB)
- ✅ Route-specific data
- ✅ Content that's not immediately visible
- ✅ Data used by specific features only

**DON'T use lazy loading for**:
- ❌ Critical above-the-fold content
- ❌ Small data (<10KB)
- ❌ Data needed immediately on page load
- ❌ Frequently accessed shared data

### Migration Checklist

When converting a large data file to lazy loading:

1. ✅ Extract data to JSON files
2. ✅ Create loader utility with caching
3. ✅ Update React hooks/components to async
4. ✅ Add loading states to UI
5. ✅ Test error handling
6. ✅ Update imports across codebase
7. ✅ Document in this file

### Performance Monitoring

Use Next.js bundle analyzer to track bundle size:

```bash
ANALYZE=true npm run build
```

This will generate an interactive bundle visualization at:
- `.next/analyze/client.html`
- `.next/analyze/server.html`

## 🔍 Troubleshooting

### Issue: Data not loading
**Solution**: Check that JSON files exist in `public/data/` directory

### Issue: 404 errors for JSON files
**Solution**: Ensure files are in the `public/` directory (not `src/`)

### Issue: Stale data after updates
**Solution**: Clear cache with `clearEnhancedDataCache()` or hard refresh

### Issue: High memory usage
**Solution**: Use `clearCache()` functions periodically for long-running sessions

## 📝 Future Optimizations

Potential areas for further optimization:

1. **Server-Side Rendering**: Consider SSR for initial data load
2. **Service Worker**: Cache JSON files with SW for offline support
3. **Compression**: Use brotli compression for static JSON files
4. **CDN**: Serve JSON files from CDN for faster global access
5. **Dynamic Imports**: Convert more static imports to dynamic imports

## 📚 Related Files

- `src/lib/iChing/enhancedDataLoader.ts` - I Ching lazy loader
- `src/data/blogPostLoader.ts` - Blog post lazy loader
- `src/components/iching/hooks/useHexagramDataAsync.ts` - Async React hook
- `scripts/extract-enhanced-data.ts` - Data extraction script
- `scripts/extract-blog-posts.ts` - Blog extraction script
- `next.config.ts` - Webpack and optimization config

## 🤝 Contributing

When adding large data files:

1. Consider if it should be lazy-loaded (>50KB)
2. If yes, extract to JSON and create a loader
3. Update this document with your changes
4. Run bundle analyzer to verify impact

---

**Last Updated**: 2026-01-26
**Bundle Analyzer**: Run `ANALYZE=true npm run build` to visualize current bundle
