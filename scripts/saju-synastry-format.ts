/**
 * 사주 시너스트리 (궁합) formatter — 점성 synastry 라인 포맷과 같은 형태로
 * 두 사람의 사주 cross 신호를 나열.
 *
 * 케이스:
 *   A: 1995-02-09 06:40 男 서울 (일간 辛, 음년 → 대운 역행)
 *   B: 1991-02-03 00:35 女 서울 (일간 甲, 음년 → 대운 순행)
 *
 * 출력 카테고리:
 *   1. 4기둥 × 4기둥 cross — 천간합/충, 지지합/충/형/해/파/자형/삼합/방합
 *   2. 일간 cross — 오행 상생/상극 (가장 중요한 한 줄)
 *   3. 신살 cross — A 천을귀인이 B 어디 활성화 (양방향)
 *   4. 대운 cross — 두 사람 현재 대운 사이 합/충
 *   5. 오행 균형 — 합쳤을 때 분포
 *
 * 실행: npx tsx scripts/saju-synastry-format.ts
 */

import { calculateSajuData } from '../src/lib/saju/saju'

const PERSON_A = { date: '1995-02-09', time: '06:40', gender: 'male' as const, tag: 'A 남' }
const PERSON_B = { date: '1991-02-03', time: '00:35', gender: 'female' as const, tag: 'B 여' }
const TZ = 'Asia/Seoul'

// ── 정통 명리 cross 룰 테이블 ─────────────────────────────────

// 천간합 (5쌍) — 합 + 化(transmutes to) element
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

// 천간충 (7쌍, 같은 오행은 X)
const STEM_CHUNG: Record<string, string> = {
  '甲': '庚', '庚': '甲',
  '乙': '辛', '辛': '乙',
  '丙': '壬', '壬': '丙',
  '丁': '癸', '癸': '丁',
}

// 지지 6합
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

// 지지충 (6쌍)
const BRANCH_CHUNG: Record<string, string> = {
  '子': '午', '午': '子',
  '丑': '未', '未': '丑',
  '寅': '申', '申': '寅',
  '卯': '酉', '酉': '卯',
  '辰': '戌', '戌': '辰',
  '巳': '亥', '亥': '巳',
}

// 지지해/원진 (6쌍)
const BRANCH_HAE: Record<string, string> = {
  '子': '未', '未': '子',
  '丑': '午', '午': '丑',
  '寅': '巳', '巳': '寅',
  '卯': '辰', '辰': '卯',
  '申': '亥', '亥': '申',
  '酉': '戌', '戌': '酉',
}

// 지지파 (6쌍)
const BRANCH_PA: Record<string, string> = {
  '子': '酉', '酉': '子',
  '丑': '辰', '辰': '丑',
  '寅': '亥', '亥': '寅',
  '卯': '午', '午': '卯',
  '巳': '申', '申': '巳',
  '戌': '未', '未': '戌',
}

// 지지형 (3형)
const BRANCH_HYEONG_3 = [
  ['寅', '巳', '申'],  // 3형 (寅巳, 巳申, 寅申)
  ['丑', '戌', '未'],  // 3형 (丑戌, 戌未, 丑未) — 丑未는 충도 함
]
const BRANCH_HYEONG_PAIR: Record<string, string> = {
  '子': '卯', '卯': '子',  // 자묘 (무례지형)
}
const SELF_HYEONG = new Set(['辰', '午', '酉', '亥'])

// 삼합 (4조)
const TRI_HAP: Array<{ branches: string[]; element: string }> = [
  { branches: ['申', '子', '辰'], element: '수' },
  { branches: ['亥', '卯', '未'], element: '목' },
  { branches: ['寅', '午', '戌'], element: '화' },
  { branches: ['巳', '酉', '丑'], element: '금' },
]

// 방합 (4조)
const BANG_HAP: Array<{ branches: string[]; element: string }> = [
  { branches: ['寅', '卯', '辰'], element: '목' },
  { branches: ['巳', '午', '未'], element: '화' },
  { branches: ['申', '酉', '戌'], element: '금' },
  { branches: ['亥', '子', '丑'], element: '수' },
]

// 천간 → 오행
const STEM_EL: Record<string, string> = {
  '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
  '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수',
}
// 지지 → 오행
const BRANCH_EL: Record<string, string> = {
  '寅': '목', '卯': '목', '巳': '화', '午': '화', '辰': '토',
  '戌': '토', '丑': '토', '未': '토', '申': '금', '酉': '금',
  '子': '수', '亥': '수',
}

// 오행 상극
const EL_CONTROLS: Record<string, string> = {
  '목': '토', '토': '수', '수': '화', '화': '금', '금': '목',
}

// 천을귀인 (일간 → 지지 2개)
const CHEONULGWIIN: Record<string, string[]> = {
  '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
  '乙': ['子', '申'], '己': ['子', '申'],
  '丙': ['亥', '酉'], '丁': ['亥', '酉'],
  '辛': ['寅', '午'],
  '壬': ['巳', '卯'], '癸': ['巳', '卯'],
}

const PILLAR_LABELS = ['년', '월', '일', '시'] as const

interface Pillar {
  stem: string
  branch: string
}

interface Saju {
  pillars: [Pillar, Pillar, Pillar, Pillar]  // 년월일시
  dayMaster: string
  currentDaeun?: { stem: string; branch: string; age?: number }
  elementCounts: Record<string, number>
}

function extractSaju(person: typeof PERSON_A): Saju {
  const s = calculateSajuData(person.date, person.time, person.gender, 'solar', TZ)
  const p = s.pillars
  const pillars: [Pillar, Pillar, Pillar, Pillar] = [
    { stem: p?.year?.heavenlyStem?.name ?? '', branch: p?.year?.earthlyBranch?.name ?? '' },
    { stem: p?.month?.heavenlyStem?.name ?? '', branch: p?.month?.earthlyBranch?.name ?? '' },
    { stem: p?.day?.heavenlyStem?.name ?? '', branch: p?.day?.earthlyBranch?.name ?? '' },
    { stem: p?.time?.heavenlyStem?.name ?? '', branch: p?.time?.earthlyBranch?.name ?? '' },
  ]
  // 오행 카운트
  const elementCounts: Record<string, number> = { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 }
  for (const pl of pillars) {
    if (STEM_EL[pl.stem]) elementCounts[STEM_EL[pl.stem]]++
    if (BRANCH_EL[pl.branch]) elementCounts[BRANCH_EL[pl.branch]]++
  }
  const cur = s.daeWoon?.current
  return {
    pillars,
    dayMaster: pillars[2].stem,
    currentDaeun: cur ? { stem: cur.heavenlyStem ?? '', branch: cur.earthlyBranch ?? '', age: cur.age } : undefined,
    elementCounts,
  }
}

const lines: string[] = []
function push(s: string) { lines.push(s) }

function main() {
  const A = extractSaju(PERSON_A)
  const B = extractSaju(PERSON_B)

  // ── 1. 일간 cross — 한 줄 핵심 ──────────────────────────
  push('[일간 cross]')
  const elA = STEM_EL[A.dayMaster]
  const elB = STEM_EL[B.dayMaster]
  if (elA === elB) {
    push(`A 일간 ${A.dayMaster}(${elA}) ↔ B 일간 ${B.dayMaster}(${elB}) — 같은 오행 (비견)`)
  } else if (EL_CONTROLS[elA] === elB) {
    push(`A 일간 ${A.dayMaster}(${elA}) ↔ B 일간 ${B.dayMaster}(${elB}) — ${elA}극${elB} (A가 B를 통제)`)
  } else if (EL_CONTROLS[elB] === elA) {
    push(`A 일간 ${A.dayMaster}(${elA}) ↔ B 일간 ${B.dayMaster}(${elB}) — ${elB}극${elA} (B가 A를 통제)`)
  } else {
    // 상생 관계
    push(`A 일간 ${A.dayMaster}(${elA}) ↔ B 일간 ${B.dayMaster}(${elB}) — 상생 (서로 보완)`)
  }
  push('')

  // ── 2. 4기둥 × 4기둥 cross ──────────────────────────────
  push('[4기둥 × 4기둥 cross]')
  // 천간 cross
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const aStem = A.pillars[i].stem
      const bStem = B.pillars[j].stem
      if (!aStem || !bStem) continue
      const hap = STEM_HAP[aStem]
      if (hap && hap.other === bStem) {
        push(`A ${PILLAR_LABELS[i]}천간 ${aStem} + B ${PILLAR_LABELS[j]}천간 ${bStem} — ${aStem}${bStem}合化${hap.element} (천간합 — 화학적 끌림)`)
      }
      if (STEM_CHUNG[aStem] === bStem) {
        push(`A ${PILLAR_LABELS[i]}천간 ${aStem} ↔ B ${PILLAR_LABELS[j]}천간 ${bStem} — 천간충 (대립)`)
      }
    }
  }
  // 지지 cross
  const branchHits = new Set<string>()  // 중복 방지 (sorted pair key)
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const aBr = A.pillars[i].branch
      const bBr = B.pillars[j].branch
      if (!aBr || !bBr) continue
      const key = `${i},${j}`

      const hap = BRANCH_HAP[aBr]
      if (hap && hap.other === bBr) {
        push(`A ${PILLAR_LABELS[i]}지 ${aBr} + B ${PILLAR_LABELS[j]}지 ${bBr} — ${aBr}${bBr}합화${hap.element} (지지합 — 결속)`)
        branchHits.add(key)
      }
      if (BRANCH_CHUNG[aBr] === bBr) {
        push(`A ${PILLAR_LABELS[i]}지 ${aBr} ↔ B ${PILLAR_LABELS[j]}지 ${bBr} — ${aBr}${bBr}충 (충돌·이별 신호)`)
        branchHits.add(key)
      }
      if (BRANCH_HAE[aBr] === bBr && !branchHits.has(key)) {
        push(`A ${PILLAR_LABELS[i]}지 ${aBr} ↔ B ${PILLAR_LABELS[j]}지 ${bBr} — ${aBr}${bBr}해/원진 (미묘한 거리감)`)
      }
      if (BRANCH_PA[aBr] === bBr && !branchHits.has(key)) {
        push(`A ${PILLAR_LABELS[i]}지 ${aBr} ↔ B ${PILLAR_LABELS[j]}지 ${bBr} — ${aBr}${bBr}파 (사소한 파열)`)
      }
      // 형 (자묘만 pair, 나머지는 3형)
      if (BRANCH_HYEONG_PAIR[aBr] === bBr) {
        push(`A ${PILLAR_LABELS[i]}지 ${aBr} ↔ B ${PILLAR_LABELS[j]}지 ${bBr} — ${aBr}${bBr}형 (무례지형 — 신경전)`)
      }
      // 3형 부분 매칭
      for (const trio of BRANCH_HYEONG_3) {
        if (trio.includes(aBr) && trio.includes(bBr) && aBr !== bBr) {
          push(`A ${PILLAR_LABELS[i]}지 ${aBr} ↔ B ${PILLAR_LABELS[j]}지 ${bBr} — ${trio.join('')} 3형 부분 (갈등·송사)`)
        }
      }
      // 자형
      if (SELF_HYEONG.has(aBr) && aBr === bBr) {
        push(`A ${PILLAR_LABELS[i]}지 ${aBr} ↔ B ${PILLAR_LABELS[j]}지 ${bBr} — 자형 (자기 압박)`)
      }
    }
  }
  // 삼합·방합 — A의 한 슬롯 + B의 한 슬롯이 합쳐 같은 trio에 속하면
  for (const trio of [...TRI_HAP, ...BANG_HAP]) {
    const aIdx = A.pillars.findIndex((p) => trio.branches.includes(p.branch))
    const bIdx = B.pillars.findIndex((p) => trio.branches.includes(p.branch))
    if (aIdx >= 0 && bIdx >= 0) {
      const aBr = A.pillars[aIdx].branch
      const bBr = B.pillars[bIdx].branch
      if (aBr !== bBr) {
        const tag = TRI_HAP.includes(trio) ? '삼합' : '방합'
        push(`A ${PILLAR_LABELS[aIdx]}지 ${aBr} + B ${PILLAR_LABELS[bIdx]}지 ${bBr} — ${trio.branches.join('')}${tag} 부분 (큰 결속 → ${trio.element})`)
      }
    }
  }
  push('')

  // ── 3. 신살 cross (천을귀인) ────────────────────────────
  push('[신살 cross — 천을귀인]')
  const aCheonul = CHEONULGWIIN[A.dayMaster] ?? []
  const bCheonul = CHEONULGWIIN[B.dayMaster] ?? []
  // A의 천을귀인이 B 4기둥의 어느 지지와 일치?
  for (let j = 0; j < 4; j++) {
    if (aCheonul.includes(B.pillars[j].branch)) {
      push(`A's 천을귀인 (${aCheonul.join('·')}, 일간 ${A.dayMaster} 기준) activates B's ${PILLAR_LABELS[j]}지 ${B.pillars[j].branch} → 길성 보호`)
    }
  }
  for (let i = 0; i < 4; i++) {
    if (bCheonul.includes(A.pillars[i].branch)) {
      push(`B's 천을귀인 (${bCheonul.join('·')}, 일간 ${B.dayMaster} 기준) activates A's ${PILLAR_LABELS[i]}지 ${A.pillars[i].branch} → 길성 보호`)
    }
  }
  push('')

  // ── 4. 대운 cross ──────────────────────────────────────
  if (A.currentDaeun && B.currentDaeun) {
    push('[현재 대운 cross]')
    push(`A 현재 대운: ${A.currentDaeun.age}세 ${A.currentDaeun.stem}${A.currentDaeun.branch}`)
    push(`B 현재 대운: ${B.currentDaeun.age}세 ${B.currentDaeun.stem}${B.currentDaeun.branch}`)
    const aS = A.currentDaeun.stem
    const bS = B.currentDaeun.stem
    if (STEM_HAP[aS]?.other === bS) {
      push(`A 대운 ${aS} + B 대운 ${bS} — ${aS}${bS}合化${STEM_HAP[aS]!.element} (대운 흐름 결속)`)
    }
    if (STEM_CHUNG[aS] === bS) {
      push(`A 대운 ${aS} ↔ B 대운 ${bS} — 대운 천간충 (시기 흐름 충돌)`)
    }
    const aB = A.currentDaeun.branch
    const bB = B.currentDaeun.branch
    if (BRANCH_HAP[aB]?.other === bB) {
      push(`A 대운 ${aB} + B 대운 ${bB} — ${aB}${bB}합 (대운 지지 결속)`)
    }
    if (BRANCH_CHUNG[aB] === bB) {
      push(`A 대운 ${aB} ↔ B 대운 ${bB} — 대운 지지충 (큰 흐름 충돌)`)
    }
    if (aB === bB && SELF_HYEONG.has(aB)) {
      push(`A 대운 ${aB} = B 대운 ${bB} — 자형 (대운 자기 압박 공명)`)
    }
    push('')
  }

  // ── 5. 오행 균형 ───────────────────────────────────────
  push('[오행 균형]')
  const els = ['목', '화', '토', '금', '수'] as const
  const aStr = els.map((e) => `${e}${A.elementCounts[e]}`).join(' ')
  const bStr = els.map((e) => `${e}${B.elementCounts[e]}`).join(' ')
  const merged: Record<string, number> = {}
  for (const e of els) merged[e] = A.elementCounts[e] + B.elementCounts[e]
  const mergedStr = els.map((e) => `${e}${merged[e]}`).join(' ')
  push(`A: ${aStr}`)
  push(`B: ${bStr}`)
  push(`합산: ${mergedStr}`)
  const sortedEls = [...els].sort((a, b) => merged[b] - merged[a])
  const top = sortedEls[0]
  const bottom = sortedEls[4]
  if (merged[top] - merged[bottom] >= 4) {
    push(`→ ${top} 강 / ${bottom} 약 — 둘 합쳐도 편중 (보완 필요)`)
  } else {
    push(`→ ${top}~${bottom} 폭 좁음 — 합쳐서 비교적 균형`)
  }

  console.log(lines.join('\n'))
}

main()
