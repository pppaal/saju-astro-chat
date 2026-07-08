// src/components/calendar/lifeTypeStyle.ts
//
// 인생유형(LifePatternKey) → 캡처·공유용 시각 아이덴티티. 유형마다 이모지·강조색·
// 한 단어 태그를 줘서 결과카드가 "갖고 싶은 배지"처럼 보이게 한다(바이럴 훅).
// 순수 프레젠테이션(엔진 무관) — 라벨 문구는 lifePattern 이 갖고, 여긴 색/이모지만.

export interface LifeTypeStyle {
  /** 배지 이모지. */
  emoji: string
  /** 강조색(HEX) — 카드 글로우·배지·테두리. 라이트/다크 양쪽에서 읽히는 채도. */
  accent: string
  /** 한 줄 태그(에센스) ko/en. */
  taglineKo: string
  taglineEn: string
}

const STYLES: Record<string, LifeTypeStyle> = {
  'late-bloomer': {
    emoji: '🌙',
    accent: '#f0a94e',
    taglineKo: '늦게 피어 오래가는',
    taglineEn: 'Blooms late, lasts long',
  },
  'youth-peak': {
    emoji: '🔥',
    accent: '#f5713e',
    taglineKo: '이십·삼십대가 전성기',
    taglineEn: 'Peaks in your 20s–30s',
  },
  'early-peak': {
    emoji: '🌱',
    accent: '#6fc27f',
    taglineKo: '일찍부터 두각',
    taglineEn: 'Ahead from the start',
  },
  'midlife-peak': {
    emoji: '☀️',
    accent: '#f2c33e',
    taglineKo: '한가운데가 절정',
    taglineEn: 'Peaks at the middle',
  },
  'steady-rise': {
    emoji: '📈',
    accent: '#5aa9e0',
    taglineKo: '멈춘 적 없이 오르는',
    taglineEn: 'Never stops climbing',
  },
  smooth: {
    emoji: '🍃',
    accent: '#63c2b4',
    taglineKo: '큰 파도 없이 멀리',
    taglineEn: 'Calm and far-reaching',
  },
  hard: {
    emoji: '🗿',
    accent: '#c19a72',
    taglineKo: '버틴 만큼 단단한',
    taglineEn: 'Forged by endurance',
  },
  undulating: {
    emoji: '🎢',
    accent: '#bd82e0',
    taglineKo: '오르내림이 무기인',
    taglineEn: 'Rides the waves',
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
  return (key && STYLES[key]) || FALLBACK
}
