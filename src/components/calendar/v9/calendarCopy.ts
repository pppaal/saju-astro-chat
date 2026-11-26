/**
 * 운세 달력(/calendar) 화면 문구 — ko/en 한 쌍(Bi). 공용 부품 문구(판정 · 범례 · 가격 · 푸터)는
 * components/v9/v9Copy, 엔진이 만든 문장(후크 · 한 달 읽기 · 큰 날 한 줄 · '왜' · 사다리 결론 …)과
 * 날짜·범례 라벨은 뷰모델(lib/calendar-view/monthViewModel · dayViewModel)이 이미 언어별로
 * 고른다. 여기엔 화면 틀의 라벨만.
 *
 * 규칙: 영어엔 한글 없음, 이모지 없음, 'AI' 라벨 없음(날 문구는 엔진 템플릿 — FIX9b E8).
 * 새 한국어 문구는 PR 본문에 원어민 검토용으로 적는다.
 */

import type { Bi } from '@/lib/i18n/bi'

export const CAL_COPY = {
  // ─── 상단 바 · 갈래 스위치 ───
  title: { ko: '운세 달력', en: 'Fortune calendar' },
  whoLabel: { ko: '내 출생 정보', en: 'Your birth info' },
  segAria: { ko: '달력 보기', en: 'Calendar view' },
  monthly: { ko: '월간', en: 'Monthly' },
  daily: { ko: '일간', en: 'Daily' },

  // ─── 히어로(먹 띠) ───
  byline: { ko: '까치가 물어 왔어요', en: 'Kkachi brought this' },
  computed: { ko: '계산됨', en: 'Computed' },
  theMonth: { ko: '이번 달', en: 'The month' },
  monthRead: { ko: '이달의 읽기', en: 'The month’s read' },
  days: { ko: '날 수', en: 'Days' },
  countsAria: { ko: '이달의 날 수', en: 'Days this month' },

  // ─── 해 볼 것 ───
  tryThis: { ko: '해 볼 것', en: 'Try this' },
  pushHold: { ko: '밀기 · 멈추기', en: 'Push · Hold' },
  push: { ko: '밀기', en: 'Push' },
  hold: { ko: '멈추기', en: 'Hold' },

  // ─── 01 하루씩 ───
  dayByDay: { ko: '01 / 하루씩', en: '01 / Day by day' },
  barsA: { ko: '막대 하나 = 하루', en: 'Each bar is a day' },
  barsB: { ko: '높을수록 순조로움', en: 'Higher = smoother' },
  barsAria: { ko: '이달 하루하루의 흐름 막대', en: 'Daily flow bars for the month' },
  todayChip: { ko: '오늘 · {d}일', en: 'Today · {d}' },
  gridAria: { ko: '이달 달력', en: 'Month calendar' },
  gridCapA: { ko: '피할 날엔 큰 결정을 미루세요.', en: 'On avoid days, delay big decisions.' },
  gridCapB: {
    ko: '날짜를 누르면 그날 읽기가, 한 번 더 누르면 하루 전체가 열려요.',
    en: 'Tap a date for its read, tap again for the full day.',
  },
  /** 그리드 칸 스크린 리더 이름 — '{label}, {verdict}'. */
  cellAria: { ko: '{label}, {verdict}', en: '{label}, {verdict}' },
  selectedRead: { ko: '고른 날', en: 'Selected day' },

  // ─── 02 큰 날 ───
  keyDays: { ko: '02 / 큰 날', en: '02 / Key days' },
  dateRead: { ko: '날짜 · 읽기', en: 'Date · Read' },
  past: { ko: '지난 날', en: 'Past' },
  today: { ko: '오늘', en: 'Today' },
  showWhy: { ko: '왜 이런 날인지 보기', en: 'Show why' },
  noMark: { ko: '방향 표시 없음', en: 'No direction shown' },

  // ─── 03 오늘 ───
  todayPrefix: { ko: '03 / {label}', en: '03 / {label}' },
  whyLabel: { ko: '왜 이런 날 · 두 체계가 같은 쪽', en: 'Why this day · both systems agree' },
  openDay: { ko: '하루 전체 보기', en: 'Open the full day' },
  openDaySub: {
    ko: '할 일과 쉬어갈 일 — 분야별로',
    en: 'What to do, what to ease off — area by area',
  },
  shareToday: { ko: '오늘 공유하기', en: 'Share today' },
  shareDay: { ko: '이날 공유하기', en: 'Share this day' },
  copied: { ko: '링크를 복사했어요', en: 'Link copied' },
  creating: { ko: '만드는 중…', en: 'Creating…' },

  // ─── 04 사다리 ───
  ladderLabel: { ko: '04 / 시간대별 가장 센 근거', en: '04 / Strongest driver per scale' },
  ladderRange: { ko: '10년 → 오늘', en: '10-yr → today' },
  ladderRangeMonth: { ko: '10년 → 이달', en: '10-yr → month' },
  sajuShort: { ko: '사주', en: 'Saju' },
  starsShort: { ko: '별자리', en: 'Stars' },

  // ─── 공유 · 푸터 ───
  shareMonth: { ko: '이달 공유하기', en: 'Share this month' },
  footerLine: {
    ko: '날과 그 말은 사주 × 점성 엔진이 만들어요 — 같은 출생 정보면 언제나 같은 달력. 좋은 날은 경향이지 약속이 아니에요.',
    en: 'Days and their words come from our Saju × astrology engine — same birth data, same calendar, every time. A good day is a tendency, not a promise.',
  },

  // ─── 일간(Daily) ───
  dayRead: { ko: '이날의 읽기', en: 'The day’s read' },
  dayTry: { ko: '01 / 해 볼 것', en: '01 / Try this' },
  dayTryRange: { ko: '이렇게 · 살살', en: 'Do · Ease' },
  do: { ko: '이렇게', en: 'Do' },
  ease: { ko: '살살', en: 'Ease' },
  dayArea: { ko: '02 / 분야별', en: '02 / By area' },
  inFocus: { ko: '주목', en: 'In focus' },
  dayCross: { ko: '03 / 겹치는 흐름', en: '03 / Crossings' },
  dayCrossRange: { ko: '사주 × 별자리', en: 'Saju × stars' },
  dayHours: { ko: '04 / 시진별', en: '04 / Hour by hour' },
  dayHoursRange: { ko: '시진 · 상승궁', en: 'Hour · rising sign' },
  hoursCap: {
    ko: '칸 색 = 그 시진의 사주 결(좋음 · 조심). 상승궁은 나란히 적을 뿐, 둘을 합쳐 읽지 않아요.',
    en: 'Shading = the hour’s saju tone (good · ease off). The rising sign sits alongside — the two are not combined.',
  },
  hourGood: { ko: '좋은 시진', en: 'Good hour' },
  hourCaution: { ko: '조심할 시진', en: 'Ease off' },
  dayLadder: { ko: '05 / 시간대별 가장 센 근거', en: '05 / Strongest driver per scale' },
  backToMonth: { ko: '이달 전체 보기', en: 'See the whole month' },
  backToMonthSub: {
    ko: '좋은 날 · 조심할 날 · 큰 날을 한 장에',
    en: 'Good, caution and key days on one page',
  },
  dayLoading: { ko: '그날의 운을 계산하고 있어요…', en: 'Reading that day…' },
  dayError: { ko: '그날 운을 불러오지 못했어요.', en: 'Couldn’t load that day.' },
  retry: { ko: '다시 시도', en: 'Retry' },
} as const satisfies Record<string, Bi>
