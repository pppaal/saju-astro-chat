/**
 * User Analytics & Personalization Utilities
 * Track user interactions and derive personalized insights
 */

import { prisma } from '@/lib/db/prisma';

export interface UserInteractionData {
  type: 'reading' | 'chat' | 'feedback' | 'share';
  service: 'saju' | 'tarot' | 'astrology' | 'destiny-map' | 'iching' | 'dream' | 'numerology' | 'compatibility';
  theme?: 'love' | 'career' | 'health' | 'family' | 'year' | 'month' | 'today';
  rating?: number; // 1-5
  metadata?: any;
}

export interface UserProfile {
  favoriteServices: string[];
  favoriteThemes: string[];
  averageRating: number;
  totalInteractions: number;
  lastInteraction: Date | null;
  engagementScore: number; // 0-100
}

/**
 * Track a user interaction
 */
export async function trackInteraction(
  userId: string,
  data: UserInteractionData
): Promise<void> {
  try {
    await prisma.userInteraction.create({
      data: {
        userId,
        type: data.type,
        service: data.service,
        theme: data.theme,
        rating: data.rating,
        metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
      },
    });
  } catch (error) {
    console.error('[trackInteraction] Failed:', error);
    // Don't throw - tracking failure shouldn't break user flow
  }
}

/**
 * Get user's personalization profile
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  const interactions = await prisma.userInteraction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100, // Last 100 interactions
  });

  if (interactions.length === 0) {
    return {
      favoriteServices: [],
      favoriteThemes: [],
      averageRating: 0,
      totalInteractions: 0,
      lastInteraction: null,
      engagementScore: 0,
    };
  }

  // Calculate favorite services
  const serviceCounts = interactions.reduce((acc, item) => {
    acc[item.service] = (acc[item.service] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const favoriteServices = Object.entries(serviceCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([service]) => service);

  // Calculate favorite themes
  const themeCounts = interactions
    .filter((item) => item.theme)
    .reduce((acc, item) => {
      if (item.theme) acc[item.theme] = (acc[item.theme] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const favoriteThemes = Object.entries(themeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([theme]) => theme);

  // Calculate average rating
  const ratingsOnly = interactions.filter((item) => item.rating !== null);
  const averageRating =
    ratingsOnly.length > 0
      ? ratingsOnly.reduce((sum, item) => sum + (item.rating || 0), 0) / ratingsOnly.length
      : 0;

  // Calculate engagement score (0-100)
  const daysSinceFirst =
    (Date.now() - new Date(interactions[interactions.length - 1].createdAt).getTime()) /
    (1000 * 60 * 60 * 24);
  const interactionsPerDay = interactions.length / Math.max(daysSinceFirst, 1);
  const engagementScore = Math.min(100, Math.round(interactionsPerDay * 20 + averageRating * 10));

  return {
    favoriteServices,
    favoriteThemes,
    averageRating: Math.round(averageRating * 10) / 10,
    totalInteractions: interactions.length,
    lastInteraction: interactions[0].createdAt,
    engagementScore,
  };
}

/**
 * Get or create user preferences
 */
export async function getUserPreferences(userId: string) {
  let preferences = await prisma.userPreferences.findUnique({
    where: { userId },
  });

  if (!preferences) {
    // Create default preferences
    preferences = await prisma.userPreferences.create({
      data: {
        userId,
        preferredLanguage: 'en',
        readingLength: 'medium',
        tonePreference: 'casual',
      },
    });
  }

  return preferences;
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(
  userId: string,
  updates: {
    preferredLanguage?: string;
    preferredThemes?: string[];
    preferredServices?: string[];
    notificationSettings?: any;
    readingLength?: 'short' | 'medium' | 'long';
    tonePreference?: 'casual' | 'formal' | 'mystical';
  }
) {
  return await prisma.userPreferences.upsert({
    where: { userId },
    update: {
      ...updates,
      preferredThemes: updates.preferredThemes ? JSON.stringify(updates.preferredThemes) : undefined,
      preferredServices: updates.preferredServices ? JSON.stringify(updates.preferredServices) : undefined,
      notificationSettings: updates.notificationSettings ? JSON.stringify(updates.notificationSettings) : undefined,
    },
    create: {
      userId,
      preferredLanguage: updates.preferredLanguage || 'en',
      readingLength: updates.readingLength || 'medium',
      tonePreference: updates.tonePreference || 'casual',
      preferredThemes: updates.preferredThemes ? JSON.stringify(updates.preferredThemes) : undefined,
      preferredServices: updates.preferredServices ? JSON.stringify(updates.preferredServices) : undefined,
      notificationSettings: updates.notificationSettings ? JSON.stringify(updates.notificationSettings) : undefined,
    },
  });
}

/**
 * Get personalized recommendations
 */
export async function getRecommendations(userId: string): Promise<{
  services: string[];
  themes: string[];
  reasoning: string;
}> {
  const profile = await getUserProfile(userId);
  const preferences = await getUserPreferences(userId);

  // If user has favorites, recommend those
  if (profile.favoriteServices.length > 0) {
    return {
      services: profile.favoriteServices,
      themes: profile.favoriteThemes,
      reasoning: `Based on your ${profile.totalInteractions} readings, you seem to enjoy ${profile.favoriteServices.join(', ')}`,
    };
  }

  // For new users, recommend based on preferences
  const prefThemes = preferences.preferredThemes
    ? JSON.parse(preferences.preferredThemes as string)
    : [];
  const prefServices = preferences.preferredServices
    ? JSON.parse(preferences.preferredServices as string)
    : [];

  if (prefServices.length > 0) {
    return {
      services: prefServices,
      themes: prefThemes,
      reasoning: 'Based on your preferences',
    };
  }

  // Default recommendations for brand new users
  return {
    services: ['saju', 'astrology', 'tarot'],
    themes: ['today', 'love', 'career'],
    reasoning: 'Popular choices for new users',
  };
}

/**
 * Get analytics for admin dashboard
 */
export async function getGlobalAnalytics(days: number = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    totalInteractions,
    uniqueUsers,
    averageRating,
    serviceBreakdown,
    themeBreakdown,
  ] = await Promise.all([
    // Total interactions
    prisma.userInteraction.count({
      where: { createdAt: { gte: since } },
    }),

    // Unique users
    prisma.userInteraction.findMany({
      where: { createdAt: { gte: since } },
      select: { userId: true },
      distinct: ['userId'],
    }),

    // Average rating
    prisma.userInteraction.aggregate({
      where: {
        createdAt: { gte: since },
        rating: { not: null },
      },
      _avg: { rating: true },
    }),

    // Service breakdown
    prisma.userInteraction.groupBy({
      by: ['service'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),

    // Theme breakdown
    prisma.userInteraction.groupBy({
      by: ['theme'],
      where: {
        createdAt: { gte: since },
        theme: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
  ]);

  return {
    totalInteractions,
    uniqueUsers: uniqueUsers.length,
    averageRating: Math.round((averageRating._avg.rating || 0) * 10) / 10,
    interactionsPerUser: Math.round(totalInteractions / Math.max(uniqueUsers.length, 1)),
    popularServices: serviceBreakdown.map((s) => ({
      service: s.service,
      count: s._count.id,
    })),
    popularThemes: themeBreakdown.map((t) => ({
      theme: t.theme,
      count: t._count.id,
    })),
  };
}

/**
 * Export user data (for GDPR compliance)
 */
export async function exportUserData(userId: string) {
  const [user, interactions, preferences] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.userInteraction.findMany({ where: { userId } }),
    prisma.userPreferences.findUnique({ where: { userId } }),
  ]);

  return {
    user: {
      id: user?.id,
      email: user?.email,
      name: user?.name,
      createdAt: user?.createdAt,
    },
    interactions: interactions.map((i) => ({
      type: i.type,
      service: i.service,
      theme: i.theme,
      rating: i.rating,
      createdAt: i.createdAt,
    })),
    preferences,
  };
}

/**
 * Delete user data (for GDPR compliance)
 */
export async function deleteUserData(userId: string) {
  // Prisma cascade delete will handle related records
  await prisma.user.delete({
    where: { id: userId },
  });
}
