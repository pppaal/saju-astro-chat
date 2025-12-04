# Destiny Tracker - Feature Documentation

## 🎨 Recent Updates

### Social Features (Enhanced Community)

#### ❤️ Like/Unlike Toggle
- **Posts**: Click the heart icon to like/unlike posts
- **Comments**: Each comment now has its own like button
- **Replies**: Nested replies also support likes
- Visual feedback: ❤️ (liked) vs 🤍 (not liked)
- Like count displayed in real-time

#### 💬 Nested Replies
- Reply directly to comments
- Threaded conversation view
- Reply count displayed on each comment
- Expandable/collapsible reply sections

#### @Mentions
- Tag users with `@username` syntax
- Works in both comments and replies
- Automatic detection and highlighting
- Mentioned users shown in purple (#7c5cff)

#### 🔖 Bookmarks
- Save posts for later reading
- Bookmark state persisted in localStorage
- Visual indicator for saved posts
- View saved posts count in profile

### Search & Discovery

#### 🔍 Advanced Search
- Real-time search across:
  - Post titles
  - Post content
  - Author names
  - Tags
- Clear search button for quick reset
- Preserves other filters (category, sort)

#### 🏷️ Enhanced Filtering
- Category filters (tarot, zodiac, fortune, etc.)
- Sort by "New" or "Top"
- Combines with search seamlessly

### User Profile

#### 👤 Profile Page (`/profile`)
- **Activity Timeline**: Recent readings and community interactions
- **Statistics Dashboard**:
  - Total readings
  - Community engagement (posts + comments)
  - Member since date
  - Saved posts count
- **Services Used**: Track which features you've accessed
- **Tabs**: Activity, Saved Posts, Statistics

### Theme & Accessibility

#### 🌓 Dark/Light Mode Toggle
- System preference detection
- Manual toggle in header
- Smooth theme transitions
- Preference saved to localStorage
- Optimized color palettes for both modes

### SEO & Marketing

#### 📊 Meta Tags
- Open Graph tags for social sharing
- Twitter Card support
- Dynamic titles and descriptions per page
- Optimized images for sharing

#### 🔍 Structured Data (JSON-LD)
- WebSite schema
- Organization schema
- Article schema for posts
- Search action integration
- Breadcrumb navigation

#### 🗺️ Sitemap & Robots
- Auto-generated sitemap.xml
- Comprehensive page coverage
- robots.txt configuration
- Search engine optimization

### Analytics & Tracking

#### 📈 Google Analytics 4
- Pageview tracking
- Custom event tracking:
  - Like/unlike actions
  - Comment submissions
  - Post creation
  - Reading generations (Tarot, Astrology, Saju)
  - Search queries
  - Category filters
- User journey tracking

#### 🎥 Microsoft Clarity
- Session replay
- Heatmaps
- User behavior insights
- Click tracking
- Scroll depth analysis

#### 🐛 Error Tracking (Sentry)
- Error monitoring (optional)
- Performance tracking
- Session replay on errors
- Custom error context
- User feedback integration

## 🚀 Setup Instructions

### Environment Variables

Add to your `.env.local`:

```bash
# Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX          # Google Analytics 4
NEXT_PUBLIC_CLARITY_ID=xxxxxxxxxx        # Microsoft Clarity

# Error Tracking (Optional)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx

# SEO
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
NEXT_PUBLIC_GOOGLE_VERIFICATION=xxx
```

### Google Analytics Setup

1. Create GA4 property at [analytics.google.com](https://analytics.google.com)
2. Get your Measurement ID (starts with `G-`)
3. Add to `.env.local` as `NEXT_PUBLIC_GA_ID`
4. Analytics will auto-track pageviews and custom events

### Microsoft Clarity Setup

1. Sign up at [clarity.microsoft.com](https://clarity.microsoft.com)
2. Create a project
3. Copy your Project ID
4. Add to `.env.local` as `NEXT_PUBLIC_CLARITY_ID`

### Sentry Setup (Optional)

```bash
# Install Sentry
npm install @sentry/nextjs

# Run setup wizard
npx @sentry/wizard@latest -i nextjs

# Add DSN to .env.local
NEXT_PUBLIC_SENTRY_DSN=your-dsn-here

# Uncomment Sentry code in src/lib/sentry.ts
```

## 📚 Usage Examples

### Track Custom Events

```typescript
import { analytics } from "@/components/analytics/GoogleAnalytics";

// Track user actions
analytics.likePost(postId);
analytics.generateDestinyMap();
analytics.search("tarot reading");
```

### Error Tracking

```typescript
import { captureError, captureMessage } from "@/lib/sentry";

try {
  // Your code
} catch (error) {
  captureError(error, { context: "additional info" });
}

captureMessage("Something important happened", "info");
```

### Using Mentions

In comments or replies, type `@username` to mention someone:
```
@Orion Thanks for sharing this tarot reading!
```

### Bookmarking Posts

1. Click the 📑 icon on any post
2. Icon changes to 🔖 when saved
3. View all saved posts in your profile

## 🎯 Key Features Summary

✅ **Social Enhancements**
- Like/unlike posts, comments, and replies
- Nested threaded comments
- @mention functionality
- Bookmark/save posts

✅ **Search & Discovery**
- Full-text search
- Multi-filter support
- Real-time results

✅ **User Experience**
- Dark/light mode toggle
- Profile with activity history
- Toast notifications
- Skeleton loading states
- Error boundaries

✅ **SEO & Performance**
- Open Graph & Twitter Cards
- JSON-LD structured data
- Sitemap & robots.txt
- Optimized fonts & images

✅ **Analytics & Monitoring**
- Google Analytics 4
- Microsoft Clarity
- Sentry error tracking
- Custom event tracking

## 🔧 Technical Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: CSS Modules, Tailwind CSS
- **State Management**: React Context API
- **Analytics**: GA4, Microsoft Clarity
- **Error Tracking**: Sentry (optional)
- **SEO**: Next.js Metadata API, JSON-LD
- **Authentication**: NextAuth.js

## 📖 Documentation

- [Google Analytics Events](.docs/analytics-events.md)
- [SEO Best Practices](.docs/seo-guide.md)
- [Component API](.docs/components.md)

## 🤝 Contributing

When adding new features:
1. Update this FEATURES.md file
2. Add analytics tracking for user actions
3. Include proper error handling
4. Write accessible HTML with ARIA labels
5. Test in both dark and light modes

## 📝 Notes

- Analytics only load when environment variables are set
- Sentry is optional and requires manual setup
- All social features work offline (localStorage)
- Profile data is currently mock data (replace with API)
