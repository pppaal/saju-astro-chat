/**
 * familyLineage.ts - 사주 세대간/가족 분석 엔진 (1000% 레벨)
 *
 * 가족 구성원간 사주 상관관계, 세대간 패턴, 가족 역할 분석
 *
 * ✅ REFACTORING COMPLETED:
 * - Original 960 lines modularized for better maintainability
 * - Types extracted to ./family/types.ts
 * - Constants extracted to ./family/constants.ts
 * - Utility functions extracted to ./family/utils.ts
 * - Core analysis functions remain in this file
 *
 * Structure:
 * - family/types.ts: Type definitions for family analysis
 * - family/constants.ts: Relationship constants (SANGSEANG, SAMHAP, etc.)
 * - family/utils.ts: Helper functions for element/stem/branch operations
 * - family/index.ts: Module exports
 * - familyLineage.ts: Main analysis logic
 */

import { FiveElement, SajuPillars, StemBranchInfo } from './types'
import { STEMS, BRANCHES, JIJANGGAN } from './constants'

// Re-export types from the dedicated types file
export type {
  SajuResult,
  FamilyRole,
  RelationType,
  FamilyMember,
  FamilyRelation,
  FamilyCompatibilityAnalysis,
  ElementHarmonyResult,
  StemRelationResult,
  BranchRelationResult,
  RoleHarmonyResult,
  InheritedTrait,
  ConflictPoint,
  GenerationalPattern,
  FamilyDynamic,
  SiblingAnalysis,
  ParentChildAnalysis,
  SpouseAnalysis,
} from './family/types'

// Import types for internal use
import type {
  SajuResult,
  FamilyRole,
  RelationType,
  FamilyMember,
  FamilyRelation,
  ElementHarmonyResult,
  StemRelationResult,
  BranchRelationResult,
  RoleHarmonyResult,
  InheritedTrait,
  ConflictPoint,
  GenerationalPattern,
  ParentChildAnalysis,
  SiblingAnalysis,
  SpouseAnalysis,
  FamilyDynamic,
} from './family/types'

// Import constants
import {
  SANGSEANG,
  SANGKEUK,
  CHEONGAN_HAP,
  YUKAP,
  SAMHAP,
  CHUNG,
  ROLE_ELEMENT_ENERGY,
} from './family/constants'

// Import utility functions
import { getStemInfo, getBranchInfo, getStemElement, getBranchElement } from './family/utils'

// ============================================================================
// 핵심 분석 함수
// ============================================================================

/**
 * 두 사주 간의 오행 조화 분석
 */
export function analyzeElementHarmony(saju1: SajuResult, saju2: SajuResult): ElementHarmonyResult {
  // 각 사주의 지배적 오행 찾기
  const elements1 = extractAllElements(saju1)
  const elements2 = extractAllElements(saju2)

  const dominant1 = findDominantElement(elements1)
  const dominant2 = findDominantElement(elements2)

  let relation: '상생' | '상극' | '비화' | '균형'
  let score: number
  let description: string

  if (dominant1 === dominant2) {
    relation = '비화'
    score = 70
    description = `같은 ${dominant1} 에너지로 공감대가 강하나 과잉될 수 있음`
  } else if (SANGSEANG[dominant1] === dominant2) {
    relation = '상생'
    score = 90
    description = `${dominant1}이 ${dominant2}을 생하는 상생관계로 자연스러운 조화`
  } else if (SANGSEANG[dominant2] === dominant1) {
    relation = '상생'
    score = 85
    description = `${dominant2}이 ${dominant1}을 생하는 상생관계`
  } else if (SANGKEUK[dominant1] === dominant2) {
    relation = '상극'
    score = 40
    description = `${dominant1}이 ${dominant2}을 극하여 갈등 가능성 있음`
  } else {
    relation = '균형'
    score = 75
    description = `간접적 관계로 균형적인 상호작용`
  }

  return { dominant1, dominant2, relation, score, description }
}

/**
 * 사주에서 모든 오행 추출
 */
function extractAllElements(saju: SajuResult): string[] {
  const elements: string[] = []
  const pillars = saju.fourPillars

  // 천간 오행
  elements.push(getStemElement(pillars.year.stem))
  elements.push(getStemElement(pillars.month.stem))
  elements.push(getStemElement(pillars.day.stem))
  elements.push(getStemElement(pillars.hour.stem))

  // 지지 오행
  elements.push(getBranchElement(pillars.year.branch))
  elements.push(getBranchElement(pillars.month.branch))
  elements.push(getBranchElement(pillars.day.branch))
  elements.push(getBranchElement(pillars.hour.branch))

  return elements
}

/**
 * 지배적 오행 찾기
 */
function findDominantElement(elements: string[]): string {
  const counts: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  for (const el of elements) {
    if (counts[el] !== undefined) {
      counts[el]++
    }
  }

  let maxElement = '토'
  let maxCount = 0
  for (const [el, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count
      maxElement = el
    }
  }
  return maxElement
}

/**
 * 천간 관계 분석
 */
export function analyzeStemRelation(saju1: SajuResult, saju2: SajuResult): StemRelationResult {
  const stems1 = [
    saju1.fourPillars.year.stem,
    saju1.fourPillars.month.stem,
    saju1.fourPillars.day.stem,
    saju1.fourPillars.hour.stem,
  ]
  const stems2 = [
    saju2.fourPillars.year.stem,
    saju2.fourPillars.month.stem,
    saju2.fourPillars.day.stem,
    saju2.fourPillars.hour.stem,
  ]

  const dayMaster1 = saju1.fourPillars.day.stem
  const dayMaster2 = saju2.fourPillars.day.stem

  const 合: string[] = []
  const 沖: string[] = []

  // 일간 합 확인
  if (CHEONGAN_HAP[dayMaster1] === dayMaster2) {
    合.push(`일간합 (${dayMaster1}-${dayMaster2})`)
  }

  // 모든 천간 조합 확인
  for (const s1 of stems1) {
    for (const s2 of stems2) {
      if (CHEONGAN_HAP[s1] === s2 && !合.includes(`${s1}-${s2}`)) {
        合.push(`${s1}-${s2} 합`)
      }
    }
  }

  // 일간 관계 분석
  const el1 = getStemElement(dayMaster1)
  const el2 = getStemElement(dayMaster2)
  let dayMasterRelation: string

  if (el1 === el2) {
    dayMasterRelation = '비견 관계 - 동등한 위치, 경쟁과 협력 공존'
  } else if (SANGSEANG[el1] === el2) {
    dayMasterRelation = '식상 관계 - 자연스러운 표현과 창조'
  } else if (SANGSEANG[el2] === el1) {
    dayMasterRelation = '인성 관계 - 배움과 보호의 관계'
  } else if (SANGKEUK[el1] === el2) {
    dayMasterRelation = '재성 관계 - 통제와 관리의 관계'
  } else {
    dayMasterRelation = '관성 관계 - 도전과 성장의 관계'
  }

  const score = 50 + 合.length * 15 - 沖.length * 10

  return { dayMasterRelation, 合, 沖, score: Math.max(0, Math.min(100, score)) }
}

/**
 * 지지 관계 분석
 */
export function analyzeBranchRelation(saju1: SajuResult, saju2: SajuResult): BranchRelationResult {
  const branches1 = [
    saju1.fourPillars.year.branch,
    saju1.fourPillars.month.branch,
    saju1.fourPillars.day.branch,
    saju1.fourPillars.hour.branch,
  ]
  const branches2 = [
    saju2.fourPillars.year.branch,
    saju2.fourPillars.month.branch,
    saju2.fourPillars.day.branch,
    saju2.fourPillars.hour.branch,
  ]

  const 三合: string[] = []
  const 六合: string[] = []
  const 沖: string[] = []
  const 刑: string[] = []

  // 육합 확인
  for (const b1 of branches1) {
    for (const b2 of branches2) {
      if (YUKAP[b1] === b2) {
        六合.push(`${b1}-${b2} 육합`)
      }
      if (CHUNG[b1] === b2) {
        沖.push(`${b1}-${b2} 충`)
      }
    }
  }

  // 삼합 확인 (두 사주 지지 합쳐서)
  const allBranches = [...branches1, ...branches2]
  const samhapSets = [
    { branches: ['신', '자', '진'], name: '수국 삼합' },
    { branches: ['인', '오', '술'], name: '화국 삼합' },
    { branches: ['해', '묘', '미'], name: '목국 삼합' },
    { branches: ['사', '유', '축'], name: '금국 삼합' },
  ]

  for (const set of samhapSets) {
    const matches = set.branches.filter((b) => allBranches.includes(b))
    if (matches.length >= 2) {
      三合.push(`${matches.join('-')} (${set.name})`)
    }
  }

  const score = 50 + 三合.length * 20 + 六合.length * 15 - 沖.length * 15 - 刑.length * 10

  return { 三合, 六合, 沖, 刑, score: Math.max(0, Math.min(100, score)) }
}

/**
 * 역할 조화 분석
 */
export function analyzeRoleHarmony(member: FamilyMember, saju: SajuResult): RoleHarmonyResult {
  const roleEnergy = ROLE_ELEMENT_ENERGY[member.role]
  const dayMasterElement = getStemElement(saju.fourPillars.day.stem)
  const allElements = extractAllElements(saju)
  const dominant = findDominantElement(allElements)

  const expectedRole = roleEnergy.primary
  const actualEnergy = dominant

  let alignment: 'strong' | 'moderate' | 'weak' | 'conflict'
  const suggestions: string[] = []

  if (expectedRole === actualEnergy) {
    alignment = 'strong'
    suggestions.push(`${member.role} 역할에 자연스럽게 맞는 에너지를 가짐`)
  } else if (roleEnergy.secondary === actualEnergy) {
    alignment = 'moderate'
    suggestions.push(`보조 에너지로 역할 수행 가능, 유연한 접근 필요`)
  } else if (SANGSEANG[actualEnergy] === expectedRole) {
    alignment = 'moderate'
    suggestions.push(`상생 관계로 역할을 지원할 수 있음`)
  } else if (SANGKEUK[actualEnergy] === expectedRole) {
    alignment = 'conflict'
    suggestions.push(`역할 에너지와 상극 관계, 의식적 노력 필요`)
    suggestions.push(`${actualEnergy} 에너지를 활용한 대안적 역할 방식 모색`)
  } else {
    alignment = 'weak'
    suggestions.push(`역할과 타고난 에너지가 달라 적응 기간 필요`)
  }

  return { expectedRole, actualEnergy, alignment, suggestions }
}

/**
 * 유전적 특성 분석
 */
export function analyzeInheritedTraits(
  child: SajuResult,
  father?: SajuResult,
  mother?: SajuResult
): InheritedTrait[] {
  const traits: InheritedTrait[] = []
  const childElements = extractAllElements(child)
  const childDominant = findDominantElement(childElements)

  if (father) {
    const fatherElements = extractAllElements(father)
    const fatherDominant = findDominantElement(fatherElements)

    if (childDominant === fatherDominant) {
      traits.push({
        trait: `지배 오행 (${childDominant})`,
        source: 'father',
        element: childDominant,
        manifestation: getElementManifestation(childDominant),
        strength: 'strong',
      })
    }

    // 천간 유사성
    if (child.fourPillars.day.stem === father.fourPillars.day.stem) {
      traits.push({
        trait: '일간 동일',
        source: 'father',
        element: getStemElement(child.fourPillars.day.stem),
        manifestation: '성격 근본이 부친과 유사',
        strength: 'strong',
      })
    }
  }

  if (mother) {
    const motherElements = extractAllElements(mother)
    const motherDominant = findDominantElement(motherElements)

    if (childDominant === motherDominant && !traits.some((t) => t.trait.includes('지배 오행'))) {
      traits.push({
        trait: `지배 오행 (${childDominant})`,
        source: 'mother',
        element: childDominant,
        manifestation: getElementManifestation(childDominant),
        strength: 'strong',
      })
    }

    // 지지 유사성
    if (child.fourPillars.day.branch === mother.fourPillars.day.branch) {
      traits.push({
        trait: '일지 동일',
        source: 'mother',
        element: getBranchElement(child.fourPillars.day.branch),
        manifestation: '내면과 감정 패턴이 모친과 유사',
        strength: 'strong',
      })
    }
  }

  if (father && mother) {
    const fatherDom = findDominantElement(extractAllElements(father))
    const motherDom = findDominantElement(extractAllElements(mother))

    if (fatherDom !== motherDom && childDominant !== fatherDom && childDominant !== motherDom) {
      // 자녀가 부모와 다른 독특한 오행
      traits.push({
        trait: `독자적 오행 (${childDominant})`,
        source: 'unique',
        element: childDominant,
        manifestation: '부모와 다른 독특한 성향 발현',
        strength: 'moderate',
      })
    }

    // 부모 모두에게서 물려받은 특성
    if (SANGSEANG[fatherDom] === childDominant && SANGSEANG[motherDom] === childDominant) {
      traits.push({
        trait: '양친 상생 집합',
        source: 'both',
        element: childDominant,
        manifestation: '양쪽 부모의 에너지가 자녀에게 상생으로 흐름',
        strength: 'strong',
      })
    }
  }

  if (traits.length === 0) {
    traits.push({
      trait: '독립적 기운',
      source: 'unique',
      element: childDominant,
      manifestation: '자신만의 독특한 운명 경로',
      strength: 'moderate',
    })
  }

  return traits
}

function getElementManifestation(element: string): string {
  const manifestations: Record<string, string> = {
    목: '성장, 창의성, 진취성',
    화: '열정, 표현력, 활력',
    토: '안정, 신뢰, 중재력',
    금: '결단력, 정의감, 원칙',
    수: '지혜, 유연성, 적응력',
  }
  return manifestations[element] || '균형적 성향'
}

/**
 * 갈등 포인트 분석
 */
export function analyzeConflictPoints(
  members: FamilyMember[],
  sajuMap: Map<string, SajuResult>
): ConflictPoint[] {
  const conflicts: ConflictPoint[] = []

  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const saju1 = sajuMap.get(members[i].id)
      const saju2 = sajuMap.get(members[j].id)

      if (!saju1 || !saju2) {
        continue
      }

      const branchRel = analyzeBranchRelation(saju1, saju2)

      if (branchRel.沖.length > 0) {
        conflicts.push({
          area: '기본 성향 충돌',
          severity: branchRel.沖.length >= 2 ? 'major' : 'minor',
          members: [members[i].name, members[j].name],
          resolution: `${branchRel.沖.join(', ')} 충의 영향. 서로의 다름을 인정하고 중재자 역할 필요`,
        })
      }

      const elementHarmony = analyzeElementHarmony(saju1, saju2)
      if (elementHarmony.relation === '상극') {
        conflicts.push({
          area: '오행 상극',
          severity: 'minor',
          members: [members[i].name, members[j].name],
          resolution: `${elementHarmony.dominant1}와 ${elementHarmony.dominant2}의 상극. 토 에너지로 중화 가능`,
        })
      }
    }
  }

  return conflicts
}

/**
 * 세대간 패턴 분석
 */
export function analyzeGenerationalPatterns(
  grandparents: SajuResult[],
  parents: SajuResult[],
  children: SajuResult[]
): GenerationalPattern[] {
  const patterns: GenerationalPattern[] = []

  // 각 세대의 지배 오행
  const gpElements = grandparents.map((s) => findDominantElement(extractAllElements(s)))
  const pElements = parents.map((s) => findDominantElement(extractAllElements(s)))
  const cElements = children.map((s) => findDominantElement(extractAllElements(s)))

  // 반복되는 오행 패턴
  const allElements = [...gpElements, ...pElements, ...cElements]
  const elementCounts: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  for (const el of allElements) {
    if (elementCounts[el] !== undefined) {
      elementCounts[el]++
    }
  }

  for (const [element, count] of Object.entries(elementCounts)) {
    if (count >= Math.ceil(allElements.length * 0.5)) {
      patterns.push({
        pattern: `${element} 우세 가문`,
        description: `가문 전체에 ${element} 에너지가 강하게 흐름`,
        affectedElements: [element],
        manifestation: getElementFamilyManifestation(element),
        karmaType: 'positive',
      })
    }
  }

  // 상생 체인 확인
  if (pElements.length > 0 && cElements.length > 0) {
    const parentDom = pElements[0]
    const childDom = cElements[0]

    if (SANGSEANG[parentDom] === childDom) {
      patterns.push({
        pattern: '상생 전승',
        description: `부모 세대(${parentDom})에서 자녀 세대(${childDom})로 상생 에너지 흐름`,
        affectedElements: [parentDom, childDom],
        manifestation: '가문의 에너지가 자연스럽게 발전하며 전승됨',
        karmaType: 'positive',
      })
    } else if (SANGKEUK[parentDom] === childDom) {
      patterns.push({
        pattern: '상극 도전',
        description: `부모 세대(${parentDom})와 자녀 세대(${childDom}) 사이 상극`,
        affectedElements: [parentDom, childDom],
        manifestation: '세대간 갈등을 통한 성장과 변화',
        karmaType: 'transformative',
      })
    }
  }

  // 부재 오행 확인
  for (const [element, count] of Object.entries(elementCounts)) {
    if (count === 0) {
      patterns.push({
        pattern: `${element} 부재`,
        description: `가문 전체에서 ${element} 에너지가 약함`,
        affectedElements: [element],
        manifestation: getMissingElementKarma(element),
        karmaType: 'negative',
      })
    }
  }

  return patterns
}

function getElementFamilyManifestation(element: string): string {
  const manifestations: Record<string, string> = {
    목: '창의적이고 진취적인 가문, 새로운 시작과 성장 추구',
    화: '열정적이고 표현력 강한 가문, 문화예술적 재능',
    토: '안정적이고 신뢰받는 가문, 부동산/토지 인연',
    금: '원칙적이고 결단력 있는 가문, 법/군/재정 분야 강점',
    수: '지혜롭고 유연한 가문, 학문/연구 분야 강점',
  }
  return manifestations[element] || '균형적 가문'
}

function getMissingElementKarma(element: string): string {
  const karma: Record<string, string> = {
    목: '창의성과 새로운 시작에 대한 학습 과제',
    화: '자기 표현과 열정에 대한 학습 과제',
    토: '안정과 신뢰 구축에 대한 학습 과제',
    금: '결단력과 원칙 수립에 대한 학습 과제',
    수: '지혜와 유연성에 대한 학습 과제',
  }
  return karma[element] || '균형 추구 과제'
}

/**
 * 부모-자녀 상세 분석
 */
export function analyzeParentChild(
  parent: SajuResult,
  child: SajuResult,
  parentRole: 'father' | 'mother'
): ParentChildAnalysis {
  const parentElements = extractAllElements(parent)
  const childElements = extractAllElements(child)
  const parentDom = findDominantElement(parentElements)
  const childDom = findDominantElement(childElements)

  // 양육 스타일
  const nurturingStyles: Record<string, string> = {
    목: '자유롭고 창의적인 양육, 독립심 강조',
    화: '열정적이고 적극적인 양육, 표현 장려',
    토: '안정적이고 일관된 양육, 기본기 중시',
    금: '원칙적이고 체계적인 양육, 규율 강조',
    수: '유연하고 지혜로운 양육, 이해와 적응 중시',
  }

  // 학습 스타일
  const learningStyles: Record<string, string> = {
    목: '탐구적이고 창의적 학습, 새로운 것 선호',
    화: '적극적이고 경쟁적 학습, 즉각적 피드백 필요',
    토: '반복적이고 안정적 학습, 기초 탄탄히',
    금: '체계적이고 논리적 학습, 명확한 목표 필요',
    수: '유연하고 직관적 학습, 다양한 방법 시도',
  }

  const nurturingStyle = nurturingStyles[parentDom] || '균형적 양육'
  const learningStyle = learningStyles[childDom] || '균형적 학습'

  const communicationGap: string[] = []
  const growthOpportunities: string[] = []
  const karmicLessons: string[] = []
  const supportStrategies: string[] = []

  // 오행 관계에 따른 분석
  if (parentDom === childDom) {
    communicationGap.push('유사한 성향으로 인한 동일한 약점 공유')
    growthOpportunities.push('깊은 공감대와 이해를 바탕으로 한 성장')
    karmicLessons.push('같은 에너지의 긍정적 면과 부정적 면 모두 경험')
    supportStrategies.push(`${parentDom} 에너지의 균형을 함께 찾아가기`)
  } else if (SANGSEANG[parentDom] === childDom) {
    communicationGap.push('부모가 주는 에너지를 자녀가 당연시할 수 있음')
    growthOpportunities.push('자연스러운 에너지 흐름으로 순조로운 성장')
    karmicLessons.push('주고받음의 균형')
    supportStrategies.push('부모의 지원에 감사하는 마음 가르치기')
  } else if (SANGKEUK[parentDom] === childDom) {
    communicationGap.push('근본적인 관점 차이로 인한 갈등')
    communicationGap.push('서로의 방식을 이해하기 어려움')
    growthOpportunities.push('다름을 통한 시야 확장')
    karmicLessons.push('상극을 극복하며 성장하는 법')
    supportStrategies.push('중재 역할을 할 수 있는 토 에너지 활용')
    supportStrategies.push('공통 관심사 찾기')
  } else if (SANGSEANG[childDom] === parentDom) {
    communicationGap.push('자녀가 부모를 지원하는 역전된 에너지 흐름')
    growthOpportunities.push('자녀의 성숙함과 책임감 발달')
    karmicLessons.push('역할 경계 인식')
    supportStrategies.push('자녀에게 과도한 책임 부여하지 않기')
  } else {
    communicationGap.push('간접적 관계로 깊은 이해까지 시간 필요')
    growthOpportunities.push('다양한 관점에서의 학습')
    karmicLessons.push('균형과 조화')
    supportStrategies.push('공통 활동을 통한 유대 강화')
  }

  return {
    nurturingStyle,
    learningStyle,
    communicationGap,
    growthOpportunities,
    karmicLessons,
    supportStrategies,
  }
}

/**
 * 형제자매 분석
 */
export function analyzeSiblings(siblings: SajuResult[], names: string[]): SiblingAnalysis {
  const elementDistribution: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }

  for (const saju of siblings) {
    const dom = findDominantElement(extractAllElements(saju))
    elementDistribution[dom]++
  }

  const conflictPotential: string[] = []
  const cooperationAreas: string[] = []
  const inheritancePatterns: string[] = []

  // 형제간 충돌 분석
  for (let i = 0; i < siblings.length; i++) {
    for (let j = i + 1; j < siblings.length; j++) {
      const branchRel = analyzeBranchRelation(siblings[i], siblings[j])
      if (branchRel.沖.length > 0) {
        conflictPotential.push(`${names[i]}와 ${names[j]} 사이 지지 충`)
      }
      if (branchRel.三合.length > 0 || branchRel.六合.length > 0) {
        cooperationAreas.push(`${names[i]}와 ${names[j]} 협력 시 시너지`)
      }
    }
  }

  // 오행 분포 분석
  const dominantElements = Object.entries(elementDistribution)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])

  if (dominantElements.length === 1) {
    inheritancePatterns.push(`모든 형제가 ${dominantElements[0][0]} 우세 - 강한 가문 특성`)
  } else if (dominantElements.length >= 3) {
    inheritancePatterns.push('다양한 오행 분포 - 각자의 역할과 강점이 다름')
  }

  // 출생 순서 영향
  const birthOrderInfluence =
    siblings.length > 1
      ? '출생 순서에 따라 가족 내 역할과 책임이 분배됨'
      : '외동으로 부모의 집중적 에너지 받음'

  return {
    birthOrderInfluence,
    elementDistribution,
    conflictPotential,
    cooperationAreas,
    inheritancePatterns,
  }
}

/**
 * 배우자 분석
 */
export function analyzeSpouse(
  self: SajuResult,
  spouse: SajuResult,
  marriageYear: number
): SpouseAnalysis {
  const elementHarmony = analyzeElementHarmony(self, spouse)
  const stemRel = analyzeStemRelation(self, spouse)
  const branchRel = analyzeBranchRelation(self, spouse)

  let marriageQuality: string
  const totalScore = (elementHarmony.score + stemRel.score + branchRel.score) / 3

  if (totalScore >= 80) {
    marriageQuality = '천생연분 - 자연스러운 조화와 깊은 이해'
  } else if (totalScore >= 65) {
    marriageQuality = '양호한 궁합 - 노력으로 더 좋아질 수 있음'
  } else if (totalScore >= 50) {
    marriageQuality = '보통 궁합 - 서로의 노력이 필요'
  } else {
    marriageQuality = '도전적 궁합 - 많은 이해와 양보 필요'
  }

  const complementaryAspects: string[] = []
  const frictionAreas: string[] = []
  const growthTogether: string[] = []

  if (stemRel.合.length > 0) {
    complementaryAspects.push(`천간합으로 인한 깊은 유대: ${stemRel.合.join(', ')}`)
  }
  if (branchRel.三合.length > 0) {
    complementaryAspects.push(`삼합으로 인한 목표 일치: ${branchRel.三合.join(', ')}`)
  }
  if (branchRel.六合.length > 0) {
    complementaryAspects.push(`육합으로 인한 일상적 조화: ${branchRel.六合.join(', ')}`)
  }

  if (branchRel.沖.length > 0) {
    frictionAreas.push(`지지 충으로 인한 갈등: ${branchRel.沖.join(', ')}`)
  }
  if (elementHarmony.relation === '상극') {
    frictionAreas.push(
      `오행 상극(${elementHarmony.dominant1}-${elementHarmony.dominant2})으로 인한 관점 차이`
    )
  }

  // 성장 영역
  const selfDom = elementHarmony.dominant1
  const spouseDom = elementHarmony.dominant2
  growthTogether.push(`${selfDom}와 ${spouseDom}의 조화를 통한 균형 학습`)
  if (elementHarmony.relation === '상생') {
    growthTogether.push('자연스러운 지원과 성장의 선순환')
  }

  // 연도별 예측
  const yearlyForecast: { year: number; theme: string }[] = []
  for (let i = 0; i < 5; i++) {
    const year = marriageYear + i
    const yearBranch = BRANCHES[year % 12].name

    let theme: string
    if (
      YUKAP[yearBranch] === self.fourPillars.day.branch ||
      YUKAP[yearBranch] === spouse.fourPillars.day.branch
    ) {
      theme = '조화와 화합의 해'
    } else if (CHUNG[yearBranch] === self.fourPillars.day.branch) {
      theme = '자기 성장과 변화의 해'
    } else if (CHUNG[yearBranch] === spouse.fourPillars.day.branch) {
      theme = '배우자 이해와 지원의 해'
    } else {
      theme = '안정적 유지의 해'
    }

    yearlyForecast.push({ year, theme })
  }

  return {
    marriageQuality,
    complementaryAspects,
    frictionAreas,
    growthTogether,
    yearlyForecast,
  }
}

/**
 * 가족 전체 역학 분석
 */
export function analyzeFamilyDynamic(
  members: FamilyMember[],
  sajuMap: Map<string, SajuResult>
): FamilyDynamic {
  const allElements: string[] = []

  for (const member of members) {
    const saju = sajuMap.get(member.id)
    if (saju) {
      const elements = extractAllElements(saju)
      allElements.push(...elements)
    }
  }

  const elementCounts: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  for (const el of allElements) {
    if (elementCounts[el] !== undefined) {
      elementCounts[el]++
    }
  }

  const sorted = Object.entries(elementCounts).sort((a, b) => b[1] - a[1])
  const dominantElement = sorted[0][0]
  const weakElement = sorted[sorted.length - 1][0]

  // 조화 점수 계산
  const conflicts = analyzeConflictPoints(members, sajuMap)
  const majorConflicts = conflicts.filter((c) => c.severity === 'major').length
  const overallHarmony = Math.max(0, 100 - majorConflicts * 15 - conflicts.length * 5)

  // 가족 카르마
  const familyKarma: string[] = []
  if (elementCounts[dominantElement] > allElements.length * 0.4) {
    familyKarma.push(`${dominantElement} 과잉: ${getElementExcessKarma(dominantElement)}`)
  }
  if (elementCounts[weakElement] < allElements.length * 0.1) {
    familyKarma.push(`${weakElement} 부족: ${getMissingElementKarma(weakElement)}`)
  }

  // 세대 패턴 (간략화)
  const generationalPatterns: GenerationalPattern[] = []

  // 집단 교훈
  const collectiveLessons = [
    `${dominantElement} 에너지의 긍정적 활용법 학습`,
    `${weakElement} 에너지 보완을 위한 의식적 노력`,
  ]

  // 가족 강화 방안
  const strengthenFamily = [
    getStrengtheningStrategy(dominantElement, weakElement),
    '정기적인 가족 활동을 통한 유대 강화',
    '각 구성원의 강점 인정과 활용',
  ]

  return {
    overallHarmony,
    dominantElement,
    weakElement,
    familyKarma,
    generationalPatterns,
    collectiveLessons,
    strengthenFamily,
  }
}

function getElementExcessKarma(element: string): string {
  const karma: Record<string, string> = {
    목: '과도한 경쟁과 무리한 확장 경계',
    화: '감정 과열과 충동 조절 필요',
    토: '고집과 변화 거부 주의',
    금: '과도한 원칙과 융통성 부족 주의',
    수: '우유부단과 방향성 상실 주의',
  }
  return karma[element] || '균형 필요'
}

function getStrengtheningStrategy(dominant: string, weak: string): string {
  return `${dominant} 에너지를 활용하여 ${weak} 영역 보완하기`
}

/**
 * 종합 가족 분석 수행
 */
export function performCompleteFamilyAnalysis(
  members: FamilyMember[],
  sajuMap: Map<string, SajuResult>
): {
  familyDynamic: FamilyDynamic
  memberRoles: Map<string, RoleHarmonyResult>
  relations: FamilyRelation[]
  conflicts: ConflictPoint[]
  recommendations: string[]
} {
  // 가족 역학
  const familyDynamic = analyzeFamilyDynamic(members, sajuMap)

  // 구성원 역할
  const memberRoles = new Map<string, RoleHarmonyResult>()
  for (const member of members) {
    const saju = sajuMap.get(member.id)
    if (saju) {
      memberRoles.set(member.id, analyzeRoleHarmony(member, saju))
    }
  }

  // 관계 분석
  const relations: FamilyRelation[] = []
  for (let i = 0; i < members.length; i++) {
    for (let j = i + 1; j < members.length; j++) {
      const saju1 = sajuMap.get(members[i].id)
      const saju2 = sajuMap.get(members[j].id)
      if (!saju1 || !saju2) {
        continue
      }

      const relationType = determineRelationType(members[i].role, members[j].role)

      relations.push({
        member1Id: members[i].id,
        member2Id: members[j].id,
        relationType,
        compatibility: {
          overallScore: 0,
          elementHarmony: analyzeElementHarmony(saju1, saju2),
          stemRelation: analyzeStemRelation(saju1, saju2),
          branchRelation: analyzeBranchRelation(saju1, saju2),
          roleHarmony: memberRoles.get(members[i].id) ?? {
            expectedRole: '알 수 없음',
            actualEnergy: '알 수 없음',
            alignment: 'moderate',
            suggestions: [],
          },
          inheritedTraits: [],
          conflictPoints: [],
          blessings: [],
          cautions: [],
        },
      })
    }
  }

  // 갈등 분석
  const conflicts = analyzeConflictPoints(members, sajuMap)

  // 추천 사항
  const recommendations: string[] = [
    ...familyDynamic.strengthenFamily,
    ...Array.from(memberRoles.values()).flatMap((r) => r.suggestions),
  ]

  return {
    familyDynamic,
    memberRoles,
    relations,
    conflicts,
    recommendations: Array.from(new Set(recommendations)),
  }
}

function determineRelationType(
  role1: FamilyRole,
  role2: FamilyRole
): 'parent_child' | 'spouse' | 'sibling' | 'grandparent_grandchild' {
  if ((role1 === 'father' || role1 === 'mother') && role2 === 'child') {
    return 'parent_child'
  }
  if (role1 === 'child' && (role2 === 'father' || role2 === 'mother')) {
    return 'parent_child'
  }
  if (role1 === 'self' && role2 === 'spouse') {
    return 'spouse'
  }
  if (role1 === 'spouse' && role2 === 'self') {
    return 'spouse'
  }
  if (role1 === 'sibling' && role2 === 'sibling') {
    return 'sibling'
  }
  if (role1 === 'grandparent' || role2 === 'grandparent') {
    return 'grandparent_grandchild'
  }
  return 'sibling'
}
