# Performance Optimization Guide

This directory contains performance optimization utilities for the DestinyPal application.

## 📊 Web Vitals Monitoring

### What are Core Web Vitals?

Core Web Vitals are a set of metrics that Google uses to measure user experience:

- **LCP (Largest Contentful Paint)**: Measures loading performance. Good LCP is < 2.5s
- **FID (First Input Delay)**: Measures interactivity. Good FID is < 100ms
- **CLS (Cumulative Layout Shift)**: Measures visual stability. Good CLS is < 0.1
- **FCP (First Contentful Paint)**: Time until first content is rendered
- **TTFB (Time to First Byte)**: Server response time
- **INP (Interaction to Next Paint)**: Measures responsiveness to interactions

### Usage

Web Vitals are automatically tracked via the `WebVitalsReporter` component in `layout.tsx`:

```typescript
import { WebVitalsReporter } from '@/components/performance/WebVitalsReporter';

// In your layout
<WebVitalsReporter />
```

### Custom Performance Measurements

```typescript
import { PerformanceMonitor } from '@/lib/performance/web-vitals-reporter';

// Start measurement
PerformanceMonitor.mark('data-fetch');

// ... do work ...

// End measurement and log duration
const duration = PerformanceMonitor.measure('data-fetch');
console.log(`Data fetch took ${duration}ms`);

// Get current duration without ending
const currentDuration = PerformanceMonitor.getDuration('data-fetch');
```

## ⚛️ React Optimization Hooks

### useDebounce

Delays updating a value until after a specified time has passed:

```typescript
import { useDebounce } from '@/lib/performance/react-optimization-utils';

function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    // Only runs 500ms after user stops typing
    performSearch(debouncedSearch);
  }, [debouncedSearch]);

  return <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />;
}
```

### useThrottle

Limits how often a value can update:

```typescript
import { useThrottle } from '@/lib/performance/react-optimization-utils';

function ScrollTracker() {
  const [scrollPosition, setScrollPosition] = useState(0);
  const throttledScroll = useThrottle(scrollPosition, 100);

  useEffect(() => {
    const handleScroll = () => setScrollPosition(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Updates at most every 100ms
  return <div>Scroll: {throttledScroll}px</div>;
}
```

### useIntersectionObserver

Detects when an element enters or leaves the viewport:

```typescript
import { useIntersectionObserver } from '@/lib/performance/react-optimization-utils';

function LazySection() {
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>({
    threshold: 0.5, // 50% visible
  });

  return (
    <div ref={ref}>
      {isVisible && <ExpensiveComponent />}
    </div>
  );
}
```

### useLazyLoad

Simplified lazy loading for components:

```typescript
import { useLazyLoad } from '@/lib/performance/react-optimization-utils';

function HeavyContent() {
  const [ref, shouldLoad] = useLazyLoad<HTMLDivElement>();

  return (
    <div ref={ref}>
      {shouldLoad ? <HeavyComponent /> : <LoadingPlaceholder />}
    </div>
  );
}
```

### useEventCallback

Creates stable callback references that don't cause re-renders:

```typescript
import { useEventCallback } from '@/lib/performance/react-optimization-utils';

function ParentComponent() {
  const [count, setCount] = useState(0);

  // Callback reference never changes, child won't re-render
  const handleClick = useEventCallback(() => {
    console.log('Current count:', count);
    setCount(count + 1);
  });

  return <ChildComponent onClick={handleClick} />;
}
```

### usePrevious

Access the previous value of a state or prop:

```typescript
import { usePrevious } from '@/lib/performance/react-optimization-utils';

function Counter() {
  const [count, setCount] = useState(0);
  const prevCount = usePrevious(count);

  return (
    <div>
      <p>Current: {count}</p>
      <p>Previous: {prevCount}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

### useMediaQuery

Responsive design with CSS media queries:

```typescript
import { useMediaQuery } from '@/lib/performance/react-optimization-utils';

function ResponsiveComponent() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');

  return isMobile ? <MobileView /> : <DesktopView />;
}
```

### useWindowSize

Track window dimensions:

```typescript
import { useWindowSize } from '@/lib/performance/react-optimization-utils';

function AdaptiveLayout() {
  const { width, height } = useWindowSize();

  return (
    <div style={{ width: width > 1200 ? '1200px' : '100%' }}>
      Viewport: {width}x{height}
    </div>
  );
}
```

### LazyComponent

Higher-order component for lazy rendering:

```typescript
import { LazyComponent } from '@/lib/performance/react-optimization-utils';

// Wraps component to only render when visible
const LazyGallery = LazyComponent(
  ({ images }) => <Gallery images={images} />,
  <GallerySkeleton />, // Loading state
  0.1 // Intersection threshold
);
```

## 🖼️ Image Optimization

### OptimizedImage

Use the `OptimizedImage` component for all images:

```typescript
import { OptimizedImage } from '@/components/ui/OptimizedImage';

// Basic usage with lazy loading
<OptimizedImage
  src="/images/photo.jpg"
  alt="Description"
  width={800}
  height={600}
/>

// Priority loading for above-the-fold
<OptimizedImage
  src="/images/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority={true}
/>

// With aspect ratio to prevent layout shift
<OptimizedImage
  src="/images/card.jpg"
  alt="Card image"
  width={400}
  height={300}
  aspectRatio="4/3"
/>
```

See [OptimizedImage.example.tsx](../../components/ui/OptimizedImage.example.tsx) for more examples.

## 📦 Bundle Optimization

### Code Splitting

Use dynamic imports for large components:

```typescript
import dynamic from 'next/dynamic';

// Lazy load heavy component
const HeavyChart = dynamic(() => import('./HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Disable SSR if not needed
});

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <HeavyChart data={chartData} />
    </div>
  );
}
```

### Tree Shaking

Import only what you need:

```typescript
// ❌ Bad - imports entire library
import _ from 'lodash';
const result = _.debounce(fn, 300);

// ✅ Good - imports only needed function
import debounce from 'lodash/debounce';
const result = debounce(fn, 300);
```

### Analyze Bundle Size

```bash
# Generate bundle analysis
ANALYZE=true npm run build

# View the analysis
# Opens browser with interactive bundle visualizer
```

## 🎯 Performance Best Practices

### 1. Memoization

Use `React.memo` for expensive components:

```typescript
import { memo } from 'react';

const ExpensiveComponent = memo(({ data }) => {
  // Heavy rendering logic
  return <div>{processData(data)}</div>;
});
```

### 2. useMemo and useCallback

```typescript
import { useMemo, useCallback } from 'react';

function DataProcessor({ items }) {
  // Memoize expensive calculations
  const processedData = useMemo(() => {
    return items.map(item => expensiveTransform(item));
  }, [items]);

  // Memoize callbacks
  const handleClick = useCallback(() => {
    console.log('Clicked with', processedData);
  }, [processedData]);

  return <List data={processedData} onClick={handleClick} />;
}
```

### 3. Virtual Scrolling

For long lists, use virtualization:

```typescript
import { FixedSizeList } from 'react-window';

function VirtualList({ items }) {
  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>{items[index]}</div>
      )}
    </FixedSizeList>
  );
}
```

### 4. Avoid Inline Functions

```typescript
// ❌ Bad - creates new function on each render
<button onClick={() => handleClick(id)}>Click</button>

// ✅ Good - stable reference
const onClick = useCallback(() => handleClick(id), [id]);
<button onClick={onClick}>Click</button>
```

### 5. Lazy Load Routes

```typescript
// app/heavy-page/page.tsx
import dynamic from 'next/dynamic';

const HeavyFeature = dynamic(() => import('@/components/HeavyFeature'), {
  loading: () => <Skeleton />,
});

export default function HeavyPage() {
  return <HeavyFeature />;
}
```

## 📈 Monitoring Performance

### In Development

```typescript
// Enable React DevTools Profiler
if (process.env.NODE_ENV === 'development') {
  import('react-devtools-inline/frontend');
}
```

### In Production

- Web Vitals are automatically sent to Google Analytics
- Vercel Analytics provides real-time insights
- Sentry tracks performance issues

## 🎨 CSS Performance

### 1. Critical CSS

Critical CSS is automatically extracted by Next.js for above-the-fold content.

### 2. Avoid Layout Thrashing

```typescript
// ❌ Bad - causes multiple reflows
elements.forEach(el => {
  el.style.width = el.offsetWidth + 10 + 'px';
});

// ✅ Good - batch reads and writes
const widths = elements.map(el => el.offsetWidth);
elements.forEach((el, i) => {
  el.style.width = widths[i] + 10 + 'px';
});
```

### 3. Use CSS Transforms

```css
/* ❌ Bad - triggers layout */
.element {
  position: relative;
  left: 100px;
}

/* ✅ Good - uses GPU acceleration */
.element {
  transform: translateX(100px);
}
```

## 🔍 Performance Checklist

- [ ] Images use `OptimizedImage` component
- [ ] Above-the-fold images use `priority={true}`
- [ ] Large components use dynamic imports
- [ ] Heavy lists use virtualization
- [ ] Expensive calculations use `useMemo`
- [ ] Event handlers use `useCallback`
- [ ] Forms use `useDebounce` for API calls
- [ ] Scroll handlers use `useThrottle`
- [ ] Bundle size is analyzed regularly
- [ ] Web Vitals are monitored
- [ ] No inline styles or functions
- [ ] CSS animations use `transform` and `opacity`

## 📚 Resources

- [Web Vitals](https://web.dev/vitals/)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
