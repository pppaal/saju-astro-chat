/**
 * Saju 라이브러리(`src/lib/Saju/*`) 한국어 풀이 함수들을 ai-report 섹션에
 * 끌어와 본명 narration을 합성합니다.
 *
 * 라이브러리는 18,924줄 다 만들어져 있는데 ai-report 파이프가 호출 안 하던
 * 갭을 메우는 wiring 모듈. 새 narrator를 만들지 않고 기존 함수만 호출.
 *
 * 호출 함수:
 *   - getGeokgukDescription(geokguk)       : 격국 17종 한국어 풀이
 *   - generateSibsinText(sibsin)            : 십신 풀이 (정관/식신/...)
 *   - generateTwelveStageText(stage)        : 12운성 풀이 (장생/관대/...)
 *
 * 추가 wiring: currentDaeun/Saeun/Wolun/Iljin 원소를 본명 일간 원소와
 * 비교해 시기별 흐름 한 줄을 합성 (대운·세운·월운·일운).
 */

import type { MatrixCalculationInput } from '@/lib/destiny-matrix/types'
import { getGeokgukDescription } from '@/lib/Saju/foundation/geokguk'
import type { GeokgukType } from '@/lib/Saju/foundation/geokguk'
import {
  calculateCrossConfidence,
  estimateSajuSignalStrength,
  estimateAstroSignalStrength,
} from './crossConfidence'
import { buildGeokgukDeepKo, buildShinsalDeepKo } from './expertKBDeep'
import { buildSajuDynamicsKo } from './sajuDynamicsKB'
import {
  buildAsteroidsSibsinCrossKo,
  buildVertexSajuCrossKo,
  buildPartOfFortuneSajuCrossKo,
  buildAspectSajuElementCrossKo,
  buildYongsinAstroCrossKo,
  buildTwelveStageAstroCrossKo,
} from './advancedAstroCrossKB'

const KO_SHINSAL_BLURB: Record<string, string> = {
  역마: '이동·출장·전직 같은 환경 변동이 잘 일어나고',
  도화: '관계 끌림과 매력이 살아나며 공개적인 자리에 서기 좋고',
  화개: '내적 정리·예술·고독한 시간이 깊어지고',
  망신: '체면 흔들림이나 실수 노출에 조심해야 하고',
  천을귀인: '귀인의 도움이 들어오고 위기에서 풀리는 길이 잘 열리고',
  태극귀인: '학문·종교·영적 통찰이 강해지고',
  문창: '학습·시험·문서 운이 강해지고',
  문곡: '문장·예술·표현 능력이 빛나고',
  월덕귀인: '한 달 단위 흐름에서 보호와 안정이 들어오고',
  천덕귀인: '하늘의 덕이 보호처럼 작용해 큰 흉운을 막아주고',
  괴강: '강한 추진력과 카리스마가 있되 극단으로 치우치기 쉽고',
  양인: '결단과 칼날같은 추진이 있는 대신 충돌·사고에 조심해야 하고',
  백호: '강력한 사건성·충돌이 있을 수 있어 조심해야 하고',
  금여성: '주변에서 도움과 인덕이 들어오고',
  천문성: '학문·종교·영성에 인연이 깊고',
  귀문관: '예민한 직관과 영적 감수성이 강하고',
  현침: '뾰족한 결단이나 직설 표현이 강한 패턴이 있고',
  고신: '외로움·고립·독립적 성향이 강하고',
  삼재: '3년 단위의 큰 정리·리셋 시기가 있어 무리한 확장은 자제하고',
}

function topEntry<T extends string>(
  dist: Partial<Record<T, number>> | undefined
): T | null {
  if (!dist) return null
  const entries = Object.entries(dist) as Array<[T, number]>
  if (entries.length === 0) return null
  let bestKey: T | null = null
  let bestVal = -Infinity
  for (const [k, v] of entries) {
    if (typeof v === 'number' && v > bestVal) {
      bestVal = v
      bestKey = k
    }
  }
  return bestKey
}

// 일주의 12운성을 sajuSnapshot.pillars.day에서 직접 추출 (분포 top이 아니라 본인 일간 stage)
import { getTwelveStage } from '@/lib/Saju/foundation/shinsal'
function readDayMasterStage(input: MatrixCalculationInput): string | null {
  const snap = (input as { sajuSnapshot?: { pillars?: { day?: { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } } } } }).sajuSnapshot
  const stem = snap?.pillars?.day?.heavenlyStem?.name
  const branch = snap?.pillars?.day?.earthlyBranch?.name
  if (!stem || !branch) return null
  const stage = getTwelveStage(stem, branch)
  return stage || null
}

// 격국 description 끝맺음을 자연스럽게 이어주는 분기
function suffixGeokgukDescription(desc: string): string {
  const cleaned = desc.replace(/\.$/, '').trim()
  // 형용사·명사 종결 (… 인자함·강함·있음 등)
  if (/(?:있음|함|많음|뛰어남|풍부함|강함|약함|좋음)$/.test(cleaned)) {
    return `${cleaned} 성향이 두드러지는 분이에요.`
  }
  // 동사형 종결 (… 추구·중시·다룸·축적·…)
  if (/(?:추구|축적|관심|보유|중시|성공|사고력|결단력|독립적)$/.test(cleaned)) {
    return `${cleaned}하는 분이에요.`
  }
  return `${cleaned}${eulReul(cleaned)} 보이는 분이에요.`
}

/**
 * 본명 사주 narration 한국어 — deepAnalysis에 prepend하기 좋도록 한 단락.
 * synthesizeExpertNarrationKo의 ¶1(본명 인격 단락)만 추출해서
 * 격국·12운성·십신·신살·일상 영역 매핑·주변 인상까지 포함된 풍부한 narration 반환.
 *
 * 기존 generateTwelveStageText/generateSibsinText 라이브러리 직접 호출은
 * 톤이 평면적이고 짧아서 (예: '12운성 쇠의 안정의 기운이 작용합니다.')
 * synthesize의 ¶1을 재사용하는 형태로 통일.
 */
export function buildSajuNarrationKo(input: MatrixCalculationInput): string {
  const full = synthesizeExpertNarrationKo(input)
  const firstParagraph = full.split('\n\n')[0]
  return firstParagraph || ''
}

/**
 * 도메인별 narration suffix — 테마 리포트에서 deepAnalysis 뒤에 덧붙이기.
 * 격국이 그 도메인에서 어떻게 발현되는지 짧게 한 줄.
 */
export function buildDomainSajuLensKo(
  input: MatrixCalculationInput,
  theme: 'love' | 'career' | 'wealth' | 'health' | 'family' | 'move'
): string {
  if (!input.geokguk) return ''
  const lensByTheme: Record<typeof theme, string> = {
    career: `${input.geokguk}이라 직업·역할에서 그 격국 색이 그대로 드러나요.`,
    love: `${input.geokguk} 흐름이 관계에서 어떻게 표현되는지가 핵심 포인트예요.`,
    wealth: `${input.geokguk} 흐름이 돈을 다루는 방식과 직결돼요.`,
    health: `${input.geokguk} 흐름이 컨디션 관리와 회복 패턴에도 똑같이 비춰요.`,
    family: `${input.geokguk} 흐름이 가족 안에서의 역할과 책임 분배로 나타나요.`,
    move: `${input.geokguk} 흐름이 이동·환경 변동을 다루는 태도에 그대로 반영돼요.`,
  }
  return lensByTheme[theme]
}

// ──────────────────────────────────────────────────────────
// 시기별 timing narration — 대운/세운/월운/일운 원소 기반
// ──────────────────────────────────────────────────────────

const ELEMENT_KO_LABEL: Record<string, string> = {
  wood: '목',
  fire: '화',
  earth: '토',
  metal: '금',
  water: '수',
  목: '목',
  화: '화',
  토: '토',
  금: '금',
  수: '수',
}

// 정통 명리 idiom — 5행 통변 표현. 일반론 대신 명리학 용어로.
const ELEMENT_FLAVOR_KO: Record<string, string> = {
  목: '인성과 식상의 결이 살아나 새 일의 기운이 도는',
  화: '관성과 재성의 작용이 강해져 외부 압력과 결과가 함께 올라오는',
  토: '인수와 비겁의 토양이 두터워져 자리 잡고 받쳐주는',
  금: '식신과 재성을 다스려 정리·결단이 또렷해지는',
  수: '식상과 재기가 흘러 표현·관계·재물 변동이 활발해지는',
}

// 본명 일간 원소와 시기 원소 관계 → 한 줄 카운슬링
/**
 * ## 분석 근거 — 계산된 모든 raw 값을 사용자에게 명시적으로 노출.
 * narration 결론(메인 본문)의 출처를 사용자가 직접 확인 가능.
 * 비어있는 카테고리는 자동 silent.
 */
export function buildEvidenceDigestKo(input: MatrixCalculationInput): string {
  const sections: string[] = []

  // 사주 raw
  const sajuItems: string[] = []
  if (input.dayMasterElement) {
    const dm = ELEMENT_KO_LABEL[input.dayMasterElement] || input.dayMasterElement
    sajuItems.push(`- 일간: ${dm}`)
  }
  if (input.geokguk) {
    sajuItems.push(`- 격국: ${input.geokguk}`)
  }
  if (input.yongsin) {
    const ys = ELEMENT_KO_LABEL[input.yongsin] || input.yongsin
    sajuItems.push(`- 용신: ${ys}`)
  }
  const fe = (input as { sajuSnapshot?: { fiveElements?: Record<string, number> } }).sajuSnapshot?.fiveElements
  if (fe) {
    const feLine = ['목', '화', '토', '금', '수']
      .map((k) => {
        const key = { '목': 'wood', '화': 'fire', '토': 'earth', '금': 'metal', '수': 'water' }[k] || k
        return `${k}${fe[key as keyof typeof fe] || 0}`
      })
      .join(' / ')
    sajuItems.push(`- 5행 분포: ${feLine}`)
  }
  if (input.sibsinDistribution && Object.keys(input.sibsinDistribution).length > 0) {
    const sibLine = Object.entries(input.sibsinDistribution)
      .filter(([, v]) => typeof v === 'number' && v > 0)
      .map(([k, v]) => `${k}(${v})`)
      .join(', ')
    if (sibLine) sajuItems.push(`- 십신 분포: ${sibLine}`)
  }
  if (input.twelveStages && Object.keys(input.twelveStages).length > 0) {
    const stagesLine = Object.entries(input.twelveStages)
      .filter(([, v]) => typeof v === 'number' && v > 0)
      .slice(0, 3)
      .map(([k, v]) => `${k}(${v})`)
      .join(', ')
    if (stagesLine) sajuItems.push(`- 12운성 top: ${stagesLine}`)
  }
  if (input.shinsalList && input.shinsalList.length > 0) {
    sajuItems.push(`- 활성 신살: ${input.shinsalList.slice(0, 8).join(', ')}`)
  }
  if (input.relations && input.relations.length > 0) {
    const relLine = input.relations.slice(0, 5).map((r) => r.kind + (r.detail ? `(${r.detail})` : '')).join(', ')
    sajuItems.push(`- 관계(합/충/형): ${relLine}`)
  }
  // 시기별 element
  const timing: string[] = []
  if (input.currentDaeunElement) timing.push(`대운 ${ELEMENT_KO_LABEL[input.currentDaeunElement] || input.currentDaeunElement}`)
  if (input.currentSaeunElement) timing.push(`세운 ${ELEMENT_KO_LABEL[input.currentSaeunElement] || input.currentSaeunElement}`)
  if (input.currentWolunElement) timing.push(`월운 ${ELEMENT_KO_LABEL[input.currentWolunElement] || input.currentWolunElement}`)
  if (input.currentIljinElement) timing.push(`일운 ${ELEMENT_KO_LABEL[input.currentIljinElement] || input.currentIljinElement}`)
  if (timing.length > 0) sajuItems.push(`- 현재 시기: ${timing.join(' · ')}`)

  if (sajuItems.length > 0) {
    sections.push(`### 사주 raw\n${sajuItems.join('\n')}`)
  }

  // 점성 raw
  const astroItems: string[] = []
  if (input.dominantWesternElement) {
    const we: Record<string, string> = { fire: '화', earth: '토', air: '풍', water: '수' }
    astroItems.push(`- dominant element: ${we[input.dominantWesternElement] || input.dominantWesternElement}`)
  }
  const signsAny = (input.planetSigns || {}) as unknown as Record<string, string | undefined>
  const housesAny = (input.planetHouses || {}) as unknown as Record<string, number | undefined>
  const planetOrder = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']
  const planetLines: string[] = []
  for (const p of planetOrder) {
    const sign = signsAny[p]
    const house = housesAny[p]
    if (sign || house) {
      const parts = [p]
      if (sign) parts.push(sign)
      if (house) parts.push(`${house}H`)
      planetLines.push(parts.join(' '))
    }
  }
  if (planetLines.length > 0) astroItems.push(`- 행성 위치: ${planetLines.join(', ')}`)
  if (signsAny.Ascendant) astroItems.push(`- 상승 (ASC): ${signsAny.Ascendant}`)
  if (signsAny.Midheaven) astroItems.push(`- 중천 (MC): ${signsAny.Midheaven}`)
  if (input.aspects && input.aspects.length > 0) {
    const typeCount: Record<string, number> = {}
    for (const a of input.aspects) typeCount[a.type] = (typeCount[a.type] || 0) + 1
    const aspectsLine = Object.entries(typeCount).map(([t, c]) => `${t} ${c}`).join(', ')
    astroItems.push(`- 어스펙트: ${aspectsLine} (총 ${input.aspects.length})`)
  }
  const transits = (input as { activeTransits?: string[] }).activeTransits
  if (transits && transits.length > 0) {
    astroItems.push(`- 활성 트랜짓: ${transits.slice(0, 5).join(', ')}`)
  }
  if (input.asteroidHouses && Object.keys(input.asteroidHouses).length > 0) {
    const astLine = Object.entries(input.asteroidHouses).map(([k, h]) => `${k} ${h}H`).join(', ')
    astroItems.push(`- 소행성: ${astLine}`)
  }
  if (input.extraPointSigns && Object.keys(input.extraPointSigns).length > 0) {
    const epLine = Object.entries(input.extraPointSigns).map(([k, s]) => `${k} ${s}`).join(', ')
    astroItems.push(`- 특수점: ${epLine}`)
  }
  const adv = input.advancedAstroSignals || {}
  const advFlags: string[] = []
  for (const [k, v] of Object.entries(adv)) {
    if (v) advFlags.push(k)
  }
  if (advFlags.length > 0) astroItems.push(`- 활성 고급 신호: ${advFlags.join(', ')}`)

  if (astroItems.length > 0) {
    sections.push(`### 점성 raw\n${astroItems.join('\n')}`)
  }

  if (sections.length === 0) return ''
  return `## 분석 근거\n\n${sections.join('\n\n')}`
}

/**
 * 신년 운세 월별 breakdown — 12개월 한 줄씩.
 * 매월 월운 element × 본명 일간으로 톤 잡고, peak 시점은 강조.
 *
 * 사용처: 신년 리포트의 "## 월별 흐름" 섹션, 상담사가 "올해 어때?" 질문에
 * 응답할 때 호출.
 */
export function buildAnnualMonthlyBreakdownKo(
  input: MatrixCalculationInput,
  startYearMonth?: string
): string {
  const natalRaw = input.dayMasterElement
  if (!natalRaw) return ''
  const natal = ELEMENT_KO_LABEL[natalRaw]
  if (!natal) return ''

  // 12개월 element 시퀀스 — 음력 월별 지지 element 매핑 (절기 단순화)
  // 인(목)→묘(목)→진(토)→사(화)→오(화)→미(토)→신(금)→유(금)→술(토)→해(수)→자(수)→축(토)
  const MONTH_BRANCH_EL: string[] = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수']
  // 인덱스: 0=1월, 1=2월, ..., 11=12월

  const SEQ = ['목', '화', '토', '금', '수']
  const ni = SEQ.indexOf(natal)
  // 정통 명리 통변 — 본명 일간 vs 운(運) 오행 관계의 십신 명칭으로 호칭
  // diff: 0=비겁(同氣) / 1=식상(我生) / 2=재성(我剋) / 3=관성(剋我) / 4=인성(生我)
  const RELATION_KO = [
    '비겁운으로 본명 기운이 두터워져 자기 주장·돌파력이 살아나는',
    '식상운으로 내 기운이 밖으로 풀려나가 표현·창의·자식 영역이 활발해지는',
    '재성운으로 내가 다스리는 자리라 재물·기회·이성 인연이 잡히는',
    '관성운으로 나를 다스리는 자리라 직책·시험·책임 압박이 들어오는',
    '인성운으로 나를 도와주는 자리라 학습·문서·귀인의 도움이 들어오는',
  ]

  const startMatch = (startYearMonth || input.startYearMonth || '').match(/^(\d{4})/)
  const year = startMatch ? Number(startMatch[1]) : new Date().getFullYear()

  const lines: string[] = []
  for (let m = 0; m < 12; m++) {
    const monthLabel = `${m + 1}월`
    const cycleEl = MONTH_BRANCH_EL[m]
    const ci = SEQ.indexOf(cycleEl)
    if (ni < 0 || ci < 0) {
      lines.push(`- **${monthLabel}** — ${cycleEl} 흐름이 이어져요.`)
      continue
    }
    const diff = (ci - ni + 5) % 5
    const relation = RELATION_KO[diff]
    const flavor = ELEMENT_FLAVOR_KO[cycleEl] || ''

    // 강조 — 같은 element 또는 충돌 element면 peak
    let badge = ''
    if (diff === 0) badge = ' 🔥' // 본명과 같음
    else if (diff === 3) badge = ' ⚠️' // 나를 누름

    // 월운 × 세운 동시 강조 (세운 element와 월운 element 충돌)
    const saeunEl = input.currentSaeunElement
    const saeunKo = saeunEl ? ELEMENT_KO_LABEL[saeunEl] : ''
    let saeunNote = ''
    if (saeunKo && saeunKo === cycleEl) {
      saeunNote = ' (세운 강조)'
    }

    lines.push(`- **${monthLabel}**${badge} — ${cycleEl}월(${relation} 시기). ${flavor} 결${saeunNote}.`)
  }

  return `## ${year}년 월별 흐름 (월운 통변)\n${lines.join('\n')}`
}

function describeElementInteraction(
  natalElementRaw: string | undefined,
  cycleElementRaw: string | undefined,
  cycleLabel: string
): string {
  const natal = natalElementRaw ? ELEMENT_KO_LABEL[natalElementRaw] : ''
  const cycle = cycleElementRaw ? ELEMENT_KO_LABEL[cycleElementRaw] : ''
  if (!cycle) return ''
  const flavor = ELEMENT_FLAVOR_KO[cycle] || '흐름이 이어지는'
  if (!natal) return `${cycleLabel} ${cycle} ${flavor} 시기예요.`
  // 본명-시기 오행 관계
  const SEQ = ['목', '화', '토', '금', '수']
  const ni = SEQ.indexOf(natal)
  const ci = SEQ.indexOf(cycle)
  if (ni < 0 || ci < 0) {
    return `${cycleLabel} ${cycle} ${flavor} 시기예요.`
  }
  const diff = (ci - ni + 5) % 5
  // diff: 0=동기, 1=설기(내가→), 2=재(내가 통제), 3=관(나를 통제), 4=인(나를 도움)
  const relationKo = ['본명과 같은 기운이라 자기 흐름이 더 강해지는', '내 기운을 밖으로 풀어내는', '내가 다스리고 통제하는', '나를 누르고 시험하는', '나를 받쳐주고 도와주는'][diff]
  return `${cycleLabel} ${cycle} 흐름은 ${relationKo} 시기로, ${flavor} 분위기예요.`
}

/**
 * 대운/세운/월운/일운 narration 묶음.
 * 본명 일간 원소와 각 시기 원소를 비교해 한 줄씩.
 * matrixInput.currentDaeun/Saeun/Wolun/IljinElement 가 routeDerivedContext에서 채워짐.
 */
export function buildTimingNarrationKo(input: MatrixCalculationInput): string {
  const natal = (input as { dayMasterElement?: string }).dayMasterElement
  const lines: string[] = []
  const daeun = input.currentDaeunElement
  const saeun = (input as { currentSaeunElement?: string }).currentSaeunElement
  const wolun = (input as { currentWolunElement?: string }).currentWolunElement
  const iljin = (input as { currentIljinElement?: string }).currentIljinElement
  const dq = describeElementInteraction(natal, daeun, '대운으로 보면')
  const sq = describeElementInteraction(natal, saeun, '올해 세운은')
  const wq = describeElementInteraction(natal, wolun, '이번 달 월운은')
  const iq = describeElementInteraction(natal, iljin, '오늘 일운은')
  if (dq) lines.push(dq)
  if (sq) lines.push(sq)
  if (wq) lines.push(wq)
  if (iq) lines.push(iq)
  return lines.join(' ')
}

// ──────────────────────────────────────────────────────────
// Expert synthesis — 4개 layer narration을 weave된 expert story로
// ──────────────────────────────────────────────────────────

// 한국어 조사 자동 선택 (이/가, 을/를, 은/는)
function hasJongsung(word: string): boolean {
  if (!word) return false
  const last = word.charCodeAt(word.length - 1)
  if (last < 0xac00 || last > 0xd7a3) return false
  return (last - 0xac00) % 28 !== 0
}
function iga(word: string): string {
  return hasJongsung(word) ? '이' : '가'
}
function eulReul(word: string): string {
  return hasJongsung(word) ? '을' : '를'
}

const STAGE_LIFE_PHRASE: Partial<Record<string, string>> = {
  장생: '막 새로 태어난 단계라 시작·도전에 힘이 잘 실리는',
  목욕: '갓 정화되는 단계라 외부 영향과 유혹에 흔들리기 쉬운',
  관대: '막 사회로 나가 자리 잡는 단계라 책임감이 실제 역할로 옮겨가는',
  건록: '능력을 인정받는 전성기 초입이라 자수성가가 가장 잘 풀리는',
  제왕: '권력의 정점에 들어와 추진력이 강해지는',
  쇠: '한 차례 정점을 지나 정리·재배치가 필요한',
  병: '몸과 마음의 신호에 민감해지며 회복이 우선되는',
  사: '한 호흡 멈추고 내면을 들여다봐야 하는',
  묘: '결과를 갈무리하고 다음을 준비하는 정리 단계의',
  절: '기존 흐름이 끊어지고 새 씨앗을 심어야 하는',
  태: '아직 보이지 않는 가능성을 잉태하는',
  양: '드러나기 직전의 조용한 성장이 진행되는',
}

const SHINSAL_THEMATIC_KO: Partial<Record<string, string>> = {
  천을귀인: '큰 결정 앞에서 도와주는 사람이 자연스레 들어오고',
  태극귀인: '학문·종교·영적 통찰에 깊이가 생기고',
  문창: '글·문서·시험 운이 트이고',
  문곡: '문장과 표현 능력이 빛나고',
  월덕귀인: '한 달 단위에서 보호와 안정이 들어오고',
  천덕귀인: '하늘의 덕이 큰 흉을 막아주고',
  역마: '이동·출장·환경 변동이 활발해지고',
  도화: '관계 끌림과 매력이 살아나며',
  화개: '내적 정리·예술·고독한 시간이 깊어지고',
  망신: '체면 흔들림이나 실수 노출에 조심해야 하고',
  괴강: '강한 추진력과 카리스마가 있되 극단으로 치우치기 쉽고',
  양인: '결단과 칼날같은 추진이 있는 대신 충돌·사고에 조심해야 하고',
  백호: '강한 사건성·충돌이 있을 수 있어 조심해야 하고',
  금여성: '주변 인덕과 도움이 들어오고',
  천문성: '학문·종교·영성에 인연이 깊고',
  귀문관: '예민한 직관과 영적 감수성이 강하고',
  현침: '뾰족한 결단이나 직설 표현이 강한 패턴이 있고',
  고신: '외로움과 독립적 성향이 강하고',
  삼재: '3년 단위의 큰 정리·리셋 시기가 있어 무리한 확장은 자제해야 하고',
}

// 5행 관계: 본명 일간 vs 시기 원소 — 자연어 한 줄 (끝맺음은 호출처에서 추가)
function describeCycleRelation(
  natalEl: string | undefined,
  cycleEl: string | undefined,
  cycleLabel: string,
  flavor: string
): string {
  const natal = natalEl ? ELEMENT_KO_LABEL[natalEl] : ''
  const cycle = cycleEl ? ELEMENT_KO_LABEL[cycleEl] : ''
  if (!cycle) return ''
  if (!natal) return `${cycleLabel}은 ${cycle} 기운이라 ${flavor}`
  const SEQ = ['목', '화', '토', '금', '수']
  const ni = SEQ.indexOf(natal)
  const ci = SEQ.indexOf(cycle)
  if (ni < 0 || ci < 0) return `${cycleLabel}은 ${cycle} 기운이 도는 자리라 ${flavor}`
  const diff = (ci - ni + 5) % 5
  // 0=비겁 1=식상 2=재성 3=관성 4=인성 — 십신 통변 + 풍부 해석
  const SIBSIN_DEEP_KO: string[] = [
    `본명과 같은 ${cycle} 기운이 더해지는 비겁 자리라 자기 주장·돌파력이 한층 살아나며, ${flavor} — 동업·경쟁·자기 사업 같은 자리에서 본인 색을 더 진하게 내기 좋은 시점이에요`,
    `본인 기운이 ${cycle}로 풀려나가는 식상 자리라 표현·창작·자식 영역이 활발해지며, ${flavor} — 발표·창업·SNS 같은 외부 발산이 자연스럽게 늘어나는 시점이에요`,
    `${cycle}이 본인이 다스리는 재성 자리라 재물·기회·이성 인연이 잡히며, ${flavor} — 다만 재성은 가만히 있어 들어오는 게 아니라 적극적으로 다스려야 잡히는 자원이라 능동성이 필요해요`,
    `${cycle}이 본인을 누르는 관성 자리라 직책·시험·책임 압박이 들어오며, ${flavor} — 외부 평가가 또렷한 자리가 만들어지니 결과를 만들어 보여줄 시점이에요`,
    `${cycle}이 본인을 받쳐주는 인성 자리라 학습·문서·귀인 도움이 들어오며, ${flavor} — 자격증·계약·스승·후원자 같은 받쳐주는 인연이 결정적 도움을 주는 시점이에요`,
  ]
  void SIBSIN_DEEP_KO // 단순 reference list — 사용은 directLines
  const directLines = [
    `${cycleLabel} ${cycle} — 본명과 같은 ${cycle} 기운이 더해지는 비겁 자리라 자기 주장·돌파력이 한층 살아나며, ${flavor} 결. 동업·경쟁·자기 사업 같은 자리에서 본인 색을 더 진하게 내기 좋은 시점이에요`,
    `${cycleLabel} ${cycle} — 본인 기운이 ${cycle}로 풀려나가는 식상 자리라 표현·창작·자식 영역이 활발해지며, ${flavor} 결. 발표·창업·SNS 같은 외부 발산이 자연스럽게 늘어나는 시점이에요`,
    `${cycleLabel} ${cycle} — ${cycle}이 본인이 다스리는 재성 자리라 재물·기회·이성 인연이 잡히며, ${flavor} 결. 재성은 가만히 들어오지 않고 적극적으로 다스려야 잡히는 자원이라 능동성이 필요해요`,
    `${cycleLabel} ${cycle} — ${cycle}이 본인을 누르는 관성 자리라 직책·시험·책임 압박이 들어오며, ${flavor} 결. 외부 평가가 또렷한 자리가 만들어지니 결과를 만들어 보여줄 시점이에요`,
    `${cycleLabel} ${cycle} — ${cycle}이 본인을 받쳐주는 인성 자리라 학습·문서·귀인 도움이 들어오며, ${flavor} 결. 자격증·계약·스승·후원자 같은 받쳐주는 인연이 결정적 도움을 주는 시점이에요`,
  ]
  return directLines[diff]
}

// 두 시기가 충돌하는지/받쳐주는지 (예: 대운 화 + 세운 금 = 화극금 충돌)
function describeCycleClash(
  el1: string | undefined,
  el2: string | undefined,
  label1: string,
  label2: string
): string {
  if (!el1 || !el2) return ''
  const a = ELEMENT_KO_LABEL[el1]
  const b = ELEMENT_KO_LABEL[el2]
  if (!a || !b) return ''
  const SEQ = ['목', '화', '토', '금', '수']
  const ai = SEQ.indexOf(a)
  const bi = SEQ.indexOf(b)
  if (ai < 0 || bi < 0) return ''
  const diff = (bi - ai + 5) % 5
  if (diff === 0) return `${label1}·${label2}이 같은 ${a} 흐름이라 그 색이 더 진해지는`
  if (diff === 4) return `${label1} ${a}${eulReul(a)} ${label2} ${b}${iga(b)} 받쳐주는 상생 구조`
  if (diff === 1) return `${label1} ${a}${iga(a)} ${label2} ${b} 쪽으로 풀려나가는 흐름`
  if (diff === 3) return `${label1} ${a}${eulReul(a)} ${label2} ${b}${iga(b)} 누르는 상극 구조라 마찰이 생기는`
  if (diff === 2) return `${label1} ${a}${iga(a)} ${label2} ${b}${eulReul(b)} 다스리는 통제 구조`
  return ''
}

/**
 * 4개 layer narration을 expert tone으로 엮어 3-4단락 자연어 합성.
 * 반환: 단락 사이에 \n\n 들어간 한 덩어리.
 */
export function synthesizeExpertNarrationKo(input: MatrixCalculationInput): string {
  // 정보 계층 구조: 메인 본문(cross-driven) → ## 사주 본명 분석(보조) → ## 점성 본명 차트(보조) → callout
  // - 메인은 cross-validated 신호만으로 구성해 정확도 우선
  // - 단독 사주 / 단독 점성 신호는 헤딩으로 명확히 분리해 부가 자료로 표시
  const mainParagraphs: string[] = []
  const sajuSupporting: string[] = []
  const astroSupporting: string[] = []
  const calloutParagraphs: string[] = []

  const natal = input.dayMasterElement
  const natalKo = natal ? ELEMENT_KO_LABEL[natal] || '' : ''

  // ───────── ¶1: 본명 인격 — 격국 + 신강/신약 + 12운성 + 십신 + 신살 (사주 보조) ─────────
  const p1: string[] = []
  if (input.geokguk) {
    const desc = getGeokgukDescription(input.geokguk as GeokgukType)
    if (desc) p1.push(`본명이 ${input.geokguk}으로 짜여 있어, ${suffixGeokgukDescription(desc)}`)
    // (NEW) 신강/신약 + 용신 — 사주 정통 강도 처방
    const strength = deriveStrength(input)
    if (strength) {
      const prescript = STRENGTH_PRESCRIPT_KO[strength]
      const yongsinKo = input.yongsin ? ELEMENT_KO_LABEL[input.yongsin] || '' : ''
      // 받침 있는 단어 + 이라 / 없는 단어 + 라 (copula 활용형)
      const cop = (w: string) => (iga(w) === '이' ? '이라' : '라')
      let prefix: string
      if (yongsinKo) {
        // "강도로 보면 신강, 용신은 토 기운이라" (기운=ㄴ → 이라)
        prefix = `강도로 보면 ${strength}, 용신은 ${yongsinKo} 기운이라`
      } else {
        // "강도로 보면 중화라" / "강도로 보면 신강이라"
        prefix = `강도로 보면 ${strength}${cop(strength)}`
      }
      if (prescript) p1.push(`${prefix}, ${prescript}.`)
    }
  } else {
    // 격국 미산출 시 일간 한자로 폴백 인트로 — 텍스트가 ¶1 첫 문장 없이 시작하지 않게
    const dayStem = ((input as { sajuSnapshot?: { pillars?: { day?: { heavenlyStem?: { name?: string } } } } }).sajuSnapshot)?.pillars?.day?.heavenlyStem?.name
    const intro = dayStem ? STEM_INTRO_KO[dayStem] : ''
    if (intro) p1.push(`${intro}.`)
  }
  // 일주의 실제 stage를 우선 사용 (분포 top은 폴백)
  const topStage = readDayMasterStage(input) || topEntry(input.twelveStages)
  if (topStage) {
    const stagePhrase = STAGE_LIFE_PHRASE[topStage]
    if (stagePhrase) {
      p1.push(`12운성으로 보면 일간이 마침 ${topStage} 단계에 들어와 있는데, 이게 ${stagePhrase} 시기라서 평소 머리로만 알던 감각이 실제 행동으로 옮겨가요.`)
    }
  }
  const topSibsin = topEntry(input.sibsinDistribution)
  if (topSibsin) {
    p1.push(`십신 중에서는 ${topSibsin}${iga(topSibsin as string)} 가장 두텁게 잡혀 있어, 그 색이 본명 안에서 꽉 맞물려 작동해요.`)
    // (A) Causal bridge — 십신을 실제 일상 영역에 anchor
    const sibsinDomain = SIBSIN_DOMAIN_KO[topSibsin as string]
    if (sibsinDomain) {
      p1.push(`실제 일상에서는 ${sibsinDomain.domain} 영역에서 가장 또렷하게 나타나서, ${sibsinDomain.manifest} 결로 하루가 짜이는 분이에요.`)
    }
  }
  if (input.shinsalList && input.shinsalList.length > 0) {
    const top = input.shinsalList.slice(0, 3) as string[]
    const blurbs = top.map((k) => SHINSAL_THEMATIC_KO[k]).filter(Boolean) as string[]
    if (blurbs.length > 0) {
      const lastWord = top[top.length - 1]
      const NEGATIVE_SHINSAL = new Set(['망신', '백호', '공망', '삼재', '괴강', '양인', '귀문관', '현침', '고신', '원진'])
      const hasNegative = top.some((s) => NEGATIVE_SHINSAL.has(s))
      const closing = hasNegative
        ? `, 그래서 평탄하게 가기보다 부침을 거치며 자기 색을 단련해가는 구조로 짜여 있어요.`
        : `, 그래서 한 자리에 머물기보다 자기 색을 차근차근 키워가는 구조예요.`
      p1.push(`거기에 ${top.join('·')}${iga(lastWord)} 활성화돼 ${blurbs.join(', ')}${closing}`)
    }
  }
  // (NEW) 주변 인상 callback — 십신 dominant로 "주변에서 듣는 말 / 거슬려하는 말" 한 줄
  if (topSibsin) {
    const impression = SIBSIN_PUBLIC_IMPRESSION_KO[topSibsin as string]
    if (impression) {
      p1.push(`주변에서 자주 듣는 평가는 "${impression.praise}" 쪽이고, 정작 본인이 가장 거슬려하는 말은 "${impression.sting}" 쪽이에요.`)
    }
  }
  // (NEW) 길성+흉성 상호작용 — 같이 들어왔을 때 의미
  if (input.shinsalList && input.shinsalList.length > 0) {
    const list = input.shinsalList as string[]
    const NEGATIVE = new Set(['망신', '백호', '공망', '삼재', '괴강', '양인', '귀문관', '현침', '고신', '원진', '천라지망'])
    const luckyHits = list.filter((s) => LUCKY_SHINSAL_SET.has(s))
    const negativeHits = list.filter((s) => NEGATIVE.has(s))
    if (luckyHits.length > 0 && negativeHits.length > 0) {
      const luckTop = luckyHits[0]
      const negTop = negativeHits[0]
      p1.push(`${luckTop}(길)과 ${negTop}(흉)이 같이 들어와 있어, 위기 상황마다 결정적인 도움이 들어오면서도 한 번씩 부침을 거치는 패턴이 반복돼요.`)
    } else if (luckyHits.length >= 2) {
      p1.push(`${luckyHits[0]}·${luckyHits[1]} 두 개가 같이 들어와 있어, 평균 이상으로 외부 도움·기회가 많이 들어오는 결이에요.`)
    } else if (negativeHits.length >= 2) {
      p1.push(`${negativeHits[0]}·${negativeHits[1]} 두 개가 같이 들어와 있어, 한 번에 풀리기보다 단련을 거쳐 자기 색을 만드는 패턴이에요.`)
    }
  }
  // (NEW) 인생 미션 한 줄 — 격국 + 일간 element가 합쳐서 도출
  if (input.geokguk) {
    const mission = GEOKGUK_MISSION_KO[input.geokguk as string]
    if (mission && natalKo) {
      p1.push(`한 줄로 정리하면, 이 분의 인생 미션은 ${mission} 데 있어요.`)
    }
  }
  if (p1.length > 0) sajuSupporting.push(p1.join(' '))

  // ───────── ¶ 약점·함정 3개 — heading + bullet list (사주 보조) ─────────
  if (input.geokguk) {
    const traps = GEOKGUK_TRAPS_KO[input.geokguk as string]
    if (traps) {
      sajuSupporting.push(`### 자주 빠지는 함정\n- ${traps[0]}\n- ${traps[1]}\n- ${traps[2]}\n셋이 동시에 작동하면 한 발짝 늦추는 게 안전한데, 본인은 보통 그 순간을 못 알아채요.`)
    }
  }

  // ───────── ¶ 격국 정통 deep KB — 5필드 expert 풀이 (사주 보조) ─────────
  if (input.geokguk) {
    const deepGeokguk = buildGeokgukDeepKo(input.geokguk as string)
    if (deepGeokguk) {
      sajuSupporting.push(`### ${input.geokguk} 정통 풀이\n${deepGeokguk}`)
    }
  }

  // ───────── ¶ 신살 정통 deep KB — 핵심 신살 3개 (사주 보조) ─────────
  if (input.shinsalList && input.shinsalList.length > 0) {
    const top3 = (input.shinsalList as string[]).slice(0, 3)
    const deepBlocks = top3.map((s) => buildShinsalDeepKo(s)).filter(Boolean)
    if (deepBlocks.length > 0) {
      sajuSupporting.push(`### 활성 신살 정통 풀이\n${deepBlocks.join('\n')}`)
    }
  }

  // ───────── ¶ 5행 분포 — 강/약 기운 (사주 보조) ─────────
  const fiveBalance = buildFiveElementsBalanceKo(input)
  if (fiveBalance) sajuSupporting.push(fiveBalance)

  // ───────── ¶ Specific 천간/지지: 본명 안에 이미 형성된 관계 (사주 보조) ─────────
  const natalRel = buildNatalRelationKo(input)
  if (natalRel) sajuSupporting.push(natalRel)

  // ───────── ¶ Tier 3: 60갑자 동적 상호작용 deep KB (사주 보조) ─────────
  const dynamicsBlock = buildSajuDynamicsKo(input.relations)
  if (dynamicsBlock) sajuSupporting.push(dynamicsBlock)

  // ───────── ¶ 시계열: 이전 → 현재 → 다음 대운 + 세운 arc (사주 보조) ─────────
  const storyArc = buildStoryArcKo(input)
  if (storyArc) sajuSupporting.push(storyArc)

  // ───────── ¶ 입체 통합: 지금 이 순간 cross-section (메인 cross) ─────────
  // 시간(나이+대운+세운+월peak) + 본명(격국·십신·길성) + 점성(토성·목성 하우스)
  // + 사주↔점성 cross가 한 단락에서 만남.
  const nowCrossSection = buildNowCrossSectionKo(input)
  if (nowCrossSection) mainParagraphs.push(nowCrossSection)

  // ───────── ¶ 도메인별 mini cross-section (메인 cross) ─────────
  // career/love/wealth/health/move 5개 도메인에 사주+점성+transit 신호 펼침
  const domainCross = buildDomainMiniCrossSectionsKo(input)
  if (domainCross) mainParagraphs.push(domainCross)

  // ───────── ¶ Confidence Score — 두 시스템 합의 강도 (메인) ─────────
  // 사주 신호 강도와 점성 신호 강도를 정량화해 합의 강도 0-100%로 표시
  {
    const sajuSig = estimateSajuSignalStrength({
      natalElement: natalKo,
      cycleElement: input.currentSaeunElement ? ELEMENT_KO_LABEL[input.currentSaeunElement] : undefined,
      shinsalActive: (input.shinsalList || []).length,
      hasGeokguk: Boolean(input.geokguk),
    })
    const aspectsAll = input.aspects || []
    const tense = aspectsAll.filter((a) => a.type === 'square' || a.type === 'opposition').length
    const flow = aspectsAll.filter((a) => a.type === 'trine' || a.type === 'sextile').length
    const transitsCount = (input as { activeTransits?: string[] }).activeTransits?.length || 0
    const adv = input.advancedAstroSignals || {}
    const advCount = Object.values(adv).filter((v) => v).length
    const astroSig = estimateAstroSignalStrength({
      activeTransitsCount: transitsCount,
      tenseAspectsCount: tense,
      flowAspectsCount: flow,
      hasAdvancedSignals: advCount >= 1,
    })
    const conf = calculateCrossConfidence(
      {
        sajuStrength: sajuSig.strength,
        sajuDirection: sajuSig.direction,
        astroStrength: astroSig.strength,
        astroDirection: astroSig.direction,
      },
      'ko'
    )
    mainParagraphs.push(
      `**합의 강도 ${conf.scorePercent}%** — ${conf.description}`
    )
  }


  // ───────── ¶ 12개월 month-by-month breakdown (메인 — 신년 운세) ─────────
  const monthlyBreakdown = buildAnnualMonthlyBreakdownKo(input)
  if (monthlyBreakdown) mainParagraphs.push(monthlyBreakdown)

  // ───────── ¶ 트랜짓 ↔ 신살 cross (메인) ─────────
  const transitShinsal = buildTransitShinsalCrossKo(input)
  if (transitShinsal) mainParagraphs.push(transitShinsal)

  // ───────── ¶ 어스펙트 ↔ 사주 합/충 cross (메인) ─────────
  const aspectsRel = buildAspectsRelationsCrossKo(input)
  if (aspectsRel) mainParagraphs.push(aspectsRel)

  // ───────── ¶ 어스펙트 detail × 사주 5행 cross (메인) ─────────
  const aspectDetail = buildAspectDetailCrossKo(input)
  if (aspectDetail) mainParagraphs.push(aspectDetail)

  // ───────── ¶ Solar Return × 세운 cross (메인) ─────────
  const solarSaeun = buildSolarReturnSaeunCrossKo(input)
  if (solarSaeun) mainParagraphs.push(solarSaeun)

  // ───────── ¶ Lunar Return × 월운 cross (메인) ─────────
  const lunarWolun = buildLunarReturnWolunCrossKo(input)
  if (lunarWolun) mainParagraphs.push(lunarWolun)

  // ───────── ¶ Eclipses × 사주 충/형 cross (메인) ─────────
  const eclipsesRel = buildEclipsesRelationsCrossKo(input)
  if (eclipsesRel) mainParagraphs.push(eclipsesRel)

  // ───────── ¶ ASC × 일간 cross (메인) ─────────
  const ascDm = buildAscDayMasterCrossKo(input)
  if (ascDm) mainParagraphs.push(ascDm)

  // ───────── ¶ Tier 4: 소행성 × 사주 십신 cross (메인) ─────────
  const dayStage = readDayMasterStage(input)
  const t4Input = {
    natalElement: input.dayMasterElement,
    yongsin: (input as { yongsin?: string }).yongsin,
    twelveStage: dayStage || undefined,
    currentSaeunElement: input.currentSaeunElement,
    currentDaeunElement: input.currentDaeunElement,
    sibsinDistribution: input.sibsinDistribution,
    asteroidHouses: input.asteroidHouses,
    extraPointSigns: input.extraPointSigns,
    aspects: input.aspects,
    activeTransits: input.activeTransits,
  }
  const asteroidsCross = buildAsteroidsSibsinCrossKo(t4Input)
  if (asteroidsCross) mainParagraphs.push(asteroidsCross)

  // ───────── ¶ Tier 4: Vertex × 일간 element cross (메인) ─────────
  const vertexCross = buildVertexSajuCrossKo(t4Input)
  if (vertexCross) mainParagraphs.push(vertexCross)

  // ───────── ¶ Tier 4: Part of Fortune × 일간 cross (메인) ─────────
  const pofCross = buildPartOfFortuneSajuCrossKo(t4Input)
  if (pofCross) mainParagraphs.push(pofCross)

  // ───────── ¶ Tier 4: 개별 aspect × 일간 element cross (메인) ─────────
  const aspectElCross = buildAspectSajuElementCrossKo(t4Input)
  if (aspectElCross) mainParagraphs.push(aspectElCross)

  // ───────── ¶ Tier 4: 용신 × astro transit cross (메인) ─────────
  const yongsinCross = buildYongsinAstroCrossKo(t4Input)
  if (yongsinCross) mainParagraphs.push(yongsinCross)

  // ───────── ¶ Tier 4: 12운성 × astro transit cross (메인) ─────────
  const stageCross = buildTwelveStageAstroCrossKo(t4Input)
  if (stageCross) mainParagraphs.push(stageCross)

  // ───────── ¶ 단기 시기 (사주 보조) ─────────
  // 사이클 충돌 / 이번 달 월운 / 오늘 일운 — 각자 독립 sub-section
  const cycleClashLine = describeCycleClash(input.currentDaeunElement, input.currentSaeunElement, '대운', '세운')
  if (cycleClashLine) {
    sajuSupporting.push(`### 대운·세운 사이클\n두 사이클을 함께 보면 ${cycleClashLine} 그림이에요. 큰 방향(대운)이 정해진 가운데 한 해 단위 환경(세운)이 어떻게 받쳐주는지가 결과를 가르는 핵심이라, 이 시점에는 거시 방향과 미시 흐름을 함께 보는 습관이 도움이 됩니다.`)
  }

  const wolunRel = describeCycleRelation(natal, input.currentWolunElement, '이번 달 월운', '한 달 분위기를 살짝 끌어주는')
  if (wolunRel) {
    const wolunEl = input.currentWolunElement ? ELEMENT_KO_LABEL[input.currentWolunElement] : ''
    const WOLUN_TIP: Record<string, string> = {
      목: '이번 달은 새 일을 시작하거나 계획을 세우기 좋은 흐름이라, 미뤄둔 시작을 한 가지만 잡아 한 달 안에 출발해 보세요',
      화: '이번 달은 외부 평가·발표·도전 자리가 들어오기 쉬운 흐름이라, 결과를 만들 게 있으면 이 달에 마무리하는 편이 유리해요',
      토: '이번 달은 정착·축적·관계 다지기에 좋은 흐름이라, 안정감 있는 일정과 신뢰 관계 강화에 시간을 쓰는 편이 좋아요',
      금: '이번 달은 정리·결단·마무리에 좋은 흐름이라, 미뤄둔 결정 한 가지를 이 달 안에 매듭짓는 게 자연스러워요',
      수: '이번 달은 관찰·복기·내적 정리에 좋은 흐름이라, 한 발짝 떨어져 큰 그림을 다시 보는 시간이 도움이 돼요',
    }
    const tip = wolunEl ? WOLUN_TIP[wolunEl] || '' : ''
    sajuSupporting.push(`### 이번 달 (월운)\n${wolunRel}. ${tip}.`)
  }

  const iljinRel = describeCycleRelation(natal, input.currentIljinElement, '오늘 일운', '오늘 하루 톤을 잡아주는')
  if (iljinRel) {
    const iljinEl = input.currentIljinElement ? ELEMENT_KO_LABEL[input.currentIljinElement] : ''
    const ILJIN_TIP: Record<string, string> = {
      목: '오늘은 새 시도·미팅 첫 운을 잡기 좋은 일진. 미뤄둔 연락·새 사람과의 첫 대화를 오늘 시도해 보세요',
      화: '오늘은 발화·결정·외부 표현이 잘 풀리는 일진. 발표·중요한 대화·강한 결정 같이 결과를 만드는 행동에 좋아요',
      토: '오늘은 정착·약속·신뢰 다지기 좋은 일진. 중요한 약속 잡기·계약 체결·관계 다지기 같이 안정감 있는 행동에 적합',
      금: '오늘은 정리·마무리·청소·결단에 좋은 일진. 미뤄둔 정리 한 가지를 오늘 처리해 보세요. 큰 결정 매듭짓기에도 좋음',
      수: '오늘은 관찰·복기·휴식·글쓰기 좋은 일진. 일기·복기 노트·중요한 기록 정리 같이 내적 정리에 시간을 쓰면 효과적',
    }
    const tip = iljinEl ? ILJIN_TIP[iljinEl] || '' : ''
    sajuSupporting.push(`### 오늘 (일운)\n${iljinRel}. ${tip}.`)
  }

  // ───────── 사주↔점성 정합 cross (메인) ─────────
  const aspectsCount = input.aspects?.length || 0
  const dominantWestern = input.dominantWesternElement
  if (dominantWestern && natalKo) {
    const westKo: Record<string, string> = { fire: '화', earth: '토', air: '풍', water: '수' }
    const w = westKo[dominantWestern] || ''
    if (w) {
      const matchHint =
        w === natalKo
          ? '점성 측 강조 원소가 본명 일간과 같아 두 시스템이 같은 색을 가리키는'
          : '점성 측 강조 원소와 본명 일간이 달라 두 시스템이 서로 다른 방향을 비추는'
      const crossSentences: string[] = [
        `점성으로 보면 ${w} 기운이 가장 강조되는 차트라, ${matchHint} 형국이에요.`,
      ]
      // (D) 사주↔점성 cross integration — 두 시스템이 한 사람 안에서 어떻게 만나는지
      const crossLine = buildCrossIntegrationKo(natalKo, dominantWestern)
      if (crossLine) crossSentences.push(crossLine)
      mainParagraphs.push(crossSentences.join(' '))
    }
  }

  // ───────── 점성 본명 디테일 (점성 보조) — 4 sub-section으로 분리 ─────────
  // 가독성: ### 행성 위치 / ### 어스펙트 / ### 추가 신호 / ### 소행성·특수점
  const planetsSection: string[] = []  // 행성 sign + house
  const aspectsSection: string[] = []  // 어스펙트 count + 분포
  const advancedSection: string[] = [] // Solar/Lunar Return, Eclipses, Progressions
  const extraSection: string[] = []    // Asteroids + Extra points (Vertex/PoF)
  const p3: string[] = []  // 도입부 (사주↔점성 정합 cross 흐름) — 메인 cross로 빠짐, 비어있음
  const signs = input.planetSigns || {}
  const houses = input.planetHouses || {}
  const SIGN_KO: Record<string, string> = {
    Aries: '양자리', Taurus: '황소자리', Gemini: '쌍둥이자리', Cancer: '게자리',
    Leo: '사자자리', Virgo: '처녀자리', Libra: '천칭자리', Scorpio: '전갈자리',
    Sagittarius: '사수자리', Capricorn: '염소자리', Aquarius: '물병자리', Pisces: '물고기자리',
  }
  const SIGN_TRAIT: Record<string, string> = {
    Aries: '주도·도전', Taurus: '안정·축적', Gemini: '소통·다중',
    Cancer: '돌봄·정서', Leo: '주목·표현', Virgo: '디테일·분석',
    Libra: '조율·균형', Scorpio: '집중·재구성', Sagittarius: '확장·신념',
    Capricorn: '구조·책임', Aquarius: '독립·혁신', Pisces: '직관·공감',
  }
  const sunSign = signs.Sun as string | undefined
  const moonSign = signs.Moon as string | undefined
  const mercurySign = signs.Mercury as string | undefined
  const venusSign = signs.Venus as string | undefined
  const marsSign = signs.Mars as string | undefined
  const uranusSign = signs.Uranus as string | undefined
  const neptuneSign = signs.Neptune as string | undefined
  const plutoSign = signs.Pluto as string | undefined

  // 첫 문장: 자아(태양) + 정서(달) — 안쪽 결
  // SIGN_KO는 모두 '자리'로 끝나 받침 없음 → '라' 사용 (이라 X)
  const innerParts: string[] = []
  if (sunSign && SIGN_KO[sunSign]) {
    const trait = SIGN_TRAIT[sunSign]
    innerParts.push(`자아 본질은 태양 ${SIGN_KO[sunSign]}라 ${trait}${eulReul(trait)} 좇는 톤`)
  }
  if (moonSign && SIGN_KO[moonSign]) {
    innerParts.push(`안쪽 정서는 달 ${SIGN_KO[moonSign]}라 ${SIGN_TRAIT[moonSign]} 결로 흐르는 톤`)
  }
  if (innerParts.length > 0) {
    planetsSection.push(`${innerParts.join(', ')}이에요.`)
  }

  // 둘째 문장: 사고(수성) + 관계(금성) + 추진(화성) — 일상 작동 결
  const operatingParts: string[] = []
  if (mercurySign && SIGN_KO[mercurySign]) {
    operatingParts.push(`사고·소통은 수성 ${SIGN_KO[mercurySign]}라 ${SIGN_TRAIT[mercurySign]} 방식으로 정리되는`)
  }
  if (venusSign && SIGN_KO[venusSign]) {
    const trait = SIGN_TRAIT[venusSign]
    operatingParts.push(`관계·가치관은 금성 ${SIGN_KO[venusSign]}라 ${trait}${eulReul(trait)} 우선시하는`)
  }
  if (marsSign && SIGN_KO[marsSign]) {
    operatingParts.push(`추진·욕구는 화성 ${SIGN_KO[marsSign]}라 ${SIGN_TRAIT[marsSign]} 방향으로 풀리는`)
  }
  if (operatingParts.length > 0) {
    planetsSection.push(`${operatingParts.join(', ')} 결이에요.`)
  }

  // 셋째 문장: 외행성 — 세대적·심층 변화 결 (Uranus/Neptune/Pluto)
  const outerPlanetParts: string[] = []
  if (uranusSign && SIGN_KO[uranusSign]) {
    outerPlanetParts.push(`혁신·해방은 천왕성 ${SIGN_KO[uranusSign]}라 ${SIGN_TRAIT[uranusSign]} 방식으로 깨고 나가는 결`)
  }
  if (neptuneSign && SIGN_KO[neptuneSign]) {
    outerPlanetParts.push(`이상·꿈은 해왕성 ${SIGN_KO[neptuneSign]}라 ${SIGN_TRAIT[neptuneSign]} 톤으로 녹아드는 결`)
  }
  if (plutoSign && SIGN_KO[plutoSign]) {
    outerPlanetParts.push(`재구성·집중은 명왕성 ${SIGN_KO[plutoSign]}라 ${SIGN_TRAIT[plutoSign]} 깊이로 파고드는 결`)
  }
  if (outerPlanetParts.length > 0) {
    planetsSection.push(`${outerPlanetParts.join(', ')}이에요.`)
  }

  // 넷째 문장: Ascendant + Midheaven — 외부 노출 결
  // PlanetName 타입엔 Ascendant/Midheaven이 없을 수 있어 Record로 캐스팅해 안전 접근
  const signsAny = signs as unknown as Record<string, string | undefined>
  const ascSign = signsAny.Ascendant
  const mcSign = signsAny.Midheaven
  const personaParts: string[] = []
  if (ascSign && SIGN_KO[ascSign]) {
    personaParts.push(`겉으로 비치는 첫인상은 상승 ${SIGN_KO[ascSign]}라 ${SIGN_TRAIT[ascSign]} 톤`)
  }
  if (mcSign && SIGN_KO[mcSign]) {
    personaParts.push(`사회·커리어 무대는 MC ${SIGN_KO[mcSign]}라 ${SIGN_TRAIT[mcSign]} 방향으로 보여지는 결`)
  }
  if (personaParts.length > 0) {
    planetsSection.push(`${personaParts.join(', ')}이에요.`)
  }

  // Mercury house — 사고·소통 영역
  if (houses.Mercury && [3, 6, 9, 11].includes(houses.Mercury)) {
    const mercuryHouseMeaning: Record<number, string> = {
      3: '단거리 소통·학습',
      6: '일상 업무·디테일',
      9: '학문·해외·신념',
      11: '커뮤니티·아이디어 교환',
    }
    planetsSection.push(`수성이 ${houses.Mercury}하우스라 ${mercuryHouseMeaning[houses.Mercury]} 영역에서 가장 또렷하게 작동해요.`)
  }
  // 의미 있는 행성 하우스 highlight
  if (houses.Sun && [1, 5, 7, 10].includes(houses.Sun)) {
    const sunHouseMeaning: Record<number, string> = {
      1: '자기 표현·정체성',
      5: '창조·연애·자녀',
      7: '파트너십',
      10: '커리어·사회 무대',
    }
    planetsSection.push(`태양이 ${houses.Sun}하우스라 ${sunHouseMeaning[houses.Sun]} 영역이 인생 무대의 중심으로 잡혀요.`)
  }
  if (houses.Jupiter && [9, 10, 11].includes(houses.Jupiter)) {
    planetsSection.push(`목성이 ${houses.Jupiter}하우스에 있어 확장·기회가 ${houses.Jupiter === 10 ? '커리어·사회 무대' : houses.Jupiter === 9 ? '학문·해외·신념' : '커뮤니티·미래 비전'} 쪽으로 열려요.`)
  }
  if (houses.Saturn && [1, 4, 10].includes(houses.Saturn)) {
    planetsSection.push(`토성이 ${houses.Saturn}하우스라 ${houses.Saturn === 1 ? '자기 정체성 형성' : houses.Saturn === 4 ? '가정·뿌리 안정' : '커리어·책임 무게'}에 구조와 시간이 필요한 차트예요.`)
  }
  if (aspectsCount >= 8) {
    aspectsSection.push(
      `주요 어스펙트가 ${aspectsCount}개 활성화돼 있어 본명 차트의 변동성과 자극이 평균보다 많은 편이에요. ` +
      `어스펙트가 많다는 건 행성 간 대화가 활발하다는 뜻이라, 한 영역의 변화가 다른 영역으로 빠르게 번지는 본명이에요. ` +
      `평소 한 가지 일에만 몰입하기 어렵고 동시에 여러 자극을 받는 패턴이 자연스러우니, 다채로운 자극을 단점이 아니라 자기 색으로 받아들이는 게 좋아요.`
    )
  } else if (aspectsCount >= 4) {
    aspectsSection.push(
      `주요 어스펙트가 ${aspectsCount}개 활성화돼 있어 평균 정도의 변동성이 있는 본명이에요. ` +
      `한쪽으로 치우치지 않고 행성들이 적당한 간격으로 대화하는 차트라, 여러 영역을 균형 있게 운영하기에 유리해요.`
    )
  }

  // Aspect 분포 — 어떤 종류가 우세한지 (어떤 aspect인지 풀어쓰기)
  const aspectsArr = input.aspects || []
  if (aspectsArr.length > 0) {
    const typeCount: Record<string, number> = {}
    for (const a of aspectsArr) {
      typeCount[a.type] = (typeCount[a.type] || 0) + 1
    }
    const ASPECT_TONE_KO: Record<string, string> = {
      conjunction: '한 점에 모이는 융합',
      opposition: '두 축이 마주서는 긴장',
      square: '서로 부딪치며 압박이 되는 자극',
      trine: '자연스럽게 흐르는 지원',
      sextile: '협력하며 풀리는 기회',
      quincunx: '조정이 필요한 어긋남',
    }
    const sortedTypes = Object.entries(typeCount).sort((a, b) => b[1] - a[1]).slice(0, 2)
    const aspectLines: string[] = []
    for (const [type, count] of sortedTypes) {
      const tone = ASPECT_TONE_KO[type]
      if (tone) aspectLines.push(`${type === 'square' ? '스퀘어' : type === 'trine' ? '트라인' : type === 'opposition' ? '오포지션' : type === 'conjunction' ? '컨정션' : type === 'sextile' ? '섹스타일' : '퀸컹스'} ${count}개(${tone})`)
    }
    if (aspectLines.length > 0) {
      aspectsSection.push(`어스펙트 분포는 ${aspectLines.join(', ')} 결로 짜여 있어, 본명 안에 ${sortedTypes[0]?.[0] === 'square' || sortedTypes[0]?.[0] === 'opposition' ? '긴장 자극이' : '조화 흐름이'} 더 두텁게 깔린 차트예요.`)
    }
  }

  // 외행성 하우스 (Uranus/Neptune/Pluto 위치 = 세대적 무대)
  const housesAny = houses as unknown as Record<string, number | undefined>
  if (housesAny.Uranus && [1, 5, 7, 10, 11].includes(housesAny.Uranus)) {
    const uranusHouseMeaning: Record<number, string> = {
      1: '자기 정체성·외모',
      5: '창조·연애 표현',
      7: '파트너십·계약',
      10: '커리어·사회 무대',
      11: '커뮤니티·미래 비전',
    }
    planetsSection.push(`천왕성이 ${housesAny.Uranus}하우스라 ${uranusHouseMeaning[housesAny.Uranus]} 영역에 깨고 나가는 변화 결이 들어와 있어요.`)
  }
  if (housesAny.Pluto && [1, 4, 7, 8, 10].includes(housesAny.Pluto)) {
    const plutoHouseMeaning: Record<number, string> = {
      1: '자기 정체성',
      4: '가정·뿌리',
      7: '파트너십',
      8: '재구성·자원 통합',
      10: '커리어 권력 구조',
    }
    planetsSection.push(`명왕성이 ${housesAny.Pluto}하우스라 ${plutoHouseMeaning[housesAny.Pluto]}에 깊은 재구성·집중 결이 작동해요.`)
  }

  // Advanced astro signals — solar/lunar return, eclipses, fixed stars 활성 여부
  const adv = input.advancedAstroSignals || {}
  const advSignals: string[] = []
  if (adv.solarReturn) advSignals.push('Solar Return(올해 생일 차트)이 들어와 한 해 초기 색이 강조되는 시기')
  if (adv.lunarReturn) advSignals.push('Lunar Return(이번 달 달 회귀)이 들어와 감정·일상 리듬 새로 잡히는 결')
  if (adv.eclipses) advSignals.push('Eclipses(현재 식)가 본명 포인트에 닿아 12-18개월 사이 중요한 전환')
  if (adv.progressions) advSignals.push('Progressions(진행 차트)가 작동해 내적 성숙·태도 변화가 진행 중')
  if (adv.fixedStars) advSignals.push('Fixed Stars(고정성)가 본명 행성에 정렬돼 평소보다 더 또렷한 운명적 색')
  if (advSignals.length > 0) {
    advancedSection.push(
      `${advSignals.slice(0, 3).join(' / ')} 신호가 같이 작동하는 시기예요. ` +
      `이런 advanced 신호는 평소 차트엔 잠자던 결인데, 활성화되면 평소보다 큰 단위(년/달/생애)로 영향이 들어와요. ` +
      `Solar Return은 한 해의 시작 톤을, Lunar Return은 한 달 정서 리듬을, Eclipses는 12-18개월 단위 인생 방향을, Progressions는 내적 성숙의 진행을 가리키는 신호라 — 평소처럼 흘러가는 한 해가 아니라 *결이 명확한 한 해*가 됩니다. ` +
      `각 신호의 영향은 위 메인 본문 cross 단락에서 사주와 묶어 풀어쓴 그대로니, 한 해 큰 그림 그릴 때 이 신호들을 같이 읽으세요.`
    )
  }

  // Asteroids — 4 여신 (Ceres/Pallas/Juno/Vesta)
  const asteroidHouses = input.asteroidHouses || {}
  const asteroidHousesAny = asteroidHouses as unknown as Record<string, number | undefined>
  const asteroidLines: string[] = []
  if (asteroidHousesAny.Juno) asteroidLines.push(`Juno ${asteroidHousesAny.Juno}하우스(파트너 결합 영역)`)
  if (asteroidHousesAny.Vesta) asteroidLines.push(`Vesta ${asteroidHousesAny.Vesta}하우스(헌신·집중 영역)`)
  if (asteroidHousesAny.Ceres) asteroidLines.push(`Ceres ${asteroidHousesAny.Ceres}하우스(돌봄·양육 영역)`)
  if (asteroidHousesAny.Pallas) asteroidLines.push(`Pallas ${asteroidHousesAny.Pallas}하우스(전략·지혜 영역)`)
  if (asteroidLines.length > 0) {
    extraSection.push(
      `소행성 결로는 ${asteroidLines.slice(0, 2).join(', ')}가 본명에 더해져 있어요. ` +
      `소행성은 메인 행성과 다르게 *세부적인 삶의 영역*을 가리키는 신호라, 평소 큰 행성으로 못 잡는 미묘한 결을 보충해줘요. ` +
      `Juno는 결혼·동반자, Vesta는 헌신·집중 영역, Ceres는 돌봄·양육, Pallas는 전략·지혜 — 본명 차트에 활성화된 소행성은 본인이 인생에서 자연스럽게 끌리는 *세부 주제*를 알려줍니다.`
    )
  }

  // Extra points — Vertex / Part of Fortune
  const extraPointSigns = input.extraPointSigns || {}
  const extraPointsAny = extraPointSigns as unknown as Record<string, string | undefined>
  if (extraPointsAny.Vertex && SIGN_KO[extraPointsAny.Vertex]) {
    extraSection.push(
      `Vertex ${SIGN_KO[extraPointsAny.Vertex]} 자리라 운명적 만남이 ${SIGN_TRAIT[extraPointsAny.Vertex]} 톤으로 들어와요. ` +
      `Vertex는 점성술에서 "운명의 문" 같은 자리로, 본인이 의식적으로 선택하지 않았는데 갑자기 들어온 만남·기회를 가리켜요. ` +
      `이 자리가 ${SIGN_KO[extraPointsAny.Vertex]}에 있다는 건, 인생의 결정적 만남이 ${SIGN_TRAIT[extraPointsAny.Vertex]} 결을 가진 사람·기회 형태로 들어온다는 뜻 — 평소 본인이 끌리는 톤이 아니어도 거부감을 느끼지 말고 한 번 받아보는 게 좋아요.`
    )
  }
  if (extraPointsAny.PartOfFortune && SIGN_KO[extraPointsAny.PartOfFortune]) {
    extraSection.push(
      `Part of Fortune ${SIGN_KO[extraPointsAny.PartOfFortune]}라 행운·번영의 결이 ${SIGN_TRAIT[extraPointsAny.PartOfFortune]} 방향으로 풀려요. ` +
      `Part of Fortune은 점성에서 본명이 가장 자연스럽게 만족·성취감을 느끼는 자리를 가리키는 신호예요. ` +
      `이 자리가 ${SIGN_KO[extraPointsAny.PartOfFortune]}에 있다는 건 ${SIGN_TRAIT[extraPointsAny.PartOfFortune]} 결을 추구할 때 가장 자연스러운 행운·번영을 만난다는 뜻이라, 인생의 큰 결정에서 이 결을 잊지 마세요.`
    )
  }

  // sub-heading으로 분리 출력 — 가독성 개선
  if (p3.length > 0) astroSupporting.push(p3.join(' '))
  if (planetsSection.length > 0) {
    astroSupporting.push(`### 행성 위치\n${planetsSection.join(' ')}`)
  }
  if (aspectsSection.length > 0) {
    astroSupporting.push(`### 어스펙트\n${aspectsSection.join(' ')}`)
  }
  if (advancedSection.length > 0) {
    astroSupporting.push(`### 추가 신호\n${advancedSection.join(' ')}`)
  }
  if (extraSection.length > 0) {
    astroSupporting.push(`### 소행성·특수점\n${extraSection.join(' ')}`)
  }

  // ───────── ¶4: 6개월 시나리오 처방 — 별도 단락 ─────────
  // 격국 있으면 격국+대운, 없으면 일간+대운 폴백
  if (input.currentDaeunElement && natalKo) {
    const daeunKo = ELEMENT_KO_LABEL[input.currentDaeunElement] || ''
    if (daeunKo) {
      const SEQ = ['목', '화', '토', '금', '수']
      const ni = SEQ.indexOf(natalKo)
      const di = SEQ.indexOf(daeunKo)
      const diff = ni >= 0 && di >= 0 ? (di - ni + 5) % 5 : -1
      let scenario = ''
      if (input.geokguk) {
        if (diff === 1) scenario = `${input.geokguk}의 강점을 밖으로 표현하기 좋은 구간이라 발표·확장·새 시도에 힘을 실어보세요.`
        else if (diff === 3) scenario = `${input.geokguk}의 책임 무게가 더 무거워지는 구간이라 무리한 확장보다 기존 책임을 정리하는 편이 안전해요.`
        else if (diff === 4) scenario = `${input.geokguk}${eulReul(input.geokguk)} 받쳐주는 기운이 들어와 있어 학습·재정비·내적 충전에 시간 쓰기 좋은 시기예요.`
        else if (diff === 0) scenario = `${input.geokguk} 색이 더 진해지는 구간이라 본인이 가진 기조를 더 분명히 드러내는 결정에 무게가 실려요.`
        else if (diff === 2) scenario = `${input.geokguk}${iga(input.geokguk)} 환경을 통제하는 위치라 외부 자원·계약·대인 관계 정리에 유리해요.`
      } else {
        // 폴백: 격국 미산출 시 일간 + 대운 관계만으로 6개월 시나리오
        if (diff === 1) scenario = '지금 6개월 사이 큰 결정이 들어오면, 표현·확장 쪽이 잘 풀리는 흐름이라 한 번 발 디뎌볼 만해요.'
        else if (diff === 3) scenario = '지금 6개월 사이 책임이 큰 결정이 들어오면, 무리한 확장보다 정리·재정비 쪽이 안전해요.'
        else if (diff === 4) scenario = '지금 6개월은 학습·재정비에 시간 쓰기 좋은 구간이라, 큰 변화는 다음 흐름까지 미루는 편이 맞아요.'
        else if (diff === 0) scenario = '지금 6개월은 본인 기조가 더 진해지는 구간이라, 평소 망설이던 결정에 무게가 실려요.'
        else if (diff === 2) scenario = '지금 6개월은 외부 자원·관계 정리에 유리한 시기라, 계약·재정 정리부터 손대보세요.'
      }
      if (scenario) {
        // callout block — UI 카드가 강조 박스로 렌더
        calloutParagraphs.push(`> **정리하자면** — ${scenario}`)
      }
    }
  }

  // 최종 조립 — 메인 cross 본문 → ## 사주 본명 분석 → ## 점성 본명 차트 → callout → ## 분석 근거 (raw)
  const sections: string[] = [...mainParagraphs]
  if (sajuSupporting.length > 0) {
    sections.push(['## 사주 본명 분석', ...sajuSupporting].join('\n\n'))
  }
  if (astroSupporting.length > 0) {
    sections.push(['## 점성 본명 차트', ...astroSupporting].join('\n\n'))
  }
  sections.push(...calloutParagraphs)

  // ## 분석 근거 — 계산된 raw 데이터를 명시적으로 노출. narration 결론의 출처를 사용자가 직접 확인.
  const evidenceDigest = buildEvidenceDigestKo(input)
  if (evidenceDigest) sections.push(evidenceDigest)
  return sections.join('\n\n')
}

// ──────────────────────────────────────────────────────────
// 휴머니즘 보강용 — 십신/시기/일간 → 삶의 영역 구체 발현 매핑
// ──────────────────────────────────────────────────────────

// 십신 dominant → 실제 일상 영역 + 발현 결
const SIBSIN_DOMAIN_KO: Partial<Record<string, { domain: string; manifest: string }>> = {
  비견: { domain: '동료·자기 정체성', manifest: '독립적 위치에서 자기 색을 분명히 드러내는' },
  겁재: { domain: '경쟁·협업 경계', manifest: '경쟁자 사이에서 자기 자리를 지키는' },
  식신: { domain: '표현·창작', manifest: '꾸준한 표현으로 결과물을 쌓아가는' },
  상관: { domain: '비판·표현·재정의', manifest: '날카로운 표현으로 기존을 다시 짜는' },
  정재: { domain: '돈·자원 관리', manifest: '꾸준한 자원 운용과 안정 축적이 중심인' },
  편재: { domain: '돈·자산 회전·외부 거래', manifest: '큰 자원 회전과 외부 기회를 다루는' },
  정관: { domain: '직장·책임·평판', manifest: '명확한 역할과 평가 기준을 세우며 움직이는' },
  편관: { domain: '책임 압박·도전 과제', manifest: '강한 책임 무게와 도전 과제를 정면으로 다루는' },
  정인: { domain: '학습·문서·인정', manifest: '꾸준한 학습과 문서 정리로 기반을 다지는' },
  편인: { domain: '직관·연구·내면 탐구', manifest: '직관적 통찰과 깊은 탐구로 영역을 파고드는' },
}

// ──────────────────────────────────────────────────────────
// Top 3 추가 — 인생 미션 / 신강·신약 / 약점·함정
// ──────────────────────────────────────────────────────────

// 격국 → 인생 미션 핵심 표현
const GEOKGUK_MISSION_KO: Record<string, string> = {
  정관격: '공식 책임을 통해 사회적 가치를 실현하는',
  편관격: '강한 책임 무게로 변혁을 추진하는',
  정인격: '학문·체계 베이스 위에 깊이 있는 통찰을 전달하는',
  편인격: '직관과 깊은 연구로 영역을 파고드는',
  식신격: '꾸준한 표현으로 결과물을 차곡차곡 쌓는',
  상관격: '날카로운 비판·재정의로 기존 틀을 흔들어 바꾸는',
  정재격: '안정적 자원 운용과 신뢰 구축을 통해 가치를 만드는',
  편재격: '외부 거래·자산 회전을 통해 흐름을 다루는',
  비견격: '독립적 정체성으로 자기 자리를 만드는',
  겁재격: '경쟁 속에서도 자기 자리를 지키는',
  양인격: '결단·칼날 추진으로 한 영역을 정복하는',
  건록격: '자수성가와 전문성으로 한 분야를 깊이 다지는',
  종왕격: '강한 흐름을 따라 그 색을 극대화하는',
  종강격: '본인 흐름의 색을 극대화하는',
  종재격: '재성을 따라 외부 자원·관계를 다루는',
  종관격: '관성을 따라 책임과 평판을 쌓는',
  종아격: '식상을 따라 표현·창작을 펼치는',
}

// 격국 → 자주 빠지는 함정 3개
const GEOKGUK_TRAPS_KO: Record<string, [string, string, string]> = {
  정관격: ['과도한 책임을 혼자 짊어지기', '원칙에 갇혀 유연성 잃기', '외부 인정·평가에 휘둘리기'],
  편관격: ['성격 급해 충돌 자초하기', '압박을 자기에게 더 강하게 씌우기', '주변에 무리한 기준 강요'],
  정인격: ['분석에 빠져 결단 미루기', '자료 모으다 행동 지연시키기', '자기만의 옳음에 갇히기'],
  편인격: ['직관에 의존해 검증 건너뛰기', '독창성에 갇혀 소통 단절', '내면 탐구에 함몰돼 현실 외면'],
  식신격: ['여유에 미루다 결과 못 만들기', '표현이 과해 갈등 부르기', '즐기는 데 빠져 깊이 약해지기'],
  상관격: ['비판이 강해 적 만들기', '기존을 무너뜨리려는 충동', '잘난 척으로 인덕 잃기'],
  정재격: ['융통성 부족으로 변화 거부하기', '작은 손익에 과도하게 집착', '재미·즐거움 놓치고 일만 하기'],
  편재격: ['외부 회전에 마음이 분산됨', '한 곳에 못 머물러 깊이 약해지기', '큰 거래·기회에 휩쓸리기'],
  비견격: ['혼자 다 하려고 협력 거부', '고집 세서 의견 못 받아들임', '경쟁자에게 과민 반응'],
  겁재격: ['경쟁심 과해 배려 부족', '자기 페이스만 보고 주변 못 봄', '외부 자원에 욕심 부리기'],
  양인격: ['충돌 잦고 극단으로 치우침', '무리수를 정당화하기', '결단 과정에서 사람 다치게 함'],
  건록격: ['독불장군이 돼 협력 어려움', '자수성가의 외로움 자초', '도움받기를 꺼려 한계 자초'],
}

// 신강/신약 → 처방 한 줄
const STRENGTH_PRESCRIPT_KO: Record<string, string> = {
  신강: '본명이 강한 편이라, 자기 흐름을 더 키우기보다 식상·재성·관성으로 풀어내고 정리하는 게 균형에 맞아요',
  신약: '본명이 약한 편이라, 비겁·인성으로 받쳐주고 휴식·학습으로 충전하는 게 회복에 도움이 돼요',
  중화: '본명이 중화에 가까워, 강점은 키우고 약점은 받쳐주는 양면 운용이 맞아요',
}

function deriveStrength(input: MatrixCalculationInput): '신강' | '신약' | '중화' | null {
  const dist = input.sibsinDistribution as Record<string, number> | undefined
  if (!dist) return null
  const supporting = (dist['비견'] || 0) + (dist['겁재'] || 0) + (dist['편인'] || 0) + (dist['정인'] || 0)
  const opposing = (dist['식신'] || 0) + (dist['상관'] || 0) + (dist['편재'] || 0) + (dist['정재'] || 0) + (dist['편관'] || 0) + (dist['정관'] || 0)
  if (supporting + opposing === 0) return null
  if (supporting >= opposing + 2) return '신강'
  if (opposing >= supporting + 2) return '신약'
  return '중화'
}

// 일간 한자 → 인격 한 줄 (격국이 없을 때 폴백 인트로)
const STEM_INTRO_KO: Record<string, string> = {
  甲: '갑목(甲木) 일간으로, 곧게 뻗어나가는 큰 나무 같은 추진력이 본명의 중심이에요',
  乙: '을목(乙木) 일간으로, 부드러우면서 어디든 적응하는 풀 같은 결이 본명의 중심이에요',
  丙: '병화(丙火) 일간으로, 밝고 표현력 강한 태양 같은 결이 본명의 중심이에요',
  丁: '정화(丁火) 일간으로, 섬세하고 따스한 촛불 같은 결이 본명의 중심이에요',
  戊: '무토(戊土) 일간으로, 묵직하고 흔들리지 않는 산 같은 안정감이 본명의 중심이에요',
  己: '기토(己土) 일간으로, 포용적이고 실용적인 들 같은 결이 본명의 중심이에요',
  庚: '경금(庚金) 일간으로, 강하고 직설적인 강철 같은 결단력이 본명의 중심이에요',
  辛: '신금(辛金) 일간으로, 정련된 보석·칼날 같은 절제와 결단이 본명의 중심이에요',
  壬: '임수(壬水) 일간으로, 흐름이 강하고 통찰이 깊은 큰 물 같은 결이 본명의 중심이에요',
  癸: '계수(癸水) 일간으로, 섬세하고 직관적인 빗물 같은 결이 본명의 중심이에요',
}

// 십신 dominant → 주변에서 흔히 듣는 인상 + 본인이 거슬려하는 말
const SIBSIN_PUBLIC_IMPRESSION_KO: Partial<Record<string, { praise: string; sting: string }>> = {
  비견: { praise: '주관 강하고 독립적이다', sting: '혼자 다 하려고 한다 / 고집 세다' },
  겁재: { praise: '추진력 있고 경쟁심 강하다', sting: '배려가 부족하다 / 자기 페이스만 본다' },
  식신: { praise: '여유롭고 표현이 자연스럽다', sting: '느긋하다 / 결단력 부족하다' },
  상관: { praise: '예리하고 다재다능하다', sting: '비판적이다 / 잘난 척한다' },
  정재: { praise: '성실하고 꼼꼼하다', sting: '융통성 없다 / 재미없다' },
  편재: { praise: '재주 많고 사람 관계 넓다', sting: '산만하다 / 한 곳에 못 머문다' },
  정관: { praise: '원칙 있고 리더 같다', sting: '딱딱하다 / 융통성 없다' },
  편관: { praise: '추진력 있고 강단 있다', sting: '성격 급하다 / 강압적이다' },
  정인: { praise: '차분하고 신뢰감 있다', sting: '느리다 / 결단을 미룬다' },
  편인: { praise: '독창적이고 직관적이다', sting: '이상하다 / 현실감 없다' },
}

const ELEMENT_PEAK_MONTHS_KO: Record<string, string> = {
  목: '3월~5월 봄철',
  화: '5월~7월 초여름',
  토: '환절기(4·7·10·1월)',
  금: '8월~10월 가을철',
  수: '11월~1월 겨울철',
}

function describeAnnualPeak(saeunEl: string | undefined, natalEl: string | undefined): string {
  if (!saeunEl || !natalEl) return ''
  const saeunKo = ELEMENT_KO_LABEL[saeunEl]
  const natalKo = ELEMENT_KO_LABEL[natalEl]
  const peak = ELEMENT_PEAK_MONTHS_KO[saeunKo]
  if (!peak) return ''
  const SEQ = ['목', '화', '토', '금', '수']
  const ni = SEQ.indexOf(natalKo)
  const si = SEQ.indexOf(saeunKo)
  if (ni < 0 || si < 0) return `특히 ${peak} 구간이 한 해 흐름의 분수령이에요.`
  const diff = (si - ni + 5) % 5
  if (diff === 0) return `특히 ${peak} 구간이 본인 색이 가장 진하게 드러나는 시기예요.`
  if (diff === 1) return `특히 ${peak} 구간에 표현·확장 압력이 가장 커져요.`
  if (diff === 2) return `특히 ${peak} 구간이 결정·통제력이 가장 또렷해지는 시기예요.`
  if (diff === 3) return `특히 ${peak} 구간에 압박과 책임 무게가 가장 무거워지니 한 박자 늦추는 편이 안전해요.`
  if (diff === 4) return `특히 ${peak} 구간이 받쳐주는 흐름이 들어오는 시기라 학습·정비에 좋아요.`
  return ''
}

// ──────────────────────────────────────────────────────────
// "지금 이 순간 cross-section" — 시간+본명+점성 한 점 통합
// 모든 layer의 신호를 한 시점에 묶어 입체적으로 보여주는 단락.
// 격국·십신·신살·일간 + 대운·세운·월peak + 점성 dominant·하우스 transit이
// 한 단락에서 만남.
// ──────────────────────────────────────────────────────────

// 십신 dominant → 한 단어 발현 (cross-section용 짧은 형)
const SIBSIN_SHORT_EXPR_KO: Partial<Record<string, string>> = {
  비견: '독립·자기 정체성',
  겁재: '경쟁·자기 자리',
  식신: '꾸준한 표현·창작',
  상관: '날카로운 비판·재정의',
  정재: '안정 자원 운용',
  편재: '외부 거래·자산 회전',
  정관: '공식 책임·평판',
  편관: '강한 책임 압박',
  정인: '학문·체계 베이스',
  편인: '직관·연구',
}

// 길성 셋 — cross-section에 한 줄 추가용
const LUCKY_SHINSAL_SET = new Set([
  '천을귀인', '태극귀인', '문창', '문곡', '금여성', '월덕귀인', '천덕귀인', '학당귀인', '암록',
])
const LUCKY_SHINSAL_GLOSS_KO: Record<string, string> = {
  천을귀인: '귀인의 도움',
  태극귀인: '학문·통찰 받침',
  문창: '학습·문서 운',
  문곡: '문장·표현',
  금여성: '인덕·도움',
  월덕귀인: '월 단위 보호',
  천덕귀인: '큰 흉 막는 보호',
  학당귀인: '배움 인연',
  암록: '숨은 후원',
}

// 점성 토성 하우스 → 시기 의미
const SATURN_HOUSE_NOW_KO: Record<number, string> = {
  1: '자기 정체성을 다지는 무게',
  4: '뿌리·가정 기반을 정리하는 시기',
  10: '커리어 책임이 무거워지는 단계',
}

// 점성 목성 하우스 → 시기 의미
const JUPITER_HOUSE_NOW_KO: Record<number, string> = {
  9: '학문·해외·신념 쪽으로 열려 있는 확장',
  10: '커리어·사회 무대 쪽 확장',
  11: '커뮤니티·미래 비전 쪽 확장',
}

// 점성 transit cycle → 지금 시점 짧은 한 줄 (괄호 안에 의미 함축)
const TRANSIT_NOW_NARRATIVE_KO: Record<string, string> = {
  saturnReturn: '토성 리턴(인생 첫 챕터 정리·재출발)',
  jupiterReturn: '목성 리턴(12년 만의 확장 기회 문)',
  uranusSquare: '천왕 스퀘어(자유·해방 욕구 강해지는 결)',
  neptuneSquare: '해왕 스퀘어(영성·현실 사이 환상 짙어지는 결)',
  plutoTransit: '명왕 transit(깊은 변형·재탄생 요구)',
  nodeReturn: '노드 리턴(운명 방향 재정렬)',
  eclipse: '일식·월식(6개월 큰 전환점)',
  mercuryRetrograde: '수성 역행(소통·계약 한 박자 늦추기)',
  venusRetrograde: '금성 역행(관계·재정 가치관 재검토)',
  marsRetrograde: '화성 역행(추진 멈추고 안으로 돌리기)',
  jupiterRetrograde: '목성 역행(확장 잠깐 멈추고 내면 정리)',
  saturnRetrograde: '토성 역행(책임 재구조화·기존 기준 점검)',
}

// transit 우선순위 (cross-section에 가장 임팩트 큰 것부터)
const TRANSIT_PRIORITY = [
  'saturnReturn',
  'plutoTransit',
  'jupiterReturn',
  'uranusSquare',
  'neptuneSquare',
  'nodeReturn',
  'eclipse',
  'saturnRetrograde',
  'mercuryRetrograde',
  'venusRetrograde',
  'marsRetrograde',
  'jupiterRetrograde',
]

function pickTopTransitNarratives(transits: string[] | undefined, max = 2): string[] {
  if (!transits || transits.length === 0) return []
  const sorted = [...transits].sort(
    (a, b) => TRANSIT_PRIORITY.indexOf(a) - TRANSIT_PRIORITY.indexOf(b)
  )
  const out: string[] = []
  for (const t of sorted) {
    const narr = TRANSIT_NOW_NARRATIVE_KO[t]
    if (narr) out.push(narr)
    if (out.length >= max) break
  }
  return out
}

// 대운 단계 — '시작/중반/끝자락' 결정
function describeDaeunStage(currentAge: number | undefined, daeunStartAge: number | undefined): string {
  if (typeof currentAge !== 'number' || typeof daeunStartAge !== 'number') return ''
  const within = currentAge - daeunStartAge
  if (within <= 2) return '초입'
  if (within >= 7) return '끝자락'
  return '중반'
}

/**
 * "지금 이 순간 cross-section" — 시간 + 본명 + 점성을 한 단락에 통합.
 *
 * 출력 예 (1995-02-09 06:40 男 서울, 2026-04-30 기준):
 *   "31세에 들어선 지금, 22~31세 乙亥 대운 끝자락 + 2026년 丙午 세운 + 5월~7월 초여름 peak가
 *    한 점에서 만나는 시점이에요. 본명에서는 정인격(학문·체계 베이스) + 편재 우세(외부 거래·자산 회전)
 *    + 천을귀인(귀인의 도움)이 이 시기에 같이 활성화돼 있고, 점성에서는 토성 1하우스(자기 정체성을
 *    다지는 무게)와 목성 9하우스(학문·해외·신념 쪽으로 열려 있는 확장)가 같이 들어와 있어요.
 *    사주의 칼날 같은 신중함과 점성의 확장 가속이 같은 시점에서 만나는 결이라, 무게중심을 어디에
 *    두느냐가 한 해 결과를 가르는 봄~여름이에요."
 */
export function buildNowCrossSectionKo(input: MatrixCalculationInput): string {
  const natal = input.dayMasterElement
  const natalKo = natal ? ELEMENT_KO_LABEL[natal] || '' : ''
  if (!natalKo) return ''

  // 시간 anchor 조립
  const timeParts: string[] = []
  // 1) 대운 (range만 — 정확한 나이는 입력에 없을 수 있어 stage hint 생략)
  const arc = readDaeunArc(input)
  const currentDaeun = arc.current
  const currentDateIso = (input as { currentDateIso?: string }).currentDateIso || new Date().toISOString().slice(0, 10)
  const currentYear = Number(currentDateIso.slice(0, 4))
  // birthYear가 sajuSnapshot에 있으면 stage hint 추가, 없으면 range만
  const snapBirthYear = (input as { sajuSnapshot?: { birthYear?: number } }).sajuSnapshot?.birthYear
  const ageNow = snapBirthYear && currentYear ? currentYear - snapBirthYear + 1 : undefined
  if (currentDaeun?.heavenlyStem && currentDaeun?.earthlyBranch && currentDaeun?.age != null) {
    const ganji = `${currentDaeun.heavenlyStem}${currentDaeun.earthlyBranch}`
    const range = `${currentDaeun.age}~${currentDaeun.age + 9}세`
    const stage = describeDaeunStage(ageNow, currentDaeun.age)
    timeParts.push(`${range} ${ganji} 대운${stage ? ` ${stage}` : ''}`)
  }
  // 2) 세운
  const annualArc = readAnnualArc(input, currentYear)
  if (annualArc.current) {
    const cur = splitGanji(annualArc.current)
    const curG = ganjiLabel(cur.stem, cur.branch)
    if (curG) timeParts.push(`${currentYear}년 ${curG} 세운`)
  }
  // 3) 월별 peak
  const peakLine = describeAnnualPeak(input.currentSaeunElement, natal)

  // 본명 layer 핵심
  const natalCoreParts: string[] = []
  if (input.geokguk) {
    natalCoreParts.push(`${input.geokguk}`)
  }
  const topSibsin = topEntry(input.sibsinDistribution)
  if (topSibsin) {
    const expr = SIBSIN_SHORT_EXPR_KO[topSibsin as string]
    natalCoreParts.push(expr ? `${topSibsin} 우세(${expr})` : `${topSibsin} 우세`)
  }
  // 길성 1개 추출
  if (input.shinsalList && input.shinsalList.length > 0) {
    const lucky = (input.shinsalList as string[]).find((s) => LUCKY_SHINSAL_SET.has(s))
    if (lucky) {
      const gloss = LUCKY_SHINSAL_GLOSS_KO[lucky]
      natalCoreParts.push(gloss ? `${lucky}(${gloss})` : lucky)
    }
  }

  // 점성 layer 핵심
  const astroCoreParts: string[] = []
  const houses = input.planetHouses || {}
  const sat = houses.Saturn
  if (sat && SATURN_HOUSE_NOW_KO[sat]) {
    astroCoreParts.push(`토성 ${sat}하우스(${SATURN_HOUSE_NOW_KO[sat]})`)
  }
  const jup = houses.Jupiter
  if (jup && JUPITER_HOUSE_NOW_KO[jup]) {
    astroCoreParts.push(`목성 ${jup}하우스(${JUPITER_HOUSE_NOW_KO[jup]})`)
  }

  // Transit micro 신호 — 현재 작동 중인 점성 cycle (있으면)
  const activeTransitsRaw = (input as { activeTransits?: string[] }).activeTransits
  const transitNarratives = pickTopTransitNarratives(activeTransitsRaw, 2)

  // 사주↔점성 cross 한 줄
  const crossClosing = buildCrossNowKo(natalKo, input.dominantWesternElement)

  // peakLine 인라인용 — '특히 X 구간에 ...' → '특히 X 구간이 핵심' 짧은 형
  const peakInline = peakLine
    ? peakLine
        .replace(/^특히 /, '')
        .replace(/이 본인 색이.*$/, '구간이 본인 색이 가장 진하게 드러나는 시기')
        .replace(/에 표현·확장.*$/, '에 표현·확장 압력이 가장 큰 시기')
        .replace(/이 결정·통제력.*$/, '구간이 결정·통제력이 가장 또렷한 시기')
        .replace(/에 압박과 책임.*$/, '에 압박과 책임 무게가 가장 무거운 시기')
        .replace(/이 받쳐주는.*$/, '구간이 받쳐주는 흐름이 들어오는 시기')
    : ''

  // 조립
  const sentences: string[] = []
  // S1: 시간 anchor — "지금 X + Y + peak가 한 점에서 만나는"
  if (timeParts.length > 0) {
    const ageAnchor = ageNow ? `${ageNow}세 시점에서 보면, ` : '지금 시점에서는 '
    const parts = [...timeParts]
    if (peakInline) parts.push(peakInline)
    const lastPart = parts[parts.length - 1]
    sentences.push(`${ageAnchor}${parts.join(' + ')}${iga(lastPart)} 한 자리에서 만나는 결이에요.`)
  }
  // S2: 본명 layer + 점성 layer — '·' join + '같은 신호가' 명사 anchor로 조사 안전
  if (natalCoreParts.length > 0 && astroCoreParts.length > 0) {
    sentences.push(`본명에서는 ${natalCoreParts.join(' · ')} 같은 신호가 같이 활성화돼 있고, 점성에서는 ${astroCoreParts.join(' · ')} 같은 신호가 같은 시점에 들어와 있어요.`)
  } else if (natalCoreParts.length > 0) {
    sentences.push(`본명에서는 ${natalCoreParts.join(' · ')} 같은 신호가 같이 활성화돼 있는 그림이에요.`)
  } else if (astroCoreParts.length > 0) {
    sentences.push(`점성에서는 ${astroCoreParts.join(' · ')} 같은 신호가 같이 들어와 있는 시점이에요.`)
  }
  // S3 (NEW): 점성 transit micro — 현재 진행 중인 cycle 1-2개
  if (transitNarratives.length > 0) {
    sentences.push(`거기에 지금 ${transitNarratives.join(', ')} 같은 transit이 같이 작동하면서, 시점 자체에 한 겹이 더 얹혀 있어요.`)
  }
  // S4: cross integration closing
  if (crossClosing) sentences.push(crossClosing)

  return sentences.join(' ')
}

// ──────────────────────────────────────────────────────────
// 도메인별 mini cross-section (A) — 5개 도메인 각각에 사주+점성+transit 펼침
// ──────────────────────────────────────────────────────────

function countSibsinFor(input: MatrixCalculationInput, kinds: string[]): number {
  const dist = input.sibsinDistribution as Record<string, number> | undefined
  if (!dist) return 0
  let sum = 0
  for (const k of kinds) sum += dist[k] || 0
  return sum
}

function hasShinsalAny(input: MatrixCalculationInput, names: string[]): boolean {
  const list = input.shinsalList as string[] | undefined
  if (!list || list.length === 0) return false
  return list.some((s) => names.includes(s))
}

function hasTransitAny(input: MatrixCalculationInput, types: string[]): boolean {
  const list = (input as { activeTransits?: string[] }).activeTransits
  if (!list || list.length === 0) return false
  return list.some((t) => types.includes(t))
}

function buildCareerMiniKo(input: MatrixCalculationInput): string {
  const parts: string[] = []
  const gwanCount = countSibsinFor(input, ['정관', '편관'])
  if (gwanCount > 0) parts.push(`관성 ${gwanCount}개(공식 책임)`)
  const houses = input.planetHouses || {}
  if (houses.Saturn === 10) parts.push('토성 10하우스(커리어 책임 무게)')
  else if (houses.Saturn === 1) parts.push('토성 1하우스(자기 정체성 우선)')
  if (houses.Sun === 10) parts.push('태양 10하우스(무대 중앙)')
  if (hasTransitAny(input, ['saturnReturn'])) parts.push('토성 리턴(직책·역할 재정의)')
  else if (hasTransitAny(input, ['jupiterReturn'])) parts.push('목성 리턴(확장 기회 문)')
  if (parts.length === 0) return ''
  return `직장은 ${parts.slice(0, 3).join(' + ')} 결`
}

function buildLoveMiniKo(input: MatrixCalculationInput): string {
  const parts: string[] = []
  const jaeCount = countSibsinFor(input, ['정재', '편재'])
  if (jaeCount > 0) parts.push(`재성 ${jaeCount}개(관계 자원)`)
  const venusSign = input.planetSigns?.Venus as string | undefined
  const SIGN_KO: Record<string, string> = {
    Aries: '양자리', Taurus: '황소자리', Gemini: '쌍둥이자리', Cancer: '게자리',
    Leo: '사자자리', Virgo: '처녀자리', Libra: '천칭자리', Scorpio: '전갈자리',
    Sagittarius: '사수자리', Capricorn: '염소자리', Aquarius: '물병자리', Pisces: '물고기자리',
  }
  const SIGN_TRAIT: Record<string, string> = {
    Aries: '주도·도전', Taurus: '안정·축적', Gemini: '소통·다중',
    Cancer: '돌봄·정서', Leo: '주목·표현', Virgo: '디테일·분석',
    Libra: '조율·균형', Scorpio: '집중·재구성', Sagittarius: '확장·신념',
    Capricorn: '구조·책임', Aquarius: '독립·혁신', Pisces: '직관·공감',
  }
  if (venusSign && SIGN_KO[venusSign]) parts.push(`금성 ${SIGN_KO[venusSign]}(${SIGN_TRAIT[venusSign]})`)
  const houses = input.planetHouses || {}
  if (houses.Venus === 7) parts.push('금성 7하우스(파트너십 강조)')
  if (houses.Mars === 5) parts.push('화성 5하우스(연애·창조 추진)')
  if (hasShinsalAny(input, ['도화', '홍염살'])) parts.push('도화·매력 활성')
  if (hasTransitAny(input, ['venusRetrograde'])) parts.push('금성 역행(가치관 재검토)')
  if (parts.length === 0) return ''
  return `관계는 ${parts.slice(0, 3).join(' + ')} 결`
}

function buildWealthMiniKo(input: MatrixCalculationInput): string {
  const parts: string[] = []
  const jeongJae = countSibsinFor(input, ['정재'])
  const pyeonJae = countSibsinFor(input, ['편재'])
  if (pyeonJae > jeongJae && pyeonJae > 0) parts.push(`편재 ${pyeonJae}개(외부 거래·자산 회전)`)
  else if (jeongJae > 0) parts.push(`정재 ${jeongJae}개(안정 자원 운용)`)
  const houses = input.planetHouses || {}
  if (houses.Jupiter === 2) parts.push('목성 2하우스(소득·자원 확장)')
  else if (houses.Jupiter === 8) parts.push('목성 8하우스(외부 자산·투자 확장)')
  else if (houses.Jupiter === 9) parts.push('목성 9하우스(학문·해외 쪽 자원)')
  if (hasTransitAny(input, ['jupiterReturn'])) parts.push('목성 리턴(12년 만의 확장 문)')
  else if (hasTransitAny(input, ['jupiterRetrograde'])) parts.push('목성 역행(확장 잠시 멈춤)')
  if (hasShinsalAny(input, ['금여성', '천을귀인'])) parts.push('인덕·귀인 도움')
  if (parts.length === 0) return ''
  return `재정은 ${parts.slice(0, 3).join(' + ')} 결`
}

function buildHealthMiniKo(input: MatrixCalculationInput): string {
  const parts: string[] = []
  // 12운성 stage
  const stage = readDayMasterStage(input)
  if (stage === '쇠' || stage === '병' || stage === '사' || stage === '묘') {
    parts.push(`12운성 ${stage}(회복·정리 단계)`)
  } else if (stage === '제왕' || stage === '건록') {
    parts.push(`12운성 ${stage}(체력 정점)`)
  }
  const houses = input.planetHouses || {}
  if (houses.Mars === 6) parts.push('화성 6하우스(체력·과로 주의)')
  else if (houses.Saturn === 6) parts.push('토성 6하우스(만성·체력 관리)')
  if (hasTransitAny(input, ['saturnReturn', 'saturnRetrograde'])) parts.push('토성 흐름(체력 재정비)')
  else if (hasTransitAny(input, ['marsRetrograde'])) parts.push('화성 역행(에너지 안으로)')
  if (hasShinsalAny(input, ['귀문관', '백호'])) parts.push('귀문·백호(예민함·과민)')
  if (parts.length === 0) return ''
  return `건강은 ${parts.slice(0, 3).join(' + ')} 결`
}

function buildMoveMiniKo(input: MatrixCalculationInput): string {
  const parts: string[] = []
  if (hasShinsalAny(input, ['역마', '지살'])) parts.push('역마·지살(이동 활성)')
  const houses = input.planetHouses || {}
  if (houses.Jupiter === 9 || houses.Sun === 9) parts.push('9하우스 강조(해외·학문 이동)')
  if (houses.Saturn === 4) parts.push('토성 4하우스(가정·뿌리 정리)')
  if (hasTransitAny(input, ['uranusSquare'])) parts.push('천왕 스퀘어(급변 가능)')
  else if (hasTransitAny(input, ['nodeReturn'])) parts.push('노드 리턴(방향 재정렬)')
  if (parts.length === 0) return ''
  return `이동은 ${parts.slice(0, 3).join(' + ')} 결`
}

// ──────────────────────────────────────────────────────────
// 다중 시간점 진화 (C) — 지금 → 6개월 → 1년 → 다음 대운 흐름
// ──────────────────────────────────────────────────────────

/**
 * 시간 흐름 위 진화 — 지금(현재 세운+월peak) → 가을(6개월 뒤) → 내년(다음 세운) → 다음 대운(10년 뒤).
 * 각 시점의 주된 결을 한 줄씩으로 묶어 시간축 위 변화를 보여줌.
 */
export function buildTemporalEvolutionKo(input: MatrixCalculationInput): string {
  const natal = (input as { dayMasterElement?: string }).dayMasterElement
  if (!natal) return ''
  const natalKo = ELEMENT_KO_LABEL[natal]
  if (!natalKo) return ''
  const SEQ = ['목', '화', '토', '금', '수']

  const segments: string[] = []
  const currentDateIso = (input as { currentDateIso?: string }).currentDateIso || new Date().toISOString().slice(0, 10)
  const currentYear = Number(currentDateIso.slice(0, 4))

  // 현재 (세운 element 기반 톤)
  const saeunEl = input.currentSaeunElement
  const saeunKo = saeunEl ? ELEMENT_KO_LABEL[saeunEl] : ''
  if (saeunKo) {
    const ni = SEQ.indexOf(natalKo)
    const si = SEQ.indexOf(saeunKo)
    const diff = ni >= 0 && si >= 0 ? (si - ni + 5) % 5 : -1
    const tone = ['본인 색이 진해지는', '표현·확장 압력이 큰', '결정·통제력이 또렷한', '책임 무게가 무거운', '받쳐주는 흐름이 들어오는'][diff] || '한 해의 톤이 잡히는'
    segments.push(`지금 ${currentYear}년 봄~여름은 ${tone} 시점`)
  }

  // 6개월 뒤 (가을·겨울 — 보통 톤 약화 또는 다른 element 강조)
  // 같은 세운이지만 계절이 바뀌므로 월별 기운 변화로 표현
  if (saeunKo) {
    const SEASON_TONE: Record<string, string> = {
      목: '늦여름~가을은 정리·갈무리 톤',
      화: '가을~초겨울은 압력 누그러지고 회복 톤',
      토: '가을은 안정·정착 톤',
      금: '겨울은 칼날 결단 톤이 가장 강해지는',
      수: '봄으로 넘어가며 흐름이 풀리는 톤',
    }
    const seasonHint = SEASON_TONE[saeunKo]
    if (seasonHint) segments.push(`6개월 뒤 ${seasonHint}`)
  }

  // 내년 (다음 세운 — annual arc가 있으면)
  const nextYear = currentYear + 1
  const arc = readAnnualArc(input, currentYear)
  if (arc.next) {
    const nextSplit = splitGanji(arc.next)
    const nextG = ganjiLabel(nextSplit.stem, nextSplit.branch)
    const nextEl = nextSplit.stem ? STEM_KO_ELEMENT[nextSplit.stem] : ''
    if (nextG && nextEl) {
      const ni = SEQ.indexOf(natalKo)
      const ei = SEQ.indexOf(nextEl)
      const diff = ni >= 0 && ei >= 0 ? (ei - ni + 5) % 5 : -1
      const nextTone = ['본인 색 더 강해지는', '표현·확장이 더 붙는', '통제·정리가 더 또렷한', '책임 무게가 한 단계 더 묵직해지는', '인성이 받쳐주는'][diff] || '톤이 한 번 바뀌는'
      segments.push(`내년 ${nextYear}년 ${nextG}로 넘어가면서 ${nextTone} 결로 옮겨감`)
    }
  }

  // 10년 뒤 다음 대운
  const daeunArc = readDaeunArc(input)
  if (daeunArc.next?.heavenlyStem && daeunArc.next?.earthlyBranch && daeunArc.next?.age != null) {
    const nextDaeunStem = daeunArc.next.heavenlyStem
    const nextDaeunEl = STEM_KO_ELEMENT[nextDaeunStem]
    const nextDaeunGanji = `${daeunArc.next.heavenlyStem}${daeunArc.next.earthlyBranch}`
    const nextDaeunRange = `${daeunArc.next.age}~${daeunArc.next.age + 9}세`
    if (nextDaeunEl) {
      segments.push(`10년 뒤 ${nextDaeunRange} ${nextDaeunGanji} 대운(${nextDaeunEl} 흐름)으로 챕터 전환`)
    }
  }

  if (segments.length === 0) return ''
  // heading + sub-section 형태 (각 시점 2-3문장 풀이로)
  const labels = ['지금', '6개월 뒤', '내년', '10년 뒤']
  const ENRICH_BY_LABEL: Record<string, string> = {
    '지금': '이 시기 결정은 다음 6개월의 토대가 되니, 한 해 핵심 주제 한 줄을 정해 두고 거기에 맞게 무게를 실어보세요.',
    '6개월 뒤': '톤이 한 번 바뀌는 자연스러운 환절기라, 지금까지 펼친 일을 정리하거나 새 단계로 넘어가기 좋은 시점이에요.',
    '내년': '한 해 단위로 결이 다시 잡히는 시점이라, 올해 끝자락에 내년 결을 미리 짚고 한 해 단위 큰 그림을 그려두면 흐름을 잘 탑니다.',
    '10년 뒤': '대운 챕터가 통째로 바뀌는 인생의 큰 전환점이라, 지금부터 새 챕터의 색을 의식적으로 준비하면 전환 충격이 줄어들어요.',
  }
  const blocks = segments.map((seg, idx) => {
    const lbl = labels[idx] || `시점 ${idx + 1}`
    const cleaned = seg
      .replace(/^지금\s*/, '')
      .replace(/^6개월 뒤\s*/, '')
      .replace(/^내년\s*/, '')
      .replace(/^10년 뒤\s*/, '')
    const action = ENRICH_BY_LABEL[lbl] || ''
    return `### ${lbl}\n${cleaned} 결이에요. ${action}`
  })
  return `## 시간 흐름 위 진화\n\n${blocks.join('\n\n')}`
}

/**
 * 도메인별 mini cross-section — 5개 도메인 각각에 사주+점성+transit 펼침.
 * heading + bullet list 형태로 출력 (UI 카드가 마커 파싱해서 시각적으로 표시).
 */
export function buildDomainMiniCrossSectionsKo(input: MatrixCalculationInput): string {
  const items: Array<[string, string]> = []
  const career = buildCareerMiniKo(input)
  const love = buildLoveMiniKo(input)
  const wealth = buildWealthMiniKo(input)
  const health = buildHealthMiniKo(input)
  const move = buildMoveMiniKo(input)
  // 각 helper 결과는 '직장은/관계는 X 결' 형태 → 라벨과 'X' 분리
  const stripLabel = (text: string, label: string): string => {
    return text.replace(new RegExp(`^${label}[은는]\\s*`), '').replace(/\s*결$/, '')
  }
  if (career) items.push(['직장', stripLabel(career, '직장')])
  if (love) items.push(['관계', stripLabel(love, '관계')])
  if (wealth) items.push(['재정', stripLabel(wealth, '재정')])
  if (health) items.push(['건강', stripLabel(health, '건강')])
  if (move) items.push(['이동', stripLabel(move, '이동')])
  if (items.length === 0) return ''
  // 각 도메인을 4문장 풀이로 — 신호 + 의미 + 발현 + 활용
  const DOMAIN_DEPTH: Record<string, { meaning: string; manifest: string; action: string }> = {
    직장: {
      meaning: '직장 영역은 본명이 외부 사회에 자리 잡고 평가받는 무대를 가리키는 자리예요',
      manifest: '여기서 들어온 신호는 회사 안의 위치·동료 관계·승진·이직 같은 결정으로 발현돼요',
      action: '이번 시기에는 이 신호 결을 회사 내 자기 포지셔닝과 다음 6개월 목표 설정에 활용해 보세요',
    },
    관계: {
      meaning: '관계 영역은 본명이 가까운 사람들과 어떻게 결합하고 거리를 두는지 보여주는 자리예요',
      manifest: '여기서 들어온 신호는 연애·결혼·우정·가족 관계의 결정 패턴으로 발현돼요',
      action: '이번 시기에는 새 인연을 시도하거나 기존 관계의 결을 한 번 점검해 보는 데 이 신호를 활용해 보세요',
    },
    재정: {
      meaning: '재정 영역은 본명이 자원을 어떻게 끌어오고 다스리는지 보여주는 자리예요',
      manifest: '여기서 들어온 신호는 수입·지출·투자·계약 같은 자원 결정의 톤으로 발현돼요',
      action: '이번 시기에는 한 해 재정 목표 한 줄을 정하고 이 신호 결에 맞게 결정하는 습관을 들여 보세요',
    },
    건강: {
      meaning: '건강 영역은 본명의 몸과 정서가 어떤 부담을 받고 어디서 회복되는지 보여주는 자리예요',
      manifest: '여기서 들어온 신호는 체력·수면·예민함·만성 질환 같은 신체 패턴으로 발현돼요',
      action: '이번 시기에는 약점 영역을 미리 챙기는 작은 루틴(스트레칭·수면 시간·식사 패턴) 한 가지를 정해 보세요',
    },
    이동: {
      meaning: '이동 영역은 본명이 환경 변화·여행·이주·새 시도에 어떻게 반응하는지 보여주는 자리예요',
      manifest: '여기서 들어온 신호는 이사·해외·여행·새 학교/회사 같은 환경 전환 결정으로 발현돼요',
      action: '이번 시기에는 지금 환경을 그대로 유지할지, 새 자리로 옮길지 한 번 진지하게 점검할 만해요',
    },
  }
  const richBlocks = items.map(([label, body]) => {
    const depth = DOMAIN_DEPTH[label]
    if (!depth) return `### ${label}\n${body}.`
    return (
      `### ${label}\n` +
      `이번 시기 ${label} 영역에서는 ${body} 결이에요. ` +
      `${depth.meaning}. ` +
      `${depth.manifest}. ` +
      `${depth.action}.`
    )
  })
  return `## 도메인별 펼침\n\n${richBlocks.join('\n\n')}`
}

// "지금 시점 cross" — natal element + dominant western 한 줄 (shorter than buildCrossIntegrationKo)
function buildCrossNowKo(natalKo: string, dominantWestern: string | undefined): string {
  if (!natalKo || !dominantWestern) return ''
  const westKo: Record<string, string> = { fire: '화', earth: '토', air: '풍', water: '수' }
  const w = westKo[dominantWestern]
  if (!w) return ''
  const sajuTone: Record<string, string> = {
    목: '자라남·계획의 신중한 추진',
    화: '표현·확장의 빠른 추진',
    토: '신뢰·축적의 묵직한 안정',
    금: '결단·정리의 칼날 같은 신중함',
    수: '관찰·통찰의 깊은 호흡',
  }
  const astroTone: Record<string, string> = {
    화: '확장·도전의 가속',
    토: '실용·구조의 다짐',
    풍: '소통·다중의 회전',
    수: '직관·정서의 깊이',
  }
  const a = sajuTone[natalKo]
  const b = astroTone[w]
  if (!a || !b) return ''
  if (natalKo === w) {
    return `사주의 ${a}이 점성의 ${b}과 같은 방향이라, 같은 시점에서 두 시스템이 서로 보태주는 결이에요. 결정에 가속이 잘 붙어요.`
  }
  return `사주의 ${a}과 점성의 ${b}이 같은 시점에서 만나는 결이라, 무게중심을 어디에 두느냐가 한 해 결과를 가르는 시기예요.`
}

// 사주 일간 element × 점성 dominant element → 두 시스템 통합 한 문장
function buildCrossIntegrationKo(natalKo: string, dominantWestern: string | undefined): string {
  if (!natalKo || !dominantWestern) return ''
  const westKo: Record<string, string> = { fire: '화', earth: '토', air: '풍', water: '수' }
  const w = westKo[dominantWestern]
  if (!w) return ''
  const SAJU_TONE: Record<string, string> = {
    목: '자라남·계획 중심의 신중한 추진',
    화: '표현·확장의 빠른 추진',
    토: '신뢰·축적의 묵직한 안정',
    금: '결단·정리의 칼날 같은 신중함',
    수: '지혜·관찰의 깊은 호흡',
  }
  const ASTRO_TONE: Record<string, string> = {
    화: '확장·도전·열정의 가속',
    토: '실용·구조·안정의 다짐',
    풍: '소통·다중·아이디어의 회전',
    수: '직관·공감·정서의 깊이',
  }
  const ko1 = SAJU_TONE[natalKo]
  const ko2 = ASTRO_TONE[w]
  if (!ko1 || !ko2) return ''
  // 같은 방향: 사주 목+점성 화(상생), 사주 화+점성 토(상생), 사주 금+점성 토(상생/같은 차분), 사주 수+점성 수
  const isAligned =
    natalKo === w ||
    (natalKo === '목' && w === '화') ||
    (natalKo === '화' && w === '토') ||
    (natalKo === '토' && w === '금') ||
    (natalKo === '금' && w === '토') ||
    (natalKo === '수' && w === '수')
  if (isAligned) {
    return `사주의 ${ko1}이 점성의 ${ko2}과 같은 방향을 가리켜, 두 시스템이 서로 보태주는 결이에요. 결정에 가속이 잘 붙는 차트입니다.`
  }
  return `사주는 ${ko1}을 가리키는데 점성은 ${ko2}을 부추기는 결이라, 한 사람 안에 brake와 accelerator가 같이 들어 있어요. 잘 맞물리면 '계산된 모험'이 되고, 어긋나면 결정 직전 늘 한 박자 망설이는 톤이 돼요. 운영 팁은 영역별로 나누는 거예요 — 큰 결정·돈·계약은 사주 신중함을 따르고, 새 만남·표현·확장은 점성 추진력을 살려 쓰면 둘이 부딪히지 않습니다.`
}

const STEM_KO_ELEMENT: Record<string, string> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const BRANCH_KO_ELEMENT: Record<string, string> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}
// blurb는 wrapping 문장의 후반부로 들어가서 kind 이름이 앞에 이미 적혀 있어
// blurb는 효과만 묘사하도록 작성 (kind 이름 중복 금지). 모든 종결 -요 톤으로 통일.
const RELATION_KIND_BLURB: Record<string, string> = {
  천간합: '부드럽게 맞물려 협력·동의가 자연스럽게 떨어져요',
  천간충: '부딪치며 추진력은 있지만 갈등·압박이 함께 와요',
  지지육합: '일상이 단단해지고 가까운 관계가 더 깊어져요',
  지지삼합: '큰 기운이 한 방향으로 모이는 강한 추진 구도예요',
  지지방합: '같은 계절 기운이 모여 안정적인 진도가 나와요',
  지지충: '환경·이동·관계 변동이 잦은 자리예요',
  지지형: '마찰·실수가 노출되기 쉬워 평소보다 한 번 더 점검해야 해요',
  지지파: '진행 중인 일이 살짝 틀어질 가능성이 있어요',
  지지해: '오해·어긋남이 쌓이기 쉬우니 해석 일치 확인이 먼저예요',
  원진: '미묘한 거부감과 오해가 자라기 쉬운 구도예요',
  공망: '결정 무게가 가벼워져 새 일은 다음 사이클로 미루는 편이 안전해요',
}

function readDayPillar(input: MatrixCalculationInput): { stem?: string; branch?: string } {
  const snap = (input as { sajuSnapshot?: { pillars?: unknown } }).sajuSnapshot
  const pillars = snap?.pillars as
    | { day?: { heavenlyStem?: { name?: string }; earthlyBranch?: { name?: string } } }
    | undefined
  return {
    stem: pillars?.day?.heavenlyStem?.name,
    branch: pillars?.day?.earthlyBranch?.name,
  }
}

/** 본명 4기둥 안에서 형성된 specific 천간/지지 관계를 자연어로 (top 2-3개). */
export function buildNatalRelationKo(input: MatrixCalculationInput): string {
  const relations = input.relations || []
  if (relations.length === 0) return ''
  // 강도 큰 관계 우선 — 충/형/공망 > 합 > 해/파 > 원진
  const priority = ['천간충', '지지충', '지지형', '공망', '천간합', '지지삼합', '지지육합', '지지방합', '지지해', '지지파', '원진']
  const sorted = [...relations].sort(
    (a, b) => priority.indexOf(a.kind) - priority.indexOf(b.kind)
  )
  // top 2-3개 narration — 1개만 쓰면 다른 관계가 dead. 2-3개로 풍부하게.
  const picked = sorted.slice(0, 3).filter((r) => RELATION_KIND_BLURB[r.kind])
  if (picked.length === 0) return ''

  const lines: string[] = []
  const first = picked[0]
  const firstDetail = first.detail ? `(${first.detail})` : ''
  lines.push(`본명 안에 이미 ${first.kind}${firstDetail}${iga(first.kind)} 형성돼 있어, ${RELATION_KIND_BLURB[first.kind]}.`)

  if (picked.length >= 2) {
    const second = picked[1]
    const secondDetail = second.detail ? `(${second.detail})` : ''
    lines.push(`거기에 ${second.kind}${secondDetail}도 같이 들어와 ${RELATION_KIND_BLURB[second.kind]}.`)
  }
  if (picked.length >= 3) {
    const third = picked[2]
    const thirdDetail = third.detail ? `(${third.detail})` : ''
    lines.push(`그리고 ${third.kind}${thirdDetail}이 더해져, ${RELATION_KIND_BLURB[third.kind]}.`)
  }
  return lines.join(' ')
}

/**
 * 점성 어스펙트 detail × 사주 5행 cross — 본명 안의 행성 간 어스펙트가
 * 사주 5행과 어떻게 만나는지 풀어서.
 * 예: Sun-Saturn square × 일간 약함 → 권위·자아 마찰이 본명 약점과 겹침
 */
export function buildAspectDetailCrossKo(input: MatrixCalculationInput): string {
  const aspects = input.aspects || []
  if (aspects.length === 0) return ''
  const natalRaw = input.dayMasterElement
  const natalKo = natalRaw ? ELEMENT_KO_LABEL[natalRaw] : ''
  if (!natalKo) return ''

  // Top 3 의미 있는 aspect (square/opposition 우선, conjunction은 luminaries만)
  const PRIORITY_PLANETS = new Set(['Sun', 'Moon', 'Saturn', 'Pluto', 'Mars', 'Jupiter', 'Venus', 'Mercury'])
  const tense = aspects.filter((a) =>
    (a.type === 'square' || a.type === 'opposition') &&
    PRIORITY_PLANETS.has(a.planet1) && PRIORITY_PLANETS.has(a.planet2)
  )
  const flow = aspects.filter((a) =>
    (a.type === 'trine' || a.type === 'sextile') &&
    PRIORITY_PLANETS.has(a.planet1) && PRIORITY_PLANETS.has(a.planet2)
  )

  const PLANET_KO: Record<string, string> = {
    Sun: '태양', Moon: '달', Mercury: '수성', Venus: '금성', Mars: '화성',
    Jupiter: '목성', Saturn: '토성', Uranus: '천왕성', Neptune: '해왕성', Pluto: '명왕성',
  }
  const ASPECT_TONE: Record<string, string> = {
    square: '서로 부딪치며 마찰을 만드는',
    opposition: '두 축이 마주서서 균형을 요구하는',
    trine: '자연스럽게 흘러 서로 받쳐주는',
    sextile: '협력하며 풀려나가는',
    conjunction: '한 점에 모여 강하게 융합되는',
  }
  const PLANET_THEME: Record<string, string> = {
    Sun: '자아·정체성', Moon: '정서·정착감', Mercury: '사고·소통',
    Venus: '관계·가치관', Mars: '행동·욕구', Jupiter: '확장·기회',
    Saturn: '책임·구조', Uranus: '혁신·해방', Neptune: '이상·녹아듦', Pluto: '재구성·집중',
  }

  const lines: string[] = []
  for (const a of tense.slice(0, 2)) {
    const p1 = PLANET_KO[a.planet1] || a.planet1
    const p2 = PLANET_KO[a.planet2] || a.planet2
    const tone = ASPECT_TONE[a.type]
    const t1 = PLANET_THEME[a.planet1] || ''
    const t2 = PLANET_THEME[a.planet2] || ''
    const aspectName = a.type === 'square' ? '스퀘어' : '오포지션'
    const sajuTone: Record<string, string> = {
      목: '시작·확장 욕구',
      화: '표현·열정 발산',
      토: '안정·축적 성향',
      금: '결단·정리 성향',
      수: '관찰·통찰 성향',
    }
    const sajuKey = sajuTone[natalKo] || '본명 기조'
    lines.push(
      `${p1}-${p2} ${aspectName} — 이 사람 차트 안에서 ${t1}과 ${t2}이 ${tone} 결로 짜여 있어요. ` +
      `이게 ${natalKo} 일간의 ${sajuKey}과 만나면, 평소 ${natalKo} 결로 매끄럽게 흐르던 ${a.planet1 === 'Sun' || a.planet2 === 'Sun' ? '자아 표현' : a.planet1 === 'Moon' || a.planet2 === 'Moon' ? '정서 안정' : '결정 흐름'}에 ${aspectName === '스퀘어' ? '주기적인 마찰' : '극단의 균형'}이 끼어드는 패턴이 만들어져요. ` +
      `${aspectName === '스퀘어'
        ? '겉으로는 외부 환경이 만든 갈등처럼 보이지만, 본질은 두 영역이 같이 자라야 한다는 본명 차트의 신호예요.'
        : '한쪽으로 기울지 않게 두 축을 모두 살리는 게 핵심이라, 한 쪽을 누르려 하면 반대편이 더 강하게 올라와요.'} ` +
      `이번 시기에는 ${t1.split('·')[0]} 영역에서 결정할 때 ${t2.split('·')[0]} 쪽 신호도 같이 점검하고, 한 박자 늦춰서 두 결을 함께 보는 습관이 도움이 됩니다.`
    )
  }
  for (const a of flow.slice(0, 1)) {
    const p1 = PLANET_KO[a.planet1] || a.planet1
    const p2 = PLANET_KO[a.planet2] || a.planet2
    const tone = ASPECT_TONE[a.type]
    const t1 = PLANET_THEME[a.planet1] || ''
    const t2 = PLANET_THEME[a.planet2] || ''
    const aspectName = a.type === 'trine' ? '트라인' : '섹스타일'
    lines.push(
      `${p1}-${p2} ${aspectName} — ${t1}과 ${t2}이 ${tone} 결이라, 사주 ${natalKo} 일간이 자기 색을 내는 자리에 자연스러운 도움이 들어와요. ` +
      `이런 흐름은 평소엔 잘 의식 못 하지만, 의식적으로 활용하면 가장 큰 자산이 되는 자리예요. ` +
      `${aspectName === '트라인'
        ? '특히 결정이 어려운 순간에 이 두 영역을 같은 결로 묶어서 보면, 막힘이 풀리고 가장 자연스러운 답이 나와요.'
        : '평소엔 잠재돼 있다가 작은 trigger가 들어오면 활성화되는 결이라, 이번 시기에는 한 번 의식적으로 시도해 볼 만해요.'} ` +
      `이번 시기 ${t1.split('·')[0]} 결정에서 ${t2.split('·')[0]} 결을 같이 살려보세요.`
    )
  }
  if (lines.length === 0) return ''
  return lines.join(' ')
}

/**
 * Solar Return × 세운 cross — 올해 생일 차트와 사주 세운이 같이 작동하는 결.
 */
export function buildSolarReturnSaeunCrossKo(input: MatrixCalculationInput): string {
  const adv = input.advancedAstroSignals || {}
  if (!adv.solarReturn) return ''
  const saeunRaw = input.currentSaeunElement
  const saeunKo = saeunRaw ? ELEMENT_KO_LABEL[saeunRaw] : ''
  if (!saeunKo) return ''
  const natalRaw = input.dayMasterElement
  const natalKo = natalRaw ? ELEMENT_KO_LABEL[natalRaw] : ''
  if (!natalKo) return ''
  const SEQ = ['목', '화', '토', '금', '수']
  const ni = SEQ.indexOf(natalKo)
  const si = SEQ.indexOf(saeunKo)
  const diff = ni >= 0 && si >= 0 ? (si - ni + 5) % 5 : -1
  const sibsinRel = ['비겁', '식상', '재성', '관성', '인성'][diff] || ''
  if (!sibsinRel) return ''
  const sibsinDeep: Record<string, string> = {
    비겁: '자기 색을 더 진하게 내고 주장·돌파력을 키우는 시기. 동업·경쟁·자기 사업이 무대로 올라오기 쉬워요',
    식상: '내가 만들어내는 표현·창작·자식 영역이 활발해지는 시기. 발표·출산·창업·SNS 같은 외부 발산이 늘어나요',
    재성: '재물·기회·이성 인연이 잡히는 시기. 다만 재성은 통제 가능한 자원이지 가만히 들어오는 게 아니라 적극적으로 다스려야 잡혀요',
    관성: '직책·시험·책임 압박이 들어오는 시기. 외부에서 평가받는 자리가 만들어지고 결과가 또렷이 매겨져요',
    인성: '학습·문서·귀인의 도움이 들어오는 시기. 자격증·계약서·스승·후원자 같은 받쳐주는 인연이 결정적 도움을 줘요',
  }
  return (
    `점성 측 Solar Return(올해 생일 차트)이 사주 측 ${saeunKo} ${sibsinRel}운과 같이 작동하는 해입니다. ` +
    `점성에서는 한 해 전체의 시작 톤이 생일 시점의 천체 배치로 다시 잡히는 시기인데, 사주 ${sibsinRel}운이 같이 들어오면 ${sibsinDeep[sibsinRel] || ''}. ` +
    `두 시스템이 한 해의 주제를 같은 방향으로 가리키는 시점이라, 평소처럼 흘러가는 한 해가 아니라 *주제가 명확한 한 해*가 됩니다. ` +
    `${sibsinRel === '관성' || sibsinRel === '재성'
      ? '특히 외부 환경이 결과를 묻는 시기라, 막연히 기다리지 말고 무엇을 보여줄지 한 해 시작에 정하고 가는 게 좋아요.'
      : '평소보다 한 해의 결이 또렷하니, 새해 시작에 한 해의 핵심 주제 한 줄을 정하고 거기에 맞춰 결정하면 흐름을 잘 탑니다.'}`
  )
}

/**
 * Lunar Return × 월운 cross — 이번 달 달 회귀와 사주 월운.
 */
export function buildLunarReturnWolunCrossKo(input: MatrixCalculationInput): string {
  const adv = input.advancedAstroSignals || {}
  if (!adv.lunarReturn) return ''
  const wolunRaw = input.currentWolunElement
  const wolunKo = wolunRaw ? ELEMENT_KO_LABEL[wolunRaw] : ''
  if (!wolunKo) return ''
  return (
    `점성 측 Lunar Return(이번 달 달 회귀)이 사주 측 ${wolunKo} 월운과 함께 들어왔어요. ` +
    `Lunar Return은 매달 달이 본명 위치로 돌아오는 시점인데, 이때 다음 한 달의 정서·일상 리듬이 새로 잡혀요. ` +
    `사주 ${wolunKo} 월운과 같은 결로 만나면, 보통 달과 달리 *직감과 흐름이 한 방향으로 일치하는* 한 달이 됩니다. ` +
    `평소엔 머리로 결정하던 일도 이번 달은 직감대로 움직여도 어긋나지 않고, 큰 결정이 있으면 첫 직감을 신뢰해 보세요. ` +
    `반면 의식적으로 *반대 방향*으로 움직이려 하면 평소보다 더 큰 저항이 걸려요.`
  )
}

/**
 * Eclipses × 사주 충/형 cross — 식이 사주 충돌 결을 자극할 때.
 */
export function buildEclipsesRelationsCrossKo(input: MatrixCalculationInput): string {
  const adv = input.advancedAstroSignals || {}
  if (!adv.eclipses) return ''
  const relations = input.relations || []
  const tenseRel = relations.find((r) => ['천간충', '지지충', '지지형'].includes(r.kind))
  if (!tenseRel) {
    return (
      `점성 측 Eclipses(현재 식)가 본명 차트 포인트에 닿는 시기예요. ` +
      `식은 평소 trasit과 다르게 12-18개월 단위로 영향이 누적되는 큰 전환 신호로, 인생의 *방향이 바뀌는* 시점에 자주 옵니다. ` +
      `사주 측에 큰 충·형이 없어, 본명 안에서 부딪치는 결은 약하지만 외부 환경(직장·관계·이주)에서 갑자기 들어오는 변화가 또렷합니다. ` +
      `식이 직접 닿는 신월·삭망 전후 한 주는 큰 결정·계약·이주를 피하고, 그 외 시기에 천천히 결정해 가는 게 안전해요. ` +
      `식 trigger 자체는 좋고 나쁨이 정해진 게 아니라 *기존 패턴이 정리되는 신호*라, 변화를 거부하기보다 받아들일 준비를 하는 시기입니다.`
    )
  }
  return (
    `점성 측 Eclipses(현재 식)가 본명 차트에 닿는 시기에 사주 측 ${tenseRel.kind}${tenseRel.detail ? `(${tenseRel.detail})` : ''}이 같이 활성화됐어요. ` +
    `이건 외부 식 trigger와 본명 내부 충돌이 *동시에 일어나는* 흔치 않은 12-18개월 전환점이에요. ` +
    `평소 같으면 식이 와도 본명에 충·형이 없으면 외부 환경 변화로만 끝나는데, 지금은 본명 안에서도 같이 움직이는 결이라 변화 강도가 평균보다 높습니다. ` +
    `큰 결정은 식 영향이 직접 닿는 신월·삭망 전후 한 주를 피하고, 가능하면 변화 흐름을 *밀어내지 말고 정리 쪽으로* 받아들이세요. ` +
    `이 시기를 잘 통과하면 12-18개월 후 본명 안의 ${tenseRel.kind} 결이 정리되는 효과까지 같이 옵니다.`
  )
}

/**
 * ASC × 일간 cross — 첫인상(상승)과 본명 일간의 결.
 */
export function buildAscDayMasterCrossKo(input: MatrixCalculationInput): string {
  const signsAny = (input.planetSigns || {}) as unknown as Record<string, string | undefined>
  const ascSign = signsAny.Ascendant
  if (!ascSign) return ''
  const natalRaw = input.dayMasterElement
  const natalKo = natalRaw ? ELEMENT_KO_LABEL[natalRaw] : ''
  if (!natalKo) return ''
  const SIGN_EL: Record<string, string> = {
    Aries: '화', Leo: '화', Sagittarius: '화',
    Taurus: '토', Virgo: '토', Capricorn: '토',
    Gemini: '풍', Libra: '풍', Aquarius: '풍',
    Cancer: '수', Scorpio: '수', Pisces: '수',
  }
  const ascEl = SIGN_EL[ascSign] || ''
  if (!ascEl) return ''
  const SIGN_KO: Record<string, string> = {
    Aries: '양자리', Taurus: '황소자리', Gemini: '쌍둥이자리', Cancer: '게자리',
    Leo: '사자자리', Virgo: '처녀자리', Libra: '천칭자리', Scorpio: '전갈자리',
    Sagittarius: '사수자리', Capricorn: '염소자리', Aquarius: '물병자리', Pisces: '물고기자리',
  }
  if (ascEl === natalKo || (ascEl === '풍' && natalKo === '금') || (ascEl === '수' && natalKo === '수')) {
    return (
      `점성 측 상승 ${SIGN_KO[ascSign]}(${ascEl} 결)와 사주 측 일간 ${natalKo}이 같은 결을 가리키는 차트예요. ` +
      `상승은 처음 만나는 사람이 받는 첫인상과 외부에 비치는 자기 모습을 결정하고, 일간은 안에서 결정하고 움직이는 본인의 핵심이에요. ` +
      `이 둘이 같은 결이라는 건, 겉으로 보이는 모습과 속에서 결정하는 모습이 한 방향이라는 뜻 — 안팎이 일치하는 자기 표현이 자연스럽게 됩니다. ` +
      `다른 사람이 본인을 오해할 일이 적고, 본인도 자기 모습에 대한 위화감 없이 자기답게 살아가는 차트예요. ` +
      `다만 같은 결이 너무 진하면 한 톤만 발달하고 반대 결을 못 키울 수 있으니, 의식적으로 다른 결도 시도해 보는 게 좋아요.`
    )
  }
  return (
    `점성 측 상승 ${SIGN_KO[ascSign]}(${ascEl} 결)와 사주 측 일간 ${natalKo}이 *다른 결*을 가리키는 차트예요. ` +
    `상승은 첫인상·외부 표현 결을 잡고, 일간은 본인이 결정하고 움직이는 핵심이에요. ` +
    `이 둘이 다르다는 건 첫인상은 ${ascEl} 톤으로 비치지만 본명 결정은 ${natalKo} 결로 흐른다는 뜻 — *안팎이 다른 두 겹의 자아*를 가진 분이에요. ` +
    `처음 만난 사람이 본인을 ${ascEl} 결로 보는데, 깊이 알게 되면 ${natalKo} 결로 결정한다는 걸 알게 되는 패턴이라, 가끔 "처음과 다르다"는 평가를 들을 수 있어요. ` +
    `이건 단점이 아니라 두 결을 모두 가진 자산이에요. 외부 무대에선 ${ascEl} 결을 살리고, 핵심 결정은 ${natalKo} 결로 내리는 식으로 분리해서 운영하면 두 결이 서로 부딪치지 않고 잘 맞물립니다.`
  )
}

/**
 * 점성 트랜짓 ↔ 사주 신살 cross — 두 시스템이 같은 방향을 가리키는 시점 한 줄.
 * 예: 토성 트랜짓이 들어왔는데 백호·괴강 활성 → 책임 압박이 두 시스템에서 동시에 신호.
 */
export function buildTransitShinsalCrossKo(input: MatrixCalculationInput): string {
  const transits = (input as { activeTransits?: string[] }).activeTransits || []
  const shinsal = input.shinsalList || []
  if (transits.length === 0 || shinsal.length === 0) return ''

  const HEAVY_TRANSIT = /(saturn|pluto|chiron|토성|명왕성|키론)/i
  const FLOW_TRANSIT = /(jupiter|venus|목성|금성)/i
  const HEAVY_SHINSAL = new Set(['백호', '괴강', '양인', '망신', '삼재', '천라지망'])
  const LUCKY_SHINSAL = new Set(['천을귀인', '천덕귀인', '월덕귀인', '학당'])

  const heavyTransit = transits.find((t) => HEAVY_TRANSIT.test(String(t)))
  const flowTransit = transits.find((t) => FLOW_TRANSIT.test(String(t)))
  const heavyShinsal = shinsal.find((s) => HEAVY_SHINSAL.has(s as string))
  const luckyShinsal = shinsal.find((s) => LUCKY_SHINSAL.has(s as string))

  if (heavyTransit && heavyShinsal) {
    return `점성 측 ${heavyTransit} 트랜짓과 사주 측 ${heavyShinsal} 신살이 같은 시점에 활성화돼 있어, 책임·시험·재정비 신호가 두 시스템에서 동시에 들어와요. 큰 결정은 한 박자 늦추는 편이 안전한 시기예요.`
  }
  if (flowTransit && luckyShinsal) {
    return `점성 측 ${flowTransit} 트랜짓과 사주 측 ${luckyShinsal} 신살이 같이 활성화돼, 외부 도움·기회 신호가 두 시스템에서 같은 방향으로 들어와요. 평소 미루던 시도를 가볍게 시작해 보기 좋은 결이에요.`
  }
  if (heavyTransit && luckyShinsal) {
    return `점성 측 ${heavyTransit} 트랜짓이 무게를 더하지만 사주 측 ${luckyShinsal} 신살이 받쳐주고 있어, 어려운 결정에 외부 도움이 한 번 들어오는 patterns예요.`
  }
  return ''
}

/**
 * 점성 어스펙트 ↔ 사주 합/충 cross — 같은 방향을 가리키는지 한 줄.
 * 점성 square/opposition (긴장) ↔ 사주 충/형 (충돌) 동시 활성 → 외부·내부 모두 마찰 시기.
 */
export function buildAspectsRelationsCrossKo(input: MatrixCalculationInput): string {
  const aspects = input.aspects || []
  const relations = input.relations || []
  if (aspects.length === 0 || relations.length === 0) return ''

  const tenseAspectCount = aspects.filter((a) => a.type === 'square' || a.type === 'opposition').length
  const flowAspectCount = aspects.filter((a) => a.type === 'trine' || a.type === 'sextile').length
  const tenseRel = relations.find((r) => ['천간충', '지지충', '지지형'].includes(r.kind))
  const flowRel = relations.find((r) => ['천간합', '지지삼합', '지지육합'].includes(r.kind))

  if (tenseAspectCount >= 3 && tenseRel) {
    return `점성 어스펙트 측 긴장(스퀘어·오포지션 ${tenseAspectCount}개)과 사주 측 ${tenseRel.kind}이 함께 들어와 있어, 외부 환경 마찰과 본명 내부 충돌이 같은 결로 작동하는 시기예요. 한 번에 모두 풀려고 하면 더 꼬일 수 있어요.`
  }
  if (flowAspectCount >= 3 && flowRel) {
    return `점성 어스펙트 측 흐름(트라인·섹스타일 ${flowAspectCount}개)과 사주 측 ${flowRel.kind}이 같이 활성화돼, 두 시스템 모두 협력·통합 방향을 가리키고 있어요. 큰 그림을 짤 때 좋은 결이에요.`
  }
  return ''
}

/** 본명 5행 분포 — 강한 기운 / 약한 기운 한 줄. */
export function buildFiveElementsBalanceKo(input: MatrixCalculationInput): string {
  const snap = (input as { sajuSnapshot?: { fiveElements?: unknown } }).sajuSnapshot
  const fe = snap?.fiveElements as Record<string, number> | undefined
  if (!fe) return ''
  // saju.ts는 wood/fire/earth/metal/water 키로 저장
  const ko: Record<string, string> = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' }
  const entries = Object.entries(fe).filter(([k, v]) => typeof v === 'number' && ko[k])
  if (entries.length === 0) return ''
  entries.sort((a, b) => (b[1] as number) - (a[1] as number))
  const strongest = entries[0]
  const weakest = entries[entries.length - 1]
  if (!strongest || !weakest || strongest[0] === weakest[0]) return ''
  const strongCount = strongest[1] as number
  const weakCount = weakest[1] as number
  if (strongCount - weakCount < 2) return '' // 균형 잡힌 경우 narration 생략

  const strongK = ko[strongest[0]]
  const weakK = ko[weakest[0]]
  const STRONG_TONE: Record<string, string> = {
    목: '시작·확장·계획 영역에서 추진력이 살아 새 일이 자연스럽게 잡히는',
    화: '표현·열정·확장에서 외부로 풀려나가는 에너지가 두터운',
    토: '안정·신뢰·축적 영역에서 묵직한 받침이 생기는',
    금: '결단·정리·구조화에서 칼날 같은 마무리력이 살아 있는',
    수: '관찰·통찰·내적 흐름에서 깊은 호흡이 자연스럽게 잡히는',
  }
  const WEAK_TONE: Record<string, string> = {
    목: '새로 시작하는 동력·계획 추진이 약해 일을 미루기 쉬운',
    화: '표현·발산·열정 발화가 약해 마음만큼 밖으로 풀려나가지 않는',
    토: '안정·중재·소속감이 얇아 한 자리에 정착하기 어려운',
    금: '결단·정리·마무리력이 약해 시작은 잘하되 끝맺음에서 흐려지는',
    수: '관찰·정리·복기 능력이 얕아 같은 실수를 반복하기 쉬운',
  }
  const COMPENSATION: Record<string, string> = {
    목: '아침 산책·새 책·자라는 식물 가까이 두기 같이 *목 기운 보강*',
    화: '운동·강한 색·사람 만남·발표 자리 같이 *화 기운 보강*',
    토: '한 자리 앉아 있는 시간·정착감 있는 공간·신뢰 관계 정착 같이 *토 기운 보강*',
    금: '정리·청소·결단해야 할 일 명단 만들기 같이 *금 기운 보강*',
    수: '글쓰기·복기 노트·물 가까이 머무르기 같이 *수 기운 보강*',
  }
  return (
    `5행 분포로는 **${strongK} 기운 ${strongCount}개**가 가장 두텁고 **${weakK} 기운 ${weakCount}${weakCount === 0 ? '개로 비어 있어요' : '개로 얇아요'}**. ` +
    `${strongK}이 두텁다는 건 ${STRONG_TONE[strongK] || '본명의 한 결이 또렷한'} 본명이라는 뜻이에요. ` +
    `반대로 ${weakK}이 ${weakCount === 0 ? '0개라는 건' : '얇다는 건'} ${WEAK_TONE[weakK] || '그 영역에서 약점이 자주 드러나는'} 결을 같이 가진다는 의미예요. ` +
    `이 두 결이 같이 작동하니, 평소엔 ${strongK} 결로 매끄럽게 풀리지만 ${weakK} 영역에서 자주 막히는 패턴이 반복돼요. ` +
    `보완 처방으로는 일상에 ${COMPENSATION[weakK] || '그 영역과 관련된 작은 행동'}을 짜서 의식적으로 ${weakK} 기운을 보태주면, 본명 균형이 한 단계 올라갑니다.`
  )
}

// ──────────────────────────────────────────────────────────
// 시계열 스토리 — 이전/현재/다음 대운 + 작년/올해/내년 세운
// ──────────────────────────────────────────────────────────

type DaeunRow = {
  age: number
  heavenlyStem?: string
  earthlyBranch?: string
}

type AnnualRow = {
  year: number
  ganji?: string
  heavenlyStem?: string
  earthlyBranch?: string
  element?: string
}

function splitGanji(row: AnnualRow): { stem?: string; branch?: string } {
  if (row.heavenlyStem || row.earthlyBranch) {
    return { stem: row.heavenlyStem, branch: row.earthlyBranch }
  }
  // unse.annual 은 보통 ganji 단일 문자열만 채워짐 (예: '丙午')
  if (row.ganji && row.ganji.length >= 2) {
    return { stem: row.ganji[0], branch: row.ganji[1] }
  }
  return {}
}

function readDaeunArc(input: MatrixCalculationInput): {
  prev?: DaeunRow
  current?: DaeunRow
  next?: DaeunRow
} {
  const snap = (input as { sajuSnapshot?: { daeWoon?: unknown } }).sajuSnapshot
  const daeWoon = snap?.daeWoon as
    | { current?: DaeunRow; list?: DaeunRow[] }
    | undefined
  const list = daeWoon?.list || []
  const current = daeWoon?.current
  if (!current) return { current: undefined }
  const idx = list.findIndex((d) => d.age === current.age)
  return {
    prev: idx > 0 ? list[idx - 1] : undefined,
    current,
    next: idx >= 0 && idx < list.length - 1 ? list[idx + 1] : undefined,
  }
}

function readAnnualArc(
  input: MatrixCalculationInput,
  currentYear: number
): { prev?: AnnualRow; current?: AnnualRow; next?: AnnualRow } {
  const snap = (input as { sajuSnapshot?: { unse?: unknown } }).sajuSnapshot
  const unse = snap?.unse as { annual?: AnnualRow[] } | undefined
  const list = unse?.annual || []
  const findYear = (y: number) => list.find((row) => row.year === y)
  return {
    prev: findYear(currentYear - 1),
    current: findYear(currentYear),
    next: findYear(currentYear + 1),
  }
}

function ganjiLabel(stem?: string, branch?: string): string {
  if (!stem && !branch) return ''
  return `${stem || ''}${branch || ''}`
}

function ganjiElementLabel(stem?: string, branch?: string): string {
  const el = stem ? STEM_KO_ELEMENT[stem] : branch ? BRANCH_KO_ELEMENT[branch] : ''
  return el ? `${el} 기운` : ''
}

/**
 * 시계열 스토리 — 이전 대운 → 현재 대운 → 다음 대운 + 작년/올해/내년 세운.
 * 스토리 한 단락으로 합성. sajuSnapshot 없으면 빈 문자열 반환.
 */
export function buildStoryArcKo(input: MatrixCalculationInput): string {
  const arc = readDaeunArc(input)
  if (!arc.current) return ''
  const lines: string[] = []

  // 대운 arc
  const prevG = ganjiLabel(arc.prev?.heavenlyStem, arc.prev?.earthlyBranch)
  const currG = ganjiLabel(arc.current.heavenlyStem, arc.current.earthlyBranch)
  const nextG = ganjiLabel(arc.next?.heavenlyStem, arc.next?.earthlyBranch)
  const prevEl = ganjiElementLabel(arc.prev?.heavenlyStem, arc.prev?.earthlyBranch)
  const currEl = ganjiElementLabel(arc.current.heavenlyStem, arc.current.earthlyBranch)
  const nextEl = ganjiElementLabel(arc.next?.heavenlyStem, arc.next?.earthlyBranch)

  if (prevG && prevEl) {
    lines.push(`지난 ${arc.prev?.age}~${(arc.prev?.age ?? 0) + 9}세 ${prevG} 대운은 ${prevEl}이 인생의 색을 잡아주던 시기였고,`)
  }
  if (currG && currEl) {
    const range = `${arc.current.age}~${arc.current.age + 9}세`
    // 일간 vs 현재 대운 element 관계로 한 줄에 시간 axis + relation 압축
    const natalRaw = (input as { dayMasterElement?: string }).dayMasterElement
    const natalKoEl = natalRaw ? ELEMENT_KO_LABEL[natalRaw] : ''
    const cycleKoEl = arc.current.heavenlyStem ? STEM_KO_ELEMENT[arc.current.heavenlyStem] : ''
    const SEQ = ['목', '화', '토', '금', '수']
    const ni = SEQ.indexOf(natalKoEl)
    const ci = SEQ.indexOf(cycleKoEl)
    const diff = ni >= 0 && ci >= 0 ? (ci - ni + 5) % 5 : -1
    const RELATION_TONE = [
      '본명 색이 한 자리에 더 진해지는',
      '본인 기운을 밖으로 풀어내는',
      '본인이 환경을 다스리고 통제하는',
      '본인을 누르고 시험하며 단단해지게 만드는',
      '본인을 받쳐주고 길러주는 인성',
    ]
    const tone = diff >= 0 && diff < 5 ? RELATION_TONE[diff] : ''
    if (tone) {
      lines.push(`지금 ${range} ${currG} 대운으로 들어와 있는데, ${tone} 구도라 인생 전반의 색이 그쪽으로 잡혀요.`)
    } else {
      lines.push(`지금 ${range} ${currG} 대운에 들어와 있어요.`)
    }
  }
  if (nextG && nextEl) {
    lines.push(`10년 뒤 ${arc.next?.age}~${(arc.next?.age ?? 0) + 9}세 ${nextG} 대운에서는 ${nextEl}이 다음 챕터를 열어주게 되니, 지금 톤을 잘 정리해두면 자연스럽게 옮겨가요.`)
  }

  // 세운 arc
  const targetIso =
    (input as { currentDateIso?: string }).currentDateIso ||
    new Date().toISOString().slice(0, 10)
  const currentYear = Number(targetIso.slice(0, 4))
  if (!Number.isNaN(currentYear)) {
    const aArc = readAnnualArc(input, currentYear)
    const cur = aArc.current ? splitGanji(aArc.current) : {}
    const prev = aArc.prev ? splitGanji(aArc.prev) : {}
    const next = aArc.next ? splitGanji(aArc.next) : {}
    const curG = ganjiLabel(cur.stem, cur.branch)
    if (curG) {
      const prevG2 = ganjiLabel(prev.stem, prev.branch)
      const nextG2 = ganjiLabel(next.stem, next.branch)
      const curEl = ganjiElementLabel(cur.stem, cur.branch)
      const annualLine =
        prevG2 && nextG2
          ? `세운으로 보면 ${currentYear - 1}년 ${prevG2}에서 시작된 줄기가 올해 ${currentYear}년 ${curG}로 넘어왔고, 내년 ${nextG2}에서 한 번 더 정리될 가능성이 있어요.`
          : curEl
            ? `올해 ${currentYear}년 세운은 ${curG}로, ${curEl}이 한 해 환경의 톤을 잡아주는 구간이에요.`
            : `올해 ${currentYear}년 세운은 ${curG} — 한 해 환경의 톤을 잡아주는 구간이에요.`
      lines.push(annualLine)
    }
  }

  return lines.join(' ')
}
