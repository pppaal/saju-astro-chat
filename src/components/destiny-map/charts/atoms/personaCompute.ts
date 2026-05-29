/**
 * 사주 raw 데이터 → persona summary + 핵심 3 insight 도출.
 *
 * 차트 모달 표지 카드 / Level 1 핵심 3 줄 의 데이터 소스.
 * advancedAnalysis (격국·용신·신강약·오행 분포) 를 1줄 plain 한국어로 변환.
 */

import { GEOKGUK, ELEMENT_REMEDY } from './interpretations'

export interface PersonaSummary {
  /** "정인격 · 신약" 같은 한 줄 라벨 */
  label: string
  /** "학자형 — 깊이 있는 분석가" 같은 한 줄 설명 */
  tagline: string
  /** "🔥 火가 보충되면 균형" 같은 처방 (없으면 undefined) */
  remedy?: string
}

export interface Insight {
  emoji: string
  /** "인성 가득 — 배우고 생각하는 게 자연스러움" */
  title: string
  /** "✓ 정인 + 편인 합 2개" 같은 근거 (한 줄) */
  evidence?: string
}

interface SajuLike {
  advancedAnalysis?: {
    geokguk?: { primary?: string; type?: string }
    yongsin?: { primaryYongsin?: string; daymasterStrength?: string }
    sibsin?: {
      categoryCount?: Record<string, number>
      dominantSibsin?: string[]
      missingSibsin?: string[]
    }
    deukryeong?: { status?: string; strength?: number }
  }
  fiveElements?: Record<string, number>
  dayMaster?: { name?: string; element?: string }
  daeun?: {
    cycles?: Array<{ age?: number; heavenlyStem?: string; earthlyBranch?: string; sibsin?: { cheon?: string; ji?: string } }>
  }
  unse?: {
    daeun?: Array<{ age?: number; heavenlyStem?: string; earthlyBranch?: string; ganji?: string }>
  }
}

/** 격국 → tagline. fallback "균형형". */
function taglineFromGeokguk(geokguk: string | undefined): string {
  if (geokguk && GEOKGUK[geokguk]) return GEOKGUK[geokguk]
  return '균형형 — 다양한 가능성 가짐'
}

/** 오행 분포에서 부족한 원소 찾기. 0 또는 1 이하인 것. */
function findDeficient(fiveElements: Record<string, number> | undefined): string | undefined {
  if (!fiveElements) return undefined
  const els = ['목', '화', '토', '금', '수']
  const min = Math.min(...els.map((e) => fiveElements[e] ?? 0))
  const deficient = els.find((e) => (fiveElements[e] ?? 0) === min && min <= 1)
  return deficient
}

export function computePersona(saju: SajuLike | undefined | null): PersonaSummary {
  if (!saju) return { label: '사주 정보 없음', tagline: '생년월일 입력이 필요합니다' }

  const geokguk = saju.advancedAnalysis?.geokguk?.primary
  const strengthStatus = saju.advancedAnalysis?.yongsin?.daymasterStrength as
    | 'strong'
    | 'medium'
    | 'weak'
    | undefined

  // "정인격 · 신약" 같은 라벨
  const parts: string[] = []
  if (geokguk) parts.push(geokguk)
  if (strengthStatus === 'strong') parts.push('신강')
  else if (strengthStatus === 'weak') parts.push('신약')
  else if (strengthStatus === 'medium') parts.push('중화')
  const label = parts.join(' · ') || '균형형'

  const tagline = taglineFromGeokguk(geokguk)

  // 부족한 오행 → 처방
  const deficient = findDeficient(saju.fiveElements)
  let remedy: string | undefined
  if (deficient) {
    const r = ELEMENT_REMEDY[deficient]
    if (r) {
      const elIcon: Record<string, string> = { 목: '🌳', 화: '🔥', 토: '🪨', 금: '⚙️', 수: '💧' }
      remedy = `${elIcon[deficient] ?? '•'} ${deficient}(${r.color.split('·')[0]}) 보충이 균형 ↗`
    }
  }

  return { label, tagline, remedy }
}

/** 사주 데이터 → 핵심 3 insight 도출. */
export function computeInsights(saju: SajuLike | undefined | null): Insight[] {
  if (!saju) return []
  const insights: Insight[] = []

  // 1. 십성 카테고리 dominant
  const catCount = saju.advancedAnalysis?.sibsin?.categoryCount
  if (catCount) {
    const cats: Array<{ name: string; emoji: string; line: string }> = [
      { name: '인성', emoji: '📚', line: '배우고 생각하는 게 자연스러움' },
      { name: '재성', emoji: '💰', line: '활동·재물·외부 지향' },
      { name: '관성', emoji: '⚖️', line: '권위·체계·책임감 강함' },
      { name: '식상', emoji: '🎨', line: '표현·창의·자유로움' },
      { name: '비겁', emoji: '🤝', line: '독립·경쟁·자기 사업 결' },
    ]
    const top = cats
      .map((c) => ({ ...c, count: catCount[c.name] ?? 0 }))
      .sort((a, b) => b.count - a.count)
      .find((c) => c.count >= 3)
    if (top) {
      insights.push({
        emoji: top.emoji,
        title: `${top.name} 풍부 — ${top.line}`,
        evidence: `✓ ${top.name} ${top.count}개 (사주 8글자 중)`,
      })
    }
  }

  // 2. 부족한 오행 진단
  const deficient = findDeficient(saju.fiveElements)
  if (deficient) {
    const elMap: Record<string, { emoji: string; meaning: string }> = {
      목: { emoji: '🌳', meaning: '성장·시작·창의 보충 필요' },
      화: { emoji: '🔥', meaning: '추진력·표현력 보충 필요' },
      토: { emoji: '🪨', meaning: '안정·실용 보충 필요' },
      금: { emoji: '⚙️', meaning: '체계·결단 보충 필요' },
      수: { emoji: '💧', meaning: '직관·유연성 보충 필요' },
    }
    const info = elMap[deficient]
    if (info) {
      insights.push({
        emoji: info.emoji,
        title: `${deficient}(${ELEMENT_REMEDY[deficient]?.color.split('·')[0] ?? deficient}) 부족 — ${info.meaning}`,
        evidence: `✓ 사주 8글자 중 ${deficient} 0~1개`,
      })
    }
  }

  // 3. 현재 대운
  const cycles = saju.unse?.daeun ?? []
  if (cycles.length > 0) {
    // 사주에 birthYear 없으면 age 계산 안 함. cycles[0].age 부터 10년 단위.
    const ageFromCycle = (c: { age?: number }) => c.age ?? 0
    // 현재 나이를 사주 daeun 의 age 와 매칭 — 단순화: 가장 큰 age <= 추정나이
    // birthYear 모르면 cycles 의 sequence 만 보고 중간 정도를 표시.
    const current = cycles[Math.min(2, cycles.length - 1)] // 보통 사용자가 20~40대
    if (current) {
      const sibsinCheon = current.heavenlyStem
      const ganji = `${current.heavenlyStem}${current.earthlyBranch}`
      insights.push({
        emoji: '🌊',
        title: `${ageFromCycle(current)}세~ ${ganji} 대운 — 흐름의 시기`,
        evidence: `✓ 천간 ${sibsinCheon} · 10년 주기`,
      })
    }
  }

  return insights.slice(0, 3)
}
