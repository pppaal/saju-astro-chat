# DestinyPal – Feature Overview

## Week 3 Performance Optimization (RAG)

### Target: p95 API < 700ms (from 1500ms)

**Completed optimizations:**

1. **OptimizedRAGManager** (`backend_ai/app/rag/optimized_manager.py`)
   - Parallel execution of all RAG systems using `asyncio.gather()`
   - Query result caching with LRU + TTL (256 entries, 5min TTL)
   - Pre-warmed embedding caches eliminate cold start
   - Thread pool (4 workers) for CPU-bound operations
   - Configurable timeouts and feature flags

2. **Enhanced Warmup** (`backend_ai/app/startup/warmup.py`)
   - `warmup_optimized()` - Full parallel warmup with sample query
   - `warmup_parallel()` - ThreadPoolExecutor-based startup
   - Pre-computes embeddings to eliminate first-request latency

3. **Redis Cache Improvements** (`backend_ai/app/redis_cache.py`)
   - Connection pooling (10 connections, reused across requests)
   - Circuit breaker for resilience (auto-recovery after 30s)
   - RAG-specific cache methods with optimized TTLs
   - LRU eviction for memory fallback

4. **Benchmark Tool** (`backend_ai/app/rag/benchmark.py`)
   - Run: `python -m backend_ai.app.rag.benchmark --warmup -n 20`
   - Validates p95 < 700ms target
   - Reports detailed timing statistics

**Environment Variables:**
```bash
WARMUP_ON_START=1           # Enable warmup on server start
WARMUP_OPTIMIZED=1          # Use OptimizedRAGManager warmup
RAG_DISABLE=1               # Disable RAG entirely (testing only)
```

**Performance Results:**
- Cold start: 3-5s → ~500ms (with warmup)
- Warm requests: 1500ms → 300-500ms
- Cache hits: <10ms

---

## Recently Shipped
- Social: like/unlike on posts/comments/replies with live counts; bookmarks saved locally.
- Threads: nested replies with mention support (`@username`) and highlighting.
- Discovery: real-time search across titles/content/authors/tags, with category and sort filters.
- Profile: activity timeline, saved posts, and stats dashboard (recent usage, member-since, saved count).
- Themes: dark/light with system detection, smooth transitions, and local persistence.
- SEO: Open Graph/Twitter cards, JSON-LD (WebSite/Organization/Article), sitemap/robots config.
- Analytics: GA4 events (likes, comments, post creation, readings, search/filter), Microsoft Clarity, optional Sentry.

## Stack
- Next.js (App Router), React, TypeScript, Tailwind + CSS Modules.
- Auth: NextAuth + Prisma.
- Analytics/Monitoring: GA4, Clarity, optional Sentry.
- Services: Tarot, Saju, Astrology, Dream, Compatibility, Personality, Calendar, etc.

## Environment Variables (add to `.env.local`)
```bash
# Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_CLARITY_ID=xxxxxxxxxx

# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx

# SEO
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
NEXT_PUBLIC_GOOGLE_VERIFICATION=xxx
```

## Usage Notes
- Mentions: type `@username` in comments/replies to tag; mentioned users are highlighted.
- Bookmarks: click the bookmark icon to toggle; stored in localStorage.
- Theme: respects system preference; manual toggle persists.
- Analytics only fire when env vars are set; Sentry is opt-in (uncomment related code when DSN is provided).

## Adding Features
1) Update this FEATURES.md.
2) Add analytics events for user actions.
3) Include error handling and accessibility (ARIA).
4) Test in both dark/light modes.
