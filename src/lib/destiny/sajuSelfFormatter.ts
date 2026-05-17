/**
 * 운명 상담사용 한 사람 사주 self-cross 라인 포맷.
 *
 * 카테고리:
 *   1. 4기둥 — stem(sibsin) · branch(sibsin)
 *   2. 4기둥 내부 cross — 천간합/충, 지지합/충/형/해/파/자형/삼합/방합
 *   3. 신살 — 천을귀인, 도화, 역마, 화개, 양인, 괴강, 공망
 *   4. 12운성 (일간 vs 4 지지)
 *   5. 격국 · 용신 · 일간 강약
 *   6. 현재 시기 cross (대운/세운/월운/일진 vs 본명 4기둥)
 *
 * dev 검증: scripts/destiny-counselor-lines-example.ts.
 */

// ── 정통 명리 룰 테이블 ─────────────────────────────────────

const STEM_HAP: Record<string, { other: string; element: string }> = {
  '甲': { other: '己', element: '토' }, '己': { other: '甲', element: '토' },
  '乙': { other: '庚', element: '금' }, '庚': { other: '乙', element: '금' },
  '丙': { other: '辛', element: '수' }, '辛': { other: '丙', element: '수' },
  '丁': { other: '壬', element: '목' }, '壬': { other: '丁', element: '목' },
  '戊': { other: '癸', element: '화' }, '癸': { other: '戊', element: '화' },
}

const STEM_CHUNG: Record<string, string> = {
  '甲': '庚', '庚': '甲', '乙': '辛', '辛': '乙',
  '丙': '壬', '壬': '丙', '丁': '癸', '癸': '丁',
}

const BRANCH_HAP: Record<string, { other: string; element: string }> = {
  '子': { other: '丑', element: '토' }, '丑': { other: '子', element: '토' },
  '寅': { other: '亥', element: '목' }, '亥': { other: '寅', element: '목' },
  '卯': { other: '戌', element: '화' }, '戌': { other: '卯', element: '화' },
  '辰': { other: '酉', element: '금' }, '酉': { other: '辰', element: '금' },
  '巳': { other: '申', element: '수' }, '申': { other: '巳', element: '수' },
  '午': { other: '未', element: '화' }, '未': { other: '午', element: '화' },
}

const BRANCH_CHUNG: Record<string, string> = {
  '子': '午', '午': '子', '丑': '未', '未': '丑',
  '寅': '申', '申': '寅', '卯': '酉', '酉': '卯',
  '辰': '戌', '戌': '辰', '巳': '亥', '亥': '巳',
}

const BRANCH_HAE: Record<string, string> = {
  '子': '未', '未': '子', '丑': '午', '午': '丑',
  '寅': '巳', '巳': '寅', '卯': '辰', '辰': '卯',
  '申': '亥', '亥': '申', '酉': '戌', '戌': '酉',
}

const BRANCH_PA: Record<string, string> = {
  '子': '酉', '酉': '子', '丑': '辰', '辰': '丑',
  '寅': '亥', '亥': '寅', '卯': '午', '午': '卯',
  '巳': '申', '申': '巳', '戌': '未', '未': '戌',
}

const BRANCH_HYEONG_3 = [
  ['寅', '巳', '申'],
  ['丑', '戌', '未'],
]
const BRANCH_HYEONG_PAIR: Record<string, string> = { '子': '卯', '卯': '子' }
const SELF_HYEONG = new Set(['辰', '午', '酉', '亥'])

const TRI_HAP = [
  { branches: ['申', '子', '辰'], element: '수' },
  { branches: ['亥', '卯', '未'], element: '목' },
  { branches: ['寅', '午', '戌'], element: '화' },
  { branches: ['巳', '酉', '丑'], element: '금' },
]

// 신살 — 천을귀인 (일간 → 지지 2개)
const CHEONULGWIIN: Record<string, string[]> = {
  '甲': ['丑', '未'], '戊': ['丑', '未'], '庚': ['丑', '未'],
  '乙': ['子', '申'], '己': ['子', '申'],
  '丙': ['亥', '酉'], '丁': ['亥', '酉'],
  '辛': ['寅', '午'],
  '壬': ['巳', '卯'], '癸': ['巳', '卯'],
}

// 도화·역마·화개 — 년지/일지 기준 → 지지
const DOHWA: Record<string, string> = {
  '寅': '卯', '午': '卯', '戌': '卯',  // 寅午戌 → 卯
  '申': '酉', '子': '酉', '辰': '酉',  // 申子辰 → 酉
  '巳': '午', '酉': '午', '丑': '午',  // 巳酉丑 → 午
  '亥': '子', '卯': '子', '未': '子',  // 亥卯未 → 子
}
const YEOKMA: Record<string, string> = {
  '寅': '申', '午': '申', '戌': '申',
  '申': '寅', '子': '寅', '辰': '寅',
  '巳': '亥', '酉': '亥', '丑': '亥',
  '亥': '巳', '卯': '巳', '未': '巳',
}
const HWAGAE: Record<string, string> = {
  '寅': '戌', '午': '戌', '戌': '戌',
  '申': '辰', '子': '辰', '辰': '辰',
  '巳': '丑', '酉': '丑', '丑': '丑',
  '亥': '未', '卯': '未', '未': '未',
}

// 양인 — 일간 기준
const YANGIN: Record<string, string> = {
  '甲': '卯', '丙': '午', '戊': '午', '庚': '酉', '壬': '子',
}

// 괴강 — 일주 (일주가 이 4개 중 하나면 발동)
const GOEGANG = new Set(['庚辰', '庚戌', '壬辰', '戊戌'])

// 공망 — 일주 60갑자 → 공망 지지 2개 (정통 60갑자 6 순)
const GONGMANG: Record<string, [string, string]> = (() => {
  const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
  const GONG_PAIRS: [string, string][] = [
    ['戌', '亥'], // 甲子순 (0-9)
    ['申', '酉'], // 甲戌순 (10-19)
    ['午', '未'], // 甲申순 (20-29)
    ['辰', '巳'], // 甲午순 (30-39)
    ['寅', '卯'], // 甲辰순 (40-49)
    ['子', '丑'], // 甲寅순 (50-59)
  ]
  const map: Record<string, [string, string]> = {}
  for (let i = 0; i < 60; i++) {
    const stem = STEMS[i % 10]
    const branch = BRANCHES[i % 12]
    const sunIdx = Math.floor(i / 10)
    map[`${stem}${branch}`] = GONG_PAIRS[sunIdx]
  }
  return map
})()

// 12운성 (일간 × 지지) — 양간 순행, 음간 역행
const STEM_YINYANG: Record<string, 'yang' | 'yin'> = {
  '甲': 'yang', '丙': 'yang', '戊': 'yang', '庚': 'yang', '壬': 'yang',
  '乙': 'yin', '丁': 'yin', '己': 'yin', '辛': 'yin', '癸': 'yin',
}
const STAGE_ORDER = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양']
const BRANCH_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
// 양간 장생 시작 지지
const YANG_JANGSAENG: Record<string, string> = {
  '甲': '亥', '丙': '寅', '戊': '寅', '庚': '巳', '壬': '申',
}
// 음간 장생 시작 지지
const YIN_JANGSAENG: Record<string, string> = {
  '乙': '午', '丁': '酉', '己': '酉', '辛': '子', '癸': '卯',
}

function twelveStage(dayStem: string, branch: string): string {
  const isYang = STEM_YINYANG[dayStem] === 'yang'
  const startBranch = isYang ? YANG_JANGSAENG[dayStem] : YIN_JANGSAENG[dayStem]
  if (!startBranch) return '?'
  const startIdx = BRANCH_ORDER.indexOf(startBranch)
  const branchIdx = BRANCH_ORDER.indexOf(branch)
  if (startIdx < 0 || branchIdx < 0) return '?'
  // 양간 순행: branch 위치를 start에서 +1씩 → stage idx
  // 음간 역행: -1씩
  let offset = branchIdx - startIdx
  if (!isYang) offset = -offset
  while (offset < 0) offset += 12
  return STAGE_ORDER[offset % 12]
}

const PILLAR_LABELS = ['년', '월', '일', '시'] as const

// 천간/지지 → 오행 (오행 카운트 계산용)
const STEM_EL_LOCAL: Record<string, string> = {
  '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
  '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수',
}
const BRANCH_EL_LOCAL: Record<string, string> = {
  '寅': '목', '卯': '목', '巳': '화', '午': '화', '辰': '토',
  '戌': '토', '丑': '토', '未': '토', '申': '금', '酉': '금',
  '子': '수', '亥': '수',
}

export interface SajuSelfPillarInput {
  stem: string
  branch: string
  stemSibsin?: string
  branchSibsin?: string
  /** 지장간 — 그 지지 안에 숨은 천간들 (chogi/junggi/jeonggi 순) */
  jijanggan?: string[]
}

export interface SajuSelfInput {
  pillars: SajuSelfPillarInput[]  // 년/월/일/시
  /** 일간 메타 (음양·오행) — output에 한 줄로 표시 */
  dayMaster?: { name: string; element: string; yinYang?: string } | null
  geokguk?: string | null
  yongsin?: { primary?: string; type?: string; dayMasterStrength?: string; kibsin?: string } | null
  /** 대운 시계열 — 시작 age 순서 */
  daeunList?: Array<{ age: number; stem: string; branch: string; sibsinStem?: string; sibsinBranch?: string }>
  currentDaeun?: { stem: string; branch: string; age?: number } | null
  currentSewoon?: { stem: string; branch: string; year?: number } | null
  currentWolwoon?: { stem: string; branch: string } | null
  currentIljin?: { stem: string; branch: string; date?: string } | null
}

/**
 * 한 사주 → 정통 self-cross 라인 list.
 * pillars 부족 시 빈 string.
 */
export function formatSajuSelf(input: SajuSelfInput): string {
  if (input.pillars.length < 4) return ''
  const P = input.pillars
  const day = P[2]
  if (!day.stem || !day.branch) return ''

  const out: string[] = ['== 사주 ==', '']

  // 일간 + 오행 카운트
  if (input.dayMaster) {
    out.push(`일간: ${input.dayMaster.name}(${input.dayMaster.yinYang ?? ''}${input.dayMaster.element})`)
  } else {
    out.push(`일간: ${day.stem}`)
  }
  const elCounts: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  for (const p of P) {
    if (STEM_EL_LOCAL[p.stem]) elCounts[STEM_EL_LOCAL[p.stem]]++
    if (BRANCH_EL_LOCAL[p.branch]) elCounts[BRANCH_EL_LOCAL[p.branch]]++
  }
  out.push(`오행: 목 ${elCounts['목']} / 화 ${elCounts['화']} / 토 ${elCounts['토']} / 금 ${elCounts['금']} / 수 ${elCounts['수']}`)
  out.push('')

  // 4기둥
  out.push('[4기둥]')
  for (let i = 0; i < 4; i++) {
    const stemSib = i === 2 ? '-' : (P[i].stemSibsin ?? '-')
    const branchSib = P[i].branchSibsin ?? '-'
    out.push(`${PILLAR_LABELS[i]}: ${P[i].stem}${P[i].branch}  (천간 ${stemSib} / 지지 ${branchSib})`)
  }
  out.push('')

  // 지장간
  const hasJijanggan = P.some((p) => p.jijanggan && p.jijanggan.length > 0)
  if (hasJijanggan) {
    out.push('[지장간 — 각 지지 안 숨은 천간]')
    for (let i = 0; i < 4; i++) {
      const j = P[i].jijanggan ?? []
      if (j.length > 0) out.push(`${PILLAR_LABELS[i]}지 ${P[i].branch}: ${j.join(' · ')}`)
    }
    out.push('')
  }

  // 대운 시계열 — prev/current/next 3개만 (full list는 너무 길어짐)
  if (input.daeunList && input.daeunList.length > 0 && input.currentDaeun) {
    const curIdx = input.daeunList.findIndex((d) => d.age === input.currentDaeun?.age)
    if (curIdx >= 0) {
      const window = input.daeunList.slice(Math.max(0, curIdx - 1), Math.min(input.daeunList.length, curIdx + 2))
      out.push('[대운]')
      for (const d of window) {
        const marker = d.age === input.currentDaeun?.age ? ' ← 현재' : ''
        const sib = `${d.sibsinStem ?? '?'}/${d.sibsinBranch ?? '?'}`
        out.push(`${d.age}세 ${d.stem}${d.branch}  ${sib}${marker}`)
      }
      out.push('')
    }
  }

  // 현재 세운 / 월운 / 일진 — 1줄씩
  const periodLines: string[] = []
  if (input.currentSewoon) periodLines.push(`세운 ${input.currentSewoon.year ?? '?'}: ${input.currentSewoon.stem}${input.currentSewoon.branch}`)
  if (input.currentWolwoon) periodLines.push(`월운: ${input.currentWolwoon.stem}${input.currentWolwoon.branch}`)
  if (input.currentIljin) periodLines.push(`일진${input.currentIljin.date ? ` (${input.currentIljin.date})` : ''}: ${input.currentIljin.stem}${input.currentIljin.branch}`)
  if (periodLines.length > 0) {
    out.push('[현재 시기]')
    out.push(...periodLines)
    out.push('')
  }

  // 격국 · 용신
  if (input.geokguk || input.yongsin?.primary) {
    out.push('[격국 · 용신]')
    if (input.geokguk) out.push(`격국: ${input.geokguk}`)
    if (input.yongsin?.primary) {
      const parts = [input.yongsin.primary]
      if (input.yongsin.type) parts.push(`(${input.yongsin.type})`)
      if (input.yongsin.dayMasterStrength) parts.push(`· 일간 ${input.yongsin.dayMasterStrength}`)
      if (input.yongsin.kibsin) parts.push(`· 기신 ${input.yongsin.kibsin}`)
      out.push(`용신: ${parts.join(' ')}`)
    }
    out.push('')
  }

  // 4기둥 내부 cross
  const crossLines: string[] = []
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const aS = P[i].stem, bS = P[j].stem
      if (aS && bS) {
        if (STEM_HAP[aS]?.other === bS) {
          crossLines.push(`${PILLAR_LABELS[i]}천간 ${aS} + ${PILLAR_LABELS[j]}천간 ${bS} — ${aS}${bS}合化${STEM_HAP[aS]!.element} (천간합)`)
        }
        if (STEM_CHUNG[aS] === bS) {
          crossLines.push(`${PILLAR_LABELS[i]}천간 ${aS} ↔ ${PILLAR_LABELS[j]}천간 ${bS} — 천간충`)
        }
      }
      const aB = P[i].branch, bB = P[j].branch
      if (!aB || !bB) continue
      const hits = new Set<string>()
      const key = `${i},${j}`
      if (BRANCH_HAP[aB]?.other === bB) {
        crossLines.push(`${PILLAR_LABELS[i]}지 ${aB} + ${PILLAR_LABELS[j]}지 ${bB} — ${aB}${bB}합화${BRANCH_HAP[aB]!.element} (지지합)`)
        hits.add(key)
      }
      if (BRANCH_CHUNG[aB] === bB) {
        crossLines.push(`${PILLAR_LABELS[i]}지 ${aB} ↔ ${PILLAR_LABELS[j]}지 ${bB} — 지지충`)
        hits.add(key)
      }
      if (BRANCH_HAE[aB] === bB && !hits.has(key)) {
        crossLines.push(`${PILLAR_LABELS[i]}지 ${aB} ↔ ${PILLAR_LABELS[j]}지 ${bB} — ${aB}${bB}해/원진`)
      }
      if (BRANCH_PA[aB] === bB && !hits.has(key)) {
        crossLines.push(`${PILLAR_LABELS[i]}지 ${aB} ↔ ${PILLAR_LABELS[j]}지 ${bB} — ${aB}${bB}파`)
      }
      if (BRANCH_HYEONG_PAIR[aB] === bB) {
        crossLines.push(`${PILLAR_LABELS[i]}지 ${aB} ↔ ${PILLAR_LABELS[j]}지 ${bB} — ${aB}${bB}형 (무례지형)`)
      }
      for (const trio of BRANCH_HYEONG_3) {
        if (trio.includes(aB) && trio.includes(bB) && aB !== bB) {
          crossLines.push(`${PILLAR_LABELS[i]}지 ${aB} ↔ ${PILLAR_LABELS[j]}지 ${bB} — ${trio.join('')} 3형 부분`)
        }
      }
      if (SELF_HYEONG.has(aB) && aB === bB) {
        crossLines.push(`${PILLAR_LABELS[i]}지 ${aB} = ${PILLAR_LABELS[j]}지 ${bB} — 자형`)
      }
    }
  }
  // 삼합 부분
  for (const trio of TRI_HAP) {
    const matched = P.filter((p) => trio.branches.includes(p.branch))
    if (matched.length >= 2) {
      const positions = P.map((p, i) => trio.branches.includes(p.branch) ? `${PILLAR_LABELS[i]}지 ${p.branch}` : null).filter(Boolean)
      crossLines.push(`${positions.join(' + ')} — ${trio.branches.join('')}삼합 ${matched.length === 3 ? '완성' : '부분'} (→ ${trio.element})`)
    }
  }
  if (crossLines.length > 0) {
    out.push('[4기둥 내부 cross]')
    out.push(...crossLines)
    out.push('')
  }

  // 신살
  const shinsalLines: string[] = []
  // 천을귀인
  const cheonul = CHEONULGWIIN[day.stem] ?? []
  for (let i = 0; i < 4; i++) {
    if (cheonul.includes(P[i].branch)) {
      shinsalLines.push(`천을귀인 (${cheonul.join('·')}) activates ${PILLAR_LABELS[i]}지 ${P[i].branch}`)
    }
  }
  // 도화·역마·화개 — 일지 기준
  const dohwa = DOHWA[day.branch]
  const yeokma = YEOKMA[day.branch]
  const hwagae = HWAGAE[day.branch]
  for (let i = 0; i < 4; i++) {
    if (P[i].branch === dohwa) shinsalLines.push(`도화 (${dohwa}) activates ${PILLAR_LABELS[i]}지 ${P[i].branch}`)
    if (P[i].branch === yeokma) shinsalLines.push(`역마 (${yeokma}) activates ${PILLAR_LABELS[i]}지 ${P[i].branch}`)
    if (P[i].branch === hwagae) shinsalLines.push(`화개 (${hwagae}) activates ${PILLAR_LABELS[i]}지 ${P[i].branch}`)
  }
  // 양인 (일간 → 지지)
  const yangin = YANGIN[day.stem]
  if (yangin) {
    for (let i = 0; i < 4; i++) {
      if (P[i].branch === yangin) shinsalLines.push(`양인 (${yangin}) activates ${PILLAR_LABELS[i]}지 ${P[i].branch}`)
    }
  }
  // 괴강 (일주)
  if (GOEGANG.has(`${day.stem}${day.branch}`)) {
    shinsalLines.push(`괴강 (일주 ${day.stem}${day.branch}) — 강한 의지·극단`)
  }
  // 공망 (일주 → 지지 2개)
  const gong = GONGMANG[`${day.stem}${day.branch}`]
  if (gong) {
    shinsalLines.push(`공망 지지: ${gong.join(', ')} (일주 ${day.stem}${day.branch} 기준)`)
    for (let i = 0; i < 4; i++) {
      if (i === 2) continue
      if (gong.includes(P[i].branch)) {
        shinsalLines.push(`${PILLAR_LABELS[i]}지 ${P[i].branch} — 공망 (작용 약화)`)
      }
    }
  }
  if (shinsalLines.length > 0) {
    out.push('[신살]')
    out.push(...shinsalLines)
    out.push('')
  }

  // 12운성
  out.push('[12운성 — 일간 vs 각 지지]')
  for (let i = 0; i < 4; i++) {
    out.push(`${PILLAR_LABELS[i]}지 ${P[i].branch} — ${twelveStage(day.stem, P[i].branch)}`)
  }
  out.push('')

  // 현재 시기 cross (대운 + 세운 + 월운 + 일진)
  const cycles: Array<{ name: string; cur: { stem: string; branch: string; age?: number; year?: number; date?: string } }> = []
  if (input.currentDaeun) cycles.push({ name: `대운 ${input.currentDaeun.age ?? '?'}세`, cur: input.currentDaeun })
  if (input.currentSewoon) cycles.push({ name: `세운 ${input.currentSewoon.year ?? '?'}`, cur: input.currentSewoon })
  if (input.currentWolwoon) cycles.push({ name: `월운`, cur: input.currentWolwoon })
  if (input.currentIljin) cycles.push({ name: `일진${input.currentIljin.date ? ` (${input.currentIljin.date})` : ''}`, cur: input.currentIljin })

  if (cycles.length > 0) {
    out.push('[현재 시기 cross — 본명 4기둥과의 합/충]')
    for (const c of cycles) {
      out.push(`${c.name}: ${c.cur.stem}${c.cur.branch}`)
      for (let i = 0; i < 4; i++) {
        const aS = P[i].stem, bS = c.cur.stem
        const aB = P[i].branch, bB = c.cur.branch
        if (aS && bS) {
          if (STEM_HAP[aS]?.other === bS) out.push(`  ${PILLAR_LABELS[i]}천간 ${aS} + ${c.name} ${bS} — ${aS}${bS}合`)
          if (STEM_CHUNG[aS] === bS) out.push(`  ${PILLAR_LABELS[i]}천간 ${aS} ↔ ${c.name} ${bS} — 천간충`)
        }
        if (aB && bB) {
          if (BRANCH_HAP[aB]?.other === bB) out.push(`  ${PILLAR_LABELS[i]}지 ${aB} + ${c.name} ${bB} — ${aB}${bB}합`)
          if (BRANCH_CHUNG[aB] === bB) out.push(`  ${PILLAR_LABELS[i]}지 ${aB} ↔ ${c.name} ${bB} — 지지충`)
          if (aB === bB && SELF_HYEONG.has(aB)) out.push(`  ${PILLAR_LABELS[i]}지 ${aB} = ${c.name} ${bB} — 자형 공명`)
        }
      }
    }
    out.push('')
  }

  return out.join('\n')
}
