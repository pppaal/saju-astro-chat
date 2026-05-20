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
  // 난다(준영 辛금을 "목"이라 부르는 등). 이름·오행을 데이터에 박아둔다.
  const nmA = (input.nameA || '').trim()
  const nmB = (input.nameB || '').trim()
  const labelA = nmA ? `A(${nmA})` : 'A'
  const labelB = nmB ? `B(${nmB})` : 'B'
  const elA = STEM_EL[aDay.stem]
  const elB = STEM_EL[bDay.stem]

  const out: string[] = ['== 시너스트리 (사주 cross) ==']
  // 앵커 — 라벨↔이름↔일간↔오행을 한 번 못 박는다. 아래 모든 cross 줄이
  // 이 매핑을 기준으로 읽히도록. (가장 자주 뒤집히던 지점)
  if (elA && elB) {
    out.push(
      `[고정 매핑 — 절대 바꾸지 말 것] ${labelA} 일간 ${aDay.stem}(${elA}) · ${labelB} 일간 ${bDay.stem}(${elB})`
    )
  }
  out.push('')

  // ── 1. 일간 cross ────────────────────────────────────────
  out.push('[일간 cross]')
  if (elA && elB) {
    if (elA === elB) {
      out.push(`${labelA} 일간 ${aDay.stem}(${elA}) ↔ ${labelB} 일간 ${bDay.stem}(${elB}) — 같은 오행 (비견)`)
    } else if (EL_CONTROLS[elA] === elB) {
      const a = nmA || 'A', b = nmB || 'B'
      out.push(
        `${labelA} 일간 ${aDay.stem}(${elA}) ↔ ${labelB} 일간 ${bDay.stem}(${elB}) — ${elA}극${elB} · 통제 방향 ${a}(${elA}) → ${b}(${elB}) (${a}이(가) ${b}을(를) 정리·다듬는 흐름, ${b}은(는) 따끔·제약처럼 느낄 수 있음) ※오행·방향 반대로 쓰지 말 것`
      )
    } else if (EL_CONTROLS[elB] === elA) {
      const a = nmA || 'A', b = nmB || 'B'
      out.push(
        `${labelA} 일간 ${aDay.stem}(${elA}) ↔ ${labelB} 일간 ${bDay.stem}(${elB}) — ${elB}극${elA} · 통제 방향 ${b}(${elB}) → ${a}(${elA}) (${b}이(가) ${a}을(를) 정리·다듬는 흐름, ${a}은(는) 따끔·제약처럼 느낄 수 있음) ※오행·방향 반대로 쓰지 말 것`
      )
    } else {
      out.push(`${labelA} 일간 ${aDay.stem}(${elA}) ↔ ${labelB} 일간 ${bDay.stem}(${elB}) — 상생 (서로 보완)`)
    }
  }
  out.push('')

  // ── 2. 4기둥 × 4기둥 cross ────────────────────────────────
  const crossLines: string[] = []
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const aS = A[i].stem, bS = B[j].stem
      if (aS && bS) {
        const hap = STEM_HAP[aS]
        if (hap && hap.other === bS) {
          crossLines.push(`A ${PILLAR_LABELS[i]}천간 ${aS} + B ${PILLAR_LABELS[j]}천간 ${bS} — ${aS}${bS}合化${hap.element} (천간합 — 화학적 끌림)`)
        }
        if (STEM_CHUNG[aS] === bS) {
          crossLines.push(`A ${PILLAR_LABELS[i]}천간 ${aS} ↔ B ${PILLAR_LABELS[j]}천간 ${bS} — 천간충 (대립)`)
        }
      }
      const aBr = A[i].branch, bBr = B[j].branch
      if (!aBr || !bBr) continue
      const key = `${i},${j}`
      const hits = new Set<string>()
      const hap = BRANCH_HAP[aBr]
      if (hap && hap.other === bBr) {
        crossLines.push(`A ${PILLAR_LABELS[i]}지 ${aBr} + B ${PILLAR_LABELS[j]}지 ${bBr} — ${aBr}${bBr}합화${hap.element} (지지합 — 결속)`)
        hits.add(key)
      }
      if (BRANCH_CHUNG[aBr] === bBr) {
        crossLines.push(`A ${PILLAR_LABELS[i]}지 ${aBr} ↔ B ${PILLAR_LABELS[j]}지 ${bBr} — ${aBr}${bBr}충 (충돌·이별 신호)`)
        hits.add(key)
      }
      if (BRANCH_HAE[aBr] === bBr && !hits.has(key)) {
        crossLines.push(`A ${PILLAR_LABELS[i]}지 ${aBr} ↔ B ${PILLAR_LABELS[j]}지 ${bBr} — ${aBr}${bBr}해/원진 (미묘한 거리감)`)
      }
      if (BRANCH_PA[aBr] === bBr && !hits.has(key)) {
        crossLines.push(`A ${PILLAR_LABELS[i]}지 ${aBr} ↔ B ${PILLAR_LABELS[j]}지 ${bBr} — ${aBr}${bBr}파 (사소한 파열)`)
      }
      if (BRANCH_HYEONG_PAIR[aBr] === bBr) {
        crossLines.push(`A ${PILLAR_LABELS[i]}지 ${aBr} ↔ B ${PILLAR_LABELS[j]}지 ${bBr} — ${aBr}${bBr}형 (무례지형 — 신경전)`)
      }
      for (const trio of BRANCH_HYEONG_3) {
        if (trio.includes(aBr) && trio.includes(bBr) && aBr !== bBr) {
          crossLines.push(`A ${PILLAR_LABELS[i]}지 ${aBr} ↔ B ${PILLAR_LABELS[j]}지 ${bBr} — ${trio.join('')} 3형 부분 (갈등·송사)`)
        }
      }
      if (SELF_HYEONG.has(aBr) && aBr === bBr) {
        crossLines.push(`A ${PILLAR_LABELS[i]}지 ${aBr} ↔ B ${PILLAR_LABELS[j]}지 ${bBr} — 자형 (자기 압박)`)
      }
    }
  }
  // 삼합·방합 — A 한 슬롯 + B 한 슬롯이 같은 trio에 속할 때
  for (const trio of [...TRI_HAP, ...BANG_HAP]) {
    const aIdx = A.findIndex((p) => trio.branches.includes(p.branch))
    const bIdx = B.findIndex((p) => trio.branches.includes(p.branch))
    if (aIdx >= 0 && bIdx >= 0 && A[aIdx].branch !== B[bIdx].branch) {
      const tag = TRI_HAP.includes(trio) ? '삼합' : '방합'
      crossLines.push(`A ${PILLAR_LABELS[aIdx]}지 ${A[aIdx].branch} + B ${PILLAR_LABELS[bIdx]}지 ${B[bIdx].branch} — ${trio.branches.join('')}${tag} 부분 (큰 결속 → ${trio.element})`)
    }
  }
  if (crossLines.length > 0) {
    out.push('[4기둥 × 4기둥 cross]')
    out.push(...crossLines)
    out.push('')
  }

  // ── 3. 신살 cross (천을귀인) ─────────────────────────────
  const shinsalLines: string[] = []
  const aCheonul = CHEONULGWIIN[aDay.stem] ?? []
  const bCheonul = CHEONULGWIIN[bDay.stem] ?? []
  for (let j = 0; j < 4; j++) {
    if (aCheonul.includes(B[j].branch)) {
      shinsalLines.push(`A's 천을귀인 (${aCheonul.join('·')}, 일간 ${aDay.stem} 기준) activates B's ${PILLAR_LABELS[j]}지 ${B[j].branch} → 길성 보호`)
    }
  }
  for (let i = 0; i < 4; i++) {
    if (bCheonul.includes(A[i].branch)) {
      shinsalLines.push(`B's 천을귀인 (${bCheonul.join('·')}, 일간 ${bDay.stem} 기준) activates A's ${PILLAR_LABELS[i]}지 ${A[i].branch} → 길성 보호`)
    }
  }
  if (shinsalLines.length > 0) {
    out.push('[신살 cross — 천을귀인]')
    out.push(...shinsalLines)
    out.push('')
  }

  // ── 12신살 cross — A의 일지 기준 B의 4지지, B의 일지 기준 A의 4지지 ──
  const twelveLines: string[] = []
  if (aDay.branch) {
    for (let j = 0; j < 4; j++) {
      if (!B[j].branch) continue
      const lbl = twelveShinsalLabel(aDay.branch, B[j].branch)
      if (lbl) {
        twelveLines.push(`A's 일지 ${aDay.branch} 기준 → B ${PILLAR_LABELS[j]}지 ${B[j].branch} = ${lbl}`)
      }
    }
  }
  if (bDay.branch) {
    for (let i = 0; i < 4; i++) {
      if (!A[i].branch) continue
      const lbl = twelveShinsalLabel(bDay.branch, A[i].branch)
      if (lbl) {
        twelveLines.push(`B's 일지 ${bDay.branch} 기준 → A ${PILLAR_LABELS[i]}지 ${A[i].branch} = ${lbl}`)
      }
    }
  }
  if (twelveLines.length > 0) {
    out.push('[12신살 cross — 상대 지지가 내 일지 기준 어떤 신살로 잡히나]')
    out.push(...twelveLines)
    out.push('')
  }

  // ── 4. 대운 cross ────────────────────────────────────────
  if (input.currentDaeunA && input.currentDaeunB) {
    const dA = input.currentDaeunA, dB = input.currentDaeunB
    const daeLines: string[] = []
    daeLines.push(`A 현재 대운: ${dA.age ?? '?'}세 ${dA.stem}${dA.branch}`)
    daeLines.push(`B 현재 대운: ${dB.age ?? '?'}세 ${dB.stem}${dB.branch}`)
    if (STEM_HAP[dA.stem]?.other === dB.stem) {
      daeLines.push(`A 대운 ${dA.stem} + B 대운 ${dB.stem} — ${dA.stem}${dB.stem}合化${STEM_HAP[dA.stem]!.element} (대운 흐름 결속)`)
    }
    if (STEM_CHUNG[dA.stem] === dB.stem) {
      daeLines.push(`A 대운 ${dA.stem} ↔ B 대운 ${dB.stem} — 대운 천간충 (시기 흐름 충돌)`)
    }
    if (BRANCH_HAP[dA.branch]?.other === dB.branch) {
      daeLines.push(`A 대운 ${dA.branch} + B 대운 ${dB.branch} — ${dA.branch}${dB.branch}합 (대운 지지 결속)`)
    }
    if (BRANCH_CHUNG[dA.branch] === dB.branch) {
      daeLines.push(`A 대운 ${dA.branch} ↔ B 대운 ${dB.branch} — 대운 지지충 (큰 흐름 충돌)`)
    }
    if (dA.branch === dB.branch) {
      daeLines.push(`A 대운 ${dA.branch} = B 대운 ${dB.branch} — 대운 지지 일치 (강한 시기 공명)`)
    }
    out.push('[현재 대운 cross]')
    out.push(...daeLines)
    out.push('')
  }

  // ── 5. 오행 균형 ────────────────────────────────────────
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
  out.push('[오행 균형]')
  out.push(`A: ${els.map((e) => `${e}${countsA[e]}`).join(' ')}`)
  out.push(`B: ${els.map((e) => `${e}${countsB[e]}`).join(' ')}`)
  const merged: Record<string, number> = {}
  for (const e of els) merged[e] = countsA[e] + countsB[e]
  out.push(`합산: ${els.map((e) => `${e}${merged[e]}`).join(' ')}`)
  const sorted = [...els].sort((a, b) => merged[b] - merged[a])
  if (merged[sorted[0]] - merged[sorted[4]] >= 4) {
    out.push(`→ ${sorted[0]} 강 / ${sorted[4]} 약 — 둘 합쳐도 편중 (보완 필요)`)
  } else {
    out.push(`→ ${sorted[0]}~${sorted[4]} 폭 좁음 — 합쳐서 비교적 균형`)
  }

  return out.join('\n')
}
