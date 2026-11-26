/**
 * 인생 흐름(/destiny) 화면 문구 — ko/en 한 쌍(Bi). 공용 부품 문구(판정 · 범례 · 가격 · 푸터)는
 * components/v9/v9Copy, 엔진이 만든 문장(인생 모양 · 겹침 · 축별 요지 · 시간표 주제 …)은
 * 뷰모델(lib/calendar-view/lifetimeViewModel)이 이미 언어별로 고른다. 여기엔 화면 틀의 라벨만.
 *
 * 규칙: 영어엔 한글 없음(한자 간지 · 十神 같은 한자 표기는 그대로), 이모지 없음, 'AI' 라벨 없음
 * (읽기 문단은 엔진 템플릿 — FIX9b E8). 새 한국어 문구는 PR 본문에 원어민 검토용으로 적는다.
 */

import type { Bi } from '@/lib/i18n/bi'

export const LIFE_COPY = {
  // ─── 상단 바 · 폴리오 ───
  title: { ko: '인생 흐름', en: 'Life flow' },
  whoLabel: { ko: '내 출생 정보', en: 'Your birth info' },

  // ─── 히어로 ───
  byline: { ko: '까치가 물어 왔어요', en: 'Kkachi brought this' },
  computed: { ko: '계산됨', en: 'Computed' },
  lifeShape: { ko: '인생 모양', en: 'Your life shape' },
  lifetimeRead: { ko: '인생 읽기 · {range}', en: 'Lifetime read · {range}' },
  now: { ko: '지금', en: 'Now' },
  nextLifeTurn: { ko: '다음 인생 마디', en: 'Next life turn' },
  age: { ko: '{n}세', en: 'Age {n}' },
  dayMasterAria: { ko: '일간 {stem}', en: 'Day master {stem}' },

  // ─── 읽기(엔진 템플릿 — AI 라벨 없음) ───
  readingLabel: { ko: '읽기', en: 'Reading' },
  readingNote: {
    ko: '내 차트로 계산 · 언제나 같은 결과',
    en: 'Computed from your chart · same every time',
  },

  // ─── 01 이번 10년의 겹침 ───
  overlapLabel: { ko: '01 / 사주 × 별자리', en: '01 / Saju × stars' },
  overlapTitle: { ko: '이번 10년의 겹침', en: 'This decade’s overlap' },

  // ─── 02 축별 교차 ───
  traitsLabel: { ko: '02 / 축별로', en: '02 / Trait by trait' },
  traitsTitleA: { ko: '사주 × 별자리,', en: 'Saju × stars,' },
  traitsTitleB: { ko: '한 축씩 맞대 보기.', en: 'trait by trait.' },

  // ─── 03 타고난 강점 ───
  strengthsLabel: { ko: '03 / 타고난 강점', en: '03 / Natural strengths' },
  strengthsSub: {
    ko: '이 결에 기대면 판이 내 쪽으로 기울어요.',
    en: 'Lean into it and the odds tilt your way.',
  },
  strengthsTitleTied: { ko: '타고난 강점', en: 'Natural strengths' },
  dayMaster: { ko: '일간', en: 'Day master' },
  colThread: { ko: '결', en: 'Thread' },
  colChart: { ko: '내 원국', en: 'In your chart' },
  colN: { ko: '수', en: 'N' },
  strongest: { ko: '가장 셈', en: 'Strongest' },
  noneInChart: { ko: '원국에 없음', en: 'None in your chart' },

  // ─── 04 인생 곡선 ───
  curveLabel: { ko: '04 / 인생 곡선', en: '04 / The life curve' },
  curveFlow: { ko: '흐름', en: 'Flow' },
  curveDiv: { ko: '한 칸 = 3년', en: '1 div = 3 years' },
  curveAria: {
    ko: '0세부터 {to}세까지의 인생 흐름 곡선',
    en: 'Life curve from age 0 to {to}',
  },
  legendCrest: { ko: '마루', en: 'Crest' },
  legendDip: { ko: '저점', en: 'Dip' },
  legendNow: { ko: '지금', en: 'Now' },
  legendEra: { ko: '10년 주기', en: '10-yr cycle' },

  // ─── 05 10년 시간표 ───
  decadesLabel: { ko: '05 / 대운', en: '05 / Decades' },
  colYears: { ko: '연도', en: 'Years' },
  colTheme: { ko: '주제 · 나이', en: 'Theme · age' },
  youAreHere: { ko: '지금 여기', en: 'You are here' },

  // ─── 06 전략 ───
  strategyLabel: { ko: '06 / 전략', en: '06 / Strategy' },
  strategyNote: { ko: '내 차트에서', en: 'From your chart' },
  direction: { ko: '방향', en: 'Direction' },
  numbers: { ko: '숫자', en: 'Numbers' },
  allies: { ko: '나를 돕는 띠', en: 'Your allies' },
  wealth: { ko: '재물을 쌓는 방식', en: 'How you build wealth' },
  watchYears: { ko: '조심할 해', en: 'Watch these years' },

  // ─── 공유 ───
  shareEyebrow: { ko: '내 타입 공유하기', en: 'Share your type' },
  shareTitleA: { ko: '친구는', en: 'What’s your' },
  shareTitleB: { ko: '무슨 타입일까?', en: 'friend’s type?' },
  shareImage: { ko: '이미지 카드로 공유', en: 'Share as image card' },
  shareLink: { ko: '링크 공유', en: 'Share link' },
  shareCopied: { ko: '링크를 복사했어요', en: 'Link copied' },
  shareMaking: { ko: '만드는 중…', en: 'Making…' },
  shareSheetTitle: { ko: 'destinypal 사주 타입', en: 'My Saju type · destinypal' },
  shareSheetText: {
    ko: '내 사주 타입은 ‘{type}’래. 너는 뭐야?',
    en: 'My Saju type is “{type}”. What’s yours?',
  },
  shareImageHint: {
    ko: '카드에는 사주 타입과 인생 모양만 담겨요 — 생년월일 · 기둥은 들어가지 않아요.',
    en: 'The card carries only your Saju type and life shape — no birth date, no pillars.',
  },

  // ─── 상담사 CTA ───
  counselorQuestion: {
    ko: '제 인생 큰 흐름(대운)을 더 깊이 짚어주세요.',
    en: 'Walk me through my life’s larger flow and luck cycles.',
  },

  // ─── 푸터 — 이 화면 고유 한 문장(기존 인생 흐름 예보 면책) ───
  footerLine: {
    ko: '앞날은 정해진 운명이 아니라 지금 기운으로 본 계절 예보 — 길은 당신이 걷습니다.',
    en: 'What lies ahead is not fixed fate but a seasonal forecast read from today’s weather — you walk the path.',
  },
} as const satisfies Record<string, Bi>

export type LifeCopyKey = keyof typeof LIFE_COPY
