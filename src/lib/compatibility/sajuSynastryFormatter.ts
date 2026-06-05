/**
 * 사주 시너스트리 (궁합) 라인 포맷.
 *
 * 점성 synastry와 같은 형태로 두 사람의 사주 cross 신호를 라인 list로
 * 생성한다. 정통 명리 cross 룰을 코드로 박은 것.
 *
 * 포함 카테고리:
 *   1. 일간 cross — 오행 상생/상극
 *   2. 4기둥 × 4기둥 cross — 천간합/충, 지지합/충/형/해/파/자형/삼합/방합
 *   3. 신살 cross — 천을귀인 양방향
 *   4. 현재 대운 cross — 천간합/충, 지지합/충
 *   5. 오행 균형 — 합쳤을 때 분포
 *
 * dev 검증: scripts/saju-synastry-format.ts.
 */

import { HYEONG_PAIR_TRIO, BRANCH_HYEONG_PAIR, SELF_HYEONG, isHyeong } from '@/lib/saju/hyeong'
// 공망·12신살은 saju SSOT(pillarLookup / shinsal)에 위임. 로컬 복제 금지.
import { getGongmang as getGongmangByPillar } from '@/lib/saju/pillarLookup'
import { pickTwelveSingle } from '@/lib/saju/shinsal'

const STEM_HAP: Record<string, { other: string; element: string }> = {
  '甲': { other: '己', element: '토' },
  '己': { other: '甲', element: '토' },
  '乙': { other: '庚', element: '금' },
  '庚': { other: '乙', element: '금' },
  '丙': { other: '辛', element: '수' },
  '辛': { other: '丙', element: '수' },
  '丁': { other: '壬', element: '목' },
  '壬': { other: '丁', element: '목' },
  '戊': { other: '癸', element: '화' },
  '癸': { other: '戊', element: '화' },
}

const STEM_CHUNG: Record<string, string> = {
  '甲': '庚', '庚': '甲',
  '乙': '辛', '辛': '乙',
  '丙': '壬', '壬': '丙',
  '丁': '癸', '癸': '丁',
}

const BRANCH_HAP: Record<string, { other: string; element: string }> = {
  '子': { other: '丑', element: '토' },
  '丑': { other: '子', element: '토' },
  '寅': { other: '亥', element: '목' },
  '亥': { other: '寅', element: '목' },
  '卯': { other: '戌', element: '화' },
  '戌': { other: '卯', element: '화' },
  '辰': { other: '酉', element: '금' },
  '酉': { other: '辰', element: '금' },
  '巳': { other: '申', element: '수' },
  '申': { other: '巳', element: '수' },
  '午': { other: '未', element: '화' },
  '未': { other: '午', element: '화' },
}

const BRANCH_CHUNG: Record<string, string> = {
  '子': '午', '午': '子',
  '丑': '未', '未': '丑',
  '寅': '申', '申': '寅',
  '卯': '酉', '酉': '卯',
  '辰': '戌', '戌': '辰',
  '巳': '亥', '亥': '巳',
}

const BRANCH_HAE: Record<string, string> = {
  '子': '未', '未': '子',
  '丑': '午', '午': '丑',
  '寅': '巳', '巳': '寅',
  '卯': '辰', '辰': '卯',
  '申': '亥', '亥': '申',
  '酉': '戌', '戌': '酉',
}

const BRANCH_PA: Record<string, string> = {
  '子': '酉', '酉': '子',
  '丑': '辰', '辰': '丑',
  '寅': '亥', '亥': '寅',
  '卯': '午', '午': '卯',
  '巳': '申', '申': '巳',
  '戌': '未', '未': '戌',
}

// 형(刑) 교리는 @/lib/saju/hyeong 단일 소스(상단 import). destiny counselor 와
// 동일 교리를 공유 — 이전엔 여기에 복붙돼 있어 한쪽만 고치면 드리프트했음.

const TRI_HAP = [
  { branches: ['申', '子', '辰'], element: '수' },
  { branches: ['亥', '卯', '未'], element: '목' },
  { branches: ['寅', '午', '戌'], element: '화' },
  { branches: ['巳', '酉', '丑'], element: '금' },
]

const BANG_HAP = [
  { branches: ['寅', '卯', '辰'], element: '목' },
  { branches: ['巳', '午', '未'], element: '화' },
  { branches: ['申', '酉', '戌'], element: '금' },
  { branches: ['亥', '子', '丑'], element: '수' },
]

const STEM_EL: Record<string, string> = {
  '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
  '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수',
}

// 천간 음양 — 십성(sibsin) cross 계산용. 같은 음양이면 비견/식신/편재/편관/편인,
// 다른 음양이면 겁재/상관/정재/정관/정인.
const STEM_YIN_YANG: Record<string, '양' | '음'> = {
  '甲': '양', '丙': '양', '戊': '양', '庚': '양', '壬': '양',
  '乙': '음', '丁': '음', '己': '음', '辛': '음', '癸': '음',
}

// 지지 본기 천간 (지지를 천간 시각으로 보는 매핑) — 지지 십성 계산용.
const BRANCH_MAIN_STEM: Record<string, string> = {
  '子': '癸', '丑': '己', '寅': '甲', '卯': '乙', '辰': '戊', '巳': '丙',
  '午': '丁', '未': '己', '申': '庚', '酉': '辛', '戌': '戊', '亥': '壬',
}

// 오행 관계 — 상생/상극 방향. 목→화→토→금→수→목 (생). 木克土, 火克金, 土克水, 金克木, 水克火 (극).
const EL_GEN: Record<string, string> = { '목': '화', '화': '토', '토': '금', '금': '수', '수': '목' }
const EL_KE: Record<string, string> = { '목': '토', '화': '금', '토': '수', '금': '목', '수': '화' }

/**
 * 일간(dayStem) 기준 대상(targetStem) 의 십성(sibsin) 반환. 정재/편재 → 배우자성
 * (남자 기준 처), 정관/편관 → 배우자성 (여자 기준 부). 궁합 cross 의 핵심 신호.
 */
function sibseongFor(dayStem: string, targetStem: string): string {
  const dayEl = STEM_EL[dayStem]
  const tgtEl = STEM_EL[targetStem]
  if (!dayEl || !tgtEl) return ''
  const sameYY = STEM_YIN_YANG[dayStem] === STEM_YIN_YANG[targetStem]
  if (dayEl === tgtEl) return sameYY ? '비견' : '겁재'
  if (EL_GEN[dayEl] === tgtEl) return sameYY ? '식신' : '상관'
  if (EL_KE[dayEl] === tgtEl) return sameYY ? '편재' : '정재'
  if (EL_KE[tgtEl] === dayEl) return sameYY ? '편관' : '정관'
  if (EL_GEN[tgtEl] === dayEl) return sameYY ? '편인' : '정인'
  return ''
}

const BRANCH_EL: Record<string, string> = {
  '寅': '목', '卯': '목', '巳': '화', '午': '화', '辰': '토',
  '戌': '토', '丑': '토', '未': '토', '申': '금', '酉': '금',
  '子': '수', '亥': '수',
}

const EL_CONTROLS: Record<string, string> = {
  '목': '토', '토': '수', '수': '화', '화': '금', '금': '목',
}

const EL_GENERATES: Record<string, string> = {
  '목': '화', '화': '토', '토': '금', '금': '수', '수': '목',
}

// 십성 짧은 글로싱 — 관계의 질감을 LLM이 곧장 읽게.
const SIBSIN_GLOSS: Record<string, string> = {
  '비견': '대등·동지', '겁재': '경쟁·협력',
  '식신': '표현·여유', '상관': '재능·자유분방',
  '편재': '활동·욕망', '정재': '안정·성실',
  '편관': '압박·도전', '정관': '책임·규범',
  '편인': '보호·배움', '정인': '후원·안정',
}

const CHEONULGWIIN: Record<string, string[]> = {
  '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
  '乙': ['子', '申'], '己': ['子', '申'],
  '丙': ['亥', '酉'], '丁': ['亥', '酉'],
  '辛': ['寅', '午'],
  '壬': ['巳', '卯'], '癸': ['巳', '卯'],
}

const BRANCH_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
const STEM_ORDER = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']

// 현재 연도의 세운 간지 (입춘 근사: 2/4 이전은 전년). 두 사람 공통 시기축.
function currentSeun(now: Date): { stem: string; branch: string; year: number } {
  let y = now.getFullYear()
  const m = now.getMonth() + 1
  if (m < 2 || (m === 2 && now.getDate() < 4)) y -= 1
  return {
    stem: STEM_ORDER[(((y - 4) % 10) + 10) % 10],
    branch: BRANCH_ORDER[(((y - 4) % 12) + 12) % 12],
    year: y,
  }
}

// 십성(十星) — 일간(day) 입장에서 상대 천간(other)이 무슨 십성인가.
// 같은 오행 비견/겁재 · 일간生상대 식신/상관 · 상대生일간 편인/정인 ·
// 일간克상대 편재/정재 · 상대克일간 편관/정관. 음양 같으면 편(식신 포함),
// 다르면 정(겁재·상관 포함).
function sibsinOf(dayStem: string, otherStem: string): string | null {
  const dayEl = STEM_EL[dayStem], otherEl = STEM_EL[otherStem]
  if (!dayEl || !otherEl) return null
  const dayPol = STEM_ORDER.indexOf(dayStem) % 2
  const otherPol = STEM_ORDER.indexOf(otherStem) % 2
  if (dayPol < 0 || otherPol < 0) return null
  const samePol = dayPol === otherPol
  if (dayEl === otherEl) return samePol ? '비견' : '겁재'
  if (EL_GENERATES[dayEl] === otherEl) return samePol ? '식신' : '상관'
  if (EL_GENERATES[otherEl] === dayEl) return samePol ? '편인' : '정인'
  if (EL_CONTROLS[dayEl] === otherEl) return samePol ? '편재' : '정재'
  if (EL_CONTROLS[otherEl] === dayEl) return samePol ? '편관' : '정관'
  return null
}

// 공망(空亡) — 일주 기준 비어 있는 2지지. pillarLookup.getGongmang(SSOT) 위임.
function gongmangOf(stem: string, branch: string): string[] {
  return getGongmangByPillar(`${stem}${branch}`) ?? []
}

// 12신살 — 일지 기준, 상대 지지에 라벨. shinsal.pickTwelveSingle(SSOT) 위임.
function twelveShinsalLabel(baseBranch: string, targetBranch: string): string | null {
  return pickTwelveSingle(baseBranch, targetBranch)
}

const PILLAR_LABELS = ['년', '월', '일', '시'] as const

// 한자 천간·지지(+合化)를 한글 발음으로 — 辛→신, 乙庚合化금→을경합화금.
// 출력만 읽기 쉽게 바꾸는 후처리(계산·로직 불변). 일간의 (금)/(목) 오행
// 글로싱은 그대로 남아 앵커 역할.
const HANJA_KO: Record<string, string> = {
  甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무', 己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계',
  子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진', 巳: '사', 午: '오', 未: '미', 申: '신', 酉: '유', 戌: '술', 亥: '해',
  合: '합', 化: '화',
}
const koreanize = (s: string) => s.replace(/[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥合化]/g, (c) => HANJA_KO[c] ?? c)

export interface SajuPillarInput {
  stem: string
  branch: string
}

export interface SajuSynastryInput {
  /** 년/월/일/시 순서 4 pillars */
  pillarsA: SajuPillarInput[]
  pillarsB: SajuPillarInput[]
  currentDaeunA?: { stem: string; branch: string; age?: number } | null
  currentDaeunB?: { stem: string; branch: string; age?: number } | null
  /** 세운 계산 기준 시각 (기본 now). 올해 세운↔두 사람 본명·대운 cross에 씀. */
  now?: Date
  /** A/B 실명. 있으면 라벨·오행·극 방향을 이름에 고정해 모델이 뒤집지 못하게 한다. */
  nameA?: string | null
  nameB?: string | null
}

/**
 * 사주 synastry 라인 list를 한 string으로 반환.
 * pillars 빠지면 빈 string.
 */
export function formatSajuSynastry(input: SajuSynastryInput): string {
  if (input.pillarsA.length < 4 || input.pillarsB.length < 4) return ''
  const A = input.pillarsA
  const B = input.pillarsB
  const aDay = A[2]
  const bDay = B[2]
  if (!aDay.stem || !bDay.stem) return ''

  // 라벨에 실명을 고정한다. "A", "B"만 주면 모델이 어느 쪽이 누구인지,
  // 辛→금 같은 오행 매핑까지 머릿속으로 다시 풀다가 통째로 뒤집는 사고가
  // 난다(辛(금) 일간을 "목"이라 부르는 등). 이름·오행을 데이터에 박아둔다.
  const nmA = (input.nameA || '').trim()
  const nmB = (input.nameB || '').trim()
  const labelA = nmA ? `A(${nmA})` : 'A'
  const labelB = nmB ? `B(${nmB})` : 'B'
  const elA = STEM_EL[aDay.stem]
  const elB = STEM_EL[bDay.stem]

  // 우선순위 버킷 — LLM이 토큰 무게가 아니라 명시적 티어로 중요도를 읽게.
  const critical: string[] = []
  const important: string[] = []
  const chamgo: string[] = []

  // 1. 일간 cross — 항상 CRITICAL
  if (elA && elB) {
    if (elA === elB) {
      critical.push(`${labelA} 일간 ${aDay.stem}(${elA}) ↔ ${labelB} 일간 ${bDay.stem}(${elB}) — 같은 오행 (비견)`)
    } else if (EL_CONTROLS[elA] === elB) {
      const a = nmA || 'A', b = nmB || 'B'
      critical.push(`${labelA} 일간 ${aDay.stem}(${elA}) ↔ ${labelB} 일간 ${bDay.stem}(${elB}) — ${elA}극${elB} · 통제 방향 ${a}(${elA}) → ${b}(${elB}) (${a}이(가) ${b}을(를) 정리·다듬는 흐름, ${b}은(는) 따끔·제약처럼 느낄 수 있음) ※오행·방향 반대로 쓰지 말 것`)
    } else if (EL_CONTROLS[elB] === elA) {
      const a = nmA || 'A', b = nmB || 'B'
      critical.push(`${labelA} 일간 ${aDay.stem}(${elA}) ↔ ${labelB} 일간 ${bDay.stem}(${elB}) — ${elB}극${elA} · 통제 방향 ${b}(${elB}) → ${a}(${elA}) (${b}이(가) ${a}을(를) 정리·다듬는 흐름, ${a}은(는) 따끔·제약처럼 느낄 수 있음) ※오행·방향 반대로 쓰지 말 것`)
    } else {
      important.push(`${labelA} 일간 ${aDay.stem}(${elA}) ↔ ${labelB} 일간 ${bDay.stem}(${elB}) — 상생 (서로 보완)`)
    }
  }

  // 1-2. 십성 cross — 상대 일간이 내 사주에서 무슨 십성인가. 오행 상생/극만으론
  // 정관 vs 편관 같은 관계의 질감이 안 잡힌다 → 양방향 십성으로 보강.
  {
    const aSeesB = sibsinOf(aDay.stem, bDay.stem) // A 일간 입장에서 B 일간은
    const bSeesA = sibsinOf(bDay.stem, aDay.stem) // B 일간 입장에서 A 일간은
    if (aSeesB && bSeesA) {
      critical.push(
        `십성 cross — ${labelA} 입장에서 ${labelB}는 ${aSeesB}(${SIBSIN_GLOSS[aSeesB] ?? ''}), ${labelB} 입장에서 ${labelA}는 ${bSeesA}(${SIBSIN_GLOSS[bSeesA] ?? ''})`
      )
    }
  }

  // 2. 천간합(끌림)=CRITICAL, 천간충=IMPORTANT
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const aS = A[i].stem, bS = B[j].stem
      if (!aS || !bS) continue
      const hap = STEM_HAP[aS]
      if (hap && hap.other === bS) {
        critical.push(`A ${PILLAR_LABELS[i]}천간 ${aS} + B ${PILLAR_LABELS[j]}천간 ${bS} — ${aS}${bS}合化${hap.element} (천간합 — 화학적 끌림)`)
      }
      if (STEM_CHUNG[aS] === bS) {
        important.push(`A ${PILLAR_LABELS[i]}천간 ${aS} ↔ B ${PILLAR_LABELS[j]}천간 ${bS} — 천간충 (대립)`)
      }
    }
  }

  // 3. 지지 관계 — 같은 (i,j) 페어의 충·형·합·해·파를 한 줄로 병합 (중복 제거)
  type PairRel = { i: number; j: number; aBr: string; bBr: string; tags: string[] }
  const pairMap = new Map<string, PairRel>()
  const addTag = (i: number, j: number, aBr: string, bBr: string, tag: string) => {
    const key = `${i},${j}`
    const cur = pairMap.get(key) ?? { i, j, aBr, bBr, tags: [] }
    if (!cur.tags.includes(tag)) cur.tags.push(tag)
    pairMap.set(key, cur)
  }
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const aBr = A[i].branch, bBr = B[j].branch
      if (!aBr || !bBr) continue
      if (BRANCH_HAP[aBr]?.other === bBr) addTag(i, j, aBr, bBr, '합')
      if (BRANCH_CHUNG[aBr] === bBr) addTag(i, j, aBr, bBr, '충')
      if (BRANCH_HYEONG_PAIR[aBr] === bBr) addTag(i, j, aBr, bBr, '형')
      if (HYEONG_PAIR_TRIO.has(aBr + bBr)) addTag(i, j, aBr, bBr, '형')
      if (SELF_HYEONG.has(aBr) && aBr === bBr) addTag(i, j, aBr, bBr, '자형')
      if (BRANCH_HAE[aBr] === bBr) addTag(i, j, aBr, bBr, '해')
      if (BRANCH_PA[aBr] === bBr) addTag(i, j, aBr, bBr, '파')
    }
  }
  for (const { i, j, aBr, bBr, tags } of pairMap.values()) {
    const hasClash = tags.some((t) => t === '충' || t === '형' || t === '3형' || t === '자형')
    const hasHap = tags.includes('합')
    const note = hasClash
      ? '이별·갈등 핵심 신호'
      : hasHap
        ? '결속'
        : tags.includes('해')
          ? '미묘한 거리감'
          : '사소한 파열'
    const combo = tags.length > 1 ? `${tags.join('+')} 복합` : tags[0]
    const line = `A ${PILLAR_LABELS[i]}지 ${aBr} ↔ B ${PILLAR_LABELS[j]}지 ${bBr} — ${aBr}${bBr} ${combo} (${note})`
    // 충/형이 일지(2)를 물면 가장 강한 신호 → CRITICAL, 그 외는 IMPORTANT
    if (hasClash && (i === 2 || j === 2)) critical.push(line)
    else important.push(line)
  }

  // 삼합·방합 cross — 두 사람 지지를 합쳐 trio가 형성되는지. 양쪽이 서로
  // 없는 글자를 보태야 진짜 cross(union이 각자보다 커야 함). 한 사람이 이미
  // 다 갖고 있으면 본명 신호라 제외. 옛 코드는 각자 1지만 잡아 "2지" 라벨을
  // 붙여, 한 쪽이 3지 다 가진 경우(본명)나 cross로 3지 완성된 경우를 오분류.
  const sbComplete: string[] = [] // 3/3 교차 완성
  const sbPartial: string[] = []  // 2/3 부분
  for (const trio of [...TRI_HAP, ...BANG_HAP]) {
    const setA = new Set(A.map((p) => p.branch).filter((b) => trio.branches.includes(b)))
    const setB = new Set(B.map((p) => p.branch).filter((b) => trio.branches.includes(b)))
    const union = new Set([...setA, ...setB])
    if (union.size >= 2 && union.size > setA.size && union.size > setB.size) {
      const tag = TRI_HAP.includes(trio) ? '삼합' : '방합'
      const label = `${trio.branches.join('')}${tag}(→${trio.element})`
      ;(union.size === 3 ? sbComplete : sbPartial).push(label)
    }
  }
  if (sbComplete.length > 0) {
    important.push(`삼합/방합 교차 완성 ${sbComplete.length}건: ${sbComplete.join(' · ')} — 두 사람 지지가 3지 모두 채워 국(局) 형성 (강한 결속 잠재)`)
  }
  if (sbPartial.length > 0) {
    chamgo.push(`삼합/방합 부분 ${sbPartial.length}건: ${sbPartial.join(' · ')} — 3지 중 2지 교차 성립 (결속 잠재, 비중 낮음)`)
  }

  // 4. 천을귀인 → IMPORTANT
  const aCheonul = CHEONULGWIIN[aDay.stem] ?? []
  const bCheonul = CHEONULGWIIN[bDay.stem] ?? []
  for (let j = 0; j < 4; j++) {
    if (aCheonul.includes(B[j].branch)) {
      important.push(`${labelA}'s 천을귀인(${aCheonul.join('·')}, 일간 ${aDay.stem}) → ${labelB} ${PILLAR_LABELS[j]}지 ${B[j].branch} 활성 → 길성 보호`)
    }
  }
  for (let i = 0; i < 4; i++) {
    if (bCheonul.includes(A[i].branch)) {
      important.push(`${labelB}'s 천을귀인(${bCheonul.join('·')}, 일간 ${bDay.stem}) → ${labelA} ${PILLAR_LABELS[i]}지 ${A[i].branch} 활성 → 길성 보호`)
    }
  }

  // 5. 12신살 → IMPORTANT (방향별 1줄 압축)
  // 각 항목을 `${pillar}지 ${branch}=${label}` 형태로 — 과거 `오육해`
  // 처럼 branch+label 을 붙여 쓰면 "오 육해" 인지 "오육해(한 단어)" 인지
  // 구분 안 돼 LLM 이 잘못 파싱. = 로 명확히 분리.
  if (aDay.branch) {
    const items: string[] = []
    for (let j = 0; j < 4; j++) {
      if (!B[j].branch) continue
      const lbl = twelveShinsalLabel(aDay.branch, B[j].branch)
      if (lbl) items.push(`${PILLAR_LABELS[j]}지 ${B[j].branch}=${lbl}`)
    }
    if (items.length) important.push(`12신살 ${labelA} 일지 ${aDay.branch} 기준 → ${labelB}: ${items.join(' · ')}`)
  }
  if (bDay.branch) {
    const items: string[] = []
    for (let i = 0; i < 4; i++) {
      if (!A[i].branch) continue
      const lbl = twelveShinsalLabel(bDay.branch, A[i].branch)
      if (lbl) items.push(`${PILLAR_LABELS[i]}지 ${A[i].branch}=${lbl}`)
    }
    if (items.length) important.push(`12신살 ${labelB} 일지 ${bDay.branch} 기준 → ${labelA}: ${items.join(' · ')}`)
  }

  // 6. 현재 대운 cross → IMPORTANT
  // 나이 표기는 `시작~끝세` 범위로 (cycle 10년). 단순 `32세` 면 LLM 이
  // "현재 32세" 로 오인 가능.
  if (input.currentDaeunA && input.currentDaeunB) {
    const dA = input.currentDaeunA, dB = input.currentDaeunB
    const ageRange = (age?: number) =>
      typeof age === 'number' ? `${age}~${age + 9}세` : '?세'
    important.push(`현재 대운: ${labelA} ${ageRange(dA.age)} ${dA.stem}${dA.branch} · ${labelB} ${ageRange(dB.age)} ${dB.stem}${dB.branch}`)
    if (STEM_HAP[dA.stem]?.other === dB.stem) important.push(`대운 천간 ${dA.stem}${dB.stem}合化${STEM_HAP[dA.stem]!.element} (흐름 결속)`)
    if (STEM_CHUNG[dA.stem] === dB.stem) important.push(`대운 천간충 (시기 흐름 충돌)`)
    if (BRANCH_HAP[dA.branch]?.other === dB.branch) important.push(`대운 지지 ${dA.branch}${dB.branch}합 (결속)`)
    if (BRANCH_CHUNG[dA.branch] === dB.branch) important.push(`대운 지지충 (큰 흐름 충돌)`)
    if (dA.branch === dB.branch) important.push(`대운 지지 ${dA.branch} 일치 (강한 시기 공명)`)
  }

  // 6-2. 세운(올해) cross — 올해 세운 간지가 두 사람 일주·대운을 합/충/형으로
  // 건드리는지. "올해 우리 어때 / 언제" 질문의 시기 해상도. (월운·일진은 과잉)
  {
    const seun = currentSeun(input.now ?? new Date())
    const ss = seun.stem, sb = seun.branch
    const seunLines: string[] = []
    const crossNatal = (lbl: string, day: SajuPillarInput) => {
      if (STEM_HAP[ss]?.other === day.stem) seunLines.push(`세운천간 ${ss} + ${lbl} 일간 ${day.stem} — ${ss}${day.stem}合化${STEM_HAP[ss]!.element} (올해 끌림·기회)`)
      if (STEM_CHUNG[ss] === day.stem) seunLines.push(`세운천간 ${ss} ↔ ${lbl} 일간 ${day.stem} — 충 (올해 압박·결정)`)
      if (BRANCH_HAP[sb]?.other === day.branch) seunLines.push(`세운지지 ${sb} + ${lbl} 일지 ${day.branch} — 합 (올해 결속·안정)`)
      if (BRANCH_CHUNG[sb] === day.branch) seunLines.push(`세운지지 ${sb} ↔ ${lbl} 일지 ${day.branch} — 충 (올해 이동·변동)`)
      else if (isHyeong(sb, day.branch)) seunLines.push(`세운지지 ${sb} ↔ ${lbl} 일지 ${day.branch} — 형 (올해 갈등·구설)`)
    }
    crossNatal(labelA, aDay)
    crossNatal(labelB, bDay)
    const crossDaeun = (lbl: string, dae?: { stem: string; branch: string } | null) => {
      if (!dae) return
      if (STEM_CHUNG[ss] === dae.stem) seunLines.push(`세운 ↔ ${lbl} 대운천간 ${dae.stem} — 충 (올해와 대운 흐름 충돌)`)
      if (BRANCH_CHUNG[sb] === dae.branch) seunLines.push(`세운 ↔ ${lbl} 대운지지 ${dae.branch} — 충 (올해와 대운 흐름 충돌)`)
      if (BRANCH_HAP[sb]?.other === dae.branch) seunLines.push(`세운 ↔ ${lbl} 대운지지 ${dae.branch} — 합 (올해 대운과 결속)`)
    }
    crossDaeun(labelA, input.currentDaeunA)
    crossDaeun(labelB, input.currentDaeunB)
    important.push(`올해 세운 ${seun.year}년 ${ss}${sb} cross${seunLines.length ? ':' : ' — 두 사람 본명·대운과 직접 합·충 없음 (올해 큰 변동 신호 약함)'}`)
    for (const l of seunLines) important.push(`  ${l}`)
  }

  // 7. 오행 균형 → IMPORTANT (1줄)
  const els = ['목', '화', '토', '금', '수'] as const
  const countsA: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  const countsB: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  for (const p of A) {
    if (STEM_EL[p.stem]) countsA[STEM_EL[p.stem]]++
    if (BRANCH_EL[p.branch]) countsA[BRANCH_EL[p.branch]]++
  }
  for (const p of B) {
    if (STEM_EL[p.stem]) countsB[STEM_EL[p.stem]]++
    if (BRANCH_EL[p.branch]) countsB[BRANCH_EL[p.branch]]++
  }
  const merged: Record<string, number> = {}
  for (const e of els) merged[e] = countsA[e] + countsB[e]
  const sorted = [...els].sort((a, b) => merged[b] - merged[a])
  const balNote =
    merged[sorted[0]] - merged[sorted[4]] >= 4
      ? `${sorted[0]} 강 / ${sorted[4]} 약 (보완 필요)`
      : `${sorted[0]}~${sorted[4]} 폭 좁음 (비교적 균형)`
  important.push(
    `오행 합산 ${els.map((e) => `${e}${merged[e]}`).join(' ')} (A ${els.map((e) => `${e}${countsA[e]}`).join('')} / B ${els.map((e) => `${e}${countsB[e]}`).join('')}) → ${balNote}`
  )

  // 8. 공망 cross — 한 쪽 공망이 상대 지지에 걸리면 그 영역이 공허·초연.
  // 일지(2)에 걸리면 가장 강한 신호.
  {
    const aGong = gongmangOf(aDay.stem, aDay.branch)
    const bGong = gongmangOf(bDay.stem, bDay.branch)
    const hits: string[] = []
    for (let j = 0; j < 4; j++) {
      if (B[j].branch && aGong.includes(B[j].branch)) {
        hits.push(`${labelA}공망 → ${labelB} ${PILLAR_LABELS[j]}지 ${B[j].branch}${j === 2 ? '(일지·강)' : ''}`)
      }
    }
    for (let i = 0; i < 4; i++) {
      if (A[i].branch && bGong.includes(A[i].branch)) {
        hits.push(`${labelB}공망 → ${labelA} ${PILLAR_LABELS[i]}지 ${A[i].branch}${i === 2 ? '(일지·강)' : ''}`)
      }
    }
    if (hits.length) {
      important.push(
        `공망 cross (${labelA}공망 ${aGong.join('')} / ${labelB}공망 ${bGong.join('')}): ${hits.join(' · ')} — 적중 영역은 서로 공허·초연·집착 약함`
      )
    } else {
      chamgo.push(`공망 cross: ${labelA}공망 ${aGong.join('')} / ${labelB}공망 ${bGong.join('')} — 서로 적중 없음 (공허 신호 약함)`)
    }
  }

  // ── 배우자성 cross (sibsin) — 정통 명리 궁합의 핵심.
  // A 일간 시각 B 의 각 천간/지지 + B 일간 시각 A 의 각 천간/지지 매핑.
  // 정재/편재(妻星) 와 정관/편관(夫星) 만 추출해 LLM 에 명시.
  // 일주(=배우자궁) 에 잡히면 가장 강한 신호.
  const spouseStars = new Set(['정재', '편재', '정관', '편관'])
  const spouseRoleLabel: Record<string, string> = {
    정재: '처성(안정·가정)',
    편재: '처성(활달·유동)',
    정관: '부성(책임·안정)',
    편관: '부성(긴장·격정)',
  }
  const sibsinCrossLines: string[] = []
  const findSpouseSignals = (
    fromLabel: string,
    fromDay: { stem: string },
    other: SajuPillarInput[],
    otherLabel: string
  ) => {
    const hits: string[] = []
    other.forEach((p, idx) => {
      if (!p.stem) return
      const s = sibseongFor(fromDay.stem, p.stem)
      if (spouseStars.has(s)) {
        const where = PILLAR_LABELS[idx] // 년/월/일/시
        const at = idx === 2 ? '일주(배우자궁)' : `${where}주`
        hits.push(`${s}(${spouseRoleLabel[s]}) at ${otherLabel} ${at} ${p.stem}`)
      }
      // 지지 본기 천간으로도 체크 — 지지 십성 보완.
      const branchStem = BRANCH_MAIN_STEM[p.branch]
      if (branchStem) {
        const sBr = sibseongFor(fromDay.stem, branchStem)
        if (spouseStars.has(sBr)) {
          const where = PILLAR_LABELS[idx]
          const at = idx === 2 ? '일지(배우자궁)' : `${where}지`
          hits.push(`${sBr}(${spouseRoleLabel[sBr]}) at ${otherLabel} ${at} ${p.branch}(본기 ${branchStem})`)
        }
      }
    })
    if (hits.length) {
      sibsinCrossLines.push(`${fromLabel} 일간(${fromDay.stem}) 기준 ${otherLabel} 차트의 배우자성: ${hits.join(' · ')}`)
    }
  }
  if (aDay.stem && bDay.stem) {
    findSpouseSignals(labelA, aDay, B, labelB)
    findSpouseSignals(labelB, bDay, A, labelA)
  }

  // ── 신살 cross — 도화/홍염/백호/괴강. 정통 명리에 명시된 lookup table 로
  // 결정적으로 계산 (LLM 한테 personalShinsal 추측 맡기지 않음).
  //   - 도화 (자오묘유): A 일지의 三合 마지막 지지가 B 의 지지에 있으면 자석 끌림.
  //   - 홍염 (일간별 특정 지지): A 일간 홍염 지지가 B 지지에 있으면 색기·끌림.
  //   - 백호일주: 둘 다 백호 또는 한쪽 백호 + 상대 일지가 그 백호 일지와 충 → 격정.
  //   - 괴강일주: 둘 다 괴강이면 강력 충돌·자극.
  const DOHWA: Record<string, string> = {
    申: '酉', 子: '酉', 辰: '酉',
    寅: '卯', 午: '卯', 戌: '卯',
    巳: '午', 酉: '午', 丑: '午',
    亥: '子', 卯: '子', 未: '子',
  }
  const HONGYEOM: Record<string, string> = {
    甲: '午', 乙: '申', 丙: '寅', 丁: '未', 戊: '辰',
    己: '辰', 庚: '戌', 辛: '酉', 壬: '子', 癸: '申',
  }
  const BAEKHO = new Set(['甲辰', '乙未', '丙戌', '丁丑', '戊辰', '壬戌', '癸丑'])
  const GOEGANG = new Set(['庚辰', '庚戌', '壬辰', '壬戌', '戊戌'])
  // BRANCH_CHUNG 은 파일 상단(line ~52) 에 이미 정의됨 — 재사용.
  const shinsalCrossLines: string[] = []
  const aDayBr = aDay.branch
  const bDayBr = bDay.branch
  const otherBranches = (p: SajuPillarInput[]) =>
    p.map((x, i) => ({ idx: i, br: x.branch })).filter((x) => !!x.br)
  // 도화 cross — A 일지 기준
  if (aDayBr) {
    const aDohwa = DOHWA[aDayBr]
    if (aDohwa) {
      for (const { idx, br } of otherBranches(B)) {
        if (br === aDohwa) {
          shinsalCrossLines.push(
            `${labelA} 일지(${aDayBr}) 기준 도화 자리(${aDohwa}) 가 ${labelB} ${PILLAR_LABELS[idx]}지(${br}) 에 적중 — 자석 끌림·매력 자극`
          )
        }
      }
    }
  }
  if (bDayBr) {
    const bDohwa = DOHWA[bDayBr]
    if (bDohwa) {
      for (const { idx, br } of otherBranches(A)) {
        if (br === bDohwa) {
          shinsalCrossLines.push(
            `${labelB} 일지(${bDayBr}) 기준 도화 자리(${bDohwa}) 가 ${labelA} ${PILLAR_LABELS[idx]}지(${br}) 에 적중 — 자석 끌림·매력 자극`
          )
        }
      }
    }
  }
  // 홍염살 cross — A 일간 기준
  if (aDay.stem) {
    const aHy = HONGYEOM[aDay.stem]
    if (aHy) {
      for (const { idx, br } of otherBranches(B)) {
        if (br === aHy) {
          shinsalCrossLines.push(
            `${labelA} 일간(${aDay.stem}) 기준 홍염살(${aHy}) 이 ${labelB} ${PILLAR_LABELS[idx]}지(${br}) 에 적중 — 색기·연애 강도 +`
          )
        }
      }
    }
  }
  if (bDay.stem) {
    const bHy = HONGYEOM[bDay.stem]
    if (bHy) {
      for (const { idx, br } of otherBranches(A)) {
        if (br === bHy) {
          shinsalCrossLines.push(
            `${labelB} 일간(${bDay.stem}) 기준 홍염살(${bHy}) 이 ${labelA} ${PILLAR_LABELS[idx]}지(${br}) 에 적중 — 색기·연애 강도 +`
          )
        }
      }
    }
  }
  // 백호일주 cross
  const aDayPair = `${aDay.stem}${aDayBr}`
  const bDayPair = `${bDay.stem}${bDayBr}`
  const aIsBaekho = BAEKHO.has(aDayPair)
  const bIsBaekho = BAEKHO.has(bDayPair)
  if (aIsBaekho && bIsBaekho) {
    shinsalCrossLines.push(
      `${labelA}·${labelB} 둘 다 백호 일주(${aDayPair} / ${bDayPair}) — 격정·강한 의지 충돌 가능, 한쪽이 누그러져야 안정`
    )
  } else if (aIsBaekho || bIsBaekho) {
    const baekhoSide = aIsBaekho ? labelA : labelB
    const baekhoBr = aIsBaekho ? aDayBr : bDayBr
    const otherSide = aIsBaekho ? labelB : labelA
    const otherDayBr = aIsBaekho ? bDayBr : aDayBr
    if (baekhoBr && otherDayBr && BRANCH_CHUNG[baekhoBr] === otherDayBr) {
      shinsalCrossLines.push(
        `${baekhoSide} 백호 일주(${aIsBaekho ? aDayPair : bDayPair}) + ${otherSide} 일지가 그 백호 지지와 충(${baekhoBr}↔${otherDayBr}) — 격정 충돌 가능`
      )
    }
  }
  // 괴강일주 cross
  const aIsGoegang = GOEGANG.has(aDayPair)
  const bIsGoegang = GOEGANG.has(bDayPair)
  if (aIsGoegang && bIsGoegang) {
    shinsalCrossLines.push(
      `${labelA}·${labelB} 둘 다 괴강 일주(${aDayPair} / ${bDayPair}) — 카리스마 강 vs 강, 서로 안 꺾이면 부딪힘`
    )
  }

  // ── 지장간 cross — 정통 명리 깊이의 핵심.
  // 지장간(支藏干): 지지 안에 숨은 천간들. 본기/중기/여기. 표면 천간만이
  // 아닌 "지지 안의 숨은 관계" 가 진짜 결속·갈등을 만든다. cross 룰:
  //   1) 한쪽 일간 ↔ 상대 일지 지장간에 들어있으면 "숨은 매혹/통제"
  //      (특히 정관/정재 십성이면 배우자성 잠재)
  //   2) 한쪽 일지 지장간의 본기 ↔ 상대 일지 지장간의 본기 합/충
  //      → 깊은 결속 또는 숨은 갈등
  const JIJANGGAN_TABLE: Record<string, string[]> = {
    子: ['癸'],
    丑: ['癸', '辛', '己'],
    寅: ['戊', '丙', '甲'],
    卯: ['乙'],
    辰: ['乙', '癸', '戊'],
    巳: ['戊', '庚', '丙'],
    午: ['己', '丁'],
    未: ['丁', '乙', '己'],
    申: ['戊', '壬', '庚'],
    酉: ['辛'],
    戌: ['辛', '丁', '戊'],
    亥: ['戊', '壬'],
  }
  const jijangganCrossLines: string[] = []
  // (1) A 일간이 B 일지 지장간 안에 — 숨은 매혹/통제 결정.
  if (aDay.stem && bDayBr) {
    const bDayHidden = JIJANGGAN_TABLE[bDayBr] ?? []
    if (bDayHidden.includes(aDay.stem)) {
      jijangganCrossLines.push(
        `${labelA} 일간(${aDay.stem}) 이 ${labelB} 일지(${bDayBr}) 지장간 [${bDayHidden.join('·')}] 안에 숨어 있음 — 표면엔 안 보여도 ${labelB} 안에 ${labelA} 가 깊이 자리 잡은 관계`
      )
    }
  }
  if (bDay.stem && aDayBr) {
    const aDayHidden = JIJANGGAN_TABLE[aDayBr] ?? []
    if (aDayHidden.includes(bDay.stem)) {
      jijangganCrossLines.push(
        `${labelB} 일간(${bDay.stem}) 이 ${labelA} 일지(${aDayBr}) 지장간 [${aDayHidden.join('·')}] 안에 숨어 있음 — 표면엔 안 보여도 ${labelA} 안에 ${labelB} 가 깊이 자리 잡은 관계`
      )
    }
  }
  // (2) 두 일지 지장간 본기 끼리의 합/충. (본기 = 가장 강한 숨은 천간)
  if (aDayBr && bDayBr) {
    const aHidden = JIJANGGAN_TABLE[aDayBr] ?? []
    const bHidden = JIJANGGAN_TABLE[bDayBr] ?? []
    const aJeongi = aHidden[aHidden.length - 1] // 본기 = 마지막
    const bJeongi = bHidden[bHidden.length - 1]
    if (aJeongi && bJeongi && aJeongi !== aDay.stem && bJeongi !== bDay.stem) {
      if (STEM_HAP[aJeongi]?.other === bJeongi) {
        jijangganCrossLines.push(
          `${labelA} 일지 본기(${aJeongi}) + ${labelB} 일지 본기(${bJeongi}) 합화${STEM_HAP[aJeongi]!.element} — 표면 외에 *지지 깊이* 에서 결속`
        )
      } else if (STEM_CHUNG[aJeongi] === bJeongi) {
        jijangganCrossLines.push(
          `${labelA} 일지 본기(${aJeongi}) ↔ ${labelB} 일지 본기(${bJeongi}) 충 — 표면은 잠잠해도 *지지 깊이* 에서 부딪힘`
        )
      }
    }
  }

  // ── 조립: 우선순위 티어 ── (헤더 짧게, 빈자료 블록 생략, 빈 라인 제거)
  const out: string[] = ['== 시너스트리 (사주 cross) ==']
  if (elA && elB) {
    out.push(`[고정] ${labelA} 일간 ${aDay.stem}(${elA}) · ${labelB} 일간 ${bDay.stem}(${elB}) — 오행·방향 절대 뒤집지 말 것`)
  }
  if (critical.length) {
    out.push('[CRITICAL · 일간 극/천간합/일지 충형]')
    out.push(critical.join('\n'))
  }
  if (sibsinCrossLines.length) {
    out.push('[CRITICAL · 배우자성 (십성)]')
    out.push(...sibsinCrossLines)
  }
  if (shinsalCrossLines.length) {
    out.push('[CRITICAL · 신살 (도화·홍염·백호·괴강)]')
    out.push(...shinsalCrossLines)
  }
  if (jijangganCrossLines.length) {
    out.push('[CRITICAL · 지장간 (지지 깊이의 숨은 관계)]')
    out.push(...jijangganCrossLines)
  }
  if (important.length) {
    out.push('[IMPORTANT]')
    out.push(important.join('\n'))
  }
  if (chamgo.length) {
    out.push('[참고]')
    out.push(...chamgo)
  }
  return koreanize(out.join('\n'))
}
