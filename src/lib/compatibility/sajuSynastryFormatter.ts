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

const BRANCH_HYEONG_3 = [
  ['寅', '巳', '申'],
  ['丑', '戌', '未'],
]
const BRANCH_HYEONG_PAIR: Record<string, string> = {
  '子': '卯', '卯': '子',
}
const SELF_HYEONG = new Set(['辰', '午', '酉', '亥'])

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

const BRANCH_EL: Record<string, string> = {
  '寅': '목', '卯': '목', '巳': '화', '午': '화', '辰': '토',
  '戌': '토', '丑': '토', '未': '토', '申': '금', '酉': '금',
  '子': '수', '亥': '수',
}

const EL_CONTROLS: Record<string, string> = {
  '목': '토', '토': '수', '수': '화', '화': '금', '금': '목',
}

const CHEONULGWIIN: Record<string, string[]> = {
  '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
  '乙': ['子', '申'], '己': ['子', '申'],
  '丙': ['亥', '酉'], '丁': ['亥', '酉'],
  '辛': ['寅', '午'],
  '壬': ['巳', '卯'], '癸': ['巳', '卯'],
}

const BRANCH_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

// 12신살 — 일지 기준, 상대 지지에 라벨 부여 (synastry: A의 일지 → B 4지지)
const TWELVE_SHINSAL_LABELS = [
  '겁살', '재살', '천살', '지살', '년살', '월살',
  '망신', '장성', '반안', '역마', '육해', '화개',
] as const
const TWELVE_SHINSAL_START: Record<string, string> = {
  '申': '巳', '子': '巳', '辰': '巳',
  '亥': '申', '卯': '申', '未': '申',
  '寅': '亥', '午': '亥', '戌': '亥',
  '巳': '寅', '酉': '寅', '丑': '寅',
}
function twelveShinsalLabel(baseBranch: string, targetBranch: string): string | null {
  const start = TWELVE_SHINSAL_START[baseBranch]
  if (!start) return null
  const startIdx = BRANCH_ORDER.indexOf(start)
  const tIdx = BRANCH_ORDER.indexOf(targetBranch)
  if (startIdx < 0 || tIdx < 0) return null
  let offset = tIdx - startIdx
  while (offset < 0) offset += 12
  return TWELVE_SHINSAL_LABELS[offset % 12]
}

const PILLAR_LABELS = ['년', '월', '일', '시'] as const

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
      for (const trio of BRANCH_HYEONG_3) {
        if (trio.includes(aBr) && trio.includes(bBr) && aBr !== bBr) addTag(i, j, aBr, bBr, '3형')
      }
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

  // 삼합·방합 부분(3지 중 2지) → 참고로 묶음. 잘게 쪼개 반복하던 "큰 결속" 제거.
  const sbHap: string[] = []
  for (const trio of [...TRI_HAP, ...BANG_HAP]) {
    const aIdx = A.findIndex((p) => trio.branches.includes(p.branch))
    const bIdx = B.findIndex((p) => trio.branches.includes(p.branch))
    if (aIdx >= 0 && bIdx >= 0 && A[aIdx].branch !== B[bIdx].branch) {
      const tag = TRI_HAP.includes(trio) ? '삼합' : '방합'
      sbHap.push(`${trio.branches.join('')}${tag}(→${trio.element})`)
    }
  }
  if (sbHap.length > 0) {
    chamgo.push(`삼합/방합 부분 ${sbHap.length}건: ${sbHap.join(' · ')} — 3지 중 2지만 성립, 결속 잠재(비중 낮음)`)
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
  if (aDay.branch) {
    const items: string[] = []
    for (let j = 0; j < 4; j++) {
      if (!B[j].branch) continue
      const lbl = twelveShinsalLabel(aDay.branch, B[j].branch)
      if (lbl) items.push(`${B[j].branch}${lbl}`)
    }
    if (items.length) important.push(`12신살 ${labelA} 일지 ${aDay.branch} 기준 → ${labelB}: ${items.join('·')}`)
  }
  if (bDay.branch) {
    const items: string[] = []
    for (let i = 0; i < 4; i++) {
      if (!A[i].branch) continue
      const lbl = twelveShinsalLabel(bDay.branch, A[i].branch)
      if (lbl) items.push(`${A[i].branch}${lbl}`)
    }
    if (items.length) important.push(`12신살 ${labelB} 일지 ${bDay.branch} 기준 → ${labelA}: ${items.join('·')}`)
  }

  // 6. 현재 대운 cross → IMPORTANT
  if (input.currentDaeunA && input.currentDaeunB) {
    const dA = input.currentDaeunA, dB = input.currentDaeunB
    important.push(`현재 대운: ${labelA} ${dA.age ?? '?'}세 ${dA.stem}${dA.branch} · ${labelB} ${dB.age ?? '?'}세 ${dB.stem}${dB.branch}`)
    if (STEM_HAP[dA.stem]?.other === dB.stem) important.push(`대운 천간 ${dA.stem}${dB.stem}合化${STEM_HAP[dA.stem]!.element} (흐름 결속)`)
    if (STEM_CHUNG[dA.stem] === dB.stem) important.push(`대운 천간충 (시기 흐름 충돌)`)
    if (BRANCH_HAP[dA.branch]?.other === dB.branch) important.push(`대운 지지 ${dA.branch}${dB.branch}합 (결속)`)
    if (BRANCH_CHUNG[dA.branch] === dB.branch) important.push(`대운 지지충 (큰 흐름 충돌)`)
    if (dA.branch === dB.branch) important.push(`대운 지지 ${dA.branch} 일치 (강한 시기 공명)`)
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

  // ── 조립: 우선순위 티어 ──────────────────────────────────
  const out: string[] = ['== 시너스트리 (사주 cross) ==']
  if (elA && elB) {
    out.push(`[고정 매핑 — 절대 바꾸지 말 것] ${labelA} 일간 ${aDay.stem}(${elA}) · ${labelB} 일간 ${bDay.stem}(${elB})`)
  }
  out.push('')
  out.push('[CRITICAL — 반드시 해석] 일간 극·천간합·일지 충형')
  out.push(critical.length ? critical.join('\n') : '(해당 없음)')
  out.push('')
  out.push('[IMPORTANT — 맥락 보강]')
  out.push(important.length ? important.join('\n') : '(해당 없음)')
  if (chamgo.length) {
    out.push('')
    out.push('[참고 — 비중 낮음]')
    out.push(...chamgo)
  }
  return out.join('\n')
}
