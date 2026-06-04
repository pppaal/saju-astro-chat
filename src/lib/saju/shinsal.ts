// src/lib/Saju/shinsal.ts
import { BRANCHES, STEMS, JIJANGGAN, CHEONEUL_GWIIN_MAP } from './constants'
import type { FiveElement, YinYang, PillarKind, TwelveStage } from './types'
import { RESENTMENT_PAIRS, toBidiRecord } from './relationTables'
import { getGongmang as getGongmangByPillar } from './pillarLookup'

export type { PillarKind, TwelveStage }

export interface PillarBase {
  heavenlyStem: { name: string; element: FiveElement; yin_yang?: YinYang }
  earthlyBranch: { name: string; element: FiveElement; yin_yang?: YinYang }
}

export interface SajuPillarsLike {
  year: PillarBase
  month: PillarBase
  day: PillarBase
  time: PillarBase
}

// TwelveStage is re-exported from types.ts

export interface ShinsalHit {
  kind:
    | '장성'
    | '반안'
    | '재살'
    | '천살'
    | '월살'
    | '망신'
    | '역마'
    | '화개'
    | '겁살'
    | '육해'
    | '화해'
    | '괘살'
    | '길성'
    | '흉성'
    | '지살'
    | '년살'
    | '도화'
    | '귀문관'
    | '현침'
    | '고신'
    | '괴강'
    | '양인'
    | '백호'
    | '천을귀인'
    | '태극귀인'
    | '금여성'
    | '천문성'
    | '문창'
    | '문곡'
    // 확장 신살
    | '공망'
    | '천의성'
    | '학당귀인'
    | '홍염살'
    | '천라지망'
    | '원진'
    | '천주귀인'
    | '암록'
    | '건록'
    | '제왕'
    // 추가 신살
    | '삼재'
    | '천덕귀인'
    | '월덕귀인'
  pillars: PillarKind[]
  target?: string
  detail?: string
}

export interface ShinsalAnnot {
  twelveStage: { [K in PillarKind]: TwelveStage }
  hits: ShinsalHit[]
  byPillar?: {
    [K in PillarKind]: {
      twelveShinsal: string[]
      generalShinsal: string[]
      lucky: string[]
    }
  }
}

export interface AnnotateOptions {
  twelveStageBasis?: 'day'
  includeLucky?: boolean
  includeUnlucky?: boolean

  includeTwelveAll?: boolean
  includeHwaHae?: boolean
  useMonthCompletion?: boolean

  includeGeneralShinsal?: boolean
  includeLuckyDetails?: boolean

  ruleSet?: 'standard' | 'your'
}

export const DEFAULT_ANNOTATE_OPTIONS: Required<AnnotateOptions> = {
  twelveStageBasis: 'day',
  includeLucky: false,
  includeUnlucky: false,

  includeTwelveAll: true,
  includeHwaHae: false,
  useMonthCompletion: false,

  includeGeneralShinsal: true,
  includeLuckyDetails: true,

  ruleSet: 'standard',
}

const _stemByName = (name: string) => STEMS.find((s) => s.name === name)
const _branchByName = (name: string) => BRANCHES.find((b) => b.name === name)

/* ===== 정규화 ===== */
const BRANCH_KO_TO_HAN: Record<string, string> = {
  자: '子',
  축: '丑',
  인: '寅',
  묘: '卯',
  진: '辰',
  사: '巳',
  오: '午',
  미: '未',
  신: '申',
  유: '酉',
  술: '戌',
  해: '亥',
}
function normalizeBranchName(n: string): string {
  const t = String(n || '').trim()
  return BRANCH_KO_TO_HAN[t] || t
}
const STEM_KO_TO_HAN: Record<string, string> = {
  갑: '甲',
  을: '乙',
  병: '丙',
  정: '丁',
  무: '戊',
  기: '己',
  경: '庚',
  신: '辛',
  임: '壬',
  계: '癸',
}
function normalizeStemName(n: string): string {
  const t = String(n || '').trim()
  return STEM_KO_TO_HAN[t] || t
}

/* ===== 12운성 ===== */
/* 정통 12운성 순서: 장생 → 목욕 → 관대 → 임관 → 왕지 → 쇠 → 병 → 사 → 묘 → 절 → 태 → 양 */
const TWELVE_STAGE_ORDER: TwelveStage[] = [
  '장생',
  '목욕',
  '관대',
  '임관',
  '왕지',
  '쇠',
  '병',
  '사',
  '묘',
  '절',
  '태',
  '양',
]

/* 일간별 장생 출발지 (정통 명리학 기준) */
const DAYMASTER_BIRTH_BRANCH: Record<string, string> = {
  甲: '亥',
  乙: '午',
  丙: '寅',
  丁: '酉',
  戊: '寅',
  己: '酉',
  庚: '巳',
  辛: '子',
  壬: '申',
  癸: '卯',
}

/* 음간 일간 — 12운성은 음간일 때 역행으로 계산 */
const YIN_DAY_MASTERS = new Set(['乙', '丁', '己', '辛', '癸'])

const BRANCH_ORDER = [
  '子',
  '丑',
  '寅',
  '卯',
  '辰',
  '巳',
  '午',
  '未',
  '申',
  '酉',
  '戌',
  '亥',
] as const

export function getTwelveStage(dayStemNameRaw: string, branchNameRaw: string): TwelveStage {
  const dayStemName = normalizeStemName(dayStemNameRaw)
  const branchName = normalizeBranchName(branchNameRaw)
  const start = DAYMASTER_BIRTH_BRANCH[dayStemName]
  if (!start) {
    return '묘'
  }
  const startIdx = (BRANCH_ORDER as readonly string[]).indexOf(start)
  const targetIdx = (BRANCH_ORDER as readonly string[]).indexOf(branchName)
  if (startIdx < 0 || targetIdx < 0) {
    return '묘'
  }
  // 양간 순행 / 음간 역행
  const isYin = YIN_DAY_MASTERS.has(dayStemName)
  const diff = isYin ? (startIdx - targetIdx + 12) % 12 : (targetIdx - startIdx + 12) % 12
  return TWELVE_STAGE_ORDER[diff]
}
export function getTwelveStagesForPillars(
  p: SajuPillarsLike,
  _basis: 'day' = 'day'
): { [K in PillarKind]: TwelveStage } {
  const dayStemName = normalizeStemName(p.day.heavenlyStem.name)
  return {
    year: getTwelveStage(dayStemName, p.year.earthlyBranch.name),
    month: getTwelveStage(dayStemName, p.month.earthlyBranch.name),
    day: getTwelveStage(dayStemName, p.day.earthlyBranch.name),
    time: getTwelveStage(dayStemName, p.time.earthlyBranch.name),
  }
}

/* ===== 12신살 테이블 ===== */
type TwelveMap = {
  겁살: string
  재살: string
  천살: string
  지살: string
  년살: string
  월살: string
  망신: string
  장성: string
  반안: string
  역마: string
  육해: string
  화개: string
}

/**
 * 정통 12신살 doctrine 기반 일지별 신살 위치표 자동 생성.
 *
 * 이전엔 144개 entries 가 hardcoded 였는데 audit 결과 모든 일지 row 가
 * 그릇된 group anchor 를 써서 12 spirits 11~12 개씩 잘못 매핑돼 있었다
 * (도화/역마/화개 등 빈출 신살 포함). 한 row(未) 만 런타임 override 로
 * 패치된 상태.
 *
 * 정통 doctrine:
 *  - 일지 가 속한 三合국에 따라 劫殺 출발점이 정해진다:
 *    寅午戌 → 劫殺 = 亥, 申子辰 → 巳, 巳酉丑 → 寅, 亥卯未 → 申
 *  - 거기서부터 시계방향 순서:
 *    劫殺→災殺→天殺→地殺→年殺(도화)→月殺→亡神→將星→攀鞍→驛馬→六害→華蓋
 *  - 그러므로 將星 = 三合 중간 글자, 驛馬 = 三合 첫 글자의 沖, 華蓋 = 三合
 *    끝 글자 — 어느 책에 가도 동일한 정설.
 *
 * 같은 결과(144 entries) 를 손으로 적는 대신 group→start, 그리고 순서대로
 * 12 spirits 를 부여하는 식으로 생성. 오타 / 인덱싱 실수 차단.
 */
const SHINSAL_KEYS_ORDER: (keyof TwelveMap)[] = [
  '겁살',
  '재살',
  '천살',
  '지살',
  '년살', // = 도화
  '월살',
  '망신',
  '장성',
  '반안',
  '역마',
  '육해',
  '화개',
]

const SHINSAL_GROUP_LEADERS: Record<string, string> = {
  寅: '亥', 午: '亥', 戌: '亥', // 寅午戌 group → 劫殺 starts at 亥
  申: '巳', 子: '巳', 辰: '巳', // 申子辰 group → 巳
  巳: '寅', 酉: '寅', 丑: '寅', // 巳酉丑 group → 寅
  亥: '申', 卯: '申', 未: '申', // 亥卯未 group → 申
}

function buildTwelveShinsalTable(): Record<string, TwelveMap> {
  const out: Record<string, TwelveMap> = {}
  for (const dayBranch of Object.keys(SHINSAL_GROUP_LEADERS)) {
    const startBranch = SHINSAL_GROUP_LEADERS[dayBranch]
    const startIdx = (BRANCH_ORDER as readonly string[]).indexOf(startBranch)
    if (startIdx < 0) continue
    const row = {} as TwelveMap
    for (let i = 0; i < 12; i++) {
      const branch = (BRANCH_ORDER as readonly string[])[(startIdx + i) % 12]
      row[SHINSAL_KEYS_ORDER[i]] = branch
    }
    out[dayBranch] = row
  }
  return out
}

const TWELVE_SHINSAL_BY_DAY_BRANCH: Record<string, TwelveMap> = buildTwelveShinsalTable()

/* ===== 레거시 간단표 — TWELVE_SHINSAL_BY_DAY_BRANCH 의 inverse view ===== */
// (branch → spirit) 매핑. 이전 hardcoded 버전은 group anchor 가 잘못돼서
// 모든 일지 row 가 그릇된 spirit 위치를 가리켰음. 새 doctrine-correct
// TWELVE_SHINSAL 테이블에서 자동 도출.
const SHINSAL_SIMPLE_BY_DAY_BRANCH: Record<
  string,
  Partial<Record<string, ShinsalHit['kind']>>
> = (() => {
  const out: Record<string, Partial<Record<string, ShinsalHit['kind']>>> = {}
  for (const [dayBranch, row] of Object.entries(TWELVE_SHINSAL_BY_DAY_BRANCH)) {
    const inv: Partial<Record<string, ShinsalHit['kind']>> = {}
    for (const key of SHINSAL_KEYS_ORDER) {
      const branch = row[key]
      inv[branch] = key as ShinsalHit['kind']
    }
    out[dayBranch] = inv
  }
  return out
})()

/* ===== 월지 보완 ===== */
const YEARMONTH_SHINSAL_BY_MONTH_BRANCH: Record<
  string,
  Partial<Record<string, ShinsalHit['kind']>>
> = {
  寅: { 申: '역마', 午: '반안', 戌: '반안' },
  申: { 寅: '역마', 子: '반안', 辰: '반안' },
  巳: { 亥: '역마', 酉: '반안', 丑: '반안' },
  亥: { 巳: '역마', 卯: '반안', 未: '반안' },
  辰: { 戌: '화개' },
  戌: { 辰: '화개' },
  丑: { 未: '화개' },
  未: { 丑: '화개' },
}

/* ===== 일반 신살/길성 ===== */
const YANGIN_BY_DAY_STEM: Record<string, string> = {
  甲: '卯',
  乙: '卯',
  丙: '午',
  丁: '午',
  戊: '午',
  己: '午',
  庚: '酉',
  辛: '酉',
  壬: '子',
  癸: '子',
}
// 괴강(魁罡) — 정통 5종: 庚辰, 庚戌, 壬辰, 壬戌, 戊戌
const GWAEGANG_DAY_PAIRS = new Set(['庚辰', '庚戌', '壬辰', '壬戌', '戊戌'])
function checkGwaegang(dayStem: string, dayBranch: string, targetBranch: string): boolean {
  return GWAEGANG_DAY_PAIRS.has(dayStem + dayBranch) && targetBranch === dayBranch
}

// 백호(白虎) — 정통 7종: 戊辰, 丁丑, 丙戌, 乙未, 甲辰, 癸丑, 壬戌
const BAEKHO_DAY_PAIRS = new Set(['戊辰', '丁丑', '丙戌', '乙未', '甲辰', '癸丑', '壬戌'])
function checkBaekho(dayStem: string, dayBranch: string): boolean {
  return BAEKHO_DAY_PAIRS.has(dayStem + dayBranch)
}
const DOHWA_SET = new Set(['子', '午', '卯', '酉'])
function getDohwaOn(branch: string): boolean {
  return DOHWA_SET.has(branch)
}

/* 귀문관: standard는 고정 세트, your는 삼합(방국) 기준으로 '좁게' */
const GWIMUN_MONTH_SET = new Set(['戌', '亥', '子', '丑'])
function getGwimunOn(
  monthBranch: string,
  targetBranch: string,
  ruleSet: 'standard' | 'your' = 'standard'
): boolean {
  if (ruleSet === 'your') {
    // 표 사이트 특례: 필요한 케이스 우선 허용
    if (
      (monthBranch === '寅' && targetBranch === '未') ||
      (monthBranch === '亥' && targetBranch === '卯')
    ) {
      return true
    }

    // 기본: 삼합(방국) 내부에서만 귀문관 허용
    const triads: string[][] = [
      ['申', '子', '辰'],
      ['寅', '午', '戌'],
      ['巳', '酉', '丑'],
      ['亥', '卯', '未'],
    ]
    const group = triads.find((g) => g.includes(monthBranch))
    return !!group && group.includes(targetBranch)
  }
  return GWIMUN_MONTH_SET.has(monthBranch) && GWIMUN_MONTH_SET.has(targetBranch)
}

const HYEONCHIM_BY_STEM: Record<string, string> = {
  甲: '酉',
  乙: '酉',
  丙: '子',
  丁: '子',
  戊: '卯',
  己: '卯',
  庚: '午',
  辛: '午',
  壬: '卯',
  癸: '卯',
}
function isHyeonchim(dayStem: string, branch: string): boolean {
  return HYEONCHIM_BY_STEM[dayStem] === branch
}
// 고신(孤神): 월지 三合 그룹의 다음 지지
//   寅卯辰 (春) → 巳    巳午未 (夏) → 申
//   申酉戌 (秋) → 亥    亥子丑 (冬) → 寅
const GOSIN_BY_MONTH: Record<string, string> = {
  寅: '巳',
  卯: '巳',
  辰: '巳',
  巳: '申',
  午: '申',
  未: '申',
  申: '亥',
  酉: '亥',
  戌: '亥',
  亥: '寅',
  子: '寅',
  丑: '寅',
}
function isGosin(monthBranch: string, target: string): boolean {
  return GOSIN_BY_MONTH[monthBranch] === target
}
// 천을귀인: 일간별 두 지지 (전통 명리학 정통 표)
//   甲戊庚 → 丑未
//   乙己   → 子申
//   丙丁   → 亥酉
//   壬癸   → 巳卯
//   辛     → 寅午  (六辛逢馬虎)
// 천을귀인은 constants.CHEONEUL_GWIIN_MAP(SSOT)에서 가져온다. 로컬 복제 금지.
const CHEONEUL_BY_DAY_STEM: Record<string, string[]> = CHEONEUL_GWIIN_MAP
const TAEGEUK_BY_DAY_STEM: Record<string, string[]> = {
  甲: ['子', '午'],
  乙: ['子', '午'],
  丙: ['卯', '酉'],
  丁: ['卯', '酉'],
  戊: ['辰', '戌'],
  己: ['辰', '戌'],
  庚: ['丑', '未'],
  辛: ['丑', '未'],
  壬: ['寅', '申'],
  癸: ['寅', '申'],
}
function isGeumYeoseong(branch: string): boolean {
  return branch === '酉' || branch === '辰'
}
function isCheonMunSeong(branch: string): boolean {
  return branch === '子' || branch === '午'
}
// 문창귀인: 일간이 만드는 식신 자리 (일간 dependent)
//   甲→巳 乙→午 丙·戊→申 丁·己→酉 庚→亥 辛→子 壬→寅 癸→卯
const MUNCHANG_BY_DAY_STEM: Record<string, string> = {
  甲: '巳',
  乙: '午',
  丙: '申',
  丁: '酉',
  戊: '申',
  己: '酉',
  庚: '亥',
  辛: '子',
  壬: '寅',
  癸: '卯',
}
function isMunChang(dayStem: string, branch: string): boolean {
  return MUNCHANG_BY_DAY_STEM[dayStem] === branch
}

// 문곡귀인: 문창의 충 자리 (식신 위치의 반대편)
const MUNGOK_BY_DAY_STEM: Record<string, string> = {
  甲: '亥',
  乙: '子',
  丙: '寅',
  丁: '卯',
  戊: '寅',
  己: '卯',
  庚: '巳',
  辛: '午',
  壬: '申',
  癸: '酉',
}
function isMunGok(dayStem: string, branch: string): boolean {
  return MUNGOK_BY_DAY_STEM[dayStem] === branch
}

/* ===== 확장 신살 테이블 ===== */

// 공망(空亡): 일주의 순(旬)에서 빠진 두 지지. 산정은 pillarLookup.getGongmang(SSOT)에
// 위임 — SIXTY_PILLARS 의 旬空 규칙 한 곳에서만 계산. 과거 여기 60칸 표를 손으로
// 들고 있었으나(드리프트 위험) 제거.
export function getGongmang(dayStem: string, dayBranch: string): string[] {
  return getGongmangByPillar(`${dayStem}${dayBranch}`) ?? []
}

// 천의성(天醫星): 월지 기준으로 다음 지지
const CHEONUI_BY_MONTH_BRANCH: Record<string, string> = {
  子: '亥',
  丑: '子',
  寅: '丑',
  卯: '寅',
  辰: '卯',
  巳: '辰',
  午: '巳',
  未: '午',
  申: '未',
  酉: '申',
  戌: '酉',
  亥: '戌',
}
function isCheonuiseong(monthBranch: string, targetBranch: string): boolean {
  return CHEONUI_BY_MONTH_BRANCH[monthBranch] === targetBranch
}

// 학당귀인(學堂貴人): 일간 기준
const HAKDANG_BY_DAY_STEM: Record<string, string> = {
  甲: '亥',
  乙: '午',
  丙: '寅',
  丁: '酉',
  戊: '寅',
  己: '酉',
  庚: '巳',
  辛: '子',
  壬: '申',
  癸: '卯',
}
function isHakdangGwiin(dayStem: string, targetBranch: string): boolean {
  return HAKDANG_BY_DAY_STEM[dayStem] === targetBranch
}

// 홍염살(紅艶殺): 일간 기준 - 이성/연애 관련
const HONGYEOM_BY_DAY_STEM: Record<string, string> = {
  甲: '午',
  乙: '午',
  丙: '寅',
  丁: '未',
  戊: '辰',
  己: '辰',
  庚: '戌',
  辛: '酉',
  壬: '子',
  癸: '申',
}
function isHongyeomsal(dayStem: string, targetBranch: string): boolean {
  return HONGYEOM_BY_DAY_STEM[dayStem] === targetBranch
}

// 천라지망(天羅地網): 辰~巳는 천라, 戌~亥는 지망
function isCheonraJimang(branch: string): '천라지망' | null {
  if (['辰', '巳', '戌', '亥'].includes(branch)) {
    return '천라지망'
  }
  return null
}

// 원진(怨嗔): 표준 6쌍(canon). 子未 丑午 寅酉 卯申 辰亥 巳戌.
// (과거 "6해의 특수형태"로 오인해 해(害) 표를 복제하던 버그를 SSOT로 제거.)
const WONJIN_PAIRS: Record<string, string> = toBidiRecord(RESENTMENT_PAIRS)
function isWonjin(dayBranch: string, targetBranch: string): boolean {
  return WONJIN_PAIRS[dayBranch] === targetBranch
}

// 천주귀인(天廚貴人): 일간 기준
const CHEONJU_BY_DAY_STEM: Record<string, string> = {
  甲: '巳',
  乙: '午',
  丙: '巳',
  丁: '午',
  戊: '巳',
  己: '午',
  庚: '亥',
  辛: '子',
  壬: '亥',
  癸: '子',
}
function isCheonjuGwiin(dayStem: string, targetBranch: string): boolean {
  return CHEONJU_BY_DAY_STEM[dayStem] === targetBranch
}

// 암록(暗祿): 건록의 충(沖) 지지
const AMNOK_BY_DAY_STEM: Record<string, string> = {
  甲: '酉',
  乙: '申',
  丙: '亥',
  丁: '戌',
  戊: '亥',
  己: '戌',
  庚: '卯',
  辛: '寅',
  壬: '巳',
  癸: '辰',
}
function isAmnok(dayStem: string, targetBranch: string): boolean {
  return AMNOK_BY_DAY_STEM[dayStem] === targetBranch
}

// 건록(建祿): 일간의 록지
const GEONROK_BY_DAY_STEM: Record<string, string> = {
  甲: '寅',
  乙: '卯',
  丙: '巳',
  丁: '午',
  戊: '巳',
  己: '午',
  庚: '申',
  辛: '酉',
  壬: '亥',
  癸: '子',
}
function isGeonrok(dayStem: string, targetBranch: string): boolean {
  return GEONROK_BY_DAY_STEM[dayStem] === targetBranch
}

// 제왕(帝旺): 12운성 중 왕지와 동일한 위치
const JEWANG_BY_DAY_STEM: Record<string, string> = {
  甲: '卯',
  乙: '寅',
  丙: '午',
  丁: '巳',
  戊: '午',
  己: '巳',
  庚: '酉',
  辛: '申',
  壬: '子',
  癸: '亥',
}
function isJewang(dayStem: string, targetBranch: string): boolean {
  return JEWANG_BY_DAY_STEM[dayStem] === targetBranch
}

// 삼재(三災): 년지 기준으로 3년 주기의 불운
// 寅午戌 → 申酉戌 삼재, 巳酉丑 → 寅卯辰 삼재, 申子辰 → 巳午未 삼재, 亥卯未 → 亥子丑 삼재
const SAMJAE_BY_YEAR_BRANCH: Record<string, string[]> = {
  寅: ['申', '酉', '戌'],
  午: ['申', '酉', '戌'],
  戌: ['申', '酉', '戌'],
  巳: ['寅', '卯', '辰'],
  酉: ['寅', '卯', '辰'],
  丑: ['寅', '卯', '辰'],
  申: ['巳', '午', '未'],
  子: ['巳', '午', '未'],
  辰: ['巳', '午', '未'],
  亥: ['亥', '子', '丑'],
  卯: ['亥', '子', '丑'],
  未: ['亥', '子', '丑'],
}
function isSamjae(yearBranch: string, currentYearBranch: string): boolean {
  const samjaeBranches = SAMJAE_BY_YEAR_BRANCH[yearBranch]
  return samjaeBranches?.includes(currentYearBranch) ?? false
}

// 천덕귀인(天德貴人): 월지 기준
const CHEONDEOK_BY_MONTH_BRANCH: Record<string, string> = {
  寅: '丁',
  卯: '申',
  辰: '壬',
  巳: '辛',
  午: '亥',
  未: '甲',
  申: '癸',
  酉: '寅',
  戌: '丙',
  亥: '乙',
  子: '巳',
  丑: '庚',
}
function isCheondeokGwiin(monthBranch: string, targetStem: string): boolean {
  return CHEONDEOK_BY_MONTH_BRANCH[monthBranch] === targetStem
}

// 월덕귀인(月德貴人): 월지 기준
const WOLDEOK_BY_MONTH_BRANCH: Record<string, string> = {
  寅: '丙',
  卯: '甲',
  辰: '壬',
  巳: '庚',
  午: '丙',
  未: '甲',
  申: '壬',
  酉: '庚',
  戌: '丙',
  亥: '甲',
  子: '壬',
  丑: '庚',
}
function isWoldeokGwiin(monthBranch: string, targetStem: string): boolean {
  return WOLDEOK_BY_MONTH_BRANCH[monthBranch] === targetStem
}

/* ===== 예시 길/흉성(유지) ===== */
const LUCKY_BRANCHES = new Set<string>(['寅', '午', '戌'])
const UNLUCKY_BRANCHES = new Set<string>(['辰', '戌'])

/* ===== 12신살 단일 선택 우선순위 ===== */
const TWELVE_PRIORITY: ShinsalHit['kind'][] = [
  '장성',
  '화개',
  '망신',
  '역마',
  '반안',
  '지살',
  '재살',
  '천살',
  '년살',
  '월살',
  '육해',
]

function mapK(k: keyof TwelveMap): ShinsalHit['kind'] {
  return k === '겁살'
    ? '겁살'
    : k === '재살'
      ? '재살'
      : k === '천살'
        ? '천살'
        : k === '지살'
          ? '지살'
          : k === '년살'
            ? '년살'
            : k === '월살'
              ? '월살'
              : k === '망신'
                ? '망신'
                : k === '장성'
                  ? '장성'
                  : k === '반안'
                    ? '반안'
                    : k === '역마'
                      ? '역마'
                      : k === '육해'
                        ? '육해'
                        : '화개'
}

// 12신살: 三合 將星 기준 offset으로 계산 (정통 표)
//   寅午戌 火局 → 將星=午
//   巳酉丑 金局 → 將星=酉
//   申子辰 水局 → 將星=子
//   亥卯未 木局 → 將星=卯
//
// 將星 위치를 0으로 잡고 12지지 순서대로 offset:
//   0=將星 1=攀鞍 2=驛馬 3=六厄 4=華蓋 5=劫煞
//   6=災煞 7=天煞 8=地煞 9=年煞 10=月煞 11=亡神
const SAMHAP_LEADER: Record<string, string> = {
  寅: '午',
  午: '午',
  戌: '午',
  巳: '酉',
  酉: '酉',
  丑: '酉',
  申: '子',
  子: '子',
  辰: '子',
  亥: '卯',
  卯: '卯',
  未: '卯',
}
const TWELVE_BY_OFFSET_KO = [
  '장성',
  '반안',
  '역마',
  '육해',
  '화개',
  '겁살',
  '재살',
  '천살',
  '지살',
  '년살',
  '월살',
  '망신',
] as const

export function pickTwelveSingle(
  dayBranch: string,
  targetBranch: string
): ShinsalHit['kind'] | null {
  const leader = SAMHAP_LEADER[dayBranch]
  if (!leader) return null
  const leaderIdx = (BRANCH_ORDER as readonly string[]).indexOf(leader)
  const targetIdx = (BRANCH_ORDER as readonly string[]).indexOf(targetBranch)
  if (leaderIdx < 0 || targetIdx < 0) return null
  const offset = (targetIdx - leaderIdx + 12) % 12
  return TWELVE_BY_OFFSET_KO[offset] as ShinsalHit['kind']
}

/**
 * Daily shinsal scan — given the user's natal day pillar, return the
 * shinsals that "fire" on a target date's branch (e.g. today is your
 * 도화일 / 역마일 / 천을귀인 등). Used by the calendar to surface
 * "오늘 발동되는 신살" without rebuilding the full 4-pillar engine.
 */
export function getShinsalHitsForDailyTarget(
  natalDayStem: string,
  natalDayBranch: string,
  targetBranch: string,
  // 확장 파라미터 — 기존 호출자는 그대로 동작하도록 optional.
  // 본명 월지와 일진 천간이 있어야 추가 12개 신살을 계산할 수 있음.
  natalMonthBranch?: string,
  targetStem?: string,
): Array<{ kind: ShinsalHit['kind']; basis: string }> {
  const hits: Array<{ kind: ShinsalHit['kind']; basis: string }> = []

  // ─── 12신살 (일지 기준) ───
  const twelve = pickTwelveSingle(natalDayBranch, targetBranch)
  if (twelve) {
    hits.push({ kind: twelve, basis: `일지(${natalDayBranch})` })
  }

  // ─── 도화 (자오묘유 중 본인 일지의 三合 도화 자리) ───
  if (DOHWA_SET.has(targetBranch)) {
    hits.push({ kind: '도화', basis: `target=${targetBranch}` })
  }

  // ─── 일간 기준 길성·흉성 ───
  // 천을귀인 — CHEONEUL_BY_DAY_STEM 테이블
  // (옛 코드가 isCheonjuGwiin을 호출해 천을귀인으로 emit하던 버그였음 —
  //  isCheonjuGwiin은 CHEONJU 테이블이라 사실 천주귀인을 emit하던 셈)
  const cheoneul = CHEONEUL_BY_DAY_STEM[natalDayStem] || []
  if (cheoneul.includes(targetBranch)) {
    hits.push({ kind: '천을귀인', basis: `일간(${natalDayStem})` })
  }
  // 태극귀인 (정신·영성·인생 큰 흐름)
  const taegeuk = TAEGEUK_BY_DAY_STEM[natalDayStem] || []
  if (taegeuk.includes(targetBranch)) {
    hits.push({ kind: '태극귀인', basis: `일간(${natalDayStem})` })
  }
  // 양인
  if (YANGIN_BY_DAY_STEM[natalDayStem] === targetBranch) {
    hits.push({ kind: '양인', basis: `일간(${natalDayStem})` })
  }
  // 현침
  if (isHyeonchim(natalDayStem, targetBranch)) {
    hits.push({ kind: '현침', basis: `일간(${natalDayStem})` })
  }
  // 홍염살 (매력·인기)
  if (isHongyeomsal(natalDayStem, targetBranch)) {
    hits.push({ kind: '홍염살', basis: `일간(${natalDayStem})` })
  }
  // 문창·문곡 (학업·표현)
  if (isMunChang(natalDayStem, targetBranch)) {
    hits.push({ kind: '문창', basis: `일간(${natalDayStem})` })
  }
  if (isMunGok(natalDayStem, targetBranch)) {
    hits.push({ kind: '문곡', basis: `일간(${natalDayStem})` })
  }
  // 학당귀인 (학업)
  if (isHakdangGwiin(natalDayStem, targetBranch)) {
    hits.push({ kind: '학당귀인', basis: `일간(${natalDayStem})` })
  }
  // 암록 (보이지 않는 도움)
  if (isAmnok(natalDayStem, targetBranch)) {
    hits.push({ kind: '암록', basis: `일간(${natalDayStem})` })
  }
  // 건록 (일간 본력 활용)
  if (isGeonrok(natalDayStem, targetBranch)) {
    hits.push({ kind: '건록', basis: `일간(${natalDayStem})` })
  }
  // 제왕 (자기 절정)
  if (isJewang(natalDayStem, targetBranch)) {
    hits.push({ kind: '제왕', basis: `일간(${natalDayStem})` })
  }
  // 천주귀인 (관계·재물 보호)
  if (isCheonjuGwiin(natalDayStem, targetBranch)) {
    hits.push({ kind: '천주귀인', basis: `일간(${natalDayStem})` })
  }

  // ─── target branch 단독 기준 ───
  // 금여성 (안정·풍요)
  if (isGeumYeoseong(targetBranch)) {
    hits.push({ kind: '금여성', basis: `target=${targetBranch}` })
  }
  // 천문성 (영성·종교·예지)
  if (isCheonMunSeong(targetBranch)) {
    hits.push({ kind: '천문성', basis: `target=${targetBranch}` })
  }

  // ─── 본명 일지 ↔ target branch ───
  // 원진 (감정·신경 예민)
  if (isWonjin(natalDayBranch, targetBranch)) {
    hits.push({ kind: '원진', basis: `일지(${natalDayBranch})` })
  }
  // 괴강 (추진력·강한 결단)
  if (checkGwaegang(natalDayStem, natalDayBranch, targetBranch)) {
    hits.push({ kind: '괴강', basis: `일주(${natalDayStem}${natalDayBranch})` })
  }

  // ─── 월지 기반 신살 (월지 정보 있을 때만) ───
  if (natalMonthBranch) {
    // 천의성 (치유·돌봄)
    if (isCheonuiseong(natalMonthBranch, targetBranch)) {
      hits.push({ kind: '천의성', basis: `월지(${natalMonthBranch})` })
    }
    // 귀문관 (예민·직관·꿈)
    if (getGwimunOn(natalMonthBranch, targetBranch, undefined)) {
      hits.push({ kind: '귀문관', basis: `월지(${natalMonthBranch})` })
    }
  }

  // ─── 천간 기반: 천덕귀인·월덕귀인 (월지 + target 일간) ───
  if (natalMonthBranch && targetStem) {
    if (isCheondeokGwiin(natalMonthBranch, targetStem)) {
      hits.push({ kind: '천덕귀인', basis: `월지(${natalMonthBranch}) ↔ 일간(${targetStem})` })
    }
    if (isWoldeokGwiin(natalMonthBranch, targetStem)) {
      hits.push({ kind: '월덕귀인', basis: `월지(${natalMonthBranch}) ↔ 일간(${targetStem})` })
    }
  }

  // ─── 공망 (일주 기준) ───
  const gongmangList = getGongmang(natalDayStem, natalDayBranch)
  if (gongmangList.includes(targetBranch)) {
    hits.push({ kind: '공망', basis: `일주(${natalDayStem}${natalDayBranch})` })
  }

  return hits
}

/* your 룰 오버라이드 */
function applyYourOverrides() {
  const row = TWELVE_SHINSAL_BY_DAY_BRANCH['未']
  if (row) {
    row.장성 = '卯' // 시지 장성
    row.화개 = '未' // 일지 화개
    row.망신 = '寅' // 월지 망신
  }
  HYEONCHIM_BY_STEM['辛'] = '未' // 현침 오버라이드(일간 辛 → 未)
}

/* ===== 신살 계산 ===== */
export function getShinsalHits(
  p: SajuPillarsLike,
  options?: Partial<AnnotateOptions>
): ShinsalHit[] {
  const opt = { ...DEFAULT_ANNOTATE_OPTIONS, ...(options || {}) }
  if (opt.ruleSet === 'your') {
    applyYourOverrides()
  }

  const hits: ShinsalHit[] = []

  const dayBranch = normalizeBranchName(p.day.earthlyBranch.name)
  const dayStem = normalizeStemName(p.day.heavenlyStem.name)
  const monthBranch = normalizeBranchName(p.month.earthlyBranch.name)

  const pairs: Array<[PillarKind, string]> = [
    ['year', normalizeBranchName(p.year.earthlyBranch.name)],
    ['month', normalizeBranchName(p.month.earthlyBranch.name)],
    ['day', normalizeBranchName(p.day.earthlyBranch.name)],
    ['time', normalizeBranchName(p.time.earthlyBranch.name)],
  ]

  // 12신살: 각 기둥당 1개만
  if (opt.includeTwelveAll) {
    for (const [kind, br] of pairs) {
      const single = pickTwelveSingle(dayBranch, br)
      if (single) {
        hits.push({
          kind: single,
          pillars: [kind],
          target: br,
          detail: '일지(' + dayBranch + ') 기준',
        })
      }
    }
  } else {
    const dayRule = SHINSAL_SIMPLE_BY_DAY_BRANCH[dayBranch] || {}
    for (const [kind, br] of pairs) {
      const hitKind = dayRule[br]
      if (hitKind) {
        hits.push({
          kind: hitKind,
          pillars: [kind],
          target: br,
          detail: '일지(' + dayBranch + ') 기준',
        })
      }
    }
  }

  // 월지 보완(옵션)
  if (opt.useMonthCompletion) {
    const monthRule = YEARMONTH_SHINSAL_BY_MONTH_BRANCH[monthBranch] || {}
    for (const [kind, br] of pairs) {
      const hitKind = monthRule[br]
      if (hitKind) {
        hits.push({
          kind: hitKind,
          pillars: [kind],
          target: br,
          detail: '월지(' + monthBranch + ') 기준',
        })
      }
    }
  }

  // 일반 신살/길성
  if (opt.includeGeneralShinsal || opt.includeLuckyDetails) {
    // 공망 계산 (일주 기준)
    const gongmangBranches = getGongmang(dayStem, dayBranch)

    for (const [kind, br] of pairs) {
      if (opt.includeGeneralShinsal) {
        if (getDohwaOn(br)) {
          hits.push({ kind: '도화', pillars: [kind], target: br })
        }
        if (getGwimunOn(monthBranch, br, opt.ruleSet)) {
          hits.push({ kind: '귀문관', pillars: [kind], target: br })
        }
        if (isHyeonchim(dayStem, br)) {
          hits.push({ kind: '현침', pillars: [kind], target: br })
        }
        if (isGosin(monthBranch, br)) {
          hits.push({ kind: '고신', pillars: [kind], target: br })
        }
        if (checkGwaegang(dayStem, dayBranch, br)) {
          hits.push({ kind: '괴강', pillars: [kind], target: br })
        }
        if (kind === 'day' && checkBaekho(dayStem, dayBranch)) {
          hits.push({ kind: '백호', pillars: [kind], target: br })
        }
        if (YANGIN_BY_DAY_STEM[dayStem] === br) {
          hits.push({ kind: '양인', pillars: [kind], target: br })
        }

        // 확장 신살 (흉성 계열)
        if (gongmangBranches.includes(br)) {
          hits.push({
            kind: '공망',
            pillars: [kind],
            target: br,
            detail: '일주(' + dayStem + dayBranch + ') 기준',
          })
        }
        if (isHongyeomsal(dayStem, br)) {
          hits.push({ kind: '홍염살', pillars: [kind], target: br })
        }
        if (isCheonraJimang(br)) {
          hits.push({ kind: '천라지망', pillars: [kind], target: br })
        }
        if (isWonjin(dayBranch, br)) {
          hits.push({ kind: '원진', pillars: [kind], target: br })
        }
      }
      if (opt.includeLuckyDetails) {
        const ce = CHEONEUL_BY_DAY_STEM[dayStem] || []
        const tg = TAEGEUK_BY_DAY_STEM[dayStem] || []
        if (ce.includes(br)) {
          hits.push({ kind: '천을귀인', pillars: [kind], target: br })
        }
        if (tg.includes(br)) {
          hits.push({ kind: '태극귀인', pillars: [kind], target: br })
        }
        if (isGeumYeoseong(br)) {
          hits.push({ kind: '금여성', pillars: [kind], target: br })
        }
        if (isCheonMunSeong(br)) {
          hits.push({ kind: '천문성', pillars: [kind], target: br })
        }
        if (isMunChang(dayStem, br)) {
          hits.push({ kind: '문창', pillars: [kind], target: br })
        }
        if (isMunGok(dayStem, br)) {
          hits.push({ kind: '문곡', pillars: [kind], target: br })
        }

        // 확장 신살 (길성 계열)
        if (isCheonuiseong(monthBranch, br)) {
          hits.push({ kind: '천의성', pillars: [kind], target: br })
        }
        if (isHakdangGwiin(dayStem, br)) {
          hits.push({ kind: '학당귀인', pillars: [kind], target: br })
        }
        if (isCheonjuGwiin(dayStem, br)) {
          hits.push({ kind: '천주귀인', pillars: [kind], target: br })
        }
        if (isAmnok(dayStem, br)) {
          hits.push({ kind: '암록', pillars: [kind], target: br })
        }
        if (isGeonrok(dayStem, br)) {
          hits.push({ kind: '건록', pillars: [kind], target: br })
        }
        if (isJewang(dayStem, br)) {
          hits.push({ kind: '제왕', pillars: [kind], target: br })
        }
      }
    }
  }

  // 천덕귀인/월덕귀인: 천간 기준으로 확인
  if (opt.includeLuckyDetails) {
    const stemPairs: Array<[PillarKind, string]> = [
      ['year', normalizeStemName(p.year.heavenlyStem.name)],
      ['month', normalizeStemName(p.month.heavenlyStem.name)],
      ['day', normalizeStemName(p.day.heavenlyStem.name)],
      ['time', normalizeStemName(p.time.heavenlyStem.name)],
    ]
    for (const [kind, stem] of stemPairs) {
      if (isCheondeokGwiin(monthBranch, stem)) {
        hits.push({
          kind: '천덕귀인',
          pillars: [kind],
          target: stem,
          detail: '월지(' + monthBranch + ') 기준',
        })
      }
      if (isWoldeokGwiin(monthBranch, stem)) {
        hits.push({
          kind: '월덕귀인',
          pillars: [kind],
          target: stem,
          detail: '월지(' + monthBranch + ') 기준',
        })
      }
    }
  }

  // 삼재: 년지 기준 (현재 연도 기준으로 판단하려면 추가 파라미터 필요)
  // 기본적으로 사주 내 년지만 표시 (실제 삼재 시기 판단은 운세 모듈에서)
  const yearBranch = normalizeBranchName(p.year.earthlyBranch.name)
  const samjaeBranches = SAMJAE_BY_YEAR_BRANCH[yearBranch]
  if (samjaeBranches && opt.includeGeneralShinsal) {
    hits.push({
      kind: '삼재',
      pillars: ['year'],
      target: samjaeBranches.join(','),
      detail: `${yearBranch}띠 삼재 지지: ${samjaeBranches.join(',')}`,
    })
  }

  // 데모 길/흉성 옵션
  if (options?.includeLucky) {
    for (const [kind, br] of pairs) {
      if (LUCKY_BRANCHES.has(br)) {
        hits.push({ kind: '길성', pillars: [kind], target: br, detail: '예시 길성 세트' })
      }
    }
  }
  if (options?.includeUnlucky) {
    for (const [kind, br] of pairs) {
      if (UNLUCKY_BRANCHES.has(br)) {
        hits.push({ kind: '흉성', pillars: [kind], target: br, detail: '예시 흉성 세트' })
      }
    }
  }

  return hits
}

export function annotateShinsal(
  p: SajuPillarsLike,
  options?: Partial<AnnotateOptions>
): ShinsalAnnot {
  const opt = { ...DEFAULT_ANNOTATE_OPTIONS, ...(options || {}) }
  const twelveStage = getTwelveStagesForPillars(p, opt.twelveStageBasis)
  const hits = getShinsalHits(p, opt)

  const byPillar: ShinsalAnnot['byPillar'] = {
    year: { twelveShinsal: [], generalShinsal: [], lucky: [] },
    month: { twelveShinsal: [], generalShinsal: [], lucky: [] },
    day: { twelveShinsal: [], generalShinsal: [], lucky: [] },
    time: { twelveShinsal: [], generalShinsal: [], lucky: [] },
  }

  for (const h of hits) {
    for (const k of h.pillars) {
      // 12신살
      if (
        [
          '겁살',
          '재살',
          '천살',
          '지살',
          '년살',
          '월살',
          '망신',
          '장성',
          '반안',
          '역마',
          '육해',
          '화개',
        ].includes(h.kind)
      ) {
        if (!byPillar[k].twelveShinsal.includes(h.kind + '살')) {
          byPillar[k].twelveShinsal.push(h.kind + '살')
        }
      }
      // 길성 (기존 + 확장 + 추가)
      else if (
        [
          '천을귀인',
          '태극귀인',
          '금여성',
          '천문성',
          '문창',
          '문곡',
          '천의성',
          '학당귀인',
          '천주귀인',
          '암록',
          '건록',
          '제왕',
          '천덕귀인',
          '월덕귀인',
        ].includes(h.kind)
      ) {
        if (!byPillar[k].lucky.includes(h.kind)) {
          byPillar[k].lucky.push(h.kind)
        }
      }
      // 일반/흉성 신살 (기존 + 확장 + 추가)
      else if (
        [
          '도화',
          '귀문관',
          '현침',
          '고신',
          '괴강',
          '양인',
          '백호',
          '공망',
          '홍염살',
          '천라지망',
          '원진',
          '삼재',
        ].includes(h.kind)
      ) {
        const label = h.kind.endsWith('살') ? h.kind : h.kind + '살'
        if (!byPillar[k].generalShinsal.includes(label)) {
          byPillar[k].generalShinsal.push(label)
        }
      }
    }
  }

  return { twelveStage, hits, byPillar }
}

/* ===== 어댑터 ===== */
export interface SajuPillarsAdapterInput {
  yearPillar: {
    heavenlyStem: { name: string; element: FiveElement }
    earthlyBranch: { name: string; element: FiveElement }
  }
  monthPillar: {
    heavenlyStem: { name: string; element: FiveElement }
    earthlyBranch: { name: string; element: FiveElement }
  }
  dayPillar: {
    heavenlyStem: { name: string; element: FiveElement }
    earthlyBranch: { name: string; element: FiveElement }
  }
  timePillar: {
    heavenlyStem: { name: string; element: FiveElement }
    earthlyBranch: { name: string; element: FiveElement }
  }
}
export function toSajuPillarsLike(input: SajuPillarsAdapterInput): SajuPillarsLike {
  return {
    year: {
      heavenlyStem: {
        name: normalizeStemName(input.yearPillar.heavenlyStem.name),
        element: input.yearPillar.heavenlyStem.element,
      },
      earthlyBranch: {
        name: normalizeBranchName(input.yearPillar.earthlyBranch.name),
        element: input.yearPillar.earthlyBranch.element,
      },
    },
    month: {
      heavenlyStem: {
        name: normalizeStemName(input.monthPillar.heavenlyStem.name),
        element: input.monthPillar.heavenlyStem.element,
      },
      earthlyBranch: {
        name: normalizeBranchName(input.monthPillar.earthlyBranch.name),
        element: input.monthPillar.earthlyBranch.element,
      },
    },
    day: {
      heavenlyStem: {
        name: normalizeStemName(input.dayPillar.heavenlyStem.name),
        element: input.dayPillar.heavenlyStem.element,
      },
      earthlyBranch: {
        name: normalizeBranchName(input.dayPillar.earthlyBranch.name),
        element: input.dayPillar.earthlyBranch.element,
      },
    },
    time: {
      heavenlyStem: {
        name: normalizeStemName(input.timePillar.heavenlyStem.name),
        element: input.timePillar.heavenlyStem.element,
      },
      earthlyBranch: {
        name: normalizeBranchName(input.timePillar.earthlyBranch.name),
        element: input.timePillar.earthlyBranch.element,
      },
    },
  }
}

/* ===== 단일 12신살/길성 ===== */
export function getTwelveShinsalSingleByPillar(
  p: SajuPillarsLike,
  options?: Partial<AnnotateOptions>
): { year: string; month: string; day: string; time: string } {
  const opt = { ...DEFAULT_ANNOTATE_OPTIONS, ...(options || {}) }
  if (opt.ruleSet === 'your') {
    applyYourOverrides()
  }

  const dayBranch = normalizeBranchName(p.day.earthlyBranch.name)
  const monthBranch = normalizeBranchName(p.month.earthlyBranch.name)
  const monthRule = YEARMONTH_SHINSAL_BY_MONTH_BRANCH[monthBranch] || {}

  const pick = (branchNameRaw: string) => {
    const b = normalizeBranchName(branchNameRaw)
    if (opt.includeTwelveAll) {
      const single = pickTwelveSingle(dayBranch, b)
      return single ? single + '살' : ''
    } else {
      const fromDay = SHINSAL_SIMPLE_BY_DAY_BRANCH[dayBranch]?.[b]
      if (fromDay) {
        return fromDay + '살'
      }
    }
    if (opt.useMonthCompletion) {
      const fromMonth = monthRule[b]
      if (fromMonth) {
        return fromMonth + '살'
      }
    }
    return ''
  }

  return {
    time: pick(p.time.earthlyBranch.name),
    day: pick(p.day.earthlyBranch.name),
    month: pick(p.month.earthlyBranch.name),
    year: pick(p.year.earthlyBranch.name),
  }
}

export function getLuckySingleByPillar(p: SajuPillarsLike): {
  year: string
  month: string
  day: string
  time: string
} {
  const hits = getShinsalHits(
    {
      year: {
        heavenlyStem: p.year.heavenlyStem,
        earthlyBranch: {
          ...p.year.earthlyBranch,
          name: normalizeBranchName(p.year.earthlyBranch.name),
        },
      },
      month: {
        heavenlyStem: p.month.heavenlyStem,
        earthlyBranch: {
          ...p.month.earthlyBranch,
          name: normalizeBranchName(p.month.earthlyBranch.name),
        },
      },
      day: {
        heavenlyStem: p.day.heavenlyStem,
        earthlyBranch: {
          ...p.day.earthlyBranch,
          name: normalizeBranchName(p.day.earthlyBranch.name),
        },
      },
      time: {
        heavenlyStem: p.time.heavenlyStem,
        earthlyBranch: {
          ...p.time.earthlyBranch,
          name: normalizeBranchName(p.time.earthlyBranch.name),
        },
      },
    },
    { includeLuckyDetails: true, includeGeneralShinsal: false, includeTwelveAll: false }
  )
  const anyLuckyOn = (k: PillarKind) =>
    hits.some(
      (h) =>
        ['천을귀인', '태극귀인', '금여성', '천문성', '문창', '문곡'].includes(h.kind) &&
        h.pillars.includes(k)
    )
  const pick = (k: PillarKind) => (anyLuckyOn(k) ? '길성' : '')
  return {
    time: pick('time'),
    day: pick('day'),
    month: pick('month'),
    year: pick('year'),
  }
}

/* ===== 지장간 텍스트 ===== */
// 순서: 여기 → 중기 → 정기 (정기만 있는 지지는 하나만).
// 정본 JIJANGGAN(constants, 한자)에서 한글 독음으로 파생 — 로컬 복제 금지.
// (과거 손으로 적다가 午='기정'(丙 누락)·亥='무임'(甲 누락) 으로 드리프트했던 버그를
//  SSOT 파생으로 제거. 이제 午=병기정, 亥=무갑임.)
const STEM_HAN_TO_KO: Record<string, string> = {
  甲: '갑',
  乙: '을',
  丙: '병',
  丁: '정',
  戊: '무',
  己: '기',
  庚: '경',
  辛: '신',
  壬: '임',
  癸: '계',
}
export const JIJANGGAN_TEXT_BY_BRANCH: Record<string, string> = Object.fromEntries(
  Object.entries(JIJANGGAN).map(([branch, j]) => [
    branch,
    [j['여기'], j['중기'], j['정기']]
      .filter((s): s is string => Boolean(s))
      .map((s) => STEM_HAN_TO_KO[s])
      .join(''),
  ])
)
export function getJijangganText(branchNameRaw: string): string {
  const b = normalizeBranchName(branchNameRaw)
  return JIJANGGAN_TEXT_BY_BRANCH[b] || ''
}
