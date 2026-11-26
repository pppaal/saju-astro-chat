// src/components/calendar/lifeTypeStyle.ts
//
// 인생유형(LifePatternKey) → 캡처·공유용 시각 아이덴티티. 유형마다 이모지·강조색·
// 한 단어 태그를 줘서 결과카드가 "갖고 싶은 배지"처럼 보이게 한다(바이럴 훅).
// 순수 프레젠테이션 — 라벨 · 한 줄 태그 문구는 lifePattern(PATTERN_KO.tagline)이 갖고,
// 여긴 색/이모지만 둔다(태그는 lifePatternTagline 으로 읽는다).

import { lifePatternTagline } from '@/lib/calendar-engine/derivers/lifePattern'

export interface LifeTypeStyle {
  /** 배지 이모지. */
  emoji: string
  /** 강조색(HEX) — 카드 글로우·배지·테두리. 라이트/다크 양쪽에서 읽히는 채도. */
  accent: string
  /** 한 줄 태그(에센스) ko/en. */
  taglineKo: string
  taglineEn: string
}

const STYLES: Record<string, Omit<LifeTypeStyle, 'taglineKo' | 'taglineEn'>> = {
  'late-bloomer': {
    emoji: '🌙',
    accent: '#f0a94e',
  },
  'youth-peak': {
    emoji: '🔥',
    accent: '#f5713e',
  },
  'early-peak': {
    emoji: '🌱',
    accent: '#6fc27f',
  },
  'midlife-peak': {
    emoji: '☀️',
    accent: '#f2c33e',
  },
  'steady-rise': {
    emoji: '📈',
    accent: '#5aa9e0',
  },
  smooth: {
    emoji: '🍃',
    accent: '#63c2b4',
  },
  hard: {
    emoji: '🗿',
    accent: '#c19a72',
  },
  undulating: {
    emoji: '🎢',
    accent: '#bd82e0',
  },
}

const FALLBACK: LifeTypeStyle = {
  emoji: '🔮',
  accent: '#e8cc8a',
  taglineKo: '나만의 인생 흐름',
  taglineEn: 'Your own life flow',
}

/** 유형 키(문자열)로 시각 스타일을 가져온다. 미정의 키는 중립 폴백. */
export function lifeTypeStyle(key: string | undefined): LifeTypeStyle {
  const style = key ? STYLES[key] : undefined
  const tagline = lifePatternTagline(key)
  if (!style || !tagline) return FALLBACK
  return { ...style, taglineKo: tagline.ko, taglineEn: tagline.en }
}
