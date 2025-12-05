# Database Migration Guide - Personalization Features

## 📋 Overview

This migration adds user personalization features including interaction tracking and user preferences.

## 🆕 New Models

### 1. UserInteraction
Tracks all user interactions for personalization and analytics:
- Reading history
- Chat conversations
- Feedback ratings
- Service usage patterns

### 2. UserPreferences
Stores user preferences for customized experience:
- Preferred language
- Favorite themes (love, career, etc.)
- Favorite services (saju, tarot, etc.)
- Notification settings
- Reading length preference
- Tone preference

## 🔧 Migration Steps

### Step 1: Verify Database Connection
```bash
npx prisma db pull
```

### Step 2: Create Migration
```bash
npx prisma migrate dev --name add_personalization_models
```

If you see drift warnings, you have two options:

#### Option A: Reset Database (Development Only)
⚠️ **This will delete all data!**
```bash
npx prisma migrate reset
npx prisma migrate dev
```

#### Option B: Create Baseline Migration (Production)
```bash
npx prisma migrate resolve --applied <migration_name>
npx prisma migrate dev --name add_personalization_models
```

### Step 3: Generate Prisma Client
```bash
npx prisma generate
```

### Step 4: Verify Migration
```bash
npx prisma migrate status
```

## 📊 Schema Changes

### Modified Tables

#### User Table
```sql
-- New relations
interactions UserInteraction[]
preferences UserPreferences?
```

### New Tables

#### UserInteraction
```sql
CREATE TABLE "UserInteraction" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "type" TEXT NOT NULL,  -- "reading", "chat", "feedback", "share"
  "service" TEXT NOT NULL,  -- "saju", "tarot", "astrology", etc.
  "theme" TEXT,  -- "love", "career", "health", etc.
  "rating" INTEGER,  -- 1-5
  "metadata" JSONB,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE INDEX "UserInteraction_userId_createdAt_idx" ON "UserInteraction"("userId", "createdAt");
CREATE INDEX "UserInteraction_userId_service_idx" ON "UserInteraction"("userId", "service");
CREATE INDEX "UserInteraction_userId_theme_idx" ON "UserInteraction"("userId", "theme");
```

#### UserPreferences
```sql
CREATE TABLE "UserPreferences" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT UNIQUE NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP,
  "preferredLanguage" TEXT DEFAULT 'en',
  "preferredThemes" JSONB,  -- ["love", "career"]
  "preferredServices" JSONB,  -- ["saju", "tarot"]
  "notificationSettings" JSONB,  -- {daily: true, weekly: false}
  "readingLength" TEXT DEFAULT 'medium',  -- "short", "medium", "long"
  "tonePreference" TEXT DEFAULT 'casual',  -- "casual", "formal", "mystical"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
```

## 🚀 Usage Examples

### Track User Interaction
```typescript
import { prisma } from '@/lib/prisma';

await prisma.userInteraction.create({
  data: {
    userId: session.user.id,
    type: 'reading',
    service: 'saju',
    theme: 'love',
    rating: 5,
    metadata: {
      duration: 120,
      completedAt: new Date().toISOString(),
    }
  }
});
```

### Get User Preferences
```typescript
const preferences = await prisma.userPreferences.findUnique({
  where: { userId: session.user.id }
});

// Use preferences in AI prompt
const readingLength = preferences?.readingLength || 'medium';
const tone = preferences?.tonePreference || 'casual';
```

### Get User's Favorite Themes
```typescript
const interactions = await prisma.userInteraction.findMany({
  where: {
    userId: session.user.id,
    type: 'reading',
    rating: { gte: 4 }
  },
  select: { theme: true },
  orderBy: { createdAt: 'desc' },
  take: 20
});

// Count theme frequency
const themeCounts = interactions.reduce((acc, { theme }) => {
  if (theme) acc[theme] = (acc[theme] || 0) + 1;
  return acc;
}, {} as Record<string, number>);
```

### Personalize AI Response
```typescript
import { enhanceTranslation } from '@/lib/i18n/translation-enhancer';

// Get user preferences
const prefs = await prisma.userPreferences.findUnique({
  where: { userId }
});

// Apply to AI prompt
const prompt = buildTonePrompt(
  prefs?.preferredLanguage || 'en',
  theme
);

// Enhance translation
const enhanced = enhanceTranslation(
  aiResponse,
  prefs?.preferredLanguage || 'en',
  {
    domain: 'astrology',
    tone: prefs?.tonePreference || 'casual',
    length: prefs?.readingLength || 'medium'
  }
);
```

## 🔍 Analytics Queries

### Most Popular Services
```typescript
const popularServices = await prisma.userInteraction.groupBy({
  by: ['service'],
  _count: { id: true },
  orderBy: { _count: { id: 'desc' } }
});
```

### User Engagement Over Time
```typescript
const engagement = await prisma.userInteraction.groupBy({
  by: ['createdAt'],
  where: {
    createdAt: {
      gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
    }
  },
  _count: { id: true }
});
```

### Average Rating by Service
```typescript
const ratings = await prisma.userInteraction.groupBy({
  by: ['service'],
  where: { rating: { not: null } },
  _avg: { rating: true }
});
```

## ⚠️ Important Notes

1. **Backup First**: Always backup your database before running migrations in production
2. **Test Locally**: Test migrations in development environment first
3. **Monitor Performance**: New indexes may take time to build on large tables
4. **JSONB Queries**: Use appropriate indexes for JSONB queries if needed
5. **Data Privacy**: UserInteraction stores sensitive data - ensure GDPR compliance

## 🔄 Rollback

If you need to rollback this migration:

```bash
npx prisma migrate resolve --rolled-back <migration_name>
```

Then manually drop the tables:
```sql
DROP TABLE IF EXISTS "UserPreferences";
DROP TABLE IF EXISTS "UserInteraction";
```

## 📝 Checklist

- [ ] Backup production database
- [ ] Test migration in development
- [ ] Run migration in staging
- [ ] Verify all indexes created
- [ ] Test application functionality
- [ ] Monitor database performance
- [ ] Update API endpoints to use new models
- [ ] Deploy application changes
- [ ] Run migration in production
- [ ] Verify production functionality

## 📚 Related Files

- `prisma/schema.prisma` - Database schema
- `src/lib/i18n/translation-enhancer.ts` - Translation utilities
- `src/lib/destiny-map/prompt/fortune/base/toneStyle.ts` - Enhanced AI prompts
- `backend_ai/app/app.py` - Backend performance monitoring
- `backend_ai/app/fusion_logic.py` - AI fusion logic with caching

## 🎯 Next Steps

After migration:

1. **Implement Tracking**: Add `UserInteraction.create()` calls in API routes
2. **Build Preferences UI**: Create settings page for user preferences
3. **Analytics Dashboard**: Build admin dashboard for interaction analytics
4. **Personalization Engine**: Use preferences in AI prompt generation
5. **A/B Testing**: Test personalized vs non-personalized responses

## 🆘 Troubleshooting

### "Can't reach database server"
- Check DATABASE_URL in `.env`
- Verify database is running
- Check firewall/network settings

### "Migration is in a failed state"
```bash
npx prisma migrate resolve --rolled-back <migration_name>
npx prisma migrate dev
```

### "Drift detected"
```bash
npx prisma db pull
npx prisma migrate dev
```

### Foreign key constraint errors
- Ensure User table exists
- Check relationMode in schema.prisma
- Verify ON DELETE CASCADE is set correctly
