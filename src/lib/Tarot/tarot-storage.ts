// 타로 리딩 결과 저장 및 관리

import { DrawnCard, Spread } from './tarot.types';
import { logger } from "@/lib/logger";

export interface SavedTarotReading {
  id: string;
  timestamp: number;
  question: string;
  spread: {
    title: string;
    titleKo?: string;
    cardCount: number;
  };
  cards: {
    name: string;
    nameKo?: string;
    isReversed: boolean;
    position: string;
    positionKo?: string;
  }[];
  interpretation: {
    overallMessage: string;
    guidance: string;
    cardInsights: {
      position: string;
      cardName: string;
      interpretation: string;
    }[];
  };
  categoryId: string;
  spreadId: string;
  deckStyle?: string;
}

const STORAGE_KEY = 'tarot_saved_readings';
const MAX_SAVED_READINGS = 50;

// 저장된 리딩 목록 가져오기
export function getSavedReadings(): SavedTarotReading[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    logger.error('Failed to parse saved readings from localStorage:', e);
    return [];
  }
}

// 리딩 저장하기
export function saveReading(reading: Omit<SavedTarotReading, 'id' | 'timestamp'>): SavedTarotReading {
  const savedReading: SavedTarotReading = {
    ...reading,
    id: generateId(),
    timestamp: Date.now(),
  };

  const readings = getSavedReadings();
  readings.unshift(savedReading);

  // 최대 저장 개수 제한
  const trimmed = readings.slice(0, MAX_SAVED_READINGS);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    logger.error('Failed to save reading:', e);
  }

  return savedReading;
}

// 리딩 삭제하기
export function deleteReading(id: string): boolean {
  const readings = getSavedReadings();
  const filtered = readings.filter(r => r.id !== id);

  if (filtered.length === readings.length) return false;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (e) {
    logger.error('Failed to delete reading:', e);
    return false;
  }
}

// 특정 리딩 가져오기
export function getReadingById(id: string): SavedTarotReading | null {
  const readings = getSavedReadings();
  return readings.find(r => r.id === id) || null;
}

// 리딩 개수 가져오기
export function getReadingsCount(): number {
  return getSavedReadings().length;
}

// ID 생성
function generateId(): string {
  return `tarot_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

// 리딩 결과를 저장 형식으로 변환
export function formatReadingForSave(
  question: string,
  spread: Spread,
  drawnCards: DrawnCard[],
  interpretation: {
    overall_message?: string;
    guidance?: string;
    card_insights?: {
      position: string;
      card_name: string;
      interpretation: string;
    }[];
  } | null,
  categoryId: string,
  spreadId: string,
  deckStyle?: string
): Omit<SavedTarotReading, 'id' | 'timestamp'> {
  return {
    question,
    spread: {
      title: spread.title,
      titleKo: spread.titleKo,
      cardCount: spread.cardCount,
    },
    cards: drawnCards.map((dc, idx) => ({
      name: dc.card.name,
      nameKo: dc.card.nameKo,
      isReversed: dc.isReversed,
      position: spread.positions[idx]?.title || `Card ${idx + 1}`,
      positionKo: spread.positions[idx]?.titleKo,
    })),
    interpretation: {
      overallMessage: interpretation?.overall_message || '',
      guidance: interpretation?.guidance || '',
      cardInsights: interpretation?.card_insights?.map(ci => ({
        position: ci.position,
        cardName: ci.card_name,
        interpretation: ci.interpretation,
      })) || [],
    },
    categoryId,
    spreadId,
    deckStyle,
  };
}

// 날짜 포맷
export function formatReadingDate(timestamp: number, isKo: boolean): string {
  const date = new Date(timestamp);
  if (isKo) {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
  }
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// 상대 시간 포맷
export function formatRelativeTime(timestamp: number, isKo: boolean): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) {
    return isKo ? '방금 전' : 'Just now';
  }
  if (minutes < 60) {
    return isKo ? `${minutes}분 전` : `${minutes} min ago`;
  }
  if (hours < 24) {
    return isKo ? `${hours}시간 전` : `${hours}h ago`;
  }
  if (days < 7) {
    return isKo ? `${days}일 전` : `${days}d ago`;
  }

  return formatReadingDate(timestamp, isKo);
}
