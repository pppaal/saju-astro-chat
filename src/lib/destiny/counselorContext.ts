/**
 * Destiny counselor context layer — builds the LLM-facing context DIRECTLY
 * from the raw saju/astro engine (not by post-processing rendered text).
 * Raw engine calc is untouched; this only reads from it. KO/EN via locale.
 *
 * Increment ①: SAJU section.
 */
import { currentManAge } from '@/lib/datetime/currentAge'
import { collectSajuFacts } from '@/lib/destiny/sajuFacts'
import { computeCurrentUnse, type CurrentUnse } from '@/lib/saju/currentUnse'
import { getSajuYearForDate } from '@/lib/saju/datePillars'
import { collectAstroFacts } from '@/lib/destiny/astroFacts'
import { getShinsalHits, getTwelveStagesForPillars, toSajuPillarsLike } from '@/lib/saju/shinsal'
import { formatAstroSelf } from '@/lib/destiny/astroSelfFormatter'
import { slimAstroSelf } from '@/lib/destiny/astroSlim'
import { getIljinCalendar } from '@/lib/saju/unse'
import { isHyeong } from '@/lib/saju/hyeong'
import { logger } from '@/lib/logger'
import type { DayMaster } from '@/lib/saju/types'
import { SIBSIN_EN as SIBSIN_EN_BASE } from '@/lib/saju/sibsinLabels'
import { PLANET_KO as PLANET_KO_BASE } from '@/lib/calendar-engine/data/planetNames'
import { koStructuralLabels } from '@/lib/llm/koStructuralLabels'
import { SIGN_KO } from '@/lib/astrology/signLabels'

const HOUSE_THEME_KO: Record<number, string> = {
  1: '자아·몸',
  2: '재물·소유',
  3: '소통·이동',
  4: '가정·뿌리',
  5: '연애·창작',
  6: '일·건강',
  7: '관계·파트너',
  8: '위기·변형',
  9: '해외·학문·확장',
  10: '직업·명예',
  11: '인맥·소망',
  12: '내면·고독',
}
const HOUSE_THEME_EN: Record<number, string> = {
  1: 'self·body',
  2: 'wealth·assets',
  3: 'communication·travel',
  4: 'home·roots',
  5: 'romance·creativity',
  6: 'work·health',
  7: 'partnership',
  8: 'crisis·transformation',
  9: 'travel·study·expansion',
  10: 'career·status',
  11: 'network·hopes',
  12: 'inner·solitude',
}

export type Locale = 'ko' | 'en'

// 10행성 + 앵글(ASC/MC) 은 캘린더 엔진 공용 정본(PLANET_KO) 재사용. 교점(Node/
// True Node/North Node=북교점) 은 이 소비처 고유 키라 spread 후 추가.
const PLANET_KO_A: Record<string, string> = {
  ...PLANET_KO_BASE,
  Node: '북교점',
  'True Node': '북교점',
  'North Node': '북교점',
}
// 별자리 KO(long form) — 정본(astrology/signLabels) 재사용. 소비처가 '자리'
// 접미사를 벗겨 짧게 쓰지만 정본 long form 을 인덱싱 후 가공.
const SIGN_KO_A = SIGN_KO
const MAJOR_TYPES = new Set(['conjunction', 'opposition', 'trine', 'square', 'sextile'])
// essential dignity — ko 라벨. EN locale 은 raw enum(domicile/detriment) 유지.
// 의미는 레전드의 [domicile]강 [detriment]약 와 동일, exaltation/fall 은 점성 표준.
const DIGNITY_KO: Record<string, string> = {
  domicile: '강함',
  exaltation: '매우강함',
  detriment: '약함',
  fall: '쇠약',
}
// English saju term maps (EN locale renders the saju side in English too).
// 10개 십신은 SSOT(sibsinLabels) 에서, 일간=Self 는 이 소비처 고유 키라 spread 후 추가.
const SIBSIN_EN: Record<string, string> = {
  ...SIBSIN_EN_BASE,
  일간: 'Self',
}
const ELEM_EN: Record<string, string> = {
  목: 'Wood',
  화: 'Fire',
  토: 'Earth',
  금: 'Metal',
  수: 'Water',
}
const STRENGTH_EN: Record<string, string> = {
  신강: 'strong',
  신약: 'weak',
  극강: 'very strong',
  강: 'strong',
  중강: 'mod. strong',
  중약: 'mod. weak',
  약: 'weak',
  극약: 'very weak',
}
const YTYPE_EN: Record<string, string> = {
  조후용신: 'Climatic',
  병약용신: 'Remedial',
  억부용신: 'Balancing',
  통관용신: 'Mediating',
  전왕용신: 'Dominant',
}
const PERIOD_EN: Record<string, string> = {
  대운: 'Decade',
  세운: 'Annual',
  월운: 'Monthly',
  일진: 'Daily',
}
// 12운성(十二運星) 단계 — EN 로케일에서 한국어가 새지 않도록 영어 라벨 맵.
// getTwelveStagesForPillars(SSOT)는 표준 라벨 임관/왕지를 반환한다 — 별칭
// 건록/제왕 만 키로 두면 임관·왕지가 영어 컨텍스트에 한글로 샜다(둘 다 키로 둠).
const STAGE_EN: Record<string, string> = {
  장생: 'birth',
  목욕: 'bath',
  관대: 'coming-of-age',
  임관: 'prosperity',
  건록: 'prosperity', // 별칭(=임관)
  왕지: 'peak',
  제왕: 'peak', // 별칭(=왕지)
  쇠: 'decline',
  병: 'illness',
  사: 'death',
  묘: 'tomb',
  절: 'void',
  태: 'conception',
  양: 'nurture',
}
// 격국(格局) 영어 라벨 — EN 로케일에서 한글이 새지 않게. 정격 8종은
// SIBSIN_EN strip(식신격→Eating God)으로 충분하지만, 종격/비격/화기격/특수격
// (GeokgukType 의 나머지 19종 + 미정)은 십성이 아니라 strip 으로 못 잡아
// 한글 그대로 샜다(예: "양인격" → "양인 structure"). 특수격만 명시 매핑.
// 라벨은 lifetimeFlow.GEOKGUK_EN 의 표기와 일치시킨다.
const GEOKGUK_SPECIAL_EN: Record<string, string> = {
  종왕격: 'Following-prosperity (Jongwang)',
  종강격: 'Following-strength (Jonggang)',
  종아격: 'Following-output (Jong-a)',
  종재격: 'Following-wealth (Jongjae)',
  종살격: 'Following-officer (Jongsal)',
  건록격: 'Established-rank (Geollok)',
  양인격: 'Yang-blade (Yangin)',
  월겁격: 'Month-rob (Wolgeop)',
  잡기격: 'Mixed (Japgi)',
  갑기화토격: 'Gap-gi Earth-transformation',
  을경화금격: 'Eul-gyeong Metal-transformation',
  병신화수격: 'Byeong-sin Water-transformation',
  정임화목격: 'Jeong-im Wood-transformation',
  무계화화격: 'Mu-gye Fire-transformation',
  곡직격: 'Curving-straight (Gokjik)',
  염상격: 'Blazing-up (Yeomsang)',
  가색격: 'Sowing-reaping (Gasaek)',
  종혁격: 'Following-reform (Jonghyeok)',
  윤하격: 'Flowing-down (Yunha)',
  미정: 'undetermined',
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토']
const WEEKDAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/**
 * 오늘(로컬 날짜) 포함 N일치 일진 간지. queryDate 의 서버(UTC) 날짜가 아니라
 * 호출자가 넘긴 로컬 today({year,month,day}) 기준이라 한국 새벽에도 안 어긋남.
 * 일진은 KST 자정 경계로 계산(getIljinCalendar) — 전통 사주 일진 기준.
 */
function buildIljinWindowBlock(
  dayMaster: DayMaster,
  localToday: { year: number; month: number; day: number },
  days: number,
  locale: Locale
): string {
  const L = (ko: string, en: string) => (locale === 'ko' ? ko : en)
  const sib = (s?: string) => (locale === 'en' ? sibEN(s) : s || '-')
  const pad = (n: number) => String(n).padStart(2, '0')
  const wdNames = locale === 'en' ? WEEKDAY_EN : WEEKDAY_KO
  const lines: string[] = []
  const base = Date.UTC(localToday.year, localToday.month - 1, localToday.day)
  for (let i = 0; i <= days; i++) {
    const dt = new Date(base + i * 86400000)
    const wy = dt.getUTCFullYear()
    const wm = dt.getUTCMonth() + 1
    const wd = dt.getUTCDate()
    const cal = getIljinCalendar(wy, wm, dayMaster)
    const found = cal.find((c) => c.day === wd)
    if (!found) continue
    const wday = wdNames[dt.getUTCDay()]
    const tag = i === 0 ? L('·오늘', '·today') : i === 1 ? L('·내일', '·tomorrow') : ''
    lines.push(
      `${pad(wm)}-${pad(wd)}(${wday}${tag}) ${found.heavenlyStem}${found.earthlyBranch} (${sib(found.sibsin?.cheon)}/${sib(found.sibsin?.ji)})`
    )
  }
  if (!lines.length) return ''
  // 헤더에 십성 anchor 명시 — 각 줄의 (상관/정재) 가 *본인 일간 기준* 임을
  // 분명히. 없으면 LLM 이 "그 날의 stem 의 자체 십성" 으로 오인 가능.
  // DayMaster 는 StemBranchInfo (객체) 이므로 .name 으로 한자 추출.
  const dmName = dayMaster?.name || '?'
  const header = L(
    `## 일진 ${days + 1}일 (괄호 십성 = 본인 일간 ${dmName} 기준 천간/지지)`,
    `## DAILY (${days + 1} days, parens = ten-gods relative to user's day master ${dmName})`
  )
  return `${header}\n${lines.join('\n')}`
}
// branch romanization (pinyin) for English 刑/punishment labels
const BRANCH_PY: Record<string, string> = {
  子: 'Zi',
  丑: 'Chou',
  寅: 'Yin',
  卯: 'Mao',
  辰: 'Chen',
  巳: 'Si',
  午: 'Wu',
  未: 'Wei',
  申: 'Shen',
  酉: 'You',
  戌: 'Xu',
  亥: 'Hai',
}
const RELKIND_EN: Record<string, string> = {
  천간합: 'Stem combine',
  천간충: 'Stem clash',
  지지육합: 'Branch union',
  지지삼합: 'Branch trine',
  지지방합: 'Branch dir.combine',
  지지충: 'Branch clash',
  지지형: 'Branch punishment',
  지지파: 'Branch break',
  지지해: 'Branch harm',
  원진: 'Resentment',
  공망: 'Void',
}
const sibEN = (s?: string | null) => (s ? (SIBSIN_EN[s] ?? s) : '-')
const pkA = (n: string, l: Locale) => (l === 'ko' ? (PLANET_KO_A[n] ?? n) : n)

// facts.pillars 의 평탄 형태(stem/branch + element) → toSajuPillarsLike 의 raw
// 형식으로 변환. SajuFacts SSOT 라 element 도 facts 가 제공.
function factPillarToShinsalInput(p: {
  stem: string
  stemElement: string
  branch: string
  branchElement: string
}) {
  return {
    heavenlyStem: { name: p.stem, element: p.stemElement as never },
    earthlyBranch: { name: p.branch, element: p.branchElement as never },
  }
}

const ELEM: Record<string, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }
const STEM_INFO: Record<string, { el: string; yang: boolean }> = {
  甲: { el: '목', yang: true },
  乙: { el: '목', yang: false },
  丙: { el: '화', yang: true },
  丁: { el: '화', yang: false },
  戊: { el: '토', yang: true },
  己: { el: '토', yang: false },
  庚: { el: '금', yang: true },
  辛: { el: '금', yang: false },
  壬: { el: '수', yang: true },
  癸: { el: '수', yang: false },
}
const GEN: Record<string, string> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
const CTRL: Record<string, string> = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' }
const BRANCH_MAINQI: Record<string, string> = {
  子: '癸',
  丑: '己',
  寅: '甲',
  卯: '乙',
  辰: '戊',
  巳: '丙',
  午: '丁',
  未: '己',
  申: '庚',
  酉: '辛',
  戌: '戊',
  亥: '壬',
}
// astro aspect — 기호 대신 한국어 뜻 직접 노출 (깨진 □ 박스 + LLM 디코드
// 오역 방지; 궁합 포매터와 동일 정책).
const ASP_SYM: Record<string, string> = {
  conjunction: '[결합]',
  sextile: '[협력]',
  square: '[긴장]',
  trine: '[조화]',
  opposition: '[대립]',
}
// EN locale 은 영어 관계어로 — 한국어 라벨이 영어 응답에 새지 않게.
const ASP_EN: Record<string, string> = {
  conjunction: '[conjunction]',
  sextile: '[sextile]',
  square: '[square]',
  trine: '[trine]',
  opposition: '[opposition]',
}
// 형(刑) 판정은 @/lib/saju/hyeong 의 isHyeong 단일 소스를 쓴다 — 본명 합충
// 블록(아래 shown 필터)과 타이밍 교차 블록이 같은 보정 교리를 공유한다.
// (이전엔 이 파일에 HYEONG_PAIR_TRIO/SELF_HYEONG/hyeongPair 가 복붙돼 있어
//  compat sajuSynastryFormatter 의 동일 복사본과 드리프트할 위험이 있었음.)
// 천간합 → 化 element (hangul) + fiveElements key
const STEM_HAP_EL: Record<string, string> = {}
for (const [a, b, el] of [
  ['甲', '己', '토'],
  ['乙', '庚', '금'],
  ['丙', '辛', '수'],
  ['丁', '壬', '목'],
  ['戊', '癸', '화'],
])
  STEM_HAP_EL[[a, b].sort().join('')] = el
const EL2KEY: Record<string, string> = {
  목: 'wood',
  화: 'fire',
  토: 'earth',
  금: 'metal',
  수: 'water',
}
function sibsinOf(day: string, other: string): string {
  const d = STEM_INFO[day],
    o = STEM_INFO[other]
  if (!d || !o) return ''
  const same = d.yang === o.yang
  if (o.el === d.el) return same ? '비견' : '겁재'
  if (GEN[d.el] === o.el) return same ? '식신' : '상관'
  if (GEN[o.el] === d.el) return same ? '편인' : '정인'
  if (CTRL[d.el] === o.el) return same ? '편재' : '정재'
  if (CTRL[o.el] === d.el) return same ? '편관' : '정관'
  return ''
}

export interface DestinyBirth {
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  timezone?: string
  latitude?: number
  longitude?: number
  birthTimeUnknown?: boolean
  birthCityUnknown?: boolean
}

export interface CurrentPeriod {
  seun?: { stem: string; branch: string } | null
  wolun?: { stem: string; branch: string } | null
  iljin?: { stem: string; branch: string } | null
  relations?: Array<{
    source: string
    relation: { kind: string; detail?: string; pillars?: string[] }
  }>
}

function buildInstructions(locale: Locale, dayMasterName?: string): string {
  // 데이터 옆에 둬야 의미가 있는 *legend / anchor* 만 둠. 행동 규칙
  // (jargon ban, tone, fuse rule, safety) 은 SYSTEM_PROMPT 에서 이미 다루므로
  // 여기 중복 X — cached prefix 크기/모순 줄이기.
  if (locale === 'en') {
    return [
      '## LEGEND',
      '- astro symbols: ☌conjunction ⚹sextile □square △trine ☍opposition / R retrograde / (t)current transit / P-Sun, P-Moon = secondary progression / [detriment]=weak [domicile]=strong',
      "- ★ Age anchor: use the [Age today] X line as the *current age*. The [daeun] entries like '31~40 甲戌' are the *start~end range* of that 10-yr cycle, NOT the current age. All ages (daeun, profection, current) are *international age* — the saju/astro stack uses one convention everywhere.",
      `- ★ Ten-gods anchor: every (X/Y) parens in [Timing] (daeun \`32~41 甲戌(now Direct Wealth/Direct Resource)\`, year/month-luck & iljin trailing (X/Y), each row of the daily block) are *ten-gods relative to user's day master ${dayMasterName ?? '?'}* (stem/branch).`,
    ].join('\n')
  }
  return [
    '## 데이터 범례',
    '- 점성 표기: 관계어는 [결합]/[협력]/[긴장]/[조화]/[대립] 그대로 / R역행 / (t)현재트랜짓 / 진행 태양·진행 달=2차진행 / [detriment]약 [domicile]강',
    '- ★ 나이 anchor: [오늘 기준 만나이] 만 X세 를 현재 나이로 사용. [대운] 의 "31~40세 갑술" 은 그 cycle 의 시작~끝 나이지 현재 나이가 아니다. 사주·점성 화면의 모든 나이(대운·프로펙션·현재)는 만 나이로 통일.',
    `- ★ 십성 anchor: [타이밍] 의 모든 (X/Y) 괄호 (대운의 \`32~41세 甲戌(현재 정재/정인)\`, 세운/월운 끝 (X/Y), 일진 블록 각 줄 (X/Y)) 는 *본인 일간 ${dayMasterName ?? '?'} 기준 천간/지지 십성*.`,
  ].join('\n')
}

/**
 * Counselor destiny context, split into two halves so the caller can route
 * each into a different Anthropic prompt block:
 *
 *   - `stable`: birth-data header + ## 사주(natal) + ## 점성(natal) +
 *     instruction rules. No "today" date, no current age, no transits,
 *     no iljin window. Bytes are identical for the same user from now
 *     until they edit their birth profile — ideal cached prefix.
 *
 *   - `daily`: ## 타이밍 (대운/세운/트랜짓/프로펙션) + ## 일진 window +
 *     "today" anchor. Rotates daily (and sub-daily for transits), so it
 *     goes into the volatile userPrompt prefix.
 *
 * Caller is responsible for placing them: stable → cachedUserContext,
 * daily → userPrompt prefix.
 */
export interface DestinyContextSplit {
  stable: string
  daily: string
}

export async function buildDestinyContext(
  birth: DestinyBirth,
  now: Date,
  locale: Locale = 'ko',
  // displayTz 는 더 이상 사용 안 함 — "오늘"은 주입된 now 에서 직접 뽑는다(아래
  // localNow). 호출부 호환을 위해 시그니처에는 남겨 둔다.
  _displayTz?: string
): Promise<DestinyContextSplit> {
  const L = (ko: string, en: string) => (locale === 'ko' ? ko : en)
  // "오늘"은 주입된 now 에서 직접 뽑는다. now 는 ensureCounselorContext 가 사용자
  // tz 기준으로 만든 그날 정오 Date 라, 로컬 필드(getFullYear/Month/Date)가 곧
  // 사용자-tz 날짜다. 예전엔 여기서 getNowInTimezone(wall clock)을 다시 읽어
  // astro(now 사용)와 saju/"오늘"이 서로 다른 시계를 보던 tz·날짜경계 불일치 +
  // 결정론 누수(테스트로 now 고정 불가)가 있었다. now 단일 기준으로 통일.
  const localNow = { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() }
  const year = localNow.year
  const saju = buildSajuSection(birth, locale, year, localNow, now)

  // birth identity header 는 [Meta] 와 중복이라 제거 (route.ts 에서 [Meta]
  // 가 birthDate/birthTime/gender/location/tz/flags 단일 source 로 출력).
  // tz 는 점성 계산용으로만 사용.
  const lat = birth.latitude ?? 37.5665
  const lon = birth.longitude ?? 126.978
  const tz = birth.timezone ?? 'Asia/Seoul'
  const pad = (n: number) => String(n).padStart(2, '0')
  const today = `${localNow.year}-${pad(localNow.month)}-${pad(localNow.day)}`

  let astroNatal = '' // ## 점성 (static natal chart)
  let astroTiming = '' // moves under ## 타이밍 (transits/eclipses/SR/progression/profection)
  try {
    const [Y, M, D] = birth.birthDate.split('-').map(Number)
    const [h, mi] = (birth.birthTime || '00:00').split(':').map(Number)
    // ── 재료 준비실 ──
    // 옛 코드는 raw 호출(calculateNatalChart/findNatalAspects/dignityOf/
    // calculateProfection) + 어스펙트 분류 + 포매팅을 한 try 블록에서 다 했음.
    // 2026-06-06 분리:
    //   - collectAstroFacts → 순수 데이터 객체 (planets/aspects/profection)
    //   - 아래 코드는 그 facts 를 텍스트로 포매팅
    const aFacts = await collectAstroFacts(
      {
        birthDate: birth.birthDate,
        birthTime: birth.birthTime,
        latitude: lat,
        longitude: lon,
        timezone: tz,
        birthTimeUnknown: birth.birthTimeUnknown,
        birthCityUnknown: birth.birthCityUnknown,
      },
      now
    )
    if (!aFacts) throw new Error('astro facts unavailable')

    // chart / natal raw 는 facts 의 escape hatch 에서 받음 — 별도 raw 재호출 없음.
    // formatAstroSelf 가 옛 chart 인스턴스를 요구해서 _chart 로 그대로 넘긴다.
    const chart = aFacts._chart
    const sgn = (s: string) => (locale === 'ko' ? (SIGN_KO_A[s] ?? s).replace(/자리$/, '') : s)
    const pl = (n: string) =>
      n === 'Ascendant'
        ? locale === 'ko'
          ? '상승점'
          : 'ASC'
        : n === 'MC'
          ? locale === 'ko'
            ? '중천점'
            : 'MC'
          : pkA(n, locale)

    const placeUnreliable = aFacts.natal.placeUnreliable
    const posLines: string[] = []
    for (const p of aFacts.natal.planets) {
      // ko 면 dignity 도 한국어로 (모델이 영어 enum 을 못 보게). EN 은 raw 유지.
      const dgTag =
        p.dignity !== 'peregrine'
          ? ` [${locale === 'ko' ? (DIGNITY_KO[p.dignity] ?? p.dignity) : p.dignity}]`
          : ''
      const houseTag = placeUnreliable ? '' : ` H${p.house}`
      posLines.push(`  ${pl(p.name)} ${sgn(p.sign)}${houseTag}${p.retrograde ? ' R' : ''}${dgTag}`)
    }
    if (!placeUnreliable) {
      posLines.push(
        `  ${pl('Ascendant')} ${sgn(aFacts.natal.ascendant.sign)}`,
        `  ${pl('MC')} ${sgn(aFacts.natal.mc.sign)}`
      )
    }

    const aspMap = locale === 'en' ? ASP_EN : ASP_SYM
    const fmtAsp = (a: { from: string; to: string; type: string; orb: number }) =>
      `  ${pl(a.from)} ${aspMap[a.type] ?? a.type} ${pl(a.to)} ${a.orb.toFixed(1)}°`
    const strong = aFacts.aspects.strong.map(fmtAsp)
    const mid = aFacts.aspects.mid.map(fmtAsp)

    // current (transits / eclipses / solar return / progression) via astroSlim v2
    const block = await formatAstroSelf({
      chart,
      latitude: lat,
      longitude: lon,
      timeZone: tz,
      now,
      natalInput: {
        year: Y,
        month: M,
        date: D,
        hour: h,
        minute: mi,
        latitude: lat,
        longitude: lon,
        timeZone: tz,
      },
      // ASC/MC/하우스는 정확한 출생시각 *과* 출생지 둘 다 필요 → 둘 중 하나라도
      // 미상이면 각을 건너뛴다. 이전엔 birthCityUnknown 만 봤어서, 출생지는
      // 알고 시간만 모르는 경우 midnight 폴백 ASC 기반 하우스/각이 새어나갔다.
      skipAngles: placeUnreliable,
    })
    const cur = slimAstroSelf(block, { locale, year }).trim()

    // Profection — facts.profection 에서 raw 값 받아 포매팅만.
    const prof = aFacts.profection
    let profLine = ''
    if (prof) {
      const lp = prof.lordPlacement
      const lordRes = lp?.sign ? ` (${sgn(lp.sign)}${lp.house ? ` H${lp.house}` : ''})` : ''
      const lordKo = placeUnreliable ? '' : `, Lord ${pkA(prof.lordOfYear, 'ko')}${lordRes}`
      const lordEn = placeUnreliable ? '' : `, Lord ${prof.lordOfYear}${lordRes}`
      profLine = L(
        `프로펙션 (만 ${prof.age}세 기준): H${prof.activatedHouse} 활성 (${HOUSE_THEME_KO[prof.activatedHouse]})${lordKo}`,
        `Profection (age ${prof.age} basis): H${prof.activatedHouse} active (${HOUSE_THEME_EN[prof.activatedHouse]})${lordEn}`
      )
    }

    astroNatal = [
      L('## 점성', '## ASTRO'),
      '',
      L('행성 (사인·하우스·디그니티):', 'planets (sign·house·dignity):'),
      ...posLines,
      '',
      ...(strong.length ? [L('본명 강한각 (0-2°):', 'natal strong (0-2°):'), ...strong] : []),
      ...(mid.length ? [L('본명 중간각 (2-5°):', 'natal mid (2-5°):'), ...mid] : []),
    ].join('\n')
    astroTiming = [cur, profLine].filter(Boolean).join('\n')
  } catch (err) {
    // 점성 실패 시 silent fallback 이면 운영에서 사용자가 "사주만" 답변을
    // 받아도 아무도 모름. 최소한 warn 으로 남겨 모니터링 가능하게.
    // (console.* 금지 — CLAUDE.md 컨벤션에 맞춰 @/lib/logger 사용.)
    logger.warn('[buildDestinyContext] astro section build failed', {
      err: err instanceof Error ? err.message : String(err),
    })
  }

  // === STABLE (cached prefix) ===
  // 출생 메타 + 본명 사주 + 본명 점성 + 규칙. 사용자가 birth profile 을
  // 바꾸지 않는 한 동일한 바이트 → Anthropic prompt cache 가 평생 hit.
  const stable =
    [saju.natal, astroNatal, buildInstructions(locale, saju.dayMasterName)]
      .filter(Boolean)
      .join('\n\n')
      .trim() + '\n'

  // === DAILY (userPrompt prefix, 휘발성) ===
  // ## 타이밍(대운/세운/트랜짓/프로펙션) + ## 일진 윈도우 + today 앵커.
  // 매일(또는 트랜짓 정밀도에 따라 sub-daily) 변하므로 cached prefix 에
  // 두면 안 됨. 매 턴 새로 만들어 userPrompt 앞에 붙인다.
  const timingBody = [saju.timing, astroTiming].filter(Boolean).join('\n')
  // 타이밍 헤더에 날짜 반복 X — 바로 위 `# 오늘: YYYY-MM-DD` 가 이미 동일
  // 날짜 anchor 제공. 두 곳에 똑같이 출력하면 dup.
  const timing = timingBody ? `${L('## 타이밍', '## TIMING')}\n\n${timingBody}` : ''
  const dailyAnchor = L(`# 오늘: ${today}`, `# Today: ${today}`)
  const daily = [dailyAnchor, timing, saju.iljinWindow].filter(Boolean).join('\n\n').trim() + '\n'

  // KO: 남은 영어 구조 태그/전문용어(cross/[CRITICAL]/SR/Lord/orb 등)를 한글로.
  // 한국어 사용자에겐 한국어 데이터만 — EN 경로는 손대지 않아 영어 유지.
  if (locale === 'ko') {
    return { stable: koStructuralLabels(stable), daily: koStructuralLabels(daily) }
  }
  return { stable, daily }
}

function buildSajuSection(
  birth: DestinyBirth,
  locale: Locale = 'ko',
  year?: number,
  localNow?: { year: number; month: number; day: number },
  // 주입된 "지금" — 대운/세운/월운·만나이 계산의 기준. collectSajuFacts →
  // calculateSajuData 로 끝까지 전달돼야 원국을 제외한 시간 의존 값이 now 와
  // 일치하고 테스트로 고정 가능하다. 없으면 호출 시점(new Date()).
  now: Date = new Date()
): { natal: string; timing: string; iljinWindow: string; dayMasterName: string } {
  const tz = birth.timezone ?? 'Asia/Seoul'
  // ── 재료 준비실 ──
  // 옛 코드는 raw 호출(calculateSajuData/Strength/Geokguk/Yongsin/Relations) +
  // 텍스트 포매팅을 한 함수에서 다 했음. 2026-06-06 분리:
  //   - collectSajuFacts → 순수 데이터 객체 (다른 서비스도 같이 받아씀)
  //   - 아래 코드는 그 facts 를 텍스트로 포매팅하는 부분만 담당
  // daeWoon / shinsal 은 아직 facts 에 없어 raw saju 한 번 더 가져옴 (LRU cache hit).
  const facts = collectSajuFacts({
    birthDate: birth.birthDate,
    birthTime: birth.birthTime,
    gender: birth.gender,
    timezone: tz,
    longitude: birth.longitude,
    now,
  })
  // 현재 운(세운/월운/일진 + 본명 대비 충/합) — fusion 우회 없이 facts._raw 에서
  // 직접 계산. _raw 는 longitude 진경도 보정이 적용된 결과라, 현재 운도 본명과
  // 같은 평균태양시 기준이 된다. (예전엔 route 가 fusion saju adapter 로 만들어
  // 주입했고, 그건 longitude 를 안 넘겨 KST LMT 로 떨어지던 불일치가 있었다.)
  const current: CurrentUnse | null = localNow
    ? computeCurrentUnse(
        facts._raw,
        new Date(localNow.year, localNow.month - 1, localNow.day, 12, 0, 0)
      )
    : null
  // 옛 코드는 calculateSajuData 를 sajuFacts 안에서 한 번 + 여기서 daeWoon/
  // pillars 위한 raw 한 번 = 두 번 호출했음 (LRU cache hit 으로 무료지만 코드
  // 스멜). Phase C(2026-06-06): facts.pillars/dayMaster/fiveElements/daeun
  // 직접 사용으로 raw 호출 1개 제거. shinsal 입력 만들 때는 facts.pillars
  // → toSajuPillarsLike 형식으로 변환.
  const day = facts.pillars.day.stem

  const strengthLabel = facts.strength
  const geok = facts.geokguk ?? ''
  const y = facts.yongsin
  const rel = facts.relations
  const gwansalHonjap = facts.gwansalHonjap

  const L = (ko: string, en: string) => (locale === 'ko' ? ko : en)
  const plab: Record<string, string> =
    locale === 'en'
      ? { year: 'Y', month: 'M', day: 'D', time: 'H' }
      : { year: '년', month: '월', day: '일', time: '시' }
  const PMAP: Record<string, string> =
    locale === 'en'
      ? { 년: 'Y', 월: 'M', 일: 'D', 시: 'H' }
      : { 년: '년', 월: '월', 일: '일', 시: '시' }
  const out: string[] = []
  out.push(L('## 사주', '## SAJU'), '')

  // day master: stem(yin/yang+element) strength rootedness(통근)
  const dm = facts.dayMaster
  const dmElDisp = dm.element
    ? locale === 'en'
      ? (ELEM_EN[dm.element] ?? dm.element)
      : dm.element
    : ''
  const yinyang = dm.yinYang === '음' ? L('음', 'yin') : L('양', 'yang')
  const strLab = locale === 'en' ? (STRENGTH_EN[strengthLabel] ?? strengthLabel) : strengthLabel
  // 통근 — facts.dayMaster.rooted 가 이미 계산 (sajuFacts.ts SSOT).
  const rootLab =
    locale === 'en' ? (dm.rooted ? 'rooted' : 'rootless') : dm.rooted ? '유근' : '무근'
  out.push(`${L('일간', 'day_master')}: ${dm.name}(${yinyang}${dmElDisp}) ${strLab} ${rootLab}`)
  const fe = facts.fiveElements
  out.push(
    `${L('오행', 'elements')}: 木${fe.wood} 火${fe.fire} 土${fe.earth} 金${fe.metal} 水${fe.water}`
  )

  // 용신 (engine-honest; hanja elements KO / English EN; 仇 only when 忌 present)
  if (y?.primaryYongsin) {
    const ge = (e?: string) => (e ? (locale === 'en' ? (ELEM_EN[e] ?? e) : (ELEM[e] ?? e)) : '')
    const ytAbbr = y.yongsinType
      ? locale === 'en'
        ? (YTYPE_EN[y.yongsinType] ?? y.yongsinType)
        : y.yongsinType.replace(/용신$/, '')
      : ''
    const extras = [
      y.secondaryYongsin ? `${L('喜', 'fav')}:${ge(y.secondaryYongsin)}` : '',
      y.kibsin ? `${L('忌', 'foe')}:${ge(y.kibsin)}` : '',
      y.kibsin && y.gusin ? `${L('仇', 'rival')}:${ge(y.gusin)}` : '',
    ]
      .filter(Boolean)
      .join(' ')
    out.push(
      `${L('용신', 'yongsin')}: ${ge(y.primaryYongsin)}${ytAbbr ? `(${ytAbbr})` : ''}${extras ? ` | ${extras}` : ''}`
    )
  }
  // 조후용신 (계절 균형 보조 신호) — 격국용신 옆에 한 줄. 단 균형이 좋아
  // 조후 결핍이 적은 사주(rating 1~3)는 노이즈가 되므로 rating 4 이상 (한
  // 겨울/한여름 같은 강한 계절 결핍) 만 노출. 격국용신과 우선순위가 헷갈리지
  // 않게 "(보조·계절)" 라벨로 명시.
  const johu = facts.johuYongsin
  if (johu && johu.rating >= 4) {
    const ge2 = (e?: string) => (e ? (locale === 'en' ? (ELEM_EN[e] ?? e) : (ELEM[e] ?? e)) : '')
    const climate = locale === 'en' ? johu.climate_en : johu.climate
    out.push(
      `${L('조후(보조·계절)', 'climate(aux)')}: ${ge2(johu.primaryYongsin)} (${climate}, ${johu.rating}/5)`
    )
  }
  if (geok) {
    // 특수격(GEOKGUK_SPECIAL_EN) 우선, 없으면 정격(십성)으로 strip.
    const bare = geok.replace(/격$/, '')
    const geokEn = `${GEOKGUK_SPECIAL_EN[geok] ?? SIBSIN_EN[bare] ?? bare} structure`
    out.push(`${L('격국', 'geokguk')}: ${locale === 'en' ? geokEn : geok}`)
  }
  if (gwansalHonjap)
    out.push(
      L(
        '참고: 官殺混雜 (정관+편관 동존)',
        'note: Officer-Killings Mix (Direct Officer + Seven Killings)'
      )
    )
  out.push('')

  // 기둥 (bare 십성, no gloss / no pipe)
  out.push(L('기둥:', 'pillars:'))
  const bareSib = (t?: string | null) =>
    !t || t === '-' ? (t ?? '-') : locale === 'en' ? (SIBSIN_EN[t] ?? t) : t
  for (const k of ['year', 'month', 'day', 'time'] as const) {
    const p = facts.pillars[k]
    const ss = k === 'day' ? (locale === 'en' ? 'Self' : '일간') : bareSib(p.stemSibsin)
    out.push(`  ${plab[k]} ${p.stem}${p.branch} ${ss}/${bareSib(p.branchSibsin)}`)
  }
  out.push('')

  // 지장간 (stems only)
  out.push(L('지장간:', 'hidden_stems:'))
  for (const k of ['year', 'month', 'day', 'time'] as const) {
    const p = facts.pillars[k]
    if (p.jijanggan.length) out.push(`  ${p.branch}: ${p.jijanggan.join('·')}`)
  }
  out.push('')

  // 합충: 공망 → combine(삼합/육합/방합/합) → clash(충/형/해/원진)
  const BRANCH_RE = /[子丑寅卯辰巳午未申酉戌亥]/g
  const combineRels = rel.filter((r) => /삼합|육합|방합|합화/.test(r.kind))
  const combinedBranches = new Set<string>()
  for (const r of combineRels)
    for (const ch of (r.detail || '').match(BRANCH_RE) ?? []) combinedBranches.add(ch)
  const parseRel = (kind: string, detail: string) => {
    const m = (detail || '').match(
      /^(.+?)\s*(삼합|육합|방합|합화|충|형|파|해|원진|합)(?:\(?([목화토금수])\)?)?/
    )
    const entities = (m ? m[1] : detail || '').replace(/·/g, '').trim()
    const word = m ? m[2] : kind.replace(/^(지지|천간)/, '')
    const el = m ? (m[3] ?? '') : ''
    return { entities, word, el }
  }
  const shown = rel.filter((r) => {
    if (r.kind === '지지파') return false
    // 엔진(relations.ts)은 삼형 세트의 임의 두 지지를 형으로 잡아 丑未/寅申
    // (충 only)까지, 자형도 12지 전부를 형으로 표기한다. 타이밍 교차 블록과
    // 동일한 보정 교리(isHyeong)로 본명 형도 걸러 두 블록이 일관되게 한다.
    if (r.kind === '지지형') {
      const bs = (r.detail || '').match(BRANCH_RE) ?? []
      const [b0, b1] = bs
      if (b0 != null && b1 != null && !isHyeong(b0, b1)) return false
    }
    return true
  })
  if (shown.length) {
    out.push(L('합충:', 'combos:'))
    const gong: string[] = [],
      combos: string[] = []
    const clashGroups = new Map<string, { entities: string; word: string; tags: string[] }>()
    for (const r of shown) {
      if (r.kind === '공망') {
        const vb = (r.detail || '').match(/[子丑寅卯辰巳午未申酉戌亥]/)?.[0] || ''
        const pill =
          Array.isArray(r.pillars) && r.pillars.length
            ? r.pillars.map((p) => plab[p] ?? p).join('·')
            : ''
        let note = ''
        if (vb && combinedBranches.has(vb)) {
          if (locale === 'ko') {
            const toks = combineRels
              .filter((cr) => (cr.detail || '').includes(vb))
              .map((cr) => {
                const pr = parseRel(cr.kind, cr.detail || '')
                return `${pr.entities.replace(/-/g, '')}${pr.word === '육합' ? '합' : pr.word}`
              })
            note = ` — ${toks.join('·')} 동시참여로 회복`
          } else note = ' — partly restored (joins union/trine)'
        }
        gong.push(`  ${L('공망', 'Void')} ${vb}[${pill}]${note}`)
        continue
      }
      const pr = parseRel(r.kind, r.detail || '')
      const wordDisp = locale === 'en' ? (RELKIND_EN[r.kind] ?? pr.word) : pr.word
      if (/충|형|파|해|원진/.test(pr.word)) {
        const key = `${pr.entities}|${pr.word}`
        const tag =
          Array.isArray(r.pillars) && r.pillars.length
            ? r.pillars.map((p) => plab[p] ?? p).join('↔')
            : ''
        const g = clashGroups.get(key) ?? { entities: pr.entities, word: wordDisp, tags: [] }
        if (tag) g.tags.push(tag)
        clashGroups.set(key, g)
      } else {
        const elDisp = pr.el
          ? locale === 'en'
            ? (ELEM_EN[pr.el] ?? pr.el)
            : (ELEM[pr.el] ?? pr.el)
          : ''
        combos.push(`  ${pr.entities} ${wordDisp}${elDisp ? ` → ${elDisp}` : ''}`)
      }
    }
    out.push(...gong, ...combos)
    for (const g of clashGroups.values())
      out.push(`  ${g.entities} ${g.word}${g.tags.length ? ` [${g.tags.join(', ')}]` : ''}`)
    out.push('')
  }

  // 신살 — 엔진이 계산한 hit 전체 출력 (관계·매력·길흉·통근 답에 자주
  // 필요). 화이트리스트로 노이즈 신살 (공망은 [합충] 에 이미 있어 제외)
  // 만 빼고 짧은 의미 라벨로 압축.
  try {
    // facts.pillars 에서 toSajuPillarsLike 형식으로 변환 (element 평탄화됨).
    const pillarsLike = toSajuPillarsLike({
      yearPillar: factPillarToShinsalInput(facts.pillars.year),
      monthPillar: factPillarToShinsalInput(facts.pillars.month),
      dayPillar: factPillarToShinsalInput(facts.pillars.day),
      timePillar: factPillarToShinsalInput(facts.pillars.time),
    })
    const allHits = getShinsalHits(pillarsLike, {
      includeGeneralShinsal: true,
      includeLuckyDetails: true,
    }) as Array<{ kind?: string; pillars?: string[] }>
    const SHINSAL_LABEL: Record<string, string> = {
      도화: '매력·이성',
      홍염살: '색기·끌림',
      백호: '격정·강렬',
      괴강: '카리스마·강고',
      양인: '날카로움·과격',
      귀문관: '집착·예민',
      원진: '미묘한 반감',
      고신: '고독 기질',
      과숙: '고독 기질(여)',
      금여성: '배우자 복·기품',
      천덕귀인: '보호·덕',
      월덕귀인: '보호·덕',
      천을귀인: '귀인 보호',
      태극귀인: '숨은 길성',
      암록: '숨은 부조',
      문창귀인: '학문·창작',
      학당귀인: '학문',
      문곡: '글재능',
      천주귀인: '의식주 안정',
      건록: '자기 기반',
      제왕: '정점·고집',
      화개: '예술·종교·고독',
      역마: '이동·변동',
      장성: '권력·리더',
      지살: '이동',
      망신: '관재·구설',
      천라지망: '걸림·답답',
      // 공망은 [합충] 에 이미 출력 → 여기선 skip
    }
    // EN locale: 한국어 신살명은 영어 사용자에게 의미가 없으니 이름은 음역,
    // 라벨은 영어 뜻으로 — 한국어가 영어 응답에 새지 않게.
    const SHINSAL_EN: Record<string, { name: string; mean: string }> = {
      도화: { name: 'Dohwa', mean: 'charm, allure' },
      홍염살: { name: 'Hongyeom', mean: 'sensual magnetism' },
      백호: { name: 'Baekho', mean: 'intense, fierce' },
      괴강: { name: 'Goegang', mean: 'charisma, force' },
      양인: { name: 'Yangin', mean: 'sharp, aggressive' },
      귀문관: { name: 'Gwimun', mean: 'obsessive, sensitive' },
      원진: { name: 'Wonjin', mean: 'subtle aversion' },
      고신: { name: 'Gosin', mean: 'solitary streak' },
      과숙: { name: 'Gwasuk', mean: 'solitary streak (female)' },
      금여성: { name: 'Geumyeo', mean: 'spouse fortune, grace' },
      천덕귀인: { name: 'Cheondeok', mean: 'protection, virtue' },
      월덕귀인: { name: 'Woldeok', mean: 'protection, virtue' },
      천을귀인: { name: 'Cheoneul', mean: 'noble protection' },
      태극귀인: { name: 'Taegeuk', mean: 'hidden fortune' },
      암록: { name: 'Amrok', mean: 'hidden support' },
      문창귀인: { name: 'Munchang', mean: 'study, creativity' },
      학당귀인: { name: 'Hakdang', mean: 'scholarship' },
      문곡: { name: 'Mungok', mean: 'writing talent' },
      천주귀인: { name: 'Cheonju', mean: 'material stability' },
      건록: { name: 'Geollok', mean: 'self-foundation' },
      제왕: { name: 'Jewang', mean: 'peak, stubborn' },
      화개: { name: 'Hwagae', mean: 'art, spirituality, solitude' },
      역마: { name: 'Yeokma', mean: 'movement, change' },
      장성: { name: 'Jangseong', mean: 'authority, leadership' },
      지살: { name: 'Jisal', mean: 'relocation' },
      망신: { name: 'Mangsin', mean: 'legal/gossip trouble' },
      천라지망: { name: 'Cheollajimang', mean: 'entanglement, stuck' },
    }
    const POS_EN: Record<string, string> = { year: 'Y', month: 'M', day: 'D', time: 'H' }
    const isEn = locale === 'en'
    const SKIP = new Set(['공망', '삼재']) // 삼재 는 시기성 신살, 본명 컨텍스트 약함
    const hits: string[] = []
    for (const h of allHits) {
      const kind = h?.kind
      if (!kind || SKIP.has(kind) || !(kind in SHINSAL_LABEL)) continue
      const loc = (h.pillars ?? [])
        .map((p) =>
          isEn ? (POS_EN[p] ?? p) : ({ year: '년', month: '월', day: '일', time: '시' }[p] ?? p)
        )
        .join('·')
      if (isEn) {
        const en = SHINSAL_EN[kind]
        hits.push(en ? `${en.name}(${loc}, ${en.mean})` : `${kind}(${loc})`)
      } else {
        hits.push(`${kind}(${loc}, ${SHINSAL_LABEL[kind]})`)
      }
    }
    if (hits.length) out.push(`${L('신살', 'sinsal')}: ${hits.join(' / ')}`)
  } catch {
    /* */
  }

  // 12운성 — 일간 기준 각 기둥의 wāngshuāi 단계. "신약 무근" 의 디테일.
  try {
    // facts.pillars 에서 toSajuPillarsLike 형식으로 변환 (element 평탄화됨).
    const pillarsLike = toSajuPillarsLike({
      yearPillar: factPillarToShinsalInput(facts.pillars.year),
      monthPillar: factPillarToShinsalInput(facts.pillars.month),
      dayPillar: factPillarToShinsalInput(facts.pillars.day),
      timePillar: factPillarToShinsalInput(facts.pillars.time),
    })
    const stages = getTwelveStagesForPillars(pillarsLike, 'day')
    if (stages) {
      // EN 로케일에선 단계명도 영어로 — 이전엔 stages[k] (장생/목욕…) 와
      // 괄호 anchor '(일간 X 기준)' 가 한국어 그대로 영어 컨텍스트에 새었다.
      const stg = (s: string) => (locale === 'en' ? (STAGE_EN[s] ?? s) : s)
      const parts = (['year', 'month', 'day', 'time'] as const)
        .map((k) => `${plab[k]}${stg(stages[k])}`)
        .join('·')
      out.push(
        `${L('12운성', '12-stages')}${L(`(일간 ${day} 기준)`, `(rel. to day master ${day})`)}: ${parts}`
      )
    }
  } catch {
    /* */
  }

  // 십성 분포 — 비견·식상·재성·관성·인성 합산. "내 성격" / "어떤 일에
  // 강해?" 답에 핵심. 7 칸 (3 천간 [일간 본인 제외] + 4 지지 본기) 중
  // each 카운트. 일주 천간은 *일간 자체* 라 십성 X (정통 사주 컨벤션).
  // 기둥 라인에서도 "일 辛未 일간/편인" 처럼 일간 라벨이 비견 아님.
  try {
    const tally: Record<string, number> = {}
    for (const k of ['year', 'month', 'day', 'time'] as const) {
      const p = facts.pillars[k]
      if (k !== 'day') {
        const s = sibsinOf(day, p.stem)
        if (s && s !== '-') tally[s] = (tally[s] ?? 0) + 1
      }
      const b = sibsinOf(day, BRANCH_MAINQI[p.branch] ?? '')
      if (b && b !== '-') tally[b] = (tally[b] ?? 0) + 1
    }
    if (Object.keys(tally).length) {
      const order = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인']
      const present = order.filter((o) => tally[o])
      // EN: 영어 십신명은 띄어쓰기가 있어 ' / ' 로 구분 (KO 는 기존 압축 포맷 유지).
      const body =
        locale === 'en'
          ? present.map((o) => `${SIBSIN_EN[o] ?? o} ${tally[o]}`).join(' / ')
          : present.map((o) => `${o}${tally[o]}`).join(' ')
      out.push(`${L('십성 분포', 'ten-gods dist')}: ${body}`)
    }
  } catch {
    /* */
  }

  // ── timing (대운 흐름 + 세운 + 교차) — returned separately for the ## 타이밍 block
  const timing: string[] = []
  const cur = facts.daeun.current
  const dlist = facts.daeun.list
  const sib1 = (s?: string | null) => (locale === 'en' ? sibEN(s) : s || '-')
  // 대운 흐름 (full timeline, current marked with its 십성) — prevents the LLM
  // from inventing past/future 대운 ages it can't see.
  // 나이 표기는 시작~끝 범위로. 단순 `32甲戌` 이면 LLM 이 "현재 32세 갑술
  // 대운 중" 으로 오인용 (compat 의 동일 버그와 같은 클래스). 10년 cycle
  // 임을 데이터 자체로 명시.
  const ys = locale === 'en' ? '' : '세' // age suffix — EN 은 만나이 숫자만(한국어 '세' 누수 방지)
  if (dlist.length) {
    const tl = dlist.map((d, i) => {
      const nextAge = dlist[i + 1]?.age
      const ageLabel =
        typeof d.age === 'number'
          ? typeof nextAge === 'number'
            ? `${d.age}~${nextAge - 1}${ys}`
            : `${d.age}${ys}~`
          : `?${ys}`
      const gz = `${ageLabel} ${d.heavenlyStem}${d.earthlyBranch}`
      return cur && d.age === cur.age
        ? `${gz}(${L('현재 ', 'now ')}${sib1(d.sibsin?.cheon)}/${sib1(d.sibsin?.ji)})`
        : gz
    })
    timing.push(`${L('대운', 'daeun')}: ${tl.join(' / ')}`)
  } else if (cur) {
    const endAge = typeof cur.age === 'number' ? `${cur.age}~${cur.age + 9}${ys}` : `?${ys}`
    timing.push(
      `${L('대운', 'daeun')} ${endAge}: ${cur.heavenlyStem}${cur.earthlyBranch} ${sib1(cur.sibsin?.cheon)}/${sib1(cur.sibsin?.ji)}`
    )
  }
  // 세운 / 월운 / 일진 lines (세운 carries the year)
  const periodLine = (label: string, v: { stem: string; branch: string }, withYear?: number) => {
    const s = sibsinOf(day, v.stem),
      b = sibsinOf(day, BRANCH_MAINQI[v.branch] ?? '')
    const honjap = (s === '정관' || s === '편관') && (b === '정관' || b === '편관') && s !== b
    const hj = honjap ? (locale === 'en' ? ' = Officer-Killings Mix' : ' = 관살혼잡') : ''
    const pair = s || b ? ` (${sib1(s)}/${sib1(b)}${hj})` : ''
    return `${label}${withYear ? ` ${withYear}` : ''} ${v.stem}${v.branch}${pair}`.replace(
      /\s{2,}/g,
      ' '
    )
  }
  // 세운 라벨의 연도는 절기 기준 사주연(getSajuYearForDate)이라야 간지와 맞는다.
  // current.seun 간지는 입춘 경계로 산출되는데(currentUnse), 라벨만 Gregorian
  // year 를 쓰면 1/1~입춘 구간에서 "2026 乙巳(=2025 간지)" 처럼 어긋났다.
  if (current?.seun)
    timing.push(periodLine(L('세운', 'Annual'), current.seun, getSajuYearForDate(now)))
  if (current?.wolun) timing.push(periodLine(L('월운', 'Monthly'), current.wolun))
  // 일진 standalone 라인은 `## 일진 8일` 블록 첫 줄(`05-28(오늘) X (X/X)`)
  // 과 동일 정보라 잉여. 교차 lines (`일진X ↔ ...`) 는 인라인으로 branch 를
  // 가지고 있어 standalone 없어도 해독 가능. 토큰 절약 + DRY.
  // 교차 — 대운·세운·월운·일진, flat, kind-after
  {
    const relsBy = (src: string) => (current?.relations ?? []).filter((r) => r.source === src)
    const natalBr: Array<[string, string]> = [
      ['년', facts.pillars.year.branch],
      ['월', facts.pillars.month.branch],
      ['일', facts.pillars.day.branch],
      ['시', facts.pillars.time.branch],
    ]
    const sp = locale === 'en' ? ' ' : ''
    const arrow = (s: string) =>
      locale === 'en'
        ? s
            .replace(/ - year/g, ' ↔ Y')
            .replace(/ - month/g, ' ↔ M')
            .replace(/ - day/g, ' ↔ D')
            .replace(/ - time/g, ' ↔ H')
        : s
            .replace(/ - year/g, ' ↔ 년')
            .replace(/ - month/g, ' ↔ 월')
            .replace(/ - day/g, ' ↔ 일')
            .replace(/ - time/g, ' ↔ 시')
    const hwaNote = (detail: string): string => {
      const stems = (detail.match(/[甲乙丙丁戊己庚辛壬癸]/g) ?? []).slice(0, 2)
      if (stems.length < 2) return ''
      const el = STEM_HAP_EL[stems.sort().join('')]
      if (!el) return ''
      const cnt = (fe as Record<string, number>)[EL2KEY[el]] ?? 0
      const H = locale === 'en' ? (ELEM_EN[el] ?? el) : (ELEM[el] ?? el)
      if (cnt <= 1)
        return locale === 'en' ? ` (combine→${H}, may not complete)` : ` (合${H}, 化미완 가능)`
      return locale === 'en' ? ` (combine→${H})` : ` (合化${H})`
    }
    const shortK = (kind: string) =>
      locale === 'en' ? (RELKIND_EN[kind] ?? kind) : kind.replace(/^(지지|천간)/, '')
    const hyeongTag = (a: string, b: string) =>
      locale === 'en'
        ? `(${a}${b}刑 / ${BRANCH_PY[a] ?? a}-${BRANCH_PY[b] ?? b} Punishment)`
        : `(${a}${b}刑)`
    const crossLines: string[] = []
    const pBranch: Record<string, string | undefined> = {
      대운: cur?.earthlyBranch ?? undefined,
      세운: current?.seun?.branch,
      월운: current?.wolun?.branch,
      일진: current?.iljin?.branch,
    }
    for (const [k, src] of [
      ['대운', 'daeun'],
      ['세운', 'seun'],
      ['월운', 'wolun'],
      ['일진', 'iljin'],
    ] as const) {
      const pfx = locale === 'en' ? (PERIOD_EN[k] ?? k) : k
      const br = pBranch[k]
      if (br)
        for (const [lab, nb] of natalBr)
          if (isHyeong(br, nb)) {
            crossLines.push(
              `  ${pfx}${sp}${br} ↔ ${locale === 'en' ? (PMAP[lab] ?? lab) : lab}${sp}${nb} ${shortK('지지형')} ${hyeongTag(br, nb)}`
            )
          }
      const grp = new Map<
        string,
        { luck: string; nat: string; word: string; note: string; pills: string[] }
      >()
      for (const r of relsBy(src)) {
        const d = arrow(r.relation.detail || '')
        const note = r.relation.kind === '천간합' ? hwaNote(r.relation.detail || '') : ''
        const m = d.match(/^(?:운|luck) (\S+) ↔ (Y|M|D|H|년|월|일|시) (\S+)$/)
        if (!m) continue
        const key = `${r.relation.kind}|${m[1]}|${m[3]}|${note}`
        const g = grp.get(key) ?? {
          luck: m[1],
          nat: m[3],
          word: shortK(r.relation.kind),
          note,
          pills: [],
        }
        g.pills.push(m[2])
        grp.set(key, g)
      }
      for (const g of grp.values())
        crossLines.push(
          `  ${pfx}${sp}${g.luck} ↔ ${g.pills.join('·')}${sp}${g.nat} ${g.word}${g.note}`
        )
    }
    if (crossLines.length) {
      timing.push(L('교차:', 'cross:'))
      timing.push(...crossLines)
    }
  }

  const iljinWindow = localNow
    ? buildIljinWindowBlock(facts.dayMaster as unknown as DayMaster, localNow, 7, locale)
    : ''

  return {
    natal:
      out
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim() + '\n',
    timing: timing
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
    iljinWindow,
    dayMasterName: facts.dayMaster.name,
  }
}
