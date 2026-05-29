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
  // /api/saju 는 {wood, fire, earth, metal, water} 영문 키 반환 (saju.ts:711).
  // NatalContext.saju.fiveElements 도 동일 영문 키. 둘 다 같은 path 로 변환.
  fiveElements?: Record<string, number>
  dayMaster?: { name?: string; element?: string }
  birthYear?: number
  /** /api/saju 응답의 daeun = getDaeunCycles() 결과 — `list` 가 대운 사이클. */
  daeun?: {
    startAge?: number
    isForward?: boolean
    current?: { age?: number; heavenlyStem?: string; earthlyBranch?: string } | null
    list?: Array<{
      age?: number
      heavenlyStem?: string
      earthlyBranch?: string
      ganji?: string
    }>
  }
}

const EN_TO_KO_ELEMENT: Record<string, string> = {
  wood: '목',
  fire: '화',
  earth: '토',
  metal: '금',
  water: '수',
}

/** 격국 → tagline. fallback "균형형". */
function taglineFromGeokguk(geokguk: string | undefined): string {
  if (geokguk && GEOKGUK[geokguk]) return GEOKGUK[geokguk]
  return '균형형 — 다양한 가능성 가짐'
}

/**
 * 오행 분포에서 부족한 원소 찾기. 0 또는 1 이하인 것.
 * /api/saju · NatalContext 둘 다 영문 키 (wood/fire/...) 반환 — 한국어 키로 변환 후 비교.
 * 영문 키가 하나도 없으면 한국어 키로 polled (안전망).
 */
function findDeficient(
  fiveElements: Record<string, number> | undefined
): string | undefined {
  if (!fiveElements) return undefined
  const koCounts: Record<string, number> = {}
  for (const [k, v] of Object.entries(fiveElements)) {
    if (typeof v !== 'number') continue
    const koKey = EN_TO_KO_ELEMENT[k] ?? k
    koCounts[koKey] = v
  }
  const els = ['목', '화', '토', '금', '수']
  if (els.every((e) => koCounts[e] === undefined)) return undefined
  const min = Math.min(...els.map((e) => koCounts[e] ?? 0))
  if (min > 1) return undefined
  return els.find((e) => (koCounts[e] ?? 0) === min)
}

/**
 * daymasterStrength 한국어 값을 표시용 한 단어로 매핑.
 * 실제값: '극신강' | '신강' | '중화' | '신약' | '극신약' (saju/yongsin.ts:19).
 */
function strengthLabel(raw: string | undefined): string | undefined {
  if (raw === '극신강' || raw === '신강') return '신강'
  if (raw === '극신약' || raw === '신약') return '신약'
  if (raw === '중화') return '중화'
  return undefined
}

export function computePersona(saju: SajuLike | undefined | null): PersonaSummary {
  if (!saju) return { label: '사주 정보 없음', tagline: '생년월일 입력이 필요합니다' }

  const geokguk = saju.advancedAnalysis?.geokguk?.primary

  // "정인격 · 신약" 같은 라벨
  const parts: string[] = []
  if (geokguk) parts.push(geokguk)
  const strength = strengthLabel(saju.advancedAnalysis?.yongsin?.daymasterStrength)
  if (strength) parts.push(strength)
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

/**
 * 현재 나이를 포함하는 대운 사이클 찾기.
 * birthYear 있으면 정확 계산. 없으면 list 중간쯤 (사용자가 20~40대라고 가정).
 */
function findCurrentDaeun(
  daeunList: NonNullable<NonNullable<SajuLike['daeun']>['list']>,
  birthYear: number | undefined
): { age?: number; heavenlyStem?: string; earthlyBranch?: string } | undefined {
  if (daeunList.length === 0) return undefined
  if (birthYear && Number.isFinite(birthYear)) {
    const currentAge = new Date().getFullYear() - birthYear
    let current = daeunList[0]
    for (const c of daeunList) {
      if ((c.age ?? 0) <= currentAge) current = c
      else break
    }
    return current
  }
  return daeunList[Math.min(2, daeunList.length - 1)]
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

  // 3. 현재 대운 — /api/saju 응답의 saju.daeun.list 사용.
  // birthYear 가 있으면 currentAge 로 정확 매칭, 없으면 list 중간쯤.
  const daeunList = saju.daeun?.list ?? []
  const current = findCurrentDaeun(daeunList, saju.birthYear)
  if (current) {
    const stem = current.heavenlyStem ?? ''
    const branch = current.earthlyBranch ?? ''
    const ganji = `${stem}${branch}`.trim()
    if (ganji) {
      insights.push({
        emoji: '🌊',
        title: `${current.age ?? 0}세~ ${ganji} 대운 — 흐름의 시기`,
        evidence: `✓ 천간 ${stem} · 10년 주기`,
      })
    }
  }

  return insights.slice(0, 3)
}
