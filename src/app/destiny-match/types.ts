// API에서 반환하는 프로필 타입
export type DiscoverProfile = {
  id: string;
  userId: string;
  displayName: string;
  bio: string | null;
  occupation: string | null;
  photos: string[];
  city: string | null;
  interests: string[];
  verified: boolean;
  age: number | null;
  distance: number | null;
  zodiacSign: string | null;
  sajuElement: string | null;
  personalityType: string | null;
  personalityName: string | null;
  compatibilityScore: number;
  compatibilityGrade: string;
  compatibilityEmoji: string;
  compatibilityTagline: string;
  lastActiveAt: string;
};

// 화면에 표시할 프로필 타입
export type UserProfile = {
  id: string;
  name: string;
  age: number;
  avatar: string;
  photos: string[];
  zodiacSign: string;
  sajuElement: string;
  birthChart: string;
  interests: string[];
  compatibility: number;
  compatibilityGrade?: string;
  compatibilityEmoji?: string;
  compatibilityTagline?: string;
  bio: string;
  distance: number;
  verified: boolean;
  occupation?: string;
  personalityType?: string;
  personalityName?: string;
};

export type ViewMode = 'swipe' | 'grid';

export type Filters = {
  zodiacSign: string;
  sajuElement: string;
  minAge: number;
  maxAge: number;
  maxDistance: number;
};
