/**
 * v9.2 홈(/) 문구 — 모든 문구가 ko/en 한 쌍(Bi). 디자인 원본 home9.tpl.html + FIX9b F1/F9.
 *
 * 규칙(SSR 게이트 scripts/check-ssr-placeholders.mjs 와 tests/app/home/homeCopy.parity.test.ts):
 * - 영어 문구엔 한글을 넣지 않는다(까치는 en 'Kkachi' 만).
 * - 한국어 문구엔 'Pricing' · 'Get started' · "Today's" · 'Members' · 'Total Visitors' 같은
 *   영어 토큰을 넣지 않는다. 'Powered by AI' 는 어느 쪽에도 없다.
 * - 판정 이름(같음 · 서로 도움 · 두 결 · 무관)과 가격 줄은 v9Copy(VERDICT · PRICE)가 SSOT —
 *   여기서 다시 쓰지 않는다. 계산·말 줄(PROVENANCE)과 푸터(FOOTER)도 v9Copy.
 *
 * 새 한국어 문구는 구현자 초안이다(오너 결정 6 — PR 본문에 원어민 검토 목록으로 올린다).
 */

import type { Bi } from '@/lib/i18n/bi'

export const HOME_COPY = {
  // ─── 내비 ───
  /** 워드마크 링크의 스크린 리더 이름. */
  homeAria: { ko: 'destinypal 홈', en: 'destinypal home' },
  signIn: { ko: '로그인', en: 'Sign in' },
  menu: { ko: '메뉴', en: 'Menu' },

  // ─── 폴리오 ───
  /** 샘플 출생지(폴리오 스탬프) — 카드 데이터에는 들어가지 않는다. */
  sampleCity: { ko: '서울', en: 'Seoul' },

  // ─── 히어로 ───
  /** 구분점(·)은 양옆을 줄바꿈 없는 공백으로 묶는다 — 좁은 화면에서 '·' 가 줄 끝이나 줄 앞에 혼자 남지 않게. */
  eyebrow: {
    ko: '사주\u00a0·\u00a0서양 점성술\u00a0·\u00a0타로',
    en: 'Korean saju\u00a0·\u00a0Western astrology\u00a0·\u00a0Tarot',
  },
  /**
   * H1 — 앞 · 밑줄(강조) · 뒤. ko 는 옛 /free 훅. en 밑줄은 디자인(home9)처럼 마침표까지 'you.',
   * '—' 와 'you.' 는 줄바꿈 없는 공백으로 묶어 'you.' 가 혼자 줄에 남지 않게 한다.
   */
  h1Before: {
    ko: '사주도 별자리도, 이상하게 ',
    en: 'Saju and the stars, strangely, describe the same person —\u00a0',
  },
  h1Em: { ko: '너를 같은 사람', en: 'you.' },
  /** en 은 비어 있다(마침표는 밑줄 안). */
  h1After: { ko: '이라 말해.', en: '' },
  lede: {
    ko: '엔진이 사주와 출생 차트를 따로 계산해요. 같은 생년월일이면 언제나 같은 답이고, 두 체계가 어디서 맞고 어디서 갈리는지 그대로 보여 줘요.',
    en: 'Our engine computes your saju and your birth chart separately — same birth data, same answer, every time — then shows where they agree and where they pull apart.',
  },
  cta: { ko: '내 무료 사주 카드 받기', en: 'Get my free Saju Card' },
  ctaOpen: { ko: '내 전체 카드 보기', en: 'Open my full card' },
  /** 저장된 출생 정보 줄 — mono 라벨. */
  savedBirth: { ko: '내 출생 정보', en: 'Your birth details' },
  editBirth: { ko: '출생 정보 수정', en: 'Edit birth details' },

  // ─── 판독 띠(COST · ACCOUNT · TIME) ───
  roCost: { ko: '비용', en: 'Cost' },
  roCostValue: { ko: '무료', en: 'FREE' },
  roAccount: { ko: '가입', en: 'Account' },
  roAccountValue: { ko: '필요 없음', en: 'NO SIGN-UP' },
  roTime: { ko: '시간', en: 'Time' },
  roTimeValue: { ko: '30', en: '30' },
  roTimeUnit: { ko: '초', en: 'SECONDS' },
  roAria: { ko: '비용 · 가입 · 시간', en: 'Cost · account · time' },

  // ─── 카드 ───
  cardEyebrow: { ko: '나의 무료 사주 카드', en: 'Your free Saju Card' },
  cardCaption: {
    ko: '네 기둥, 빅 쓰리, 사주 타입 — 태어난 한 순간으로 계산하고, 바로 공유할 수 있어요.',
    en: 'Your four pillars, your big three and your Saju type — computed from one birth moment, ready to share.',
  },
  /**
   * 출생 정보가 저장된 사람 — 카드는 여전히 엔진 샘플이라(오너 결정 5 · QA-1) '내 카드'라고 하지
   * 않는다. 내 카드는 위 'Open my full card' 링크(리포트)에서 연다.
   */
  cardEyebrowSample: { ko: '샘플 사주 카드', en: 'Sample Saju Card' },
  cardCaptionSample: {
    ko: '샘플 카드예요 — 내 카드는 위에서 열어 보세요.',
    en: 'A sample card — open yours above.',
  },

  // ─── 상담사 CTA(오너 결정 1 — 카드 바로 다음의 유료 진입) ───
  counselorCta: { ko: '운명 상담사에게 물어보기', en: 'Ask the destiny counselor' },

  // ─── 둘러보기 ───
  exploreEyebrow: { ko: '둘러보기', en: 'Explore' },
  exploreH2a: { ko: '나를 읽는 세 가지 방법.', en: 'Three ways to read\u00a0you.' },
  exploreH2b: { ko: '카드는 하나.', en: 'One card.' },
  exploreSubLead: {
    ko: '무료로 시작하고, 원할 때 더 깊이.',
    en: 'Start free. Go deeper when you like.',
  },
  exploreSub: {
    ko: '모든 리딩은 내 카드에서 시작해요. 유료 리딩은 크레딧을 써요 — 한 번 결제, 구독 없음.',
    en: 'Every reading starts from your card. Paid ones use credits — pay once, no subscription.',
  },
  free: { ko: '무료', en: 'Free' },
  afterCard: { ko: '카드를 받은 다음', en: 'After your card' },
  exploreAria: { ko: '리딩 목록', en: 'Readings' },

  // ─── 리딩은 이렇게 만들어져요(먹 띠) ───
  bandEyebrow: { ko: '리딩은 이렇게 만들어져요', en: 'How a reading is made' },
  bandH2a: { ko: '계산했어요,', en: 'Computed,' },
  bandH2b: { ko: '지어내지 않았어요.', en: 'not generated.' },
  step1Title: { ko: '결정론적 엔진', en: 'A deterministic engine' },
  step1Text: {
    ko: '같은 차트는 언제나 같은 풀이를 내요 — 그날 기분에 따라 바뀌는 출력이 아니에요.',
    en: 'The same chart always yields the same reading — not mood-of-the-day output.',
  },
  step2Title: { ko: '실제 천문 계산', en: 'Real astronomy' },
  step2Text: {
    ko: '절입 시각은 분 단위로, 태어난 시는 그 지역의 태양시로 계산해요. 차트는 Swiss Ephemeris로 그려요.',
    en: 'Solar terms to the minute, local solar time for the birth hour. Charts from Swiss Ephemeris.',
  },
  step3Title: { ko: '사주 × 점성술, 교차 검증', en: 'Saju × astrology, cross-checked' },
  /** '{verdicts}' = VERDICT 짧은 이름 넷을 ' · ' 로 이은 것(v9Copy SSOT). */
  step3Text: {
    ko: '모든 특성을 {verdicts}으로 나눠요. 타이밍 신호는 두 체계가 같은 쪽을 가리킬 때만 전해요.',
    en: 'Every trait is sorted: {verdicts}. Timing signals reach you only when both systems agree.',
  },
  /** 3단계 머리 줄 오른쪽 — 샘플의 축 행(타이밍 행이 없을 때). */
  step3Traits: { ko: '샘플 · 특성별', en: 'Sample · trait by trait' },
  /** 3단계 머리 줄 오른쪽 — 이 10년의 겹침(타이밍 행). */
  step3Timing: { ko: '샘플 · 이번 10년', en: 'Sample · this decade' },
  dialCorner: { ko: '60년 주기', en: '60-year cycle' },
  dialUnit: { ko: '1눈금 = 1년', en: '1 tick = 1 year' },

  // ─── 까치 ───
  magpieEyebrow: { ko: '까치', en: 'Kkachi' },
  magpieH3: { ko: '왜 까치일까요?', en: 'Why a magpie?' },
  magpieSub1: { ko: '한국에서는 까치가 울면', en: 'In Korea, when a magpie calls,' },
  magpieSub2: { ko: '반가운 소식이 온다고 해요.', en: 'good news is on its way.' },
  magpieVoice1: { ko: '저는 소식을 전하고,', en: 'I bring the news.' },
  magpieVoice2: { ko: '계산은 엔진이 해요.', en: 'The engine does the math.' },
} as const satisfies Record<string, Bi>

export type HomeCopyKey = keyof typeof HOME_COPY

/**
 * 언어 토글 — 설명은 바꿀 언어로 쓴다(기존 홈 헤더 · GlobalHeader 와 같은 말). 보는 언어와
 * 반대 언어의 글자라 HOME_COPY 의 언어 순도 검사 밖에 둔다(화면 밖 설명이다). 버튼의 접근성 이름은
 * 보이는 글자 + 이 설명('KO 한국어로 전환') — HomeNav.
 */
export const LOCALE_TOGGLE = {
  /** 지금 locale → 숨긴 설명(바꿀 언어의 lang 으로 읽힌다). */
  aria: { ko: 'Switch to English', en: '한국어로 전환' },
  /** 지금 locale → 보이는 글자(바꿀 언어). */
  short: { ko: 'EN', en: 'KO' },
} as const satisfies Record<string, Bi>
