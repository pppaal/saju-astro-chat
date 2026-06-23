/**
 * 인생 전체 흐름 — 사주 대운(10년 십신 아크)과 점성 인생 마디(회귀·외행성 transit)를
 * *교차*해 "초년기→장년기" 단계별로 합성. 교차엔진(사주×점성).
 *
 * v2 (2026-06): 팩트 노출 강화.
 *  - 대운 간지·정확 연도 범위 명시(예: "갑신 대운 2024-2034")
 *  - 외행성 마디 정확 일시(예: "토성 회귀 2024-03-17")를 해당 단계에 매핑
 *  - 점성 정체성(태양·상승·MC)을 intro 에 노출
 *  - 같은 톤(good/mid/hard)이 연속 단계에 반복되지 않도록 variant 회전
 *
 * v3 (2026-06): 영문 path 활성 + 사주 팩트 더 깊이.
 *  - lang === 'en' 도 동작 (옛 코드: undefined 리턴이라 영문 사용자 미노출)
 *  - 격국(geokguk) 한 줄 노출 — advancedAnalysis.geokguk
 *  - 오행 분포(fiveElements) 지배 오행 한 줄 노출
 *  - 본명 ↔ 대운 지지 충/육합 한 줄 (단계별 relationLine 신 필드)
 *
 * 모든 계산은 결정적(LLM 무사용). natal·monthly scope.
 */
import type { NatalContext } from '../context/types'
import { getSibsinKo } from '@/lib/saju/cycleRelations'
import { SIGN_KO as SIGN_KO_SSOT } from '@/lib/astrology/signLabels'
import { STEM_KO, BRANCH_KO } from '@/lib/saju/ganjiKo'
import { getStemElement } from '@/lib/saju/stemBranchUtils'
import { getTwelveStage } from '@/lib/saju/shinsal'
import { getJohuYongsin } from '@/lib/saju/johuYongsin'
import { getTwelveStageInterpretation, type TwelveStageType } from '@/lib/saju/interpretations'

const TWELVE_STAGE_TYPES: ReadonlySet<TwelveStageType> = new Set([
  '장생',
  '목욕',
  '관대',
  '건록',
  '제왕',
  '쇠',
  '병',
  '사',
  '묘',
  '절',
  '태',
  '양',
])
import { SIBSIN_CAT, favorOf, type SibsinCat } from './cycleTone'
import type { LifecycleMilestoneOverride } from '@/lib/calendar-engine/lifecycle/astroLifecycle'
import { buildLifecycleTiming } from '@/lib/calendar-engine/lifecycle/astroLifecycle'
import { currentManAge } from '@/lib/datetime/currentAge'

export interface LifePhase {
  label: string // 초년기 … (rendered locale — kept for backward compat)
  /**
   * 단계 라벨을 양 언어로 병행 baked — 클라이언트 토글이 서버 render 언어에
   * 묶이지 않게. lifetimePivots 가 label+labelEn 을 항상 함께 내보내는 패턴과 동일.
   */
  labelKo: string // 초년기/청년기/중년기/장년기
  labelEn: string // Early years / Young adulthood / …
  ageRange: string // '0~19세 · 1995~2014'
  /** 십신 + 단계 본문 + 톤 (필수). 옛 단일 text 와 호환되도록 같이 유지. */
  text: string
  /** 본문 한국어 — 클라이언트 토글용. */
  textKo: string
  /** 본문 영문 — 클라이언트 토글용. */
  textEn: string
  /**
   * 이 단계에 걸친 대운 흐름 한 줄. 예: "丁丑(정축) 대운 1996-2006 → 丙子(병자)
   * 대운 2006-2016". UI 가 본문(text) 위에 작게 표시.
   */
  daeunLine?: string
  /**
   * 이 단계에 떨어지는 외행성 마디 한 줄. 예: "첫 목성 회귀 2007년 1월".
   * 시간순 정렬, 최대 3개, 더 있으면 "외 N" 으로 압축. UI 가 본문 아래에 표시.
   */
  milestoneLine?: string
  /** milestoneLine 영문 — 클라이언트 토글용. */
  milestoneLineEn?: string
  /**
   * 본명 지지 ↔ 이 단계 대운 지지의 충·합 한 줄. 예: "본명 巳(사) × 대운
   * 亥(해) → 巳亥충 (변동 압력)". 있으면 UI 가 본문 아래 (milestoneLine 과 별도)
   * 에 작게 표시. v3 신규.
   */
  relationLine?: string
  /** relationLine 영문 — 클라이언트 토글용. */
  relationLineEn?: string
  /**
   * 본명 신살 중 이 단계 대운 지지(또는 천간)와 anchor 가 일치해 활성화되는
   * 첫 번째 신살 한 줄. 예: "신살: 천을귀인 활성 (대운 丑 ↔ 본명 일지) —
   * 도움·우호적 지원 시기". 없으면 undefined. v3 신규.
   */
  shinsalLine?: string
  /** shinsalLine 영문 — 클라이언트 토글용. */
  shinsalLineEn?: string
  /**
   * 일간 기준 이 단계 대운 지지의 12운성 한 줄. 예: "12운성: 대운 丑이
   * 일간 辛 기준 衰(쇠) — 천천히 힘이 빠지는 시기". advancedAnalysis 의
   * twelveStages interpretation (meaning) 을 한 줄로 압축. v4 신규.
   */
  twelveStageLine?: string
  /** twelveStageLine 영문 — 클라이언트 토글용. */
  twelveStageLineEn?: string
  current: boolean
}
export interface LifetimeFlow {
  intro: string
  phases: LifePhase[]
}

type Cat = SibsinCat

// ════════════════════════════ KO copy ════════════════════════════
const BAND_CAT_KO: Record<string, Record<Cat, string>> = {
  초년기: {
    관성: '규율과 통제 속에서 자라요. 엄한 환경이나 또렷한 규칙을 일찍 겪는 편이에요',
    재성: '현실 감각이 일찍 트여요. 용돈·물건·결과에 눈이 밝은 아이예요',
    식상: '끼와 표현욕이 일찍 피어나요. 말·그림·놀이로 자기를 드러내요',
    비겁: '또래·형제 속에서 고집과 주체성을 키워요',
    인성: '배움과 보살핌을 잘 받아들여요. 공부·독서·어른의 사랑이 자양분이 돼요',
  },
  청년기: {
    관성: '진로·직장·책임이 본격화돼요. 자기 자리를 만들어가요',
    재성: '현실 성취와 돈·연애의 기회가 열려요. 실속을 다져요',
    식상: '재능과 표현으로 세상에 나가요. 자기 목소리를 내요',
    비겁: '독립과 경쟁 속에서 홀로서기를 해요. 내 길을 찾아요',
    인성: '더 깊이 배우고 전문성을 쌓아요. 내공을 다져요',
  },
  중년기: {
    관성: '사회적 위치와 책임이 정점에 올라요. 무게를 감당하는 시기예요',
    재성: '재물과 결실을 거두는 시기예요. 노력이 형태로 남아요',
    식상: '쌓인 경험이 표현·창작·후배로 흘러나와요',
    비겁: '관계와 동료 속에서 내 자리를 다시 정의해요',
    인성: '배움을 갈무리하고 내면이 깊어져요',
  },
  장년기: {
    관성: '오랜 책임을 내려놓고 자리를 정리하는 시기예요',
    재성: '쌓아온 것을 누리고 나누는 시기예요. 결실을 거둬요',
    식상: '여유 속에서 취미·표현·지혜를 풀어내요',
    비겁: '사람들과 어울리며 진짜 내 자리를 즐겨요',
    인성: '지혜와 내면이 무르익어 다음 세대에 전해요',
  },
}

// ════════════════════════════ EN copy ════════════════════════════
// EN band labels for output (BAND_CAT_EN keys mirror Korean band names so we
// can pick by Korean band label). Phase output uses BAND_LABEL_EN for the
// visible 'label' field.
const BAND_LABEL_EN: Record<string, string> = {
  초년기: 'Early years',
  청년기: 'Young adulthood',
  중년기: 'Midlife',
  장년기: 'Elder years',
}
const CAT_EN: Record<Cat, string> = {
  관성: 'Officer',
  재성: 'Wealth',
  식상: 'Output',
  비겁: 'Peer',
  인성: 'Resource',
}
const BAND_CAT_EN: Record<string, Record<Cat, string>> = {
  초년기: {
    관성: 'You grow up under discipline and clear rules — strict adults or tight structure shape you early',
    재성: 'A practical streak shows up early — you have an eye for money, things, and tangible results',
    식상: 'Talent and the urge to express bloom young — words, drawings, play are how you show yourself',
    비겁: 'You sharpen your will and stubbornness inside peer and sibling groups',
    인성: 'You absorb learning and care well — books, study, and grown-up affection feed your roots',
  },
  청년기: {
    관성: 'Career, job, and responsibility step forward — you start carving out your own seat',
    재성: 'The stage of real-world results, money, and love opens up — you build your footing',
    식상: 'You head into the world through talent and expression — your voice finds an audience',
    비겁: 'You stand on your own through independence and competition — you find your road',
    인성: 'You go deeper into study and craft — you thicken your inner muscle',
  },
  중년기: {
    관성: 'Social standing and responsibility hit their peak — a season of bearing weight',
    재성: 'A season of harvest — what you built takes shape as real assets and results',
    식상: 'Years of experience pour out through expression, creation, mentoring',
    비겁: 'You redefine your place among colleagues and longtime relationships',
    인성: 'You wrap up your studies and your interior deepens',
  },
  장년기: {
    관성: 'You set down old duties and start tidying your seat for the next stage',
    재성: 'A season of enjoying and sharing what you stored up — the fruit comes home',
    식상: 'From a place of ease, hobbies, expression, and wisdom flow out',
    비겁: 'You enjoy your real place among people you have walked with',
    인성: 'Wisdom and inner life ripen — you pass it on to the next generation',
  },
}

// 같은 톤이 연속 단계에 반복돼 글이 단조로워지지 않도록 variant 3 개씩 준비.
// 단계 순서대로 회전하면서 직전 단계 톤과 같으면 다음 인덱스 사용 — "큰 굴곡
// 없이 차분히 자기 몫을 다지는 흐름" 이 청년기·중년기에 똑같이 박히던 회귀
// (사용자 지적 2026-06) 를 해결.
const TONE_VARIANTS_KO: Record<'good' | 'hard' | 'mid', readonly string[]> = {
  good: [
    '흐름이 순해서 노력한 만큼 잘 풀리는 편이에요.',
    '기운이 등 뒤에서 받쳐줘 결정이 매끄럽게 이어져요.',
    '용신과 잘 맞아 시도한 일이 좀처럼 헛돌지 않아요.',
  ],
  hard: [
    '쉽지 않은 고비를 넘으며 단단해지는 시기예요.',
    '저항이 잦아 한 걸음마다 무게를 실어야 하는 편이에요.',
    '기신과 부딪히며 깎여나가는 만큼 코어가 굵어져요.',
  ],
  mid: [
    '큰 굴곡 없이 차분히 자기 몫을 다지는 흐름이에요.',
    '드라마틱한 사건보다 누적이 의미 있는 편이에요.',
    '평지에서 페이스를 유지하는 게 핵심이에요.',
  ],
}
const TONE_VARIANTS_EN: Record<'good' | 'hard' | 'mid', readonly string[]> = {
  good: [
    'The current runs with you — effort tends to convert into results.',
    'The wind blows at your back, so decisions chain together cleanly.',
    'Your useful element is in season, so attempts rarely spin in place.',
  ],
  hard: [
    'A season of grinding through resistance — you come out denser and tougher.',
    'Pushback shows up often, so each step has to be loaded with weight.',
    'You collide with your unhelpful element — what gets sanded down is what makes your core thicker.',
  ],
  mid: [
    'No dramatic swings — a flow that quietly compounds what you do.',
    'Less about big events, more about the meaning of accumulation.',
    'The point of this stretch is holding pace on flat ground.',
  ],
}

// 별자리 EN→KO(long form) — 정본(astrology/signLabels) 재사용.
const SIGN_KO = SIGN_KO_SSOT
// EN sign names ARE identity (Aries → Aries) but a lookup keeps signature
// parity with SIGN_KO so the rest of the code can swap by lang uniformly.
const SIGN_EN: Record<string, string> = {
  Aries: 'Aries',
  Taurus: 'Taurus',
  Gemini: 'Gemini',
  Cancer: 'Cancer',
  Leo: 'Leo',
  Virgo: 'Virgo',
  Libra: 'Libra',
  Scorpio: 'Scorpio',
  Sagittarius: 'Sagittarius',
  Capricorn: 'Capricorn',
  Aquarius: 'Aquarius',
  Pisces: 'Pisces',
}

// 천간/지지 한자 → 한글 음. 일반 사용자가 한자를 못 읽어 "丁丑 대운" 이 막막
// 하다는 피드백(2026-06). 모든 간지 표기 시 옆에 한글 음을 병기한다.
// 천간/지지 한자→한글 음은 정본(saju/ganjiKo) 의 STEM_KO/BRANCH_KO 직접 import.
// Romanizations (pinyin-ish) for EN output — English readers can't read
// 한글 음 either, so we romanize the Korean reading instead.
const STEM_ROM: Record<string, string> = {
  甲: 'gap',
  乙: 'eul',
  丙: 'byeong',
  丁: 'jeong',
  戊: 'mu',
  己: 'gi',
  庚: 'gyeong',
  辛: 'sin',
  壬: 'im',
  癸: 'gye',
}
const BRANCH_ROM: Record<string, string> = {
  子: 'ja',
  丑: 'chuk',
  寅: 'in',
  卯: 'myo',
  辰: 'jin',
  巳: 'sa',
  午: 'o',
  未: 'mi',
  申: 'sin',
  酉: 'yu',
  戌: 'sul',
  亥: 'hae',
}
function ganjiKo(stem: string, branch: string): string {
  const s = STEM_KO[stem] ?? ''
  const b = BRANCH_KO[branch] ?? ''
  return s && b ? `${stem}${branch}(${s}${b})` : `${stem}${branch}`
}
function ganjiEn(stem: string, branch: string): string {
  const s = STEM_ROM[stem] ?? ''
  const b = BRANCH_ROM[branch] ?? ''
  return s && b ? `${stem}${branch} (${s}${b})` : `${stem}${branch}`
}

// 외행성 마디 kind → 짧은 한국어 라벨 (각 단계 카드에 짧게 박는 용도).
// astroLifecycle.ts 의 labelKo 는 "첫 토성 회귀 — 진짜 어른됨의 통과의례" 처럼
// 한 문장이라 너무 길어서, phase 텍스트엔 함축형만 쓴다.
const MILESTONE_SHORT_KO: Record<string, string> = {
  jupiter_return_1: '첫 목성 회귀',
  jupiter_return_2: '두 번째 목성 회귀',
  jupiter_return_3: '세 번째 목성 회귀',
  jupiter_return_5: '다섯 번째 목성 회귀',
  saturn_return_1: '첫 토성 회귀',
  saturn_return_2: '두 번째 토성 회귀',
  pluto_square_pluto: '명왕성 사각',
  uranus_opposition: '천왕성 대립',
  neptune_square: '해왕성 사각',
  chiron_return: '카이런 회귀',
  uranus_return: '천왕성 회귀',
  progressed_lunar_1: '감정 사이클 매듭',
}
const MILESTONE_SHORT_EN: Record<string, string> = {
  jupiter_return_1: 'First Jupiter return',
  jupiter_return_2: 'Second Jupiter return',
  jupiter_return_3: 'Third Jupiter return',
  jupiter_return_5: 'Fifth Jupiter return',
  saturn_return_1: 'First Saturn return',
  saturn_return_2: 'Second Saturn return',
  pluto_square_pluto: 'Pluto square Pluto',
  uranus_opposition: 'Uranus opposition',
  neptune_square: 'Neptune square',
  chiron_return: 'Chiron return',
  uranus_return: 'Uranus return',
  progressed_lunar_1: 'Progressed lunar return',
}

const BANDS: Array<[number, number, string]> = [
  [0, 19, '초년기'],
  [20, 39, '청년기'],
  [40, 59, '중년기'],
  [60, 84, '장년기'],
]

// ─────────────────────────────────────────────────────────────
// 지지 충/육합 — 본명 ↔ 대운 지지 관계. 6+6 pair 만 다루고 형/해/파
// 같은 더 미묘한 관계는 단계 카드에 욱여넣기 비좁아 생략 (DailyFlowCard 가
// 풀세트를 보여준다).
// ─────────────────────────────────────────────────────────────
const BRANCH_CHUNG: Record<string, string> = {
  子: '午',
  午: '子',
  丑: '未',
  未: '丑',
  寅: '申',
  申: '寅',
  卯: '酉',
  酉: '卯',
  辰: '戌',
  戌: '辰',
  巳: '亥',
  亥: '巳',
}
const BRANCH_YUKHAP: Record<string, string> = {
  子: '丑',
  丑: '子',
  寅: '亥',
  亥: '寅',
  卯: '戌',
  戌: '卯',
  辰: '酉',
  酉: '辰',
  巳: '申',
  申: '巳',
  午: '未',
  未: '午',
}

// ─────────────────────────────────────────────────────────────
// 신살 한 줄 함축 (bilingual). natalShinsal[].kind 의 한국어 이름을 받아
// "이 단계에 대운 지지가 본명 anchor 와 일치 → 신살 활성" 줄을 만든다.
// kind 가 매핑 테이블에 없으면 "${kind} 발현" / "${kind} activated" 로 폴백.
// ─────────────────────────────────────────────────────────────
const SHINSAL_SHORT_KO: Record<string, string> = {
  천을귀인: '도움·우호적 지원 시기',
  천덕귀인: '하늘의 보호',
  월덕귀인: '달의 가호',
  문창귀인: '학문·표현 활성',
  문창: '학문·표현 활성',
  학당귀인: '지혜·학습 시기',
  금여: '행운·인연 풍성',
  금여성: '행운·인연 풍성',
  도화: '관계·매력 활성, 감정 변동',
  역마: '이동·변동 잦은 시기',
  역마살: '이동·변동 잦은 시기',
  양인: '강한 추진력, 칼끝의 시기',
  백호: '예측 불가 사건 주의',
  망신: '체면·신용 시험',
  망신살: '체면·신용 시험',
  겁살: '재물·신뢰 도전',
  공망: '허무·내면 응시 시기',
  // 12신살 시리즈 (역마 외 11종) — 출력에서 "${kind} 발현" 폴백으로 떨어지던
  // 회귀(2026-06 사용자 지적) 해결. 모두 같은 12신살 계열이라 톤은 비슷하지만
  // 각자 맥락이 다름.
  지살: '자기 시작·이동의 신호',
  년살: '도화의 분파 — 감정·관계 자극',
  월살: '발목 잡는 작은 장애 — 변화 직전 정체',
  // (망신 / 망신살 위에 이미 등록 — 12신살 시리즈에서 중복 회피)
  반안: '겉은 화려, 속은 시험 — 자존심 자극',
  반안살: '겉은 화려, 속은 시험 — 자존심 자극',
  장성: '리더십·권위 자극',
  장성살: '리더십·권위 자극',
  화개: '내면·예술·정신성 활성',
  화개살: '내면·예술·정신성 활성',
  재살: '재물·신뢰 도전 (겁살 분파)',
  천살: '하늘이 거는 시험 — 부모·권위 이슈',
  육해: '관계 마찰·은근한 방해',
  육해살: '관계 마찰·은근한 방해',
}
const SHINSAL_SHORT_EN: Record<string, { name: string; short: string }> = {
  천을귀인: { name: 'Cheoneul Gwiin (Nobleman)', short: 'supportive helpers, lucky breaks' },
  천덕귀인: { name: 'Cheondeok Gwiin (Heavenly Virtue)', short: 'celestial protection' },
  월덕귀인: { name: 'Woldeok Gwiin (Lunar Virtue)', short: 'lunar grace' },
  문창귀인: { name: 'Munchang Gwiin (Scholar)', short: 'scholarship & expression thrive' },
  문창: { name: 'Munchang (Scholar)', short: 'scholarship & expression thrive' },
  학당귀인: { name: 'Hakdang Gwiin (Academy)', short: 'wisdom & learning' },
  금여: { name: 'Geumyeo (Golden Carriage)', short: 'fortune and connections abundant' },
  금여성: { name: 'Geumyeoseong (Golden Carriage)', short: 'fortune and connections abundant' },
  도화: { name: 'Dohwa (Peach Blossom)', short: 'charm & relationships active, emotional swings' },
  역마: { name: 'Yeokma (Travel Horse)', short: 'movement, travel, frequent shifts' },
  역마살: { name: 'Yeokmasal (Travel Horse)', short: 'movement, travel, frequent shifts' },
  양인: { name: 'Yangin (Yang Blade)', short: 'razor-sharp drive, edge of risk' },
  백호: { name: 'Baekho (White Tiger)', short: 'watch for unpredictable shocks' },
  망신: { name: 'Mangsin (Loss of Face)', short: 'test of reputation' },
  망신살: { name: 'Mangsinsal (Loss of Face)', short: 'test of reputation' },
  겁살: { name: 'Geopsal (Robbery)', short: 'trials around wealth and trust' },
  공망: { name: 'Gongmang (Void)', short: 'emptiness, deep introspection' },
  지살: { name: 'Jisal (Self-Start)', short: 'self-initiated moves, departures' },
  년살: { name: 'Nyeonsal (Year Spike)', short: 'a Dohwa offshoot — feelings stirred' },
  월살: { name: 'Wolsal (Snag)', short: 'small obstacles stall the cusp of change' },
  반안: { name: 'Banan (Saddle)', short: 'shiny on the outside, tested on the inside' },
  반안살: { name: 'Banansal (Saddle)', short: 'shiny on the outside, tested on the inside' },
  장성: { name: 'Jangseong (General)', short: 'leadership and authority stirred' },
  장성살: { name: 'Jangseongsal (General)', short: 'leadership and authority stirred' },
  화개: { name: 'Hwagae (Canopy)', short: 'inwardness, art, spirituality activated' },
  화개살: { name: 'Hwagaesal (Canopy)', short: 'inwardness, art, spirituality activated' },
  재살: { name: 'Jaesal (Wealth Trial)', short: 'wealth & trust tested (Geopsal cousin)' },
  천살: { name: 'Cheonsal (Heaven Trial)', short: "sky's test — parent/authority issues" },
  육해: { name: 'Yukhae (Friction)', short: 'relational friction, quiet interference' },
  육해살: { name: 'Yukhaesal (Friction)', short: 'relational friction, quiet interference' },
}

// 본명 4지지 위치명 → 한국어/영문 표기 (단계 카드 줄에 쓰는 짧은 라벨).
const PILLAR_POS_KO: Record<string, string> = {
  year: '연지',
  month: '월지',
  day: '일지',
  time: '시지',
}
const PILLAR_POS_EN: Record<string, string> = {
  year: 'year branch',
  month: 'month branch',
  day: 'day branch',
  time: 'hour branch',
}
const PILLAR_STEM_POS_KO: Record<string, string> = {
  year: '연간',
  month: '월간',
  day: '일간',
  time: '시간',
}
const PILLAR_STEM_POS_EN: Record<string, string> = {
  year: 'year stem',
  month: 'month stem',
  day: 'day stem',
  time: 'hour stem',
}

// 받침 인식 조사
function hasFinalConsonant(s: string): boolean {
  const t = s.trim()
  if (!t) return false
  const c = t.charCodeAt(t.length - 1)
  if (c < 0xac00 || c > 0xd7a3) return false
  return (c - 0xac00) % 28 !== 0
}
const gaI = (s: string) => (hasFinalConsonant(s) ? '이' : '가')

/** "2024-03-17T..." → "2024년 3월" 형태로 짧게. */
function shortDateKo(iso: string): string {
  const y = iso.slice(0, 4)
  const m = parseInt(iso.slice(5, 7), 10)
  return `${y}년 ${m}월`
}
/** "2024-03-17T..." → "Mar 2024" 형태로 짧게. */
function shortDateEn(iso: string): string {
  const y = iso.slice(0, 4)
  const m = parseInt(iso.slice(5, 7), 10)
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const mon = months[Math.max(0, Math.min(11, m - 1))]
  return `${mon} ${y}`
}

// ─────────────────────────────────────────────────────────────
// 격국 KO/EN — advancedAnalysis.geokguk.primary (한국어 명) 를 받아
// EN 표시명과 한 줄 함축 설명을 만든다. description 은 advancedAnalysis 가
// 한국어로만 주므로 KO 는 그대로, EN 은 여기 매핑 테이블에서 가져온다.
// ─────────────────────────────────────────────────────────────
const GEOKGUK_EN: Record<string, { name: string; short: string }> = {
  식신격: { name: 'Eating-god (Siksin) pattern', short: 'creativity feeds wealth' },
  상관격: { name: 'Hurting-officer (Sanggwan) pattern', short: 'free, original, talent-driven' },
  편재격: { name: 'Indirect-wealth (Pyeonjae) pattern', short: 'enterprising, dynamic with money' },
  정재격: { name: 'Direct-wealth (Jeongjae) pattern', short: 'steady, faithful accumulation' },
  편관격: { name: 'Indirect-officer (Pyeongwan) pattern', short: 'decisive, willing to push hard' },
  정관격: {
    name: 'Direct-officer (Jeonggwan) pattern',
    short: 'orderly, principled responsibility',
  },
  편인격: {
    name: 'Indirect-resource (Pyeonin) pattern',
    short: 'unconventional thinker, lone-wolf learner',
  },
  정인격: {
    name: 'Direct-resource (Jeongin) pattern',
    short: 'studious, dignified, well-supported',
  },
  종왕격: { name: 'Following-prosperity (Jongwang) pattern', short: 'rides one dominant force' },
  종강격: {
    name: 'Following-strength (Jonggang) pattern',
    short: 'leans on support that overwhelms the chart',
  },
  종아격: {
    name: 'Following-output (Jong‑a) pattern',
    short: 'goes all-in on expression and output',
  },
  종재격: {
    name: 'Following-wealth (Jongjae) pattern',
    short: 'follows the dominant wealth force',
  },
  종살격: {
    name: 'Following-officer (Jongsal) pattern',
    short: 'follows overpowering authority/pressure',
  },
  건록격: { name: 'Established-rank (Geollok) pattern', short: 'born standing on your own feet' },
  양인격: { name: 'Yang-blade (Yangin) pattern', short: 'sharp, intense, high-stakes drive' },
  월겁격: { name: 'Month-rob (Wolgeop) pattern', short: 'strong peers, competition shapes you' },
  잡기격: { name: 'Mixed (Japgi) pattern', short: 'mixed signals — multi-track development' },
  곡직격: { name: 'Curving-straight (Gokjik) pattern', short: 'all-Wood — growth and uprightness' },
  염상격: { name: 'Blazing-up (Yeomsang) pattern', short: 'all-Fire — bright, radiant force' },
  가색격: { name: 'Sowing-reaping (Gasaek) pattern', short: 'all-Earth — fertile, gathering' },
  종혁격: {
    name: 'Following-reform (Jonghyeok) pattern',
    short: 'all-Metal — sharp, refining force',
  },
  윤하격: { name: 'Flowing-down (Yunha) pattern', short: 'all-Water — fluid, deep, adaptive' },
  갑기화토격: { name: 'Gap-gi Earth transformation pattern', short: 'two stems fuse into Earth' },
  을경화금격: {
    name: 'Eul-gyeong Metal transformation pattern',
    short: 'two stems fuse into Metal',
  },
  병신화수격: {
    name: 'Byeong-sin Water transformation pattern',
    short: 'two stems fuse into Water',
  },
  정임화목격: { name: 'Jeong-im Wood transformation pattern', short: 'two stems fuse into Wood' },
  무계화화격: { name: 'Mu-gye Fire transformation pattern', short: 'two stems fuse into Fire' },
  미정: { name: 'Undetermined pattern', short: 'no clean pattern lock' },
}
// 한국어 1줄 함축 — geokguk.ts 의 description 은 본문에 가까운 한 문장이라
// intro 한 줄에 박기엔 살짝 길다. 짧은 핵심만 적는다.
const GEOKGUK_SHORT_KO: Record<string, string> = {
  식신격: '창의가 곧 재물로 이어지는 스타일',
  상관격: '자유롭고 재능 중심 스타일',
  편재격: '활동적이고 사업 수완이 큰 스타일',
  정재격: '안정적·꾸준한 축적 스타일',
  편관격: '결단력 있고 밀어붙이는 스타일',
  정관격: '원칙·책임 중심 스타일',
  편인격: '독자적 사고·1인 학습형 스타일',
  정인격: '배움·지원이 든든한 스타일',
  종왕격: '하나의 강한 기운에 올라타는 스타일',
  종강격: '지원이 압도하는 스타일',
  종아격: '표현·창작 전부에 던지는 스타일',
  종재격: '재물 흐름에 동승하는 스타일',
  종살격: '강한 압력·권위에 적응하는 스타일',
  건록격: '홀로서기로 출발하는 스타일',
  양인격: '날카롭고 강도 높은 추진력 스타일',
  월겁격: '경쟁이 사람을 키우는 스타일',
  잡기격: '다중 트랙 발달 스타일',
  곡직격: '목 일색 — 성장·곧음 스타일',
  염상격: '화 일색 — 환하고 빛나는 스타일',
  가색격: '토 일색 — 너른 토양 스타일',
  종혁격: '금 일색 — 날카로운 정련 스타일',
  윤하격: '수 일색 — 유연하고 깊은 스타일',
  갑기화토격: '두 천간이 토로 화하는 스타일',
  을경화금격: '두 천간이 금으로 화하는 스타일',
  병신화수격: '두 천간이 수로 화하는 스타일',
  정임화목격: '두 천간이 목으로 화하는 스타일',
  무계화화격: '두 천간이 화로 화하는 스타일',
  미정: '뚜렷한 격이 잡히지 않는 스타일',
}

// ─────────────────────────────────────────────────────────────
// 오행 분포 → 지배 오행 한 줄 함축. 강한 오행이 사주 8자에 가장 많이 분포
// 했다는 사실만 노출 (균형/부족 진단은 PersonaCard 가 따로 보여준다).
// ─────────────────────────────────────────────────────────────
type Elem = 'wood' | 'fire' | 'earth' | 'metal' | 'water'
const ELEMENT_KO: Record<Elem, string> = {
  wood: '목',
  fire: '화',
  earth: '토',
  metal: '금',
  water: '수',
}
const ELEMENT_EN: Record<Elem, string> = {
  wood: 'Wood',
  fire: 'Fire',
  earth: 'Earth',
  metal: 'Metal',
  water: 'Water',
}
const ELEMENT_IMPLICATION_KO: Record<Elem, string> = {
  wood: '성장·확장 동력이 큰 편이에요',
  fire: '드러내고 표현하는 추진력이 큰 편이에요',
  earth: '안정·뿌리·매개 역할에 강한 편이에요',
  metal: '분별·다듬기·맺고 끊는 게 분명해요',
  water: '유연한 사고와 깊이 있는 흐름이 본 편이에요',
}
const ELEMENT_IMPLICATION_EN: Record<Elem, string> = {
  wood: 'your engine runs on growth and expansion',
  fire: 'your engine runs on showing up, expression, and radiance',
  earth: 'your strength is steadiness, roots, and mediating between people',
  metal: 'your strength is judgment, refinement, and decisive cuts',
  water: 'your strength is flexible thought and going deep',
}
// FiveElement (Korean 한글: 목/화/토/금/수) → Elem key (wood/fire/...)
const ELEMENT_KO_TO_KEY: Record<string, Elem> = {
  목: 'wood',
  화: 'fire',
  토: 'earth',
  금: 'metal',
  수: 'water',
}

export function deriveLifetimeFlow(
  natal: NatalContext,
  lang: 'ko' | 'en' = 'ko',
  /**
   * Optional — calculateOuterPlanetMilestones 결과. 있으면 각 단계 안에 떨어지는
   * 외행성 마디(토성 회귀, 천왕성 대립 등) 의 정확 일시를 사실로 노출한다.
   * 미지정 시 옛 동작(대운 사실 + 십신 설명만) 유지.
   */
  astroMilestoneOverrides?: readonly LifecycleMilestoneOverride[],
  /**
   * 주입형 "현재 시각" (SSOT 규약). 미지정 시 호출 시점. lifetimePivots 와 동일한
   * now 를 받아야 "현재 단계(you are here)"와 "현재 pivot"이 같은 날짜를 가리킨다 —
   * 예전엔 이 인자가 없어 currentManAge 가 서버 시계로 떨어져 비결정적이었다(ENGINE-AUDIT).
   */
  now?: Date
): LifetimeFlow | undefined {
  const birthYear = natal.input?.year
  const daeun = natal.saju?.daeun ?? []
  const dm = natal.saju?.dayMaster?.name
  if (!birthYear || daeun.length === 0 || !dm) return undefined

  // ── lang dispatch helpers ──
  // intro 합성 + daeunLine 은 render 언어를 그대로 쓰고, phase 의 사용자 토글
  // 대상 라인(text/relation/shinsal/twelveStage/milestone)은 KO/EN 양쪽을 baked.
  const isEn = lang === 'en'
  const SIGN = isEn ? SIGN_EN : SIGN_KO
  const BAND_CAT = isEn ? BAND_CAT_EN : BAND_CAT_KO
  const ganjiFmt = isEn ? ganjiEn : ganjiKo

  // ── strength / yongsin ──
  const strengthKo =
    natal.saju.strength === 'weak'
      ? '기운이 약한 편이라'
      : natal.saju.strength === 'strong'
        ? '기운이 강한 편이라'
        : '기운이 비교적 균형 잡혀'
  const strengthEn =
    natal.saju.strength === 'weak'
      ? 'on the weaker side of strength'
      : natal.saju.strength === 'strong'
        ? 'on the stronger side of strength'
        : 'relatively balanced in strength'
  const yongPrimary = natal.saju.yongsin.primary
  const yongSecondary = natal.saju.yongsin.secondary
  const yongKo = [yongPrimary, yongSecondary].filter(Boolean).join('·')
  const yongEnList = [yongPrimary, yongSecondary]
    .filter(Boolean)
    .map((e) => (e ? (ELEMENT_EN[ELEMENT_KO_TO_KEY[e]] ?? e) : ''))
    .filter(Boolean)
  const yongEn =
    yongEnList.length === 2 ? `${yongEnList[0]} or ${yongEnList[1]}` : (yongEnList[0] ?? '')

  // ── astro identity (Sun / Asc / MC) ──
  const planets = (natal.astro?.chart?.planets ?? []) as Array<{ name?: string; sign?: string }>
  const sunSign = planets.find((p) => p.name === 'Sun')?.sign
  const ascSign = (natal.astro?.chart?.ascendant as { sign?: string } | undefined)?.sign
  const mcSign = (natal.astro?.chart?.mc as { sign?: string } | undefined)?.sign
  const astroIdParts: string[] = []
  if (isEn) {
    if (sunSign) astroIdParts.push(`Sun in ${SIGN[sunSign] ?? sunSign}`)
    if (ascSign) astroIdParts.push(`${SIGN[ascSign] ?? ascSign} rising`)
    if (mcSign) astroIdParts.push(`MC in ${SIGN[mcSign] ?? mcSign}`)
  } else {
    if (sunSign) astroIdParts.push(`태양 ${SIGN[sunSign] ?? sunSign}`)
    if (ascSign) astroIdParts.push(`상승 ${SIGN[ascSign] ?? ascSign}`)
    if (mcSign) astroIdParts.push(`MC ${SIGN[mcSign] ?? mcSign}`)
  }
  const astroId = astroIdParts.join(isEn ? ', ' : '·')

  // ── 격국 (advancedAnalysis.geokguk) ──
  // 옛 description fallback 제거 (2026-06-06): GEOKGUK_SHORT_KO 가 28 격국 +
  // 미정 완전 커버라 fallback 실도달 0 + 1줄 description 함수 자체가 dead.
  const geokgukPrimary = natal.saju.analyses?.geokguk?.primary as string | undefined
  let geokgukIntroKo = ''
  let geokgukIntroEn = ''
  if (geokgukPrimary && geokgukPrimary !== '미정') {
    const shortKo = GEOKGUK_SHORT_KO[geokgukPrimary] ?? ''
    const en = GEOKGUK_EN[geokgukPrimary]
    if (shortKo) {
      // 조사 처리 — 격국명은 항상 '격' 으로 끝나 받침 있음. "정인격으로" 식.
      // (옛 "정인격로" 비문법 회귀 fix.)
      geokgukIntroKo = `격국은 ${geokgukPrimary}으로 ${shortKo}.`
    }
    if (en) {
      geokgukIntroEn = `Pattern: ${en.name} — ${en.short}.`
    }
  }

  // ── 오행 분포 (사주 8자에 가장 많은 오행) ──
  const fe = natal.saju.fiveElements
  let topElemKey: Elem | undefined
  if (fe) {
    const entries: Array<[Elem, number]> = [
      ['wood', fe.wood ?? 0],
      ['fire', fe.fire ?? 0],
      ['earth', fe.earth ?? 0],
      ['metal', fe.metal ?? 0],
      ['water', fe.water ?? 0],
    ]
    entries.sort((a, b) => b[1] - a[1])
    if (entries[0][1] > 0) topElemKey = entries[0][0]
  }
  let elemIntroKo = ''
  let elemIntroEn = ''
  if (topElemKey) {
    elemIntroKo = `사주 8자 중 ${ELEMENT_KO[topElemKey]} 기운이 가장 많아 ${ELEMENT_IMPLICATION_KO[topElemKey]}.`
    elemIntroEn = `Across your eight characters ${ELEMENT_EN[topElemKey]} dominates — ${ELEMENT_IMPLICATION_EN[topElemKey]}.`
  }

  // ── 추가 팩트(advancedAnalysis 미노출 필드) ──
  const advanced = natal.saju.analyses

  // 옛 (1) 종합 점수 — calculateComprehensiveScore + S~F 등급은 2026-06-06 폐기.
  // (빈 scoreIntroKo/En 死변수도 2026-06 제거 — parts 에 항상 falsy 라 무의미했다.)

  // (2) 십성 비중 — sibsin.categoryCount 의 dominant 카테고리 (% 환산)
  let sibsinIntroKo = ''
  let sibsinIntroEn = ''
  if (advanced?.sibsin) {
    const cc = advanced.sibsin.categoryCount
    const sum = cc.비겁 + cc.식상 + cc.재성 + cc.관성 + cc.인성
    if (sum > 0) {
      const entries: Array<[keyof typeof cc, number]> = [
        ['비겁', cc.비겁],
        ['식상', cc.식상],
        ['재성', cc.재성],
        ['관성', cc.관성],
        ['인성', cc.인성],
      ]
      entries.sort((a, b) => b[1] - a[1])
      const [domCat, domCount] = entries[0]
      if (domCount > 0) {
        const pct = Math.round((domCount / sum) * 100)
        const CAT_IMPLICATION_KO: Record<string, string> = {
          비겁: '주체성·독립심·동료 경쟁이 본 스타일',
          식상: '표현·창작·말솜씨가 본 스타일',
          재성: '행동 동력·물질 감각이 본 스타일',
          관성: '책임·규율·사회적 자리가 본 스타일',
          인성: '배움·지원·내공 다지기가 본 스타일',
        }
        const CAT_EN_NAME: Record<string, string> = {
          비겁: 'Peer (Bigyeop)',
          식상: 'Output (Siksang)',
          재성: 'Wealth (Jaeseong)',
          관성: 'Officer (Gwanseong)',
          인성: 'Resource (Inseong)',
        }
        const CAT_IMPLICATION_EN: Record<string, string> = {
          비겁: 'your engine runs on agency, independence, and peer competition',
          식상: 'your engine runs on expression, creation, and articulate output',
          재성: 'your engine runs on action and a feel for tangible results',
          관성: 'your engine runs on responsibility, discipline, and earned standing',
          인성: 'your engine runs on study, support, and inner consolidation',
        }
        sibsinIntroKo = `본명에 ${domCat}이 ${pct}%로 가장 두드러져 — ${CAT_IMPLICATION_KO[domCat]}.`
        sibsinIntroEn = `${CAT_EN_NAME[domCat]} weighs heaviest at ${pct}% — ${CAT_IMPLICATION_EN[domCat]}.`
      }
    }
  }

  // (3) 통근 + 득령 — 일간 뿌리 강도(0~200) + 월령 득실(득령/평령/실령)
  let rootIntroKo = ''
  let rootIntroEn = ''
  if (advanced?.tonggeun || advanced?.deukryeong) {
    const tg = advanced.tonggeun
    const dr = advanced.deukryeong
    let tgKo = ''
    let tgEn = ''
    if (tg) {
      const ts = tg.totalStrength
      if (ts >= 100) {
        tgKo = '단단하게 박혀'
        tgEn = 'deeply rooted'
      } else if (ts >= 50) {
        tgKo = '뚜렷이 박혀'
        tgEn = 'well rooted'
      } else if (ts > 0) {
        tgKo = '얇게 박혀'
        tgEn = 'shallowly rooted'
      } else {
        tgKo = '뿌리 없이'
        tgEn = 'rootless'
      }
    }
    let drKo = ''
    let drEn = ''
    if (dr) {
      if (dr.status === '득령') {
        drKo = '월령을 얻어'
        drEn = 'with the month-branch in your favor'
      } else if (dr.status === '실령') {
        drKo = '월령을 잃어'
        drEn = 'with the month-branch against you'
      } else {
        drKo = '월령은 무난해'
        drEn = 'with the month-branch neutral'
      }
    }
    const strSummaryKo =
      natal.saju.strength === 'weak' ? '약한' : natal.saju.strength === 'strong' ? '강한' : '중화의'
    const strSummaryEn =
      natal.saju.strength === 'weak'
        ? 'on the weaker side'
        : natal.saju.strength === 'strong'
          ? 'on the stronger side'
          : 'balanced'
    if (tgKo || drKo) {
      const parts: string[] = []
      if (tgKo) parts.push(`일간 통근이 ${tgKo}`)
      if (drKo) parts.push(drKo)
      rootIntroKo = `${parts.join(' ')} 강약은 ${strSummaryKo} 편이에요.`
    }
    if (tgEn || drEn) {
      const partsEn: string[] = []
      if (tgEn) partsEn.push(`day-master ${tgEn}`)
      if (drEn) partsEn.push(drEn)
      rootIntroEn = `Strength reads as ${strSummaryEn} — ${partsEn.join(', ')}.`
    }
  }

  // (4) 조후 용신 — primary yongsin 과 다를 때만 노출 (중복 회피).
  // raw 응답에서 분리됐기 때문에 (2026-06-06) 여기서 직접 호출. 일간 + 월지로
  // pure-lookup 이라 cost 무시.
  let johuIntroKo = ''
  let johuIntroEn = ''
  const monthBranchForJohu = natal.saju.pillars?.month?.earthlyBranch?.name
  if (dm && monthBranchForJohu) {
    const jy = getJohuYongsin(dm, monthBranchForJohu)
    if (jy) {
      const johuElem = jy.primaryYongsin
      const ekbu = natal.saju.yongsin?.primary
      if (johuElem && johuElem !== ekbu) {
        const johuEnElem = ELEMENT_EN[ELEMENT_KO_TO_KEY[johuElem]] ?? johuElem
        johuIntroKo = `조후로 보면 ${johuElem}이 받쳐주면 좋아서 ${jy.reasoning}`
        johuIntroEn = `Seasonally you need ${johuEnElem} — ${jy.reasoning_en}`
      }
    }
  }

  // 옛 (5) 건강 + 직업 — analyzeHealth/analyzeCareer 의 모호한 텍스트 예측이라
  // 2026-06-06 폐기. LLM 답변이 같은 정보를 컨텍스트(오행 분포 + 십신 분포) 기반으로
  // 더 정확하게 만들 수 있음.
  const lifeIntroKo = ''
  const lifeIntroEn = ''

  // ── intro 합성 ──
  let intro = ''
  if (isEn) {
    const head = yongEn
      ? `On the Saju side, ${dm} day master, ${strengthEn}; you shine when ${yongEn} elements back you up.`
      : `On the Saju side, ${dm} day master, ${strengthEn}.`
    const parts: string[] = []
    parts.push(head)
    if (geokgukIntroEn) parts.push(geokgukIntroEn)
    if (sibsinIntroEn) parts.push(sibsinIntroEn)
    if (rootIntroEn) parts.push(rootIntroEn)
    if (elemIntroEn) parts.push(elemIntroEn)
    if (johuIntroEn) parts.push(johuIntroEn)
    if (lifeIntroEn) parts.push(lifeIntroEn)
    if (astroId) {
      parts.push(`On the astrology side, you were born with ${astroId}.`)
      parts.push('These two set the stage, and the phases below unfold on it.')
    } else {
      parts.push(
        'The phases below are the crossing of Saju daeun and astrological life milestones.'
      )
    }
    intro = parts.join(' ')
  } else {
    const head = yongKo
      ? `사주로는 ${dm} 일간으로 ${strengthKo}, 용신 ${yongKo}${gaI(yongKo)} 받쳐줄 때 잘 풀려요.`
      : `사주로는 ${dm} 일간으로 ${strengthKo}.`
    const parts: string[] = []
    parts.push(head)
    if (geokgukIntroKo) parts.push(geokgukIntroKo)
    if (sibsinIntroKo) parts.push(sibsinIntroKo)
    if (rootIntroKo) parts.push(rootIntroKo)
    if (elemIntroKo) parts.push(elemIntroKo)
    if (johuIntroKo) parts.push(johuIntroKo)
    if (lifeIntroKo) parts.push(lifeIntroKo)
    if (astroId) {
      parts.push(`점성으로는 ${astroId}의 기질을 타고났고요.`)
      parts.push('이 둘이 평생 흐름의 바탕을 만들고, 그 위에서 시기별로 펼쳐져요.')
    } else {
      parts.push('사주 대운과 점성 인생 마디를 교차해 본 큰 흐름이에요.')
    }
    intro = parts.join(' ')
  }

  // 만 나이 — 출생지 시간대 기준 (SSOT: currentManAge). 사주/점성 전체가 만
  // 나이 한 컨벤션이라 화면 어디서나 동일 값. 옛 회귀: UTC year 만 빼서 자정
  // 경계 사용자에게 화면마다 ±1 차이 났음.
  const currentAge = currentManAge({
    birthYear,
    birthMonth: natal.input.month,
    birthDate: natal.input.date,
    birthTimeZone: natal.input.timeZone,
    now,
  })

  // ── 외행성 마디 사실 — kind 별로 (라벨, 정확 일시) 맵. 없거나 null 은 무시. ──
  // bilingual: 날짜 문자열을 KO/EN 양쪽으로 baked (kind 매핑 존재 판정은 KO 테이블
  // 기준 — 두 테이블 키가 동일).
  // 외행성 마디(토성/목성 회귀·천왕성 대립 등)를 단계 카드의 `outer` 로 채운다.
  // 예전엔 astroMilestoneOverrides 만 직접 읽어, 그게 미지정(현재 전 경로)이면
  // milestoneFacts 가 비어 `outer` 가 *항상 []* 였다(감사 CRITICAL — lifeStages 에서
  // 외행성 마디 전체 누락). lifetimePivots 와 동일하게 buildLifecycleTiming 을 거쳐
  // (override 있으면 실제 transit, 없으면 평균 테이블) 일관되게 채운다.
  const overrideByKind = new Map<string, LifecycleMilestoneOverride>()
  for (const o of astroMilestoneOverrides ?? []) overrideByKind.set(o.kind, o)
  const milestoneFacts: Array<{ kind: string; age: number; dateStrKo: string; dateStrEn: string }> =
    buildLifecycleTiming(birthYear, birthYear + 90, true, astroMilestoneOverrides, now).events
      .filter((e) => MILESTONE_SHORT_KO[e.event])
      .map((e) => {
        const ov = overrideByKind.get(e.event)
        // override 의 정확 일시가 있으면 "2024년 3월"까지, 없으면 연도만.
        const dateStrKo = ov?.exactDateISO ? shortDateKo(ov.exactDateISO) : `${e.startYear}년`
        const dateStrEn = ov?.exactDateISO ? shortDateEn(ov.exactDateISO) : `${e.startYear}`
        return { kind: e.event, age: e.startYear - birthYear, dateStrKo, dateStrEn }
      })

  // ── 본명 4지지 (지지충/육합 판정용) — 위치 라벨을 KO/EN 양쪽 baked. ──
  const pillars = natal.saju.pillars
  const natalBranches: Array<{ name: string; posKo: string; posEn: string }> = []
  if (pillars) {
    const yr = pillars.year?.earthlyBranch?.name
    const mo = pillars.month?.earthlyBranch?.name
    const dy = pillars.day?.earthlyBranch?.name
    const ti = pillars.time?.earthlyBranch?.name
    if (yr) natalBranches.push({ name: yr, posKo: '연', posEn: 'year' })
    if (mo) natalBranches.push({ name: mo, posKo: '월', posEn: 'month' })
    if (dy) natalBranches.push({ name: dy, posKo: '일', posEn: 'day' })
    if (ti) natalBranches.push({ name: ti, posKo: '시', posEn: 'hour' })
  }

  // ── 톤 variant 회전 — 직전 단계와 같은 톤이면 다음 인덱스로 ──
  // bilingual: 인덱스를 한 번만 advance 하고 KO/EN 두 테이블에서 같은 인덱스로
  // 뽑아 두 언어가 desync 되지 않게 (옛 nextToneText 는 호출마다 advance 라
  // KO·EN 따로 부르면 인덱스가 어긋났음).
  const lastToneIdx: Record<'good' | 'hard' | 'mid', number> = { good: -1, hard: -1, mid: -1 }
  const nextToneIdx = (fav: 'good' | 'hard' | 'mid'): number => {
    const variants = TONE_VARIANTS_KO[fav]
    lastToneIdx[fav] = (lastToneIdx[fav] + 1) % variants.length
    return lastToneIdx[fav]
  }

  const phases: LifePhase[] = []
  for (const [lo, hi, label] of BANDS) {
    const labelOut = isEn ? (BAND_LABEL_EN[label] ?? label) : label

    // 단계(20년)에 걸치는 모든 대운을 모은다 — 옛 코드는 가운데 1개만 표기해서
    // 청년기 20~39세인데 乙亥(2016-2026) 만 나오고 다음 대운(2026-2036) 이
    // 빠지던 회귀(사용자 지적). 같은 단계에 대운 2개 이상이면 모두 화살표로
    // 연결해 노출한다.
    const bandDaeuns = daeun.filter((x) => x.startAge + 10 > lo && x.startAge <= hi)
    // 대표 대운(설명 본문에 쓸 십신/톤 결정) — 단계 가운데를 덮는 대운, 없으면
    // 첫 번째 매칭 대운.
    const mid = Math.floor((lo + hi) / 2)
    const primary =
      bandDaeuns.find((x) => x.startAge <= mid && x.startAge + 10 > mid) ?? bandDaeuns[0]
    if (!primary) continue
    // 초년(0~)은 대운 시작 전 — 근묘화실에서 초년은 년주(부모·뿌리)가 주관한다.
    // 대운 십신으로 읽으면 어긋난다(재다신약인데 초년이 좋게 뜨는 등). 그래서
    // 초년 본문·톤은 *년주 천간* 으로 본다. (대운 부가사실은 아래 그대로 표시 —
    // 첫 대운이 초년 후반에 시작하므로.)
    const isChildhood = lo === 0
    const lensStem = isChildhood
      ? (natal.saju.pillars?.year?.heavenlyStem?.name ?? primary.stem)
      : primary.stem
    const sibsinName = getSibsinKo(dm, lensStem) // 정관/편관/정재/편재/식신/상관/비견/겁재/정인/편인
    const cat = SIBSIN_CAT[sibsinName] as Cat | undefined
    const body = cat ? BAND_CAT[label]?.[cat] : undefined
    if (!cat || !body) continue
    const fav = favorOf(natal.saju.strength, cat, getStemElement(lensStem), natal.saju.yongsin)
    // 초년 톤은 억부(신강약)로 — 신약은 비겁·인성이 받침(good), 재성·관성·식상은
    // 부담(hard). 재다신약의 초년 재성 부담이 'mid' 로 뭉개지던 것 교정.
    const toneFav =
      isChildhood && natal.saju.strength === 'weak'
        ? cat === '비겁' || cat === '인성'
          ? 'good'
          : 'hard'
        : isChildhood && natal.saju.strength === 'strong'
          ? cat === '식상' || cat === '재성' || cat === '관성'
            ? 'good'
            : 'hard'
          : fav

    // 사실 1: 이 단계에 걸친 대운 모두 (간지 + 한글 음/로마자 + 정확 연도 범위).
    const MAX_DAEUNS = 3
    const daeunsToShow = bandDaeuns.slice(0, MAX_DAEUNS)
    const daeunMore = bandDaeuns.length - daeunsToShow.length
    const daeunLabel = isEn ? 'daeun' : '대운'
    const daeunLine =
      daeunsToShow
        .map(
          (x) => `${ganjiFmt(x.stem, x.branch)} ${daeunLabel} ${x.startYear}-${x.startYear + 10}`
        )
        .join(' → ') + (daeunMore > 0 ? ' →…' : '')

    // 사실 2: 이 단계(age lo~hi)에 떨어지는 외행성 마디. KO/EN 양쪽 한 줄.
    const phaseMilestones = milestoneFacts
      .filter((m) => m.age >= lo && m.age <= hi)
      .slice()
      // 나이(숫자)로 정렬 — dateStr 문자열 정렬은 "2025" 와 "Aug 2019"(override 월표기)가
      // 섞이면 "A"<"2" 가 거짓이라 시간순이 깨졌다(테이블+override 혼합 시).
      .sort((a, b) => a.age - b.age)
    const TOP_N = 3
    const top = phaseMilestones.slice(0, TOP_N)
    const moreCount = phaseMilestones.length - top.length
    const buildMilestoneLine = (en: boolean): string | undefined => {
      if (top.length === 0) return undefined
      const short = en ? MILESTONE_SHORT_EN : MILESTONE_SHORT_KO
      const str = top.map((m) => `${short[m.kind]} ${en ? m.dateStrEn : m.dateStrKo}`).join(', ')
      const more = moreCount > 0 ? (en ? ` (+${moreCount} more)` : ` 외 ${moreCount}`) : ''
      return `${str}${more}`
    }
    const milestoneLineKo = buildMilestoneLine(false)
    const milestoneLineEn = buildMilestoneLine(true)

    // 사실 3: 본명 4지지 ↔ 이 단계 대운 지지의 충·합. 단계에 대운이 여러
    // 개 있어도 primary 한 개만 검사 (단계 카드에 한 줄 더 박을 공간이 좁다).
    // KO/EN 양쪽 산출 — 같은 지지 hit (year→…→hour 순 첫 매칭) 을 두 언어로 표현.
    const buildRelationLine = (en: boolean): string | undefined => {
      if (natalBranches.length === 0) return undefined
      const daeunBranch = primary.branch
      for (const nb of natalBranches) {
        if (BRANCH_CHUNG[nb.name] === daeunBranch) {
          // 평이 우선 — 일지/×/충/간지 원명을 surface 에서 빼고 의미만 한 문장으로.
          return en
            ? 'This stretch tends to shake your footing a little — expect more change and friction.'
            : '이 시기엔 환경이 타고난 자리를 흔드는 편이라, 변동과 마찰이 잦아요.'
        }
        if (BRANCH_YUKHAP[nb.name] === daeunBranch) {
          return en
            ? 'This stretch clicks with your natural grain — things tend to fall into step.'
            : '이 시기엔 환경이 타고난 흐름과 잘 맞아, 손발이 척척 맞는 편이에요.'
        }
      }
      return undefined
    }
    const relationLineKo = buildRelationLine(false)
    const relationLineEn = buildRelationLine(true)

    // 사실 4: 본명 신살 활성 — 이 단계 대운 지지/천간이 본명 신살의 anchor
    // (= ShinsalHit.target, 신살이 앉아있는 본명 간지 글자) 와 일치하면 그
    // 신살이 이 단계에 '활성' 된다고 본다. 단계에 대운이 여러 개 있어도
    // 카드 공간 제약 + "한 단계 한 신살" 원칙으로 primary 대운만 검사.
    // natalShinsal 이 없거나 매칭이 없으면 silently skip. KO/EN 양쪽 baked.
    let shinsalLineKo: string | undefined
    let shinsalLineEn: string | undefined
    const natalShinsal = natal.saju.natalShinsal
    if (natalShinsal && natalShinsal.length > 0) {
      const daeunBranch = primary.branch
      const daeunStem = primary.stem
      for (const sh of natalShinsal) {
        const tgt = sh.target
        if (!tgt) continue
        const isBranch = tgt in BRANCH_KO
        const isStem = tgt in STEM_KO
        const matches = (isBranch && tgt === daeunBranch) || (isStem && tgt === daeunStem)
        if (!matches) continue
        // anchor 가 어느 기둥인지 — pillars[0] (대표 위치) 사용. 위치 라벨이
        // 없는 경우엔 그냥 "본명" 만 쓴다.
        const pillarKey = sh.pillars?.[0]
        const kind = sh.kind
        // EN
        {
          const meta = SHINSAL_SHORT_EN[kind] ?? { name: kind, short: `${kind} activated` }
          const posLabel = pillarKey
            ? isBranch
              ? (PILLAR_POS_EN[pillarKey] ?? '')
              : (PILLAR_STEM_POS_EN[pillarKey] ?? '')
            : ''
          const anchorRom = isBranch
            ? `${tgt} (${BRANCH_ROM[tgt] ?? ''})`
            : `${tgt} (${STEM_ROM[tgt] ?? ''})`
          const daeunRom = isBranch
            ? `${daeunBranch} (${BRANCH_ROM[daeunBranch] ?? ''})`
            : `${daeunStem} (${STEM_ROM[daeunStem] ?? ''})`
          const anchorPart = posLabel ? `natal ${posLabel} ${anchorRom}` : `natal ${anchorRom}`
          shinsalLineEn = `${meta.name} active (daeun ${daeunRom} ↔ ${anchorPart}) — ${meta.short}`
        }
        // KO
        {
          const short = SHINSAL_SHORT_KO[kind] ?? `${kind} 발현`
          const posLabel = pillarKey
            ? isBranch
              ? (PILLAR_POS_KO[pillarKey] ?? '')
              : (PILLAR_STEM_POS_KO[pillarKey] ?? '')
            : ''
          const anchorKo = isBranch
            ? `${tgt}(${BRANCH_KO[tgt] ?? ''})`
            : `${tgt}(${STEM_KO[tgt] ?? ''})`
          const daeunKo = isBranch
            ? `${daeunBranch}(${BRANCH_KO[daeunBranch] ?? ''})`
            : `${daeunStem}(${STEM_KO[daeunStem] ?? ''})`
          const anchorPart = posLabel ? `본명 ${posLabel} ${anchorKo}` : `본명 ${anchorKo}`
          shinsalLineKo = `${kind} 활성 (대운 ${daeunKo} ↔ ${anchorPart}) — ${short}`
        }
        break // 첫 매칭 한 개만
      }
    }

    // 사실 5: 일간 기준 이 단계 대운 지지의 12운성. 옛 advanced.interpretations
    // 캐시 사용했지만 raw 응답에서 제거됐기 때문에 (2026-06-06) 직접 호출.
    // getTwelveStage + getTwelveStageInterpretation 둘 다 pure-table lookup 이라
    // cost 무시. KO/EN 양쪽 baked.
    let twelveStageLineKo: string | undefined
    let twelveStageLineEn: string | undefined
    try {
      const stage = getTwelveStage(dm, primary.branch)
      // getTwelveStage 는 정통 표기 임관/왕지를 내는데, 해석 테이블·타입가드는
      // 동의어 건록/제왕 키를 쓴다. 정규화하지 않으면 임관·왕지 단계가 *항상*
      // 해석을 잃고 "…기준 임관" 으로 끊겨 raw 용어만 남는다(감사 지적). 동의어를
      // 매핑해 의미가 절대 비지 않게 한다.
      const stageForLookup = stage === '임관' ? '건록' : stage === '왕지' ? '제왕' : stage
      let meaningKo = ''
      let meaningEn = ''
      if (stageForLookup && TWELVE_STAGE_TYPES.has(stageForLookup as TwelveStageType)) {
        const interp = getTwelveStageInterpretation(stageForLookup as TwelveStageType)
        if (interp) {
          meaningKo = interp.meaning ?? ''
          meaningEn = interp.meaning_en ?? ''
        }
      }
      // 평이 우선 — "대운 申(신)이 일간 辛 기준 왕지" 같은 간지/일간/운성 원명을
      // surface 에서 빼고, 12운성의 *평이 의미*만 한 줄로 쓴다(예: "권력의 정점").
      // 아동기엔 운성 해석이 전부 성인 기준("성인이 되어 관을 쓰는 시기")이라
      // 유아에게 붙으면 어색하므로 생략한다(감사 지적). 의미가 비면(이론상 없음)
      // raw 운성명을 노출하지 않고 그냥 줄을 안 만든다.
      if (!isChildhood && meaningKo) {
        twelveStageLineKo = `기운의 흐름으로 보면, ${meaningKo}.`
        twelveStageLineEn = meaningEn
          ? `In terms of your life-energy cycle, ${meaningEn.charAt(0).toLowerCase()}${meaningEn.slice(1)}.`
          : undefined
      }
    } catch {
      // stage 계산 실패 시 silently skip
    }

    // 본문 — 십신(정확명) + cat + body + 톤. 초년은 "년주(부모·뿌리) 기준" 명시.
    // KO/EN 양쪽 산출. 톤 variant 는 인덱스를 한 번만 뽑아 두 언어 동기화.
    const toneIdx = nextToneIdx(toneFav)
    const toneKo = TONE_VARIANTS_KO[toneFav][toneIdx]
    const toneEn = TONE_VARIANTS_EN[toneFav][toneIdx]
    const bodyKo = BAND_CAT_KO[label]?.[cat] ?? body
    const bodyEn = BAND_CAT_EN[label]?.[cat] ?? body
    const childPrefixKo = isChildhood ? '초년은 부모·뿌리의 영향을 받는 시기예요 — ' : ''
    const childPrefixEn = isChildhood ? "Shaped by family and roots early on — " : ''
    // 평이 우선: 십신 원명("편재(재성) 흐름 — ")을 surface 에서 빼고 그 의미를 풀어쓴
    // bodyKo/En 로 시작한다. 십신 라벨은 어차피 bodyKo 안에 평이하게 녹아 있어
    // 중복 노이즈였고, novice 표면에 raw 십신을 노출하던 주범이었다(감사 지적).
    const textKo = `${childPrefixKo}${bodyKo}. ${toneKo}`
    const textEn = `${childPrefixEn}${bodyEn}. ${toneEn}`
    const text = isEn ? textEn : textKo

    const ageRange = isEn
      ? `age ${lo}-${hi} · ${birthYear + lo}-${birthYear + hi}`
      : `${lo}~${hi}세 · ${birthYear + lo}~${birthYear + hi}`

    phases.push({
      label: labelOut,
      labelKo: label,
      labelEn: BAND_LABEL_EN[label] ?? label,
      ageRange,
      text,
      textKo,
      textEn,
      daeunLine,
      milestoneLine: isEn ? milestoneLineEn : milestoneLineKo,
      milestoneLineEn,
      relationLine: isEn ? relationLineEn : relationLineKo,
      relationLineEn,
      shinsalLine: isEn ? shinsalLineEn : shinsalLineKo,
      shinsalLineEn,
      twelveStageLine: isEn ? twelveStageLineEn : twelveStageLineKo,
      twelveStageLineEn,
      current: currentAge >= lo && currentAge <= hi,
    })
  }
  if (phases.length === 0) return undefined
  return { intro, phases }
}
