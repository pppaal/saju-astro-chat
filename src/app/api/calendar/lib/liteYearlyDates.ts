import type {
  DomainKey,
  MonthlyOverlapPoint,
  TimingCalibrationSummary,
} from '@/lib/destiny-matrix/types'
import type { EventCategory, ImportanceGrade } from '@/lib/destiny-map/calendar/types'
import type { UserAstroProfile, UserSajuProfile } from '@/lib/destiny-map/calendar/types'
import { getJohuYongsin, MONTH_CLIMATE } from '@/lib/Saju/johuYongsin'

type CalendarLocale = 'ko' | 'en'

type LiteMatrixCalendarContext = {
  overlapTimeline?: MonthlyOverlapPoint[]
  overlapTimelineByDomain?: Partial<Record<DomainKey, MonthlyOverlapPoint[]>>
  timingCalibration?: TimingCalibrationSummary
  domainScores?: Partial<
    Record<
      DomainKey,
      {
        finalScoreAdjusted?: number
      }
    >
  >
}

export interface LiteImportantDate {
  date: string
  grade: ImportanceGrade
  score: number
  rawScore?: number
  adjustedScore?: number
  displayScore?: number
  categories: EventCategory[]
  titleKey: string
  descKey: string
  ganzhi: string
  crossVerified: boolean
  transitSunSign: string
  sajuFactorKeys: string[]
  astroFactorKeys: string[]
  recommendationKeys: string[]
  warningKeys: string[]
  confidence?: number
  confidenceNote?: string
  crossAgreementPercent?: number
  /** 본문에 등장한 사주·점성 용어 → 한 줄 풀이 (프런트 툴팁용) */
  glossary?: Record<string, string>
  /** 사주 ↔ 점성 교차 확인 한 줄 + 신뢰도 % */
  crossCheck?: { line: string; agreementPercent: number }
}

type LiteOptions = {
  category?: EventCategory
  limit?: number
  minGrade?: ImportanceGrade
  locale?: CalendarLocale
  matrixContext?: LiteMatrixCalendarContext | null
}

const DOMAIN_TO_CATEGORY: Record<DomainKey, EventCategory> = {
  career: 'career',
  love: 'love',
  money: 'wealth',
  health: 'health',
  move: 'travel',
}

const DOMAIN_LABELS: Record<CalendarLocale, Record<DomainKey, string>> = {
  ko: {
    career: '커리어',
    love: '관계',
    money: '재정',
    health: '건강',
    move: '이동',
  },
  en: {
    career: 'career',
    love: 'relationship',
    money: 'finance',
    health: 'health',
    move: 'movement',
  },
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

function monthKey(year: number, month: number): string {
  return `${year}-${pad2(month)}`
}

function categoryMatchesFilter(categories: EventCategory[], filter?: EventCategory): boolean {
  return !filter || categories.includes(filter)
}

function scoreToGrade(score: number): ImportanceGrade {
  if (score >= 86) return 0
  if (score >= 72) return 1
  if (score >= 56) return 2
  if (score >= 38) return 3
  return 4
}

type StrengthTier = 'rising' | 'aligned' | 'wavering' | 'guarded'

function tierFromStrength(strength: number): StrengthTier {
  if (strength >= 0.78) return 'rising'
  if (strength >= 0.6) return 'aligned'
  if (strength >= 0.42) return 'wavering'
  return 'guarded'
}

function hashSeed(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function pickBySeed<T>(seed: string, list: readonly T[]): T {
  if (!list.length) return undefined as unknown as T
  return list[hashSeed(seed) % list.length]
}

const STEM_TO_ELEMENT: Record<string, 'wood' | 'fire' | 'earth' | 'metal' | 'water'> = {
  甲: 'wood', 乙: 'wood',
  丙: 'fire', 丁: 'fire',
  戊: 'earth', 己: 'earth',
  庚: 'metal', 辛: 'metal',
  壬: 'water', 癸: 'water',
}

const ELEMENT_LABEL_KO: Record<string, string> = {
  wood: '목', fire: '화', earth: '토', metal: '금', water: '수',
}

const ELEMENT_LABEL_EN: Record<string, string> = {
  wood: 'Wood', fire: 'Fire', earth: 'Earth', metal: 'Metal', water: 'Water',
}

function seasonElement(month: number): 'wood' | 'fire' | 'earth' | 'metal' | 'water' {
  if (month >= 3 && month <= 5) return 'wood'
  if (month >= 6 && month <= 8) return 'fire'
  if (month === 9) return 'earth'
  if (month >= 10 && month <= 11) return 'metal'
  return 'water'
}

const ELEMENT_RELATIONS: Record<string, Record<string, 'same' | 'support' | 'drain' | 'control' | 'controlled'>> = {
  wood: { wood: 'same', fire: 'drain', earth: 'control', metal: 'controlled', water: 'support' },
  fire: { fire: 'same', earth: 'drain', metal: 'control', water: 'controlled', wood: 'support' },
  earth: { earth: 'same', metal: 'drain', water: 'control', wood: 'controlled', fire: 'support' },
  metal: { metal: 'same', water: 'drain', wood: 'control', fire: 'controlled', earth: 'support' },
  water: { water: 'same', wood: 'drain', fire: 'control', earth: 'controlled', metal: 'support' },
}

// 천간 (year-stem index 0..9 = 甲乙丙丁戊己庚辛壬癸)
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const STEM_INDEX: Record<string, number> = Object.fromEntries(STEMS.map((s, i) => [s, i]))
const STEM_YIN: Record<string, boolean> = {
  '甲': false, '乙': true, '丙': false, '丁': true, '戊': false,
  '己': true, '庚': false, '辛': true, '壬': false, '癸': true,
}
const STEM_TO_KO_ELEMENT: Record<string, string> = {
  '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
  '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수',
}
const ELEMENT_KO_TO_EN_MAP: Record<string, 'wood' | 'fire' | 'earth' | 'metal' | 'water'> = {
  '목': 'wood', '화': 'fire', '토': 'earth', '금': 'metal', '수': 'water',
}
// 월지: Gregorian month 1~12 → 丑寅卯辰巳午未申酉戌亥子
const MONTH_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
function monthBranchOf(month: number): string {
  return MONTH_BRANCHES[month % 12]
}
function yearStemOf(year: number): string {
  return STEMS[((year - 4) % 10 + 10) % 10]
}
// 寅月 천간 = (year stem % 5) * 2 → 0=甲己→丙(2), 1=乙庚→戊(4), 2=丙辛→庚(6), 3=丁壬→壬(8), 4=戊癸→甲(0)
function monthStemOf(year: number, month: number): string {
  const yIdx = ((year - 4) % 10 + 10) % 10
  const baseStemIdx = ((yIdx % 5) * 2 + 2) % 10
  const monthsFromYin = month >= 2 ? month - 2 : month + 10
  return STEMS[(baseStemIdx + monthsFromYin) % 10]
}

// 십신 (day-master vs target stem)
function getSibsinKo(dayStem: string, targetStem: string): string {
  const dayEl = STEM_TO_KO_ELEMENT[dayStem]
  const tEl = STEM_TO_KO_ELEMENT[targetStem]
  if (!dayEl || !tEl) return ''
  const elements = ['목', '화', '토', '금', '수']
  const samePolarity = STEM_YIN[dayStem] === STEM_YIN[targetStem]
  const dayIdx = elements.indexOf(dayEl)
  const tIdx = elements.indexOf(tEl)
  const diff = (tIdx - dayIdx + 5) % 5
  // diff 0 same el, 1 day produces target (식상), 2 day controls target (재성),
  // 3 target controls day (관성), 4 target produces day (인성)
  const labels = [
    ['비견', '겁재'], // 0
    ['식신', '상관'], // 1
    ['편재', '정재'], // 2
    ['편관', '정관'], // 3
    ['편인', '정인'], // 4
  ]
  return labels[diff][samePolarity ? 0 : 1]
}

const SIBSIN_DOMAIN: Record<string, DomainKey> = {
  비견: 'career', 겁재: 'money',
  식신: 'love', 상관: 'love',
  편재: 'money', 정재: 'money',
  편관: 'career', 정관: 'career',
  편인: 'health', 정인: 'health',
}

const SIBSIN_THEME_KO: Record<string, string> = {
  비견: '동료·동료성 협업',
  겁재: '경쟁·자원 분배 신경전',
  식신: '꾸준한 표현·생산 활동',
  상관: '강한 발산·표현·창작',
  편재: '유동적인 돈 흐름·외부 거래',
  정재: '고정 수입·계약 안정',
  편관: '도전적 책임·압박 업무',
  정관: '공식 직책·규칙 안의 일',
  편인: '학습·내적 정리 시간',
  정인: '돌봄·문서·인정의 흐름',
}

// 12신살 핵심 4종 — 일지 三合 그룹별 트리거 월지
const SAMHAP_GROUP: Record<string, '寅午戌' | '申子辰' | '巳酉丑' | '亥卯未'> = {
  寅: '寅午戌', 午: '寅午戌', 戌: '寅午戌',
  申: '申子辰', 子: '申子辰', 辰: '申子辰',
  巳: '巳酉丑', 酉: '巳酉丑', 丑: '巳酉丑',
  亥: '亥卯未', 卯: '亥卯未', 未: '亥卯未',
}
const SHINSAL_TRIGGERS: Record<
  '寅午戌' | '申子辰' | '巳酉丑' | '亥卯未',
  { 역마: string; 도화: string; 화개: string; 망신: string }
> = {
  寅午戌: { 역마: '申', 도화: '卯', 화개: '戌', 망신: '巳' },
  申子辰: { 역마: '寅', 도화: '酉', 화개: '辰', 망신: '亥' },
  巳酉丑: { 역마: '亥', 도화: '午', 화개: '丑', 망신: '申' },
  亥卯未: { 역마: '巳', 도화: '子', 화개: '未', 망신: '寅' },
}
function activeSinsals(dayBranch: string, transitBranch: string): string[] {
  const grp = SAMHAP_GROUP[dayBranch]
  if (!grp) return []
  const trig = SHINSAL_TRIGGERS[grp]
  const out: string[] = []
  if (trig.역마 === transitBranch) out.push('역마')
  if (trig.도화 === transitBranch) out.push('도화')
  if (trig.화개 === transitBranch) out.push('화개')
  if (trig.망신 === transitBranch) out.push('망신')
  return out
}
const SINSAL_BLURB_KO: Record<string, string> = {
  역마: '환경 이동·출장·전직 신호',
  도화: '관계 끌림·매력·공개 자리',
  화개: '내적 정리·예술·고요',
  망신: '체면 흔들림 주의·실수 점검',
}

const GLOSSARY_KO: Record<string, string> = {
  // 십신
  비견: '나와 같은 오행·성별 — 동료, 동등한 협업의 결',
  겁재: '나와 같은 오행·반대 성별 — 경쟁자, 자원을 나누는 관계',
  식신: '내가 만들어내는 부드러운 산출 — 꾸준한 표현·생산',
  상관: '내가 만들어내는 강한 발산 — 창의·도전·말발',
  편재: '내가 통제할 자원·외부 거래 — 유동적인 돈 흐름',
  정재: '내가 안정적으로 거두는 자원 — 고정 수입·계약',
  편관: '나를 누르는 강한 책임 — 도전적·압박형 업무',
  정관: '나를 다스리는 정식 직책 — 공식·규칙 안의 일',
  편인: '나를 키우는 비주류 인성 — 학습·내적 재정비',
  정인: '나를 키우는 정식 인성 — 돌봄·문서·인정',
  // 신살
  역마: '이동·출장·전직 같은 환경 변동 신호',
  도화: '관계 끌림·매력·공개적인 자리에 서기 좋은 결',
  화개: '내적 정리·예술·고독한 시간이 깊어지는 결',
  망신: '체면 흔들림·실수 노출에 조심해야 하는 결',
  // 사주 기본 어휘
  일간: '내 사주의 기준 천간(태어난 날의 위 글자) — 본인 그 자체',
  일지: '태어난 날의 아래 글자(地支) — 배우자 자리·내 일상의 결',
  월간: '태어난 달의 위 글자(천간) — 사회·직장·환경 결',
  월지: '태어난 달의 아래 글자(지지) — 시기·계절·격국의 뿌리',
  대운: '10년 단위의 큰 운 흐름',
  세운: '한 해의 운 흐름',
  격국: '사주가 어떤 틀에 가까운지(정관격·정재격 등) — 본명의 큰 성격',
  조후용신: '계절(月)에 비춰 본명을 살리는 핵심 오행',
  // 오행
  목: '나무 — 자라남·계획·시작',
  화: '불 — 표현·확장·열정',
  토: '흙 — 중재·신뢰·축적',
  금: '쇠 — 결단·구조·정리',
  수: '물 — 지혜·휴식·흐름',
  // 점성
  네이탈: '태어난 순간의 천체 위치(본명 차트)',
  트랜짓: '오늘 하늘에 떠 있는 행성과 본명의 만남',
  '환절기 트랜짓': '계절이 바뀌는 구간(3·9월 등)에 일어나는 외부 신호',
  // 분석 용어
  교차: '사주와 점성이 같은 결을 가리키는지 확인하는 cross-check',
}

function pickGlossaryTerms(text: string): string[] {
  const out: string[] = []
  for (const term of Object.keys(GLOSSARY_KO)) {
    if (text.includes(term)) out.push(term)
  }
  return out
}

function buildCrossCheckLineKo(percent: number): string {
  if (percent >= 75) {
    return `사주 신호와 점성 신호가 ${percent}%로 같은 방향을 가리킵니다. 둘이 동시에 받쳐줘 결정의 신뢰도가 높습니다.`
  }
  if (percent >= 55) {
    return `사주·점성 교차 일치도 ${percent}% — 큰 줄기는 같지만 세부에서 갈리니 핵심만 잡고 나머지는 미루는 편이 안전합니다.`
  }
  return `사주·점성 교차 일치도 ${percent}%로 낮습니다. 한쪽 신호만 보고 움직이지 말고 다른 축에서 다시 확인하세요.`
}

function buildCrossCheckLineEn(percent: number): string {
  if (percent >= 75) {
    return `Saju and astrology align at ${percent}% — both axes back the same direction, so confidence is high.`
  }
  if (percent >= 55) {
    return `Cross-check ${percent}% — broad direction holds but details diverge; keep the core moves and defer the rest.`
  }
  return `Cross-check ${percent}% — signals diverge. Don't move on a single axis; verify on the other before committing.`
}

function hasFinalConsonant(ko: string): boolean {
  if (!ko) return false
  const ch = ko.charCodeAt(ko.length - 1)
  if (ch < 0xac00 || ch > 0xd7a3) return false
  return (ch - 0xac00) % 28 !== 0
}

function objectMarkerKo(label: string): string {
  return hasFinalConsonant(label) ? '을' : '를'
}

function subjectMarkerKo(label: string): string {
  return hasFinalConsonant(label) ? '이' : '가'
}

function instrumentalMarkerKo(label: string): string {
  if (!label) return '으로'
  const ch = label.charCodeAt(label.length - 1)
  if (ch < 0xac00 || ch > 0xd7a3) return '으로'
  const jong = (ch - 0xac00) % 28
  // 받침 없음 또는 ㄹ(8) 받침 → '로', 그 외 → '으로'
  return jong === 0 || jong === 8 ? '로' : '으로'
}

const MOON_GRAIN_KO: Record<DomainKey, string> = {
  career: '실행 동기',
  love: '감정 결',
  money: '결정 흐름',
  health: '리듬',
  move: '의지 흐름',
}

const SIGN_KO_LABEL: Record<string, string> = {
  Aries: '양자리', Taurus: '황소자리', Gemini: '쌍둥이자리', Cancer: '게자리',
  Leo: '사자자리', Virgo: '처녀자리', Libra: '천칭자리', Scorpio: '전갈자리',
  Sagittarius: '사수자리', Capricorn: '염소자리', Aquarius: '물병자리', Pisces: '물고기자리',
}
function sunSignKoLabel(sign: string | undefined): string {
  if (!sign) return '태양'
  return SIGN_KO_LABEL[sign] || sign
}
const SIGN_DOMAIN_FLAVOR_KO: Record<string, Partial<Record<DomainKey, string>>> = {
  Aries: { career: '주도형 추진력', love: '직진형 표현', money: '빠른 결단', health: '활동형 회복', move: '단발적 이동' },
  Taurus: { career: '꾸준한 누적', love: '안정 지향', money: '자산·실물 관리', health: '리듬 누적', move: '계획적 이동' },
  Gemini: { career: '커뮤니케이션·다중 라인', love: '대화 중심', money: '단기 거래', health: '두뇌·호흡', move: '잦은 이동' },
  Cancer: { career: '돌봄·기반 다지기', love: '정서 결속', money: '생활 자금', health: '정서 회복', move: '귀가·홈베이스' },
  Leo: { career: '주목·발표', love: '표현·로맨스', money: '대담한 베팅', health: '심장·체력', move: '공식 자리' },
  Virgo: { career: '디테일·운영', love: '세심한 배려', money: '예산 정리', health: '식습관·점검', move: '점검형 이동' },
  Libra: { career: '협상·중재', love: '관계 균형', money: '공동 결제', health: '균형·자세', move: '동행 이동' },
  Scorpio: { career: '집중·재구성', love: '깊은 결속', money: '레버리지·차입', health: '대사·해독', move: '비공개 이동' },
  Sagittarius: { career: '확장·기획', love: '오픈 마인드', money: '큰 그림 투자', health: '하체·간', move: '장거리 이동' },
  Capricorn: { career: '구조·책임', love: '진중한 약속', money: '장기 자산', health: '뼈·관절', move: '업무 출장' },
  Aquarius: { career: '혁신·네트워크', love: '거리 있는 우정형', money: '신기술 투자', health: '신경계', move: '돌발 이동' },
  Pisces: { career: '창작·직관', love: '교감·헌신', money: '감정 소비', health: '면역·수면', move: '내면 여행' },
}
function signHouseFlavorKo(sign: string | undefined, domain: DomainKey): string {
  if (!sign) return '본인 축의 색을 드러내는 시기'
  return SIGN_DOMAIN_FLAVOR_KO[sign]?.[domain] || `${sunSignKoLabel(sign)} 색이 흐름에 묻어납니다`
}

const MOON_GRAIN_EN: Record<DomainKey, string> = {
  career: 'execution drive',
  love: 'emotional grain',
  money: 'decision flow',
  health: 'rhythm',
  move: 'momentum',
}

function getMonthStrength(rows: MonthlyOverlapPoint[] | undefined, month: string): number {
  if (!rows?.length) return 0
  return rows
    .filter((item) => item.month === month)
    .reduce((max, item) => Math.max(max, item.overlapStrength || 0), 0)
}

function getDomainBase(
  matrixContext: LiteMatrixCalendarContext | null | undefined,
  domain: DomainKey
): number {
  const raw = matrixContext?.domainScores?.[domain]?.finalScoreAdjusted
  if (!Number.isFinite(raw)) return 0.52
  return clamp(Number(raw) / 10, 0, 1)
}

function pickTopDomains(
  matrixContext: LiteMatrixCalendarContext | null | undefined,
  currentMonthKey: string
): Array<{ domain: DomainKey; score: number }> {
  const domains: DomainKey[] = ['career', 'love', 'money', 'health', 'move']
  return domains
    .map((domain) => {
      const monthStrength = getMonthStrength(
        matrixContext?.overlapTimelineByDomain?.[domain],
        currentMonthKey
      )
      const score = getDomainBase(matrixContext, domain) * 0.55 + monthStrength * 0.45
      return { domain, score: clamp(score, 0, 1) }
    })
    .sort((left, right) => right.score - left.score)
}

const TITLE_POOL_KO: Record<DomainKey, Record<StrengthTier, string[]>> = {
  career: {
    rising: ['커리어 추진력이 살아나는 날', '커리어 결단을 가져갈 만한 날', '커리어 점화가 강한 날'],
    aligned: ['커리어 흐름이 가지런해지는 날', '커리어 우선순위가 잘 잡히는 날', '커리어 실행에 무리가 없는 날'],
    wavering: ['커리어 점검이 필요한 날', '커리어 속도를 한 호흡 늦출 날', '커리어 조정이 들어갈 날'],
    guarded: ['커리어 보수 운영이 필요한 날', '커리어 무리수를 막아둘 날', '커리어 잠시 물러설 날'],
  },
  love: {
    rising: ['관계의 온도가 오르는 날', '대화가 풀리는 관계의 날', '관계 신호가 또렷한 날'],
    aligned: ['관계 결이 맞아드는 날', '감정 정리에 좋은 날', '관계 한 걸음 다가설 날'],
    wavering: ['관계 거리 조정이 필요한 날', '관계 신호가 엇갈리는 날', '대화 톤을 낮출 날'],
    guarded: ['관계 보수 운영의 날', '관계 충돌을 피해갈 날', '관계 표현 자제가 좋은 날'],
  },
  money: {
    rising: ['재정 결정이 가벼워지는 날', '돈 흐름에 활기가 있는 날', '재정 실행이 살아나는 날'],
    aligned: ['재정 점검과 정렬에 좋은 날', '예산을 다듬기 좋은 날', '소비-수입 균형의 날'],
    wavering: ['재정 점검이 우선인 날', '큰 지출을 미룰 날', '재정 신호가 흐릿한 날'],
    guarded: ['재정 보수 운영의 날', '큰 결제 자제할 날', '재정 보호 우선의 날'],
  },
  health: {
    rising: ['컨디션 회복이 빠른 날', '루틴 회복에 좋은 날', '몸 신호가 또렷한 날'],
    aligned: ['건강 점검에 좋은 날', '체력 정렬의 날', '리듬 잡기에 무난한 날'],
    wavering: ['건강 무리를 피할 날', '몸 신호 점검이 필요한 날', '회복 우선의 날'],
    guarded: ['건강 보수 운영의 날', '체력 비축이 우선인 날', '몸 사릴 날'],
  },
  move: {
    rising: ['이동·추진이 가벼운 날', '환경 전환에 좋은 날', '이동 결정이 매끄러운 날'],
    aligned: ['이동 일정 정리의 날', '동선 점검에 좋은 날', '환경 조정의 날'],
    wavering: ['이동 점검이 필요한 날', '동선 변경 자제할 날', '이동 결정 미룰 날'],
    guarded: ['이동 보수 운영의 날', '큰 이동 자제할 날', '환경 변화 신중히 갈 날'],
  },
}

const TITLE_POOL_EN: Record<DomainKey, Record<StrengthTier, string[]>> = {
  career: {
    rising: ['Career momentum day', 'Strong push for career calls', 'Career-decision-friendly day'],
    aligned: ['Career flow lines up well', 'Career priorities settle cleanly', 'Smooth career execution day'],
    wavering: ['Career review day', 'Slow down career pace', 'Career adjustment day'],
    guarded: ['Conservative career day', 'Hold career bets today', 'Career step-back day'],
  },
  love: {
    rising: ['Warm relationship day', 'Conversations open up', 'Clear relationship signals'],
    aligned: ['Relationship alignment day', 'Good for emotional reset', 'Relationship step-forward day'],
    wavering: ['Relationship distance review', 'Mixed relationship signals', 'Lower the conversation tone'],
    guarded: ['Conservative relationship day', 'Avoid relationship friction', 'Hold expressions today'],
  },
  money: {
    rising: ['Money decisions feel light', 'Active money flow day', 'Finance execution day'],
    aligned: ['Good for finance review', 'Budget alignment day', 'Income-spend balance day'],
    wavering: ['Finance review day', 'Defer large spending', 'Finance signals are fuzzy'],
    guarded: ['Conservative finance day', 'Hold large payments', 'Finance protection day'],
  },
  health: {
    rising: ['Quick recovery day', 'Good for routine reset', 'Clear body signals'],
    aligned: ['Health review day', 'Body alignment day', 'Rhythm-building day'],
    wavering: ['Avoid health strain today', 'Check body signals', 'Recovery-first day'],
    guarded: ['Conservative health day', 'Save energy day', 'Health step-back day'],
  },
  move: {
    rising: ['Smooth movement day', 'Environment-shift day', 'Move decisions feel light'],
    aligned: ['Schedule cleanup day', 'Route check day', 'Environment adjustment day'],
    wavering: ['Movement review day', 'Hold route changes', 'Defer move decisions'],
    guarded: ['Conservative movement day', 'Avoid major moves', 'Tread cautiously'],
  },
}

function buildTitle(
  locale: CalendarLocale,
  domain: DomainKey,
  tier: StrengthTier,
  sibsin: string,
  seed: string
): string {
  const pool = (locale === 'ko' ? TITLE_POOL_KO : TITLE_POOL_EN)[domain][tier]
  const base = pickBySeed(seed, pool)
  if (locale === 'ko' && sibsin && (tier === 'rising' || tier === 'aligned')) {
    return `${sibsin} 흐름의 날 · ${base}`
  }
  if (locale === 'en' && sibsin && (tier === 'rising' || tier === 'aligned')) {
    return `${sibsin} day · ${base}`
  }
  return base
}

function buildDescription(
  locale: CalendarLocale,
  domain: DomainKey,
  tier: StrengthTier,
  dominanceGap: number,
  crossAgreementPercent: number,
  pack: MonthlyCounselorPack | undefined,
  seed: string
): string {
  const label = DOMAIN_LABELS[locale][domain]
  const om = locale === 'ko' ? objectMarkerKo(label) : ''
  const focusKo =
    dominanceGap >= 0.18 ? `${label} 단일 축에` : `${label}${om} 중심으로 보조 축까지`
  const focusEn =
    dominanceGap >= 0.18 ? `solely on ${label}` : `${label} with a secondary axis in support`
  const aligned = crossAgreementPercent >= 70
  const conflicted = crossAgreementPercent < 50
  const crossPhraseKo = aligned
    ? '사주·점성 신호가 같은 방향을 가리킵니다'
    : conflicted
      ? '신호가 엇갈립니다'
      : '큰 줄기는 맞지만 세부 신호가 갈립니다'
  const crossPhraseEn = aligned
    ? 'saju and astrology point the same way'
    : conflicted
      ? 'signals are mixed'
      : 'the broad direction holds but details diverge'

  const corePoolKo: Record<StrengthTier, string[]> = {
    rising: [
      `${label} 추진력이 분명히 살아 있어 ${focusKo} 우선순위를 좁혀 실행하기 좋습니다.`,
      `${label} 결단의 무게를 가져갈 만큼 흐름이 받쳐주는 날이라 작은 일은 뒤로 미뤄도 됩니다.`,
      aligned
        ? `${label} 신호가 또렷하고 사주·점성 결이 같은 방향이라 결과까지 끌고 갈 수 있는 날입니다.`
        : `${label} 신호가 또렷해 결과까지 끌고 갈 수 있지만, ${crossPhraseKo}.`,
    ],
    aligned: [
      `${label} 흐름이 가지런해 ${focusKo} 일정과 우선순위를 정리하기 좋습니다.`,
      `${label} 축이 안정적이라 큰 무리수보다 가볍게 진도 빼는 편이 효율적입니다.`,
      `${label} 결이 맞아들어 작은 결정 여러 개를 묶어 처리할 수 있습니다.`,
    ],
    wavering: [
      conflicted
        ? `${label} 축은 살아 있지만 ${crossPhraseKo}. 실행보다 조건 확인이 먼저입니다.`
        : `${label} 축은 살아 있어도 무게를 크게 싣기엔 이른 날입니다. 조건 확인부터 하세요.`,
      `${label} 신호가 흔들리니 범위를 좁히고 결정 기한을 다음 날로 미뤄도 됩니다.`,
      aligned
        ? `${label} 흐름은 안정적이지만 추진력이 약해, 새 결정보다 점검 항목을 정리하기 좋은 날입니다.`
        : `${label} 흐름은 보이지만 확신을 크게 싣기엔 이른 날입니다.`,
    ],
    guarded: [
      `${label} 축에 제약이 큰 날입니다. 무리하게 확정하지 말고 리스크를 줄이세요.`,
      `${label} 추진력이 약한 날이라 큰 결정은 다음 흐름까지 보류하는 편이 안전합니다.`,
      conflicted
        ? `${label} 신호가 약하고 ${crossPhraseKo}. 새 일을 벌이기보다 기존 흐름을 정리해 두세요.`
        : `${label} 신호가 약하니 새 일을 벌이기보다 기존 흐름을 정리해 두세요.`,
    ],
  }

  const corePoolEn: Record<StrengthTier, string[]> = {
    rising: [
      `${label} momentum is clear; lean ${focusEn} and tighten priorities to push real outcomes.`,
      `${label} carries enough weight today to make decisive moves while smaller tasks can wait.`,
      aligned
        ? `${label} signals are sharp and ${crossPhraseEn}, so follow through to a clean outcome.`
        : `${label} signals are sharp, but ${crossPhraseEn}; keep one verification step.`,
    ],
    aligned: [
      `${label} flow is steady; focus ${focusEn} and clean up the schedule.`,
      `${label} is stable enough for batch progress without aggressive moves.`,
      `${label} alignment lets you bundle small decisions efficiently.`,
    ],
    wavering: [
      conflicted
        ? `${label} is active but ${crossPhraseEn}; verify conditions before executing.`
        : `${label} is active but the weight isn't there yet. Verify conditions first.`,
      `${label} signals wobble; narrow the scope and delay binding decisions by one day.`,
      aligned
        ? `${label} flow is steady but momentum is thin; clean up checklists rather than commit new work.`
        : `${label} is visible but not clean enough for a hard commitment today.`,
    ],
    guarded: [
      `${label} faces stronger constraints than momentum; reduce risk rather than push.`,
      `${label} pull is weak today; defer large decisions to the next cycle.`,
      conflicted
        ? `${label} signals are thin and ${crossPhraseEn}; consolidate existing work instead of starting new.`
        : `${label} signals are thin; consolidate existing work instead of starting new.`,
    ],
  }

  const pool = locale === 'ko' ? corePoolKo[tier] : corePoolEn[tier]
  const core = pickBySeed(seed, pool)
  if (!pack) return core
  if (locale === 'ko') {
    const prefixCandidates: string[] = []
    if (pack.sibsin) {
      prefixCandidates.push(
        `이번 달 십신은 ${pack.sibsin}—${pack.sibsinTheme}${subjectMarkerKo(pack.sibsinTheme)} 결을 만듭니다.`
      )
    }
    if (pack.sinsals.length) {
      const s = pack.sinsals[0]
      const blurb = SINSAL_BLURB_KO[s]
      prefixCandidates.push(
        `본명에 ${s}${subjectMarkerKo(s)} 활성화돼 ${blurb}${subjectMarkerKo(blurb)} 함께 옵니다.`
      )
    }
    if (pack.yongsinPrimary && pack.yongsinAlign !== 'neutral') {
      prefixCandidates.push(
        pack.yongsinAlign === 'support'
          ? `조후용신 ${pack.yongsinPrimary}${subjectMarkerKo(pack.yongsinPrimary)} 본명을 받쳐줍니다.`
          : `조후용신 ${pack.yongsinPrimary}${subjectMarkerKo(pack.yongsinPrimary)} 본명과 결이 어긋납니다.`
      )
    }
    if (!prefixCandidates.length) return core
    const prefix = pickBySeed(`${seed}|p`, prefixCandidates)
    return `${prefix} ${core}`
  }
  const prefixCandidates: string[] = []
  if (pack.sibsin) {
    prefixCandidates.push(`This month leans on ${pack.sibsin}—shaping the grain.`)
  }
  if (pack.sinsals.length) {
    prefixCandidates.push(`Sinsal ${pack.sinsals[0]} is active in your chart.`)
  }
  if (pack.yongsinPrimary && pack.yongsinAlign !== 'neutral') {
    prefixCandidates.push(
      pack.yongsinAlign === 'support'
        ? `Johu yongsin ${pack.yongsinPrimary} backs the natal frame.`
        : `Johu yongsin ${pack.yongsinPrimary} pulls against the natal frame.`
    )
  }
  if (!prefixCandidates.length) return core
  return `${pickBySeed(`${seed}|p`, prefixCandidates)} ${core}`
}

type MonthlyCounselorPack = {
  monthStem: string
  monthBranch: string
  sibsin: string // 십신 라벨
  sibsinTheme: string // 한국어 한 줄
  sinsals: string[] // 활성 신살
  yongsinAlign: 'support' | 'neutral' | 'conflict' // 용신과의 호환
  yongsinPrimary?: string // 한글 오행 라벨
  climate?: string // 月支 기후 라벨
  season?: string
}

function buildMonthlyCounselorPacks(
  year: number,
  profile: UserSajuProfile
): Record<number, MonthlyCounselorPack> {
  const out: Record<number, MonthlyCounselorPack> = {}
  const dayStem = profile.dayMaster || profile.pillars?.day?.stem || ''
  const dayBranch = profile.dayBranch || profile.pillars?.day?.branch || ''
  const yongsin = profile.yongsin?.primary // 한글 오행 (목/화/토/금/수) 또는 영문 가능
  for (let m = 1; m <= 12; m++) {
    const ms = monthStemOf(year, m)
    const mb = monthBranchOf(m)
    const sibsin = dayStem ? getSibsinKo(dayStem, ms) : ''
    const sinsals = dayBranch ? activeSinsals(dayBranch, mb) : []
    const johu = dayStem ? getJohuYongsin(dayStem, mb) : null
    const climate = MONTH_CLIMATE[mb]?.climate
    const season = MONTH_CLIMATE[mb]?.season
    let yongsinAlign: MonthlyCounselorPack['yongsinAlign'] = 'neutral'
    let yongsinPrimary: string | undefined = johu?.primaryYongsin
    if (yongsin && yongsinPrimary) {
      const userYongsinKo = ELEMENT_KO_TO_EN_MAP[yongsin]
        ? yongsin
        : Object.entries(ELEMENT_KO_TO_EN_MAP).find(([_, en]) => en === yongsin)?.[0]
      yongsinAlign =
        userYongsinKo === yongsinPrimary
          ? 'support'
          : userYongsinKo
            ? 'conflict'
            : 'neutral'
    }
    out[m] = {
      monthStem: ms,
      monthBranch: mb,
      sibsin,
      sibsinTheme: sibsin ? SIBSIN_THEME_KO[sibsin] || '' : '',
      sinsals,
      yongsinAlign,
      yongsinPrimary,
      climate,
      season,
    }
  }
  return out
}

function buildSajuFactors(
  locale: CalendarLocale,
  profile: UserSajuProfile,
  domain: DomainKey,
  month: number,
  pack: MonthlyCounselorPack,
  seed: string
): string[] {
  const label = DOMAIN_LABELS[locale][domain]
  const dayMaster = profile.dayMaster || profile.pillars?.day?.stem || ''
  const dayElement = (profile.dayMasterElement as string) || STEM_TO_ELEMENT[dayMaster] || 'earth'
  const seasonEl = seasonElement(month)
  const relation = ELEMENT_RELATIONS[dayElement]?.[seasonEl] || 'same'

  if (locale === 'ko') {
    const dayElKo = ELEMENT_LABEL_KO[dayElement]
    const monthElKo = STEM_TO_KO_ELEMENT[pack.monthStem] || ELEMENT_LABEL_KO[seasonEl]
    const seasonKo = pack.season || ''
    // 1) 일간-월령 십신 한 줄
    const sibsinLine = pack.sibsin
      ? `이번 달은 일간 ${dayMaster}(${dayElKo}) 위에 월간 ${pack.monthStem}(${monthElKo})${subjectMarkerKo(monthElKo)} ${pack.sibsin}${instrumentalMarkerKo(pack.sibsin)} 들어와 ${pack.sibsinTheme}${subjectMarkerKo(pack.sibsinTheme)} 두드러집니다.`
      : `이번 달 월령은 일간 ${dayMaster}(${dayElKo})에게 ${relationLabelKo(relation)} 결로 들어옵니다.`
    // 2) 신살 / 용신 / 격국 중 하나를 seed로 골라서 두 번째 줄 구성
    const secondPool: string[] = []
    if (pack.sinsals.length) {
      const s = pickBySeed(`${seed}|sl`, pack.sinsals)
      const blurb = SINSAL_BLURB_KO[s]
      secondPool.push(
        `일지 ${profile.dayBranch || ''} 기준 ${s}${subjectMarkerKo(s)} 활성화되어 ${blurb}${subjectMarkerKo(blurb)} ${label} 쪽 흐름에 끼어듭니다.`
      )
    }
    if (pack.yongsinPrimary) {
      const alignText =
        pack.yongsinAlign === 'support'
          ? '용신 결과 부합해 결정이 가벼워집니다'
          : pack.yongsinAlign === 'conflict'
            ? '용신과 결이 어긋나 한 박자 늦추는 편이 안전합니다'
            : '조후용신은 흐름과 큰 충돌 없이 무난하게 작동합니다'
      secondPool.push(
        `${seasonKo ? `${seasonKo} ` : ''}월령 ${pack.monthBranch}의 조후용신은 ${pack.yongsinPrimary} 기운이라, 본명에 비춰 ${alignText}.`
      )
    }
    if (profile.geokguk?.type) {
      secondPool.push(
        `${profile.geokguk.type}${profile.geokguk.strength ? `·${profile.geokguk.strength}` : ''} 격에 비추어 ${label} 결정은 ${pack.yongsinAlign === 'conflict' ? '범위를 좁혀' : '꾸준한 호흡으로'} 다루는 편이 본명과 잘 맞습니다.`
      )
    }
    if (!secondPool.length) {
      secondPool.push(
        `대운·세운의 기본 구조는 ${label} 판단을 한 번에 넓히기보다 단계로 다루기를 지지합니다.`
      )
    }
    const branchLine = profile.dayBranch
      ? `일지 ${profile.dayBranch}와 월지 ${pack.monthBranch} 사이는 ${label} 쪽 결정의 ${relationCycleSignalKo(relation)} 신호를 만듭니다.`
      : ''
    const second = pickBySeed(`${seed}|s2`, secondPool)
    return branchLine ? [sibsinLine, second, branchLine] : [sibsinLine, second]
  }

  const dayElEn = ELEMENT_LABEL_EN[dayElement]
  const monthElEn = ELEMENT_LABEL_EN[ELEMENT_KO_TO_EN_MAP[STEM_TO_KO_ELEMENT[pack.monthStem]] || seasonEl]
  const sibsinLine = pack.sibsin
    ? `This month, day-master ${dayMaster} (${dayElEn}) meets month-stem ${pack.monthStem} (${monthElEn}) as ${pack.sibsin}; the ${label} axis carries that flavour.`
    : `This month's month frame meets day-master ${dayMaster} (${dayElEn}) as a ${relationLabelEn(relation)} pairing.`
  const secondPool: string[] = []
  if (pack.sinsals.length) {
    const s = pickBySeed(`${seed}|sl`, pack.sinsals)
    secondPool.push(`Day-branch ${profile.dayBranch || ''} activates ${s} this month, adding a ${s === '역마' ? 'movement' : s === '도화' ? 'attraction' : s === '화개' ? 'introspection' : 'caution'} signal to ${label}.`)
  }
  if (pack.yongsinPrimary) {
    const alignText =
      pack.yongsinAlign === 'support'
        ? 'aligns with the natal yongsin, easing decisions'
        : pack.yongsinAlign === 'conflict'
          ? 'misaligns with the natal yongsin; slow the pace'
          : 'sits in a neutral band against the natal yongsin'
    secondPool.push(`The month's johu yongsin is ${pack.yongsinPrimary}, which ${alignText}.`)
  }
  if (!secondPool.length) {
    secondPool.push(`Long-cycle structure prefers handling ${label} step-by-step rather than expanding all at once.`)
  }
  const branchLine = profile.dayBranch
    ? `Day-branch ${profile.dayBranch} against month-branch ${pack.monthBranch} produces a ${relation === 'support' ? 'push' : relation === 'control' ? 'brake' : 'check'} signal for ${label}.`
    : ''
  const second = pickBySeed(`${seed}|s2`, secondPool)
  return branchLine ? [sibsinLine, second, branchLine] : [sibsinLine, second]
}

function relationLabelKo(rel: 'same' | 'support' | 'drain' | 'control' | 'controlled'): string {
  switch (rel) {
    case 'same': return '동기'
    case 'support': return '상생'
    case 'drain': return '설기'
    case 'control': return '극'
    case 'controlled': return '제'
  }
}

function relationActionKo(rel: 'same' | 'support' | 'drain' | 'control' | 'controlled'): string {
  switch (rel) {
    case 'same': return '기운이 같이 모입니다'
    case 'support': return '받쳐주는 결이 들어옵니다'
    case 'drain': return '에너지가 바깥으로 풀려나갑니다'
    case 'control': return '진행에 제동이 걸리기 쉽습니다'
    case 'controlled': return '한 박자 늦추는 결이 보입니다'
  }
}

function relationCycleSignalKo(rel: 'same' | 'support' | 'drain' | 'control' | 'controlled'): string {
  switch (rel) {
    case 'same':
    case 'support': return '추진'
    case 'drain': return '확장'
    case 'control': return '제동'
    case 'controlled': return '점검'
  }
}

function relationCyclePriorityKo(rel: 'same' | 'support' | 'drain' | 'control' | 'controlled'): string {
  switch (rel) {
    case 'same':
    case 'support': return '올립니다'
    case 'drain': return '바깥으로 분산시킵니다'
    case 'control': return '눌러둡니다'
    case 'controlled': return '잠시 미뤄둡니다'
  }
}

function relationLabelEn(rel: 'same' | 'support' | 'drain' | 'control' | 'controlled'): string {
  switch (rel) {
    case 'same': return 'reinforcing'
    case 'support': return 'supportive'
    case 'drain': return 'draining'
    case 'control': return 'controlling'
    case 'controlled': return 'restrained'
  }
}

function relationActionEn(rel: 'same' | 'support' | 'drain' | 'control' | 'controlled'): string {
  switch (rel) {
    case 'same': return 'thickening momentum on'
    case 'support': return 'adding lift to'
    case 'drain': return 'leaking energy from'
    case 'control': return 'putting brakes on'
    case 'controlled': return 'asking you to slow on'
  }
}

function buildAstroFactors(
  locale: CalendarLocale,
  astroProfile: UserAstroProfile,
  domain: DomainKey,
  month: number,
  crossAgreementPercent: number,
  tier: StrengthTier,
  seed: string
): string[] {
  const label = DOMAIN_LABELS[locale][domain]
  const sunSign = astroProfile.sunSign || (locale === 'ko' ? '태양' : 'Sun')
  const moonSign = astroProfile.moonSign
  const isWinter = month <= 2 || month === 12
  const isSummer = month >= 6 && month <= 8
  const dayIsStrong = tier === 'rising' || tier === 'aligned'
  const strongTrigger = crossAgreementPercent >= 70 && dayIsStrong
  const weakTrigger = crossAgreementPercent < 50 || tier === 'guarded'

  if (locale === 'ko') {
    const grainKo = MOON_GRAIN_KO[domain]
    const sunHouseFlavor = signHouseFlavorKo(sunSign, domain)
    const seasonalKo = isWinter
      ? '겨울 트랜짓이 깊이 있는 결정에 무게를 더합니다'
      : isSummer
        ? '여름 트랜짓이 외부 활동과 표현을 키웁니다'
        : '환절기 트랜짓이 우선순위 재배치를 유도합니다'
    const sunLine = `네이탈 태양 ${sunSignKoLabel(sunSign)}—${sunHouseFlavor}. 이번 ${seasonalKo}.`
    const moonLine = moonSign
      ? `${sunSignKoLabel(moonSign)} 달은 ${label} 쪽 ${grainKo}${objectMarkerKo(grainKo)} ${crossAgreementPercent >= 60 ? '받쳐줍니다' : '흩트립니다'}.`
      : `달 트랜짓은 ${label} 결정의 ${crossAgreementPercent >= 60 ? '실행 신호' : '재확인 신호'}로 작용합니다.`
    const closerPool = strongTrigger
      ? [
          `행성 어스펙트가 ${label} 쪽으로 또렷한 점화를 보탭니다.`,
          `단기 트리거가 살아 있어 짧은 호흡으로 진도 빼기 좋습니다.`,
          `트랜짓 정렬이 좋으니 결정 후 실행까지 같은 날 묶어도 됩니다.`,
        ]
      : weakTrigger
        ? [
            `트랜짓 정렬이 약하니 큰 결정 전에 한 박자 두세요.`,
            `단기 트리거가 흐릿해 즉답보다 자료를 한 번 더 보세요.`,
            `행성 어스펙트가 흩어져 있어 무리한 일정은 미루는 편이 안전합니다.`,
          ]
        : [
            `단기 트리거는 살아 있어도 지속성은 따로 확인하세요.`,
            `행성 어스펙트가 ${label} 쪽으로 작은 점화를 보탭니다.`,
            `트랜짓이 안정 구간에 있어 큰 변동 없이 흐름을 끌고 갈 수 있습니다.`,
          ]
    return [sunLine, moonLine, pickBySeed(seed, closerPool)]
  }
  const grainEn = MOON_GRAIN_EN[domain]
  const seasonalEn = isWinter
    ? 'winter transits add weight to deep decisions'
    : isSummer
      ? 'summer transits expand outward action and expression'
      : 'shoulder-season transits drive a re-prioritization'
  const sunLine = `Around ${sunSign}, ${seasonalEn}.`
  const moonLine = moonSign
    ? `The ${moonSign} Moon signal ${crossAgreementPercent >= 60 ? 'supports' : 'scatters'} ${grainEn} on ${label}.`
    : `Lunar transit acts as ${crossAgreementPercent >= 60 ? 'an execution cue' : 'a re-check cue'} for ${label} decisions.`
  const closerPool = strongTrigger
    ? [
        `Planetary aspects add a clear spark toward ${label}.`,
        `Short-term triggers are alive; bundle decision and execution today.`,
        `Transit alignment is strong; tighten the loop and ship.`,
      ]
    : weakTrigger
      ? [
          `Transit alignment is thin; pause one beat before large decisions.`,
          `Short-term triggers are faint; review notes once more before answering.`,
          `Planetary aspects are scattered; defer aggressive scheduling.`,
        ]
      : [
          `Short-term triggers may be alive, but verify durability separately.`,
          `Planetary aspects add a small spark toward ${label}.`,
          `Transit sits in a stable band; carry the flow without forcing changes.`,
        ]
  return [sunLine, moonLine, pickBySeed(seed, closerPool)]
}

function buildRecommendations(grade: ImportanceGrade): string[] {
  if (grade <= 1) return ['confidence']
  if (grade === 2) return ['planning']
  return []
}

function buildWarnings(grade: ImportanceGrade, crossAgreementPercent: number): string[] {
  if (grade >= 3) return ['confusion']
  if (grade === 2 && crossAgreementPercent < 50) return ['confusion']
  return []
}

export function calculateYearlyImportantDatesLite(
  year: number,
  sajuProfile: UserSajuProfile,
  astroProfile: UserAstroProfile,
  options?: LiteOptions
): LiteImportantDate[] {
  const locale = options?.locale || 'ko'
  const results: LiteImportantDate[] = []
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31)
  const reliability = clamp(
    options?.matrixContext?.timingCalibration?.reliabilityScore || 0.58,
    0,
    1
  )
  const counselorPacks = buildMonthlyCounselorPacks(year, sajuProfile)

  for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
    const month = date.getMonth() + 1
    const day = date.getDate()
    const currentMonthKey = monthKey(year, month)
    const domainRanking = pickTopDomains(options?.matrixContext, currentMonthKey)
    const primary = domainRanking[0] || { domain: 'career' as DomainKey, score: 0.52 }
    const secondary = domainRanking[1] || { domain: 'love' as DomainKey, score: 0.48 }
    const seasonalPulse = (Math.sin((day / 31) * Math.PI) + 1) / 2
    const dailyWave = (Math.sin((day / 31) * Math.PI * 2 - Math.PI / 2) + 1) / 2
    const weekday = date.getDay()
    const weekdayBoost =
      weekday === 1 || weekday === 4 ? 0.04 : weekday === 0 || weekday === 6 ? -0.03 : 0
    const primaryMonthStrength = getMonthStrength(
      options?.matrixContext?.overlapTimelineByDomain?.[primary.domain],
      currentMonthKey
    )
    const secondaryMonthStrength = getMonthStrength(
      options?.matrixContext?.overlapTimelineByDomain?.[secondary.domain],
      currentMonthKey
    )
    const dominanceGap = clamp(primary.score - secondary.score, 0, 1)
    const primaryStrength = clamp(
      primary.score * 0.52 +
        primaryMonthStrength * 0.18 +
        dailyWave * 0.12 +
        seasonalPulse * 0.08 +
        reliability * 0.08 +
        dominanceGap * 0.08 +
        weekdayBoost,
      0,
      1
    )
    const crossAgreementPercent = Math.round(
      clamp(primary.score * 55 + secondary.score * 20 + reliability * 25, 0, 1) * 100
    )
    const weakPenalty =
      primaryStrength < 0.5
        ? clamp((0.4 - primaryMonthStrength) * 32 + (0.6 - reliability) * 14, 0, 28)
        : 0
    const peakBoost = primaryStrength >= 0.8 && primaryMonthStrength >= 0.7 ? 4 : 0
    const score = Math.round(
      clamp(
        8 +
          primaryStrength * 64 +
          primaryMonthStrength * 18 +
          secondaryMonthStrength * 5 +
          secondary.score * 6 +
          dominanceGap * 6 +
          peakBoost -
          weakPenalty,
        2,
        99
      )
    )
    const grade = scoreToGrade(score)
    const baseTier = tierFromStrength(primaryStrength)
    const tier: StrengthTier =
      grade === 0
        ? 'rising'
        : grade === 4
          ? 'guarded'
          : grade === 3 && baseTier !== 'guarded'
            ? 'wavering'
            : grade === 1 && baseTier === 'wavering'
              ? 'aligned'
              : baseTier
    const seed = `${year}-${pad2(month)}-${pad2(day)}|${primary.domain}|${grade}`
    if (typeof options?.minGrade === 'number' && grade > options.minGrade) {
      continue
    }

    const categories: EventCategory[] = [DOMAIN_TO_CATEGORY[primary.domain], 'general']
    if (secondary.score >= 0.62) {
      const secondaryCategory = DOMAIN_TO_CATEGORY[secondary.domain]
      if (!categories.includes(secondaryCategory)) categories.unshift(secondaryCategory)
    }
    if (!categoryMatchesFilter(categories, options?.category)) {
      continue
    }

    results.push({
      date: isoDate(year, month, day),
      grade,
      score,
      rawScore: score,
      adjustedScore: score,
      displayScore: score,
      categories,
      titleKey: buildTitle(
        locale,
        primary.domain,
        tier,
        counselorPacks[month]?.sibsin || '',
        `${seed}|t`
      ),
      descKey: buildDescription(
        locale,
        primary.domain,
        tier,
        dominanceGap,
        crossAgreementPercent,
        counselorPacks[month],
        `${seed}|d`
      ),
      ganzhi: `${counselorPacks[month]?.monthStem || ''}${counselorPacks[month]?.monthBranch || ''}`,
      crossVerified: crossAgreementPercent >= 60,
      transitSunSign: astroProfile.sunSign || '',
      sajuFactorKeys: buildSajuFactors(
        locale,
        sajuProfile,
        primary.domain,
        month,
        counselorPacks[month],
        `${seed}|s`
      ),
      astroFactorKeys: [
        locale === 'ko'
          ? `사주↔점성 교차 일치도 ${crossAgreementPercent}% — ${
              crossAgreementPercent >= 70
                ? '두 축이 같은 방향'
                : crossAgreementPercent >= 50
                  ? '큰 줄기는 같지만 세부는 갈림'
                  : '신호가 엇갈림'
            }`
          : `Saju↔astrology cross-check ${crossAgreementPercent}% — ${
              crossAgreementPercent >= 70
                ? 'both axes align'
                : crossAgreementPercent >= 50
                  ? 'broad direction holds, details diverge'
                  : 'signals diverge'
            }`,
        ...buildAstroFactors(
          locale,
          astroProfile,
          primary.domain,
          month,
          crossAgreementPercent,
          tier,
          `${seed}|a`
        ),
      ],
      recommendationKeys: buildRecommendations(grade),
      warningKeys: buildWarnings(grade, crossAgreementPercent),
      confidence: Math.round(clamp(primaryStrength * 100, 0, 100)),
      confidenceNote:
        locale === 'ko' ? '캘린더 경량 스코어링 기준' : 'Calendar lite scoring baseline',
      crossAgreementPercent,
      glossary: (() => {
        if (locale !== 'ko') return undefined
        const surface = [
          counselorPacks[month]?.sibsin || '',
          ...(counselorPacks[month]?.sinsals || []),
          ...buildSajuFactors(locale, sajuProfile, primary.domain, month, counselorPacks[month], `${seed}|s`),
        ].join(' ')
        const terms = pickGlossaryTerms(surface)
        if (!terms.length) return undefined
        const map: Record<string, string> = {}
        for (const t of terms) map[t] = GLOSSARY_KO[t]
        return map
      })(),
      crossCheck: {
        line:
          locale === 'ko'
            ? buildCrossCheckLineKo(crossAgreementPercent)
            : buildCrossCheckLineEn(crossAgreementPercent),
        agreementPercent: crossAgreementPercent,
      },
    })
  }

  results.sort((a, b) => {
    if (a.grade !== b.grade) return a.grade - b.grade
    return (b.displayScore ?? b.score) - (a.displayScore ?? a.score)
  })

  if (options?.limit) {
    return results.slice(0, options.limit)
  }
  return results
}
