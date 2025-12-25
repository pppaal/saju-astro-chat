# DestinyPal – Feature Overview

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
