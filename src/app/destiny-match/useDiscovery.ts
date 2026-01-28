import { useState, useRef, useEffect, useCallback } from 'react';
import type { Session } from 'next-auth';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { logger } from '@/lib/logger';
import type { UserProfile, ViewMode, Filters } from './types';
import { convertToUserProfile } from './convertProfile';

export interface UseDiscoveryParams {
  session: Session | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  router: AppRouterInstance;
  signInUrl: string;
}

export interface UseDiscoveryReturn {
  // View state
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;

  // Profile state
  profiles: UserProfile[];
  currentIndex: number;
  likedProfiles: string[];
  selectedProfile: UserProfile | null;
  setSelectedProfile: (profile: UserProfile | null) => void;

  // Filter state
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  filters: Filters;
  setFilters: (filters: Filters) => void;

  // Loading/error state
  isLoading: boolean;
  error: string | null;
  needsSetup: boolean;
  hasMore: boolean;

  // Drag state
  cardRef: React.RefObject<HTMLDivElement | null>;
  dragOffset: { x: number; y: number };
  isDragging: boolean;

  // Computed
  currentProfile: UserProfile | undefined;
  hasMoreProfiles: boolean;
  rotation: number;
  opacity: number;

  // Callbacks
  loadProfiles: () => Promise<void>;
  handleDragStart: (clientX: number, clientY: number) => void;
  handleDragMove: (clientX: number, clientY: number) => void;
  handleDragEnd: () => void;
  handleLike: () => Promise<void>;
  handlePass: () => Promise<void>;
  handleSuperLike: () => Promise<void>;
}

export function useDiscovery({
  session,
  status,
  router,
  signInUrl,
}: UseDiscoveryParams): UseDiscoveryReturn {
  const [viewMode, setViewMode] = useState<ViewMode>('swipe');
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [likedProfiles, setLikedProfiles] = useState<string[]>([]);
  const [_passedProfiles, setPassedProfiles] = useState<string[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    zodiacSign: 'all',
    sajuElement: 'all',
    minAge: 18,
    maxAge: 99,
    maxDistance: 50,
  });

  // 로딩/에러 상태
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const cardRef = useRef<HTMLDivElement>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const currentProfile = profiles[currentIndex];
  const hasMoreProfiles = currentIndex < profiles.length;

  // 프로필 로딩 함수
  const loadProfiles = useCallback(async () => {
    if (!session?.user) { return; }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('limit', '20');
      if (filters.zodiacSign !== 'all') { params.set('zodiac', filters.zodiacSign); }
      if (filters.sajuElement !== 'all') { params.set('element', filters.sajuElement); }

      const res = await fetch(`/api/destiny-match/discover?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 400 && data.error?.includes('프로필')) {
          setNeedsSetup(true);
          return;
        }
        throw new Error(data.error || '프로필을 불러오는데 실패했습니다');
      }

      const convertedProfiles = (data.profiles || []).map(convertToUserProfile);
      setProfiles(convertedProfiles);
      setHasMore(data.hasMore);
      setCurrentIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  }, [session?.user, filters.zodiacSign, filters.sajuElement]);

  // 세션 변경 시 프로필 로딩
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      loadProfiles();
    }
  }, [status, session?.user, loadProfiles]);

  // 스와이프 API 호출
  const handleSwipeApi = async (
    profileId: string,
    action: 'like' | 'pass' | 'super_like',
    compatibilityScore?: number,
  ) => {
    try {
      const res = await fetch('/api/destiny-match/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetProfileId: profileId,
          action,
          compatibilityScore,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        logger.error('Swipe failed:', data.error);
        return null;
      }

      // 매치 성사 시 알림
      if (data.isMatch) {
        alert('💕 매치 성사! 상대방도 당신을 좋아합니다!');
      }

      return data;
    } catch (err) {
      logger.error('Swipe error:', err);
      return null;
    }
  };

  // Swipe handlers
  const handleDragStart = (clientX: number, clientY: number) => {
    if (!session) {
      router.push(signInUrl);
      return;
    }
    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY });
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) { return; }
    const offsetX = clientX - dragStart.x;
    const offsetY = clientY - dragStart.y;
    setDragOffset({ x: offsetX, y: offsetY });
  };

  const handleDragEnd = () => {
    if (!isDragging) { return; }
    setIsDragging(false);

    const threshold = 100;
    if (Math.abs(dragOffset.x) > threshold) {
      if (dragOffset.x > 0) {
        handleLike();
      } else {
        handlePass();
      }
    }
    setDragOffset({ x: 0, y: 0 });
  };

  const handleLike = async () => {
    if (!session) {
      router.push(signInUrl);
      return;
    }
    if (currentProfile) {
      // API 호출
      await handleSwipeApi(currentProfile.id, 'like', currentProfile.compatibility);
      setLikedProfiles(prev => [...prev, currentProfile.id]);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePass = async () => {
    if (!session) {
      router.push(signInUrl);
      return;
    }
    if (currentProfile) {
      // API 호출
      await handleSwipeApi(currentProfile.id, 'pass');
      setPassedProfiles(prev => [...prev, currentProfile.id]);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleSuperLike = async () => {
    if (!session) {
      router.push(signInUrl);
      return;
    }
    if (currentProfile) {
      // API 호출
      await handleSwipeApi(currentProfile.id, 'super_like', currentProfile.compatibility);
      setLikedProfiles(prev => [...prev, currentProfile.id]);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const rotation = dragOffset.x * 0.1;
  const opacity = 1 - Math.abs(dragOffset.x) / 300;

  return {
    viewMode,
    setViewMode,
    profiles,
    currentIndex,
    likedProfiles,
    selectedProfile,
    setSelectedProfile,
    showFilters,
    setShowFilters,
    filters,
    setFilters,
    isLoading,
    error,
    needsSetup,
    hasMore,
    cardRef,
    dragOffset,
    isDragging,
    currentProfile,
    hasMoreProfiles,
    rotation,
    opacity,
    loadProfiles,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleLike,
    handlePass,
    handleSuperLike,
  };
}
