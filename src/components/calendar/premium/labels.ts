/**
 * Calendar UI chrome 라벨 — ko/en 양쪽. engine narrative (verdict / oneLine /
 * sections 등) 는 API 가 locale 받아 자체 localize 하므로 여기선 UI 고정 라벨만.
 *
 * 사용:
 *   const t = getCalLabels(locale)
 *   <span>{t.today}</span>
 *   <span>{t.gradeLabel(grade.key)}</span>
 */

export type CalLocale = 'ko' | 'en'

type GradeKey = 'lucky' | 'neutral' | 'unlucky'
type ThemeKey = 'growth' | 'career' | 'money' | 'love' | 'health'

interface LabelSet {
  // Tabs + sticky hero
  tabYear: string
  tabMonth: string
  tabDay: string
  today: string
  goToToday: string
  thisMonth: string
  // Weekday names (Sun..Sat)
  weekdayShort: [string, string, string, string, string, string, string] // S, M, T, W, T, F, S
  weekdayFull: [string, string, string, string, string, string, string]
  // Calendar
  prevMonth: string
  nextMonth: string
  legendGood: string
  legendNeutral: string
  legendCaution: string
  // Day cell aria
  dayCellAria: (m: number, d: number, gradeLabel: string, selected: boolean) => string
  dailyHeaderAria: (monthLabel: string, day: number, weekday: string) => string
  heroAria: string
  calendarTabAria: string
  // doNow/watchOut
  doNowLabel: string
  watchOutLabel: string
  // Engine diag
  engineDiag: string
  confidence: string
  agreement: string
  agreementSub: string
  confidenceSub: string
  // Hour detail
  hourDetailTitle: (best: number, worst: number) => string
  best: string
  worst: string
  noSignal: string
  // Dos/Donts
  dosTitle: string
  dontsTitle: string
  // Day fallback
  dayDetailPlaceholder: string
  // Hour formatter
  formatHour: (h: number) => string
  // Hero breakdown chips
  saju: string
  astro: string
  agreementShort: string
  distribution: string
  scoreCaption: string
  // Grade labels
  gradeLabel: (key: GradeKey) => string
  gradeSub: (key: GradeKey) => string
  // Theme names
  themeName: (key: ThemeKey) => string
  themeOrder: ThemeKey[]
  // ThemeRadar
  radarTitle: string
  radarCaptionStrong: (
    top: string,
    topScore: number,
    second: string,
    secondScore: number,
    bottom: string,
    bottomScore: number
  ) => string
  radarCaptionFlat: string
  themeMissingCaption: (names: string[]) => string
  // FlowChart
  flowTitle: string
  flowSubtitle: string
  flowYLabel: string
  nowLabel: string
  tooltipBest: string
  tooltipCaution: string
  tooltipConvergence: string
  // Highlights
  bestDay: string
  cautionDay: string
  convergenceDay: string
  bestMonth: string
  cautionMonth: string
  convergenceMonth: string
  bestHour: string
  cautionHour: string
  emptyHighlight: string
  // Year hero
  yearLabel: (year: number) => string
  yearVerdict: (bestMonth: number, worstMonth: number) => string
  yearVerdictFlat: string
  // Month verdict fallback
  monthVerdictFallback: (gradeLabel: string) => string
  // Highlight descriptions
  bestDayDesc: (score: number) => string
  cautionDayDesc: (score: number) => string
  bestMonthDesc: (score: number) => string
  cautionMonthDesc: (score: number) => string
  convergenceDesc: string
  // Empty radar fallback
  yearThemeEmpty: string
  monthThemeEmpty: string
  // LifeTimeline
  lifeTimelineTitle: string
  lifeInProgress: string
  // LifePivot meanings (fallback when engine doesn't provide)
  pivotBothSystems: string
  pivotAstroOnly: string
  pivotDaeunOnly: string
  // Month insights (themeRanking + keyEvents + convergence)
  themeFocusTitle: string
  themeFocusEmpty: string
  keyDatesTitle: string
  keyDatesBestLabel: string
  keyDatesWindowLabel: string
  keyDatesAvoidLabel: string
  keyDatesScoreSuffix: (score: number) => string
  keyDatesWindowFmt: (start: string, end: string, avg: number) => string
  keyDatesEmpty: string
  bigTurnsTitle: string
  bigTurnsAstroLabel: string
  bigTurnsSajuLabel: string
  bigTurnsEmpty: string
  // Engine error
  engineFailedRetry: string
  fetchTimeout: string
}

const KO: LabelSet = {
  tabYear: '올해',
  tabMonth: '달력',
  tabDay: '오늘',
  today: '오늘',
  goToToday: '오늘로',
  thisMonth: '이번 달입니다',
  weekdayShort: ['일', '월', '화', '수', '목', '금', '토'],
  weekdayFull: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  prevMonth: '이전 달',
  nextMonth: '다음 달',
  legendGood: '좋은 날',
  legendNeutral: '보통',
  legendCaution: '조심',
  dayCellAria: (m, d, g, sel) => `${m}월 ${d}일, ${g}${sel ? ', 선택됨' : ''}`,
  dailyHeaderAria: (m, d, w) => `${m} ${d}일 ${w} — 달력으로 이동`,
  heroAria: '오늘 상세 보기',
  calendarTabAria: '달력 뷰로 이동',
  doNowLabel: '추진',
  watchOutLabel: '보류',
  engineDiag: '엔진 자기 진단',
  confidence: '신뢰도',
  agreement: '사주↔점성 합치',
  agreementSub: '두 시스템이 같은 방향을 가리키는 정도',
  confidenceSub: '엔진이 이 예측에 부여한 자체 신뢰도',
  hourDetailTitle: (b, w) => `시간대 자세히 — best ${b} / worst ${w}`,
  best: 'BEST',
  worst: 'WORST',
  noSignal: '신호 없음',
  dosTitle: '권장 행동 패턴',
  dontsTitle: '주의 행동 패턴',
  dayDetailPlaceholder:
    '이 날의 시간대별 정밀 분석은 달력에서 날짜를 탭하면 상세보기에 표시됩니다.',
  formatHour: (h) => {
    if (h === 0) return '자정 12시'
    if (h === 12) return '정오 12시'
    if (h < 12) return `오전 ${h}시`
    return `오후 ${h - 12}시`
  },
  saju: '사주',
  astro: '점성',
  agreementShort: '합치',
  distribution: '분포',
  scoreCaption: '평균 에너지',
  gradeLabel: (k) => (k === 'lucky' ? '좋은 날' : k === 'unlucky' ? '조심할 날' : '보통'),
  gradeSub: (k) =>
    k === 'lucky' ? '받쳐주는 흐름' : k === 'unlucky' ? '무리하지 않기' : '잔잔한 흐름',
  themeName: (k) =>
    ({ growth: '성장', career: '직업', money: '재물', love: '연애', health: '건강' })[k],
  themeOrder: ['growth', 'career', 'money', 'love', 'health'],
  radarTitle: '분야별 밸런스',
  radarCaptionStrong: (top, ts, second, ss, bottom, bs) =>
    `${top}(${ts})과 ${second}(${ss}) 영역이 돋보이며, ${bottom}(${bs}) 관리에 유의하세요.`,
  radarCaptionFlat: '전체적으로 고르게 분포된 형태입니다.',
  themeMissingCaption: (names) => `${names.join('·')} 신호 부족 — 다른 축 평균으로 표시했어요.`,
  flowTitle: '흐름',
  flowSubtitle: '베스트(녹) · 주의(분홍) · 양쪽 수렴(보라)',
  flowYLabel: '에너지 지수',
  nowLabel: '지금',
  tooltipBest: '베스트',
  tooltipCaution: '주의',
  tooltipConvergence: '양쪽 수렴',
  bestDay: '베스트 데이 (추진)',
  cautionDay: '주의 데이 (보류)',
  convergenceDay: '수렴 데이 (전환)',
  bestMonth: '베스트 달 (추진)',
  cautionMonth: '주의 달 (보류)',
  convergenceMonth: '수렴 달 (전환)',
  bestHour: '베스트 시간 (추진)',
  cautionHour: '주의 시간 (보류)',
  emptyHighlight: '데이터 없음',
  yearLabel: (y) => `${y} 한 해`,
  yearVerdict: (b, w) => `${b}월 무렵 흐름이 가장 좋고, ${w}월은 숨 고르기 좋은 시기예요.`,
  yearVerdictFlat: '한 해 흐름이 비교적 고른 편이에요.',
  monthVerdictFallback: (g) => `이번 달은 ${g} 흐름이에요.`,
  bestDayDesc: (s) => `${s}점 — 큰 결정·시작에 우호적`,
  cautionDayDesc: (s) => `${s}점 — 보류·일상 유지`,
  bestMonthDesc: (s) => `평균 ${s}점 — 큰 결정·시작에 우호적`,
  cautionMonthDesc: (s) => `평균 ${s}점 — 숨 고르기·정리에 좋음`,
  convergenceDesc: '점성·사주 양쪽이 가리키는 큰 흐름 — 좋고 나쁨은 점수로',
  yearThemeEmpty: '올해 테마 신호가 부족해요 — 차트 대신 다른 카드로 흐름을 확인하세요.',
  monthThemeEmpty: '이달 테마 신호가 부족해요.',
  lifeTimelineTitle: '인생 분기점',
  lifeInProgress: '진행 중',
  pivotBothSystems: '점성·사주 양쪽이 같은 시기를 가리키는 큰 전환',
  pivotAstroOnly: '점성 라이프사이클 분기점',
  pivotDaeunOnly: '대운 전환 — 10년 흐름의 시작',
  themeFocusTitle: '이번 달 초점',
  themeFocusEmpty: '이달 테마 신호가 부족해요.',
  keyDatesTitle: '핵심 날짜',
  keyDatesBestLabel: '추진일',
  keyDatesWindowLabel: '강한 구간',
  keyDatesAvoidLabel: '보류 날짜',
  keyDatesScoreSuffix: (s) => `${s}점`,
  keyDatesWindowFmt: (start, end, avg) => `${start} ~ ${end} (평균 ${avg}점)`,
  keyDatesEmpty: '이번 달 표시할 날짜 신호가 부족해요.',
  bigTurnsTitle: '큰 전환',
  bigTurnsAstroLabel: '점성',
  bigTurnsSajuLabel: '사주',
  bigTurnsEmpty: '이번 달 양쪽 수렴 날이 없어요.',
  engineFailedRetry: '엔진 호출 실패',
  fetchTimeout: '서버 응답이 너무 오래 걸려요. 다시 시도해 주세요.',
}

const EN: LabelSet = {
  tabYear: 'Year',
  tabMonth: 'Month',
  tabDay: 'Today',
  today: 'Today',
  goToToday: 'Today',
  thisMonth: 'Current month',
  weekdayShort: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
  weekdayFull: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  prevMonth: 'Previous month',
  nextMonth: 'Next month',
  legendGood: 'Good',
  legendNeutral: 'Neutral',
  legendCaution: 'Caution',
  dayCellAria: (m, d, g, sel) => `${m}/${d}, ${g}${sel ? ', selected' : ''}`,
  dailyHeaderAria: (m, d, w) => `${m} ${d} ${w} — open calendar`,
  heroAria: 'View today details',
  calendarTabAria: 'Go to calendar',
  doNowLabel: 'Push',
  watchOutLabel: 'Hold',
  engineDiag: 'Engine diagnostics',
  confidence: 'Confidence',
  agreement: 'Saju ↔ Astro agreement',
  agreementSub: 'How aligned the two systems are',
  confidenceSub: 'Engine self-confidence in this reading',
  hourDetailTitle: (b, w) => `Hour detail — best ${b} / worst ${w}`,
  best: 'BEST',
  worst: 'WORST',
  noSignal: 'No signal',
  dosTitle: 'Recommended actions',
  dontsTitle: 'Things to watch',
  dayDetailPlaceholder: 'Tap a day in the calendar to see hour-level analysis.',
  formatHour: (h) => {
    if (h === 0) return '12 AM'
    if (h === 12) return '12 PM'
    if (h < 12) return `${h} AM`
    return `${h - 12} PM`
  },
  saju: 'Saju',
  astro: 'Astro',
  agreementShort: 'Align',
  distribution: 'Mix',
  scoreCaption: 'Avg energy',
  gradeLabel: (k) => (k === 'lucky' ? 'Lucky day' : k === 'unlucky' ? 'Cautious day' : 'Neutral'),
  gradeSub: (k) =>
    k === 'lucky' ? 'Supportive flow' : k === 'unlucky' ? 'Take it easy' : 'Steady flow',
  themeName: (k) =>
    ({ growth: 'Growth', career: 'Career', money: 'Money', love: 'Love', health: 'Health' })[k],
  themeOrder: ['growth', 'career', 'money', 'love', 'health'],
  radarTitle: 'Domain balance',
  radarCaptionStrong: (top, ts, second, ss, bottom, bs) =>
    `${top} (${ts}) and ${second} (${ss}) stand out; mind ${bottom} (${bs}).`,
  radarCaptionFlat: 'Pretty evenly distributed.',
  themeMissingCaption: (names) =>
    `${names.join(', ')}: low signal — shown as average of other axes.`,
  flowTitle: 'Flow',
  flowSubtitle: 'Best (green) · Caution (rose) · Convergence (purple)',
  flowYLabel: 'Energy',
  nowLabel: 'Now',
  tooltipBest: 'Best',
  tooltipCaution: 'Caution',
  tooltipConvergence: 'Convergence',
  bestDay: 'Best day (push)',
  cautionDay: 'Caution day (hold)',
  convergenceDay: 'Convergence (turn)',
  bestMonth: 'Best month (push)',
  cautionMonth: 'Caution month (hold)',
  convergenceMonth: 'Convergence (turn)',
  bestHour: 'Best hour (push)',
  cautionHour: 'Caution hour (hold)',
  emptyHighlight: 'No data',
  yearLabel: (y) => `${y}`,
  yearVerdict: (b, w) => `Best around month ${b}; month ${w} is a good time to slow down.`,
  yearVerdictFlat: 'The year is fairly even overall.',
  monthVerdictFallback: (g) => `This month is a ${g.toLowerCase()} flow.`,
  bestDayDesc: (s) => `${s} — favorable for big decisions/starts`,
  cautionDayDesc: (s) => `${s} — hold steady, maintenance day`,
  bestMonthDesc: (s) => `Avg ${s} — favorable for big decisions/starts`,
  cautionMonthDesc: (s) => `Avg ${s} — good for slowing down and reflecting`,
  convergenceDesc:
    'Saju and astrology both peak here — see scores for whether it tilts good or hard',
  yearThemeEmpty: 'Low theme signal this year — use other cards instead.',
  monthThemeEmpty: 'Low theme signal this month.',
  lifeTimelineTitle: 'Life pivots',
  lifeInProgress: 'In progress',
  pivotBothSystems: 'Both saju and astrology mark this period — a major turn',
  pivotAstroOnly: 'Astrological lifecycle pivot',
  pivotDaeunOnly: 'Daeun transition — start of a new 10-year flow',
  themeFocusTitle: 'Focus this month',
  themeFocusEmpty: 'Low theme signal this month.',
  keyDatesTitle: 'Key dates',
  keyDatesBestLabel: 'Push day',
  keyDatesWindowLabel: 'Strong window',
  keyDatesAvoidLabel: 'Hold dates',
  keyDatesScoreSuffix: (s) => `${s} pts`,
  keyDatesWindowFmt: (start, end, avg) => `${start} – ${end} (avg ${avg})`,
  keyDatesEmpty: 'Not enough date signals this month.',
  bigTurnsTitle: 'Big turns',
  bigTurnsAstroLabel: 'Astro',
  bigTurnsSajuLabel: 'Saju',
  bigTurnsEmpty: 'No convergence days this month.',
  engineFailedRetry: 'Engine call failed',
  fetchTimeout: 'Server taking too long. Please try again.',
}

export function getCalLabels(locale: CalLocale | string | undefined | null): LabelSet {
  if (locale === 'en') return EN
  return KO
}
