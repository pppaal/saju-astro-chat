import type { DiscoverProfile, UserProfile } from './types';

export const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

export const SAJU_ELEMENTS = ["Fire", "Water", "Wood", "Metal", "Earth"];

// API 프로필을 화면용 프로필로 변환
export function convertToUserProfile(profile: DiscoverProfile): UserProfile {
  return {
    id: profile.id,
    name: profile.displayName,
    age: profile.age || 0,
    avatar: profile.displayName.charAt(0).toUpperCase(),
    photos: Array.isArray(profile.photos) && profile.photos.length > 0
      ? profile.photos
      : [profile.displayName.charAt(0).toUpperCase()],
    zodiacSign: profile.zodiacSign || 'Unknown',
    sajuElement: profile.sajuElement || 'Unknown',
    birthChart: profile.personalityType
      ? `${profile.personalityType} - ${profile.personalityName || ''}`
      : `${profile.zodiacSign || ''} / ${profile.sajuElement || ''}`,
    interests: Array.isArray(profile.interests) ? profile.interests : [],
    compatibility: profile.compatibilityScore,
    compatibilityGrade: profile.compatibilityGrade,
    compatibilityEmoji: profile.compatibilityEmoji,
    compatibilityTagline: profile.compatibilityTagline,
    bio: profile.bio || '자기소개가 없습니다.',
    distance: profile.distance || 0,
    verified: profile.verified,
    occupation: profile.occupation || undefined,
    personalityType: profile.personalityType || undefined,
    personalityName: profile.personalityName || undefined,
  };
}
