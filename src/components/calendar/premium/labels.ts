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
  // Weekday names (Sun..Sat)
  weekdayShort: [string, string, string, string, string, string, string]
  weekdayFull: [string, string, string, string, string, string, string]
  // Calendar
  prevMonth: string
  nextMonth: string
  legendGood: string
  legendNeutral: string
  legendCaution: string
  // Aria
  dayCellAria: (m: number, d: number, gradeLabel: string, selected: boolean) => string
  dailyHeaderAria: (monthLabel: string, day: number, weekday: string) => string
  heroAria: string
  calendarTabAria: string
  // Hour formatter
  formatHour: (h: number) => string
  // Hero
  scoreCaption: string
  // Grade / theme
  gradeLabel: (key: GradeKey) => string
  themeName: (key: ThemeKey) => string
  // FlowChart
  flowTitle: string
  flowSubtitle: string
  flowYLabel: string
  nowLabel: string
  tooltipBest: string
  tooltipCaution: string
  tooltipConvergence: string
  // Year hero verdict
  yearLabel: (year: number) => string
  yearVerdict: (bestMonth: number, worstMonth: number) => string
  yearVerdictFlat: string
  monthVerdictFallback: (gradeLabel: string) => string
  // LifeTimeline
  lifeTimelineTitle: string
  lifeInProgress: string
  /** engine lifetimePivots.meaning 없을 때 description fallback. */
  pivotDaeunFallback: (saju: string) => string
  // Month insights (themeRanking + keyEvents + convergence)
  themeFocusTitle: string
  keyDatesTitle: string
  keyDatesBestLabel: string
  keyDatesWindowLabel: string
  keyDatesAvoidLabel: string
  keyDatesScoreSuffix: (score: number) => string
  keyDatesWindowFmt: (start: string, end: string, avg: number) => string
  bigTurnsTitle: string
  bigTurnsAstroLabel: string
  bigTurnsSajuLabel: string
  // Month comparison
  comparisonPrefix: string
  comparisonOverallUp: (delta: number) => string
  comparisonOverallDown: (delta: number) => string
  comparisonOverallFlat: string
  // Year insights
  yearFocusTitle: string
  yearBigDaysTitle: string
  // Bar context badges (differentiating same 5-bar pattern across tabs)
  contextMonthAvg: string
  contextYearAvg: string
  contextTodayEnergy: string
  // Day insights
  dayVerdictDomainPrefix: string
  dayAxisAgreement: (kind: 'aligned' | 'mixed' | 'opposed') => string
  dayDomainsTitle: string
  dayPatternsLabel: string
  dayWhyTitle: string
  dayWhySajuLabel: string
  dayWhyAstroLabel: string
  dayWhyShinsalLabel: string
  dayWhyCrossLabel: string
  /** 합치율 chip — "사주↔점성 N%" */
  crossAgreementChip: (percent: number) => string
  /** CrossInsightCard 라벨 */
  crossInsightTitle: string
  crossInsightSubtitle: string
  crossInsightEvidenceLabel: string
  crossSignalSajuTitle: string
  crossSignalAstroTitle: string
  crossSignalDaysUnit: (n: number) => string
  dayHourlyTitle: string
  dayHourlyPushLabel: string
  dayHourlyAvoidLabel: string
  dayHourlyBestHour: string
  dayHourlyWorstHour: string
  // 24h chart
  hourlyTitle: string
  hourlySubtitle: string
  hourlyNeutralRef: string
  // formatters
  fmtMonthDay: (m: number, d: number) => string
  fmtMonth: (m: number) => string
  fmtAge: (age: number) => string
  fmtMonthlyFlow: string
  fmtDailyFlow: string
  /** 헤더 라벨 — "2026년 5월" / "MAY 2026" */
  fmtYearMonthHeader: (year: number, month1: number) => string
  // Misc UI
  openCalendarGrid: string
  closeButton: string
  evidenceToggle: string
  evidenceShow: string
  evidenceHide: string
  bothSystemsBadge: string
  // Engine error
  engineFailedRetry: string
  fetchTimeout: string
}

const KO: LabelSet = {
  tabYear: '올해',
  tabMonth: '요번달',
  tabDay: '오늘',
  today: '오늘',
  goToToday: '오늘로',
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
  formatHour: (h) => {
    if (h === 0) return '자정 12시'
    if (h === 12) return '정오 12시'
    if (h < 12) return `오전 ${h}시`
    return `오후 ${h - 12}시`
  },
  scoreCaption: '평균 에너지',
  gradeLabel: (k) => (k === 'lucky' ? '좋은 날' : k === 'unlucky' ? '조심할 날' : '보통'),
  themeName: (k) =>
    ({ growth: '성장', career: '직업', money: '재물', love: '연애', health: '건강' })[k],
  flowTitle: '흐름',
  flowSubtitle: '베스트(녹) · 주의(분홍) · 양쪽 수렴(보라)',
  flowYLabel: '에너지 지수',
  nowLabel: '지금',
  tooltipBest: '베스트',
  tooltipCaution: '주의',
  tooltipConvergence: '양쪽 수렴',
  yearLabel: (y) => `${y} 한 해`,
  yearVerdict: (b, w) => `${b}월 무렵 흐름이 가장 좋고, ${w}월은 숨 고르기 좋은 시기예요.`,
  yearVerdictFlat: '한 해 흐름이 비교적 고른 편이에요.',
  monthVerdictFallback: (g) => `이번 달은 ${g} 흐름이에요.`,
  lifeTimelineTitle: '인생 분기점',
  lifeInProgress: '진행 중',
  pivotDaeunFallback: (saju) => `${saju} — 10년 흐름의 시작`,
  themeFocusTitle: '이번 달 초점',
  keyDatesTitle: '핵심 날짜',
  keyDatesBestLabel: '추진일',
  keyDatesWindowLabel: '강한 구간',
  keyDatesAvoidLabel: '보류 날짜',
  keyDatesScoreSuffix: (s) => `${s}점`,
  keyDatesWindowFmt: (start, end, avg) => `${start} ~ ${end} (평균 ${avg}점)`,
  bigTurnsTitle: '큰 전환',
  bigTurnsAstroLabel: '점성',
  bigTurnsSajuLabel: '사주',
  comparisonPrefix: '지난달 대비',
  comparisonOverallUp: (d) => `전체 ↑${d}점`,
  comparisonOverallDown: (d) => `전체 ↓${Math.abs(d)}점`,
  comparisonOverallFlat: '전체 비슷',
  yearFocusTitle: '올해 초점',
  yearBigDaysTitle: '올해 큰 날',
  contextMonthAvg: '이달 평균',
  contextYearAvg: '12개월 평균',
  contextTodayEnergy: '오늘 에너지',
  dayVerdictDomainPrefix: '중심 영역',
  dayAxisAgreement: (k) =>
    k === 'aligned' ? '사주·점성 합의' : k === 'opposed' ? '사주·점성 엇갈림' : '부분 합의',
  dayDomainsTitle: '오늘의 영역',
  dayPatternsLabel: '활성 패턴',
  dayWhyTitle: '왜 오늘은',
  dayWhySajuLabel: '사주',
  dayWhyAstroLabel: '점성',
  dayWhyShinsalLabel: '신살',
  dayWhyCrossLabel: '교차 (사주↔점성)',
  crossAgreementChip: (p) => `사주↔점성 ${p}%`,
  crossInsightTitle: '사주 ↔ 점성 시그널',
  crossInsightSubtitle: '이번 기간 사주가 자주 보낸 신호 vs 점성이 자주 보낸 신호.',
  crossInsightEvidenceLabel: '예시 일',
  crossSignalSajuTitle: '사주가 자주 보낸 신호',
  crossSignalAstroTitle: '점성이 자주 보낸 신호',
  crossSignalDaysUnit: (n) => `${n}일`,
  dayHourlyTitle: '지금 뭐 할까',
  dayHourlyPushLabel: '추진할 것',
  dayHourlyAvoidLabel: '보류할 것',
  dayHourlyBestHour: '최고 시간',
  dayHourlyWorstHour: '주의 시간',
  hourlyTitle: '시간대 흐름 (24시간)',
  hourlySubtitle: '하루 중 어느 시간에 운이 오는지 · 50점 기준선',
  hourlyNeutralRef: '보통 50',
  fmtMonthDay: (m, d) => `${m}월 ${d}일`,
  fmtMonth: (m) => `${m}월`,
  fmtAge: (age) => `${age}세`,
  fmtMonthlyFlow: '월별 에너지 흐름',
  fmtDailyFlow: '일별 에너지 흐름',
  fmtYearMonthHeader: (y, m) => `${y}년 ${m}월`,
  openCalendarGrid: '캘린더 보기',
  closeButton: '닫기',
  evidenceToggle: '근거',
  evidenceShow: '근거 보기',
  evidenceHide: '근거 숨기기',
  bothSystemsBadge: '점성·사주',
  engineFailedRetry: '엔진 호출 실패',
  fetchTimeout: '서버 응답이 너무 오래 걸려요. 다시 시도해 주세요.',
}

const EN: LabelSet = {
  tabYear: 'Year',
  tabMonth: 'Month',
  tabDay: 'Today',
  today: 'Today',
  goToToday: 'Today',
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
  formatHour: (h) => {
    if (h === 0) return '12 AM'
    if (h === 12) return '12 PM'
    if (h < 12) return `${h} AM`
    return `${h - 12} PM`
  },
  scoreCaption: 'Avg energy',
  gradeLabel: (k) => (k === 'lucky' ? 'Lucky day' : k === 'unlucky' ? 'Cautious day' : 'Neutral'),
  themeName: (k) =>
    ({ growth: 'Growth', career: 'Career', money: 'Money', love: 'Love', health: 'Health' })[k],
  flowTitle: 'Flow',
  flowSubtitle: 'Best (green) · Caution (rose) · Convergence (purple)',
  flowYLabel: 'Energy',
  nowLabel: 'Now',
  tooltipBest: 'Best',
  tooltipCaution: 'Caution',
  tooltipConvergence: 'Convergence',
  yearLabel: (y) => `${y}`,
  yearVerdict: (b, w) => `Best around month ${b}; month ${w} is a good time to slow down.`,
  yearVerdictFlat: 'The year is fairly even overall.',
  monthVerdictFallback: (g) => `This month is a ${g.toLowerCase()} flow.`,
  lifeTimelineTitle: 'Life pivots',
  lifeInProgress: 'In progress',
  pivotDaeunFallback: (saju) => `${saju} — start of a new 10-year flow`,
  themeFocusTitle: 'Focus this month',
  keyDatesTitle: 'Key dates',
  keyDatesBestLabel: 'Push day',
  keyDatesWindowLabel: 'Strong window',
  keyDatesAvoidLabel: 'Hold dates',
  keyDatesScoreSuffix: (s) => `${s} pts`,
  keyDatesWindowFmt: (start, end, avg) => `${start} – ${end} (avg ${avg})`,
  bigTurnsTitle: 'Big turns',
  bigTurnsAstroLabel: 'Astro',
  bigTurnsSajuLabel: 'Saju',
  comparisonPrefix: 'vs last month',
  comparisonOverallUp: (d) => `overall ↑${d}`,
  comparisonOverallDown: (d) => `overall ↓${Math.abs(d)}`,
  comparisonOverallFlat: 'overall steady',
  yearFocusTitle: 'Year focus',
  yearBigDaysTitle: 'Year big days',
  contextMonthAvg: 'Month avg',
  contextYearAvg: '12-month avg',
  contextTodayEnergy: 'Today’s energy',
  dayVerdictDomainPrefix: 'Focus',
  dayAxisAgreement: (k) =>
    k === 'aligned' ? 'Saju & astro agree' : k === 'opposed' ? 'Saju & astro disagree' : 'Mixed',
  dayDomainsTitle: 'Today’s domains',
  dayPatternsLabel: 'Active patterns',
  dayWhyTitle: 'Why today',
  dayWhySajuLabel: 'Saju',
  dayWhyAstroLabel: 'Astro',
  dayWhyShinsalLabel: 'Shinsal',
  dayWhyCrossLabel: 'Cross (Saju ↔ Astro)',
  crossAgreementChip: (p) => `Saju ↔ Astro ${p}%`,
  crossInsightTitle: 'Saju ↔ Astro Signals',
  crossInsightSubtitle: 'Top signals Saju sent vs top signals Astro sent this period.',
  crossInsightEvidenceLabel: 'Example days',
  crossSignalSajuTitle: 'Saju top signals',
  crossSignalAstroTitle: 'Astro top signals',
  crossSignalDaysUnit: (n) => `${n}d`,
  dayHourlyTitle: 'What now',
  dayHourlyPushLabel: 'Push',
  dayHourlyAvoidLabel: 'Hold',
  dayHourlyBestHour: 'Best hour',
  dayHourlyWorstHour: 'Caution hour',
  hourlyTitle: '24-hour flow',
  hourlySubtitle: 'When energy peaks during the day · 50 = baseline',
  hourlyNeutralRef: 'Neutral 50',
  fmtMonthDay: (m, d) => `${m}/${d}`,
  fmtMonth: (m) => `M${m}`,
  fmtAge: (age) => `age ${age}`,
  fmtMonthlyFlow: 'Monthly flow',
  fmtDailyFlow: 'Daily flow',
  fmtYearMonthHeader: (y, m) => {
    const MMM = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
    return `${MMM[m - 1] ?? ''} ${y}`
  },
  openCalendarGrid: 'View calendar',
  closeButton: 'Close',
  evidenceToggle: 'Why',
  evidenceShow: 'Show evidence',
  evidenceHide: 'Hide evidence',
  bothSystemsBadge: 'Saju · Astro',
  engineFailedRetry: 'Engine call failed',
  fetchTimeout: 'Server taking too long. Please try again.',
}

export function getCalLabels(locale: CalLocale | string | undefined | null): LabelSet {
  if (locale === 'en') return EN
  return KO
}
