/**
 * 운(대운/세운/월운/일운) 갑자 조립 + 운끼리 충·합·형 관계 — 엔진 공용.
 *
 * 캘린더 v3(yearlyDates)에서 추출. 점수 로직과 무관한 순수 사주 갑자 math라
 * v3·v2 어느 엔진에서든 같은 결과로 재사용한다. DailyFlowCard의 "대운/세운/
 * 월운/일진 흐름"과 "충/합/형" 칩이 이 모듈 한 곳에서 나온다.
 */

// ── 천간/지지 기본 ──
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const STEM_YIN: Record<string, boolean> = {
  甲: false,
  乙: true,
  丙: false,
  丁: true,
  戊: false,
  己: true,
  庚: false,
  辛: true,
  壬: false,
  癸: true,
}
const STEM_TO_KO_ELEMENT: Record<string, string> = {
  甲: '목',
  乙: '목',
  丙: '화',
  丁: '화',
  戊: '토',
  己: '토',
  庚: '금',
  辛: '금',
  壬: '수',
  癸: '수',
}
const BRANCHES_BY_INDEX = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

// ── 관계 상수 ──
const STEM_HAP_PARTNER: Record<string, { partner: string; transform: string }> = {
  甲: { partner: '己', transform: '토' },
  乙: { partner: '庚', transform: '금' },
  丙: { partner: '辛', transform: '수' },
  丁: { partner: '壬', transform: '목' },
  戊: { partner: '癸', transform: '화' },
  己: { partner: '甲', transform: '토' },
  庚: { partner: '乙', transform: '금' },
  辛: { partner: '丙', transform: '수' },
  壬: { partner: '丁', transform: '목' },
  癸: { partner: '戊', transform: '화' },
}
const STEM_CHUNG_SET = new Set([
  '甲-庚',
  '庚-甲',
  '乙-辛',
  '辛-乙',
  '丙-壬',
  '壬-丙',
  '丁-癸',
  '癸-丁',
])
const BRANCH_HAP_PARTNER: Record<string, string> = {
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
const BRANCH_CHUNG_PARTNER: Record<string, string> = {
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
const BRANCH_HAE_PAIRS = new Set([
  '子-未',
  '未-子',
  '丑-午',
  '午-丑',
  '寅-巳',
  '巳-寅',
  '卯-辰',
  '辰-卯',
  '申-亥',
  '亥-申',
  '酉-戌',
  '戌-酉',
])
const BRANCH_PA_PAIRS = new Set([
  '子-酉',
  '酉-子',
  '丑-辰',
  '辰-丑',
  '寅-亥',
  '亥-寅',
  '卯-午',
  '午-卯',
  '申-巳',
  '巳-申',
  '未-戌',
  '戌-未',
])
const BRANCH_HYUNG_TRIO = ['寅', '巳', '申']
const BRANCH_HYUNG_TRIO2 = ['丑', '戌', '未']
const BRANCH_HYUNG_PAIR = new Set(['子-卯', '卯-子'])
const BRANCH_TRIPLES_SAMHAP: Array<{ members: string[]; result: string; label: string }> = [
  { members: ['亥', '卯', '未'], result: '목', label: '亥卯未 목 삼합' },
  { members: ['寅', '午', '戌'], result: '화', label: '寅午戌 화 삼합' },
  { members: ['巳', '酉', '丑'], result: '금', label: '巳酉丑 금 삼합' },
  { members: ['申', '子', '辰'], result: '수', label: '申子辰 수 삼합' },
]
const BRANCH_TRIPLES_BANGHAP: Array<{ members: string[]; result: string; label: string }> = [
  { members: ['寅', '卯', '辰'], result: '목', label: '寅卯辰 봄 방합' },
  { members: ['巳', '午', '未'], result: '화', label: '巳午未 여름 방합' },
  { members: ['申', '酉', '戌'], result: '금', label: '申酉戌 가을 방합' },
  { members: ['亥', '子', '丑'], result: '수', label: '亥子丑 겨울 방합' },
]
const BRANCH_WONJIN_PAIRS = new Set([
  '子-未',
  '未-子',
  '丑-午',
  '午-丑',
  '寅-酉',
  '酉-寅',
  '卯-申',
  '申-卯',
  '辰-亥',
  '亥-辰',
  '巳-戌',
  '戌-巳',
])

// ── 십신 (본명 일간 기준 상대 십신) ──
export function getSibsinKo(dayStem: string, targetStem: string): string {
  const dayEl = STEM_TO_KO_ELEMENT[dayStem]
  const tEl = STEM_TO_KO_ELEMENT[targetStem]
  if (!dayEl || !tEl) return ''
  const elements = ['목', '화', '토', '금', '수']
  const samePolarity = STEM_YIN[dayStem] === STEM_YIN[targetStem]
  const dayIdx = elements.indexOf(dayEl)
  const tIdx = elements.indexOf(tEl)
  const diff = (tIdx - dayIdx + 5) % 5
  const labels = [
    ['비견', '겁재'],
    ['식신', '상관'],
    ['편재', '정재'],
    ['편관', '정관'],
    ['편인', '정인'],
  ]
  return labels[diff][samePolarity ? 0 : 1]
}

// ── 운별 갑자 컨텍스트 ──
export interface DaeunCycleInput {
  age: number
  heavenlyStem: string
  earthlyBranch: string
}
export interface DaeunContext {
  ganji: string
  ageStart: number
  ageEnd: number
  sibsinStem: string
  yearsToNext?: number
  transitionImminent?: boolean
  nextGanji?: string
  nextSibsinStem?: string
}
export interface SewoonContext {
  ganji: string
  year: number
  sibsinStem: string
}
export interface GanjiSibsin {
  ganji: string
  sibsinStem: string
}

/** 그 날짜에 활성인 대운 — 출생연도 기준 소수 나이로 [age, age+10) 구간 선택. */
export function pickDaeunForDate(
  cycles: DaeunCycleInput[] | undefined,
  birthYear: number | null,
  natalDayMaster: string,
  d: Date
): DaeunContext | null {
  if (!cycles?.length || birthYear == null) return null
  const yearStart = new Date(d.getFullYear(), 0, 1).getTime()
  const yearEnd = new Date(d.getFullYear() + 1, 0, 1).getTime()
  const fractionalYear = d.getFullYear() + (d.getTime() - yearStart) / (yearEnd - yearStart)
  const ageAtDate = fractionalYear - birthYear
  let activeIdx = 0
  for (let i = 0; i < cycles.length; i++) {
    if (cycles[i].age <= Math.floor(ageAtDate)) activeIdx = i
    else break
  }
  const active = cycles[activeIdx]
  if (!active) return null
  const next = cycles[activeIdx + 1] || null
  const daeunStem = active.heavenlyStem || ''
  const sibsinStem = natalDayMaster && daeunStem ? getSibsinKo(natalDayMaster, daeunStem) : ''
  const nextStem = next?.heavenlyStem || ''
  const nextSibsinStem = natalDayMaster && nextStem ? getSibsinKo(natalDayMaster, nextStem) : ''
  const yearsToNext = next ? Math.max(0, next.age - ageAtDate) : Infinity
  return {
    ganji: `${daeunStem}${active.earthlyBranch}`,
    ageStart: active.age,
    ageEnd: active.age + 10,
    sibsinStem,
    yearsToNext: next ? Number(yearsToNext.toFixed(2)) : undefined,
    transitionImminent: next ? yearsToNext <= 1 : false,
    nextGanji: next ? `${next.heavenlyStem}${next.earthlyBranch}` : undefined,
    nextSibsinStem: next ? nextSibsinStem : undefined,
  }
}

/** 세운 — 그 해 60갑자. */
export function sewoonForYear(yr: number, natalDayMaster: string): SewoonContext {
  const idx60 = (yr - 4 + 6000) % 60
  const stem = STEMS[idx60 % 10]
  const branch = BRANCHES_BY_INDEX[idx60 % 12]
  const sibsinStem = natalDayMaster && stem ? getSibsinKo(natalDayMaster, stem) : ''
  return { ganji: `${stem}${branch}`, year: yr, sibsinStem }
}

/** 월운 — 절기 기반 월주(stem/branch)에서 조립. */
export function wolwoonFromPillar(
  monthStem: string,
  monthBranch: string,
  natalDayMaster: string
): GanjiSibsin {
  const sibsinStem = natalDayMaster && monthStem ? getSibsinKo(natalDayMaster, monthStem) : ''
  return { ganji: `${monthStem}${monthBranch}`, sibsinStem }
}

// ── 운끼리 충/합/형 ──
export type CycleInteractionKind =
  | '천간합'
  | '천간충'
  | '지지합'
  | '지지충'
  | '지지형'
  | '지지해'
  | '지지파'
  | '자형'
export interface CycleInteraction {
  pair: string
  kind: CycleInteractionKind
  blurb: string
}
interface CycleSlot {
  id: string
  label: string
  stem: string
  branch: string
}

function interactionFor(a: CycleSlot, b: CycleSlot): CycleInteraction[] {
  const out: CycleInteraction[] = []
  const pair = `${a.label}↔${b.label}`
  if (a.stem && b.stem && STEM_HAP_PARTNER[a.stem]?.partner === b.stem) {
    out.push({
      pair,
      kind: '천간합',
      blurb: `${a.label}(${a.stem})과 ${b.label}(${b.stem})이 천간합 — 두 흐름이 부드럽게 묶입니다.`,
    })
  }
  if (a.stem && b.stem && STEM_CHUNG_SET.has(`${a.stem}-${b.stem}`)) {
    out.push({
      pair,
      kind: '천간충',
      blurb: `${a.label}(${a.stem})과 ${b.label}(${b.stem})이 천간충 — 결정 압박이 크게 들어옵니다.`,
    })
  }
  if (a.branch && b.branch && BRANCH_HAP_PARTNER[a.branch] === b.branch && a.branch !== b.branch) {
    out.push({
      pair,
      kind: '지지합',
      blurb: `${a.label}(${a.branch})과 ${b.label}(${b.branch})이 지지합 — 환경이 손발 맞춰 돕습니다.`,
    })
  }
  if (a.branch && b.branch && BRANCH_CHUNG_PARTNER[a.branch] === b.branch) {
    out.push({
      pair,
      kind: '지지충',
      blurb: `${a.label}(${a.branch})과 ${b.label}(${b.branch})이 지지충 — 환경 변동·이동·교체 신호.`,
    })
  }
  const inTrio = (set: string[]) =>
    set.includes(a.branch) && set.includes(b.branch) && a.branch !== b.branch
  if (
    a.branch &&
    b.branch &&
    (inTrio(BRANCH_HYUNG_TRIO) ||
      inTrio(BRANCH_HYUNG_TRIO2) ||
      BRANCH_HYUNG_PAIR.has(`${a.branch}-${b.branch}`))
  ) {
    out.push({
      pair,
      kind: '지지형',
      blurb: `${a.label}(${a.branch})과 ${b.label}(${b.branch})이 형 — 마찰·구설·실수 노출 주의.`,
    })
  }
  if (a.branch && b.branch && BRANCH_HAE_PAIRS.has(`${a.branch}-${b.branch}`)) {
    out.push({
      pair,
      kind: '지지해',
      blurb: `${a.label}(${a.branch})과 ${b.label}(${b.branch})이 해 — 오해·관계 균열 주의.`,
    })
  }
  if (a.branch && b.branch && BRANCH_PA_PAIRS.has(`${a.branch}-${b.branch}`)) {
    out.push({
      pair,
      kind: '지지파',
      blurb: `${a.label}(${a.branch})과 ${b.label}(${b.branch})이 파 — 진행 중인 일이 살짝 어긋날 수 있어요.`,
    })
  }
  return out
}

/** 본명·대운·세운·월운·일운 다섯 슬롯의 pairwise 충/합/형/해/파/원진 + 삼합/방합. */
export function buildCycleInteractions(
  natalDayMaster: string,
  natalDayBranch: string,
  daeun: { ganji: string } | null,
  sewoon: { ganji: string },
  wolwoon: { ganji: string },
  iljin: { ganji: string }
): CycleInteraction[] | undefined {
  const split = (g: string): { stem: string; branch: string } => ({
    stem: g.charAt(0) || '',
    branch: g.charAt(1) || '',
  })
  const slots: CycleSlot[] = [
    { id: 'natal', label: '본명', stem: natalDayMaster, branch: natalDayBranch },
    ...(daeun ? [{ id: 'daeun', label: '대운', ...split(daeun.ganji) }] : []),
    { id: 'sewoon', label: '세운', ...split(sewoon.ganji) },
    { id: 'wolwoon', label: '월운', ...split(wolwoon.ganji) },
    { id: 'iljin', label: '일운', ...split(iljin.ganji) },
  ]
  const out: CycleInteraction[] = []
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      out.push(...interactionFor(slots[i], slots[j]))
    }
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i]
      const b = slots[j]
      if (a.branch && b.branch && BRANCH_WONJIN_PAIRS.has(`${a.branch}-${b.branch}`)) {
        out.push({
          pair: `${a.label}↔${b.label}`,
          kind: '지지해', // 원진은 의미상 해와 비슷한 마찰 — UI는 같은 카드로
          blurb: `${a.label}(${a.branch})과 ${b.label}(${b.branch})이 원진 — 감정적 거리·미묘한 신경전.`,
        })
      }
    }
  }
  const allBranches = slots.map((s) => s.branch).filter(Boolean)
  for (const trio of [...BRANCH_TRIPLES_SAMHAP, ...BRANCH_TRIPLES_BANGHAP]) {
    const present = trio.members.filter((m) => allBranches.includes(m))
    if (present.length === 3) {
      const involved = slots
        .filter((s) => trio.members.includes(s.branch))
        .map((s) => s.label)
        .join(', ')
      const isSamhap = BRANCH_TRIPLES_SAMHAP.includes(trio)
      out.push({
        pair: involved,
        kind: '지지합',
        blurb: `${trio.label} 완성 (${involved}) — ${trio.result} 기운으로 강하게 묶이는 ${isSamhap ? '삼합' : '방합'} 흐름.`,
      })
    }
  }
  return out.length > 0 ? out : undefined
}
