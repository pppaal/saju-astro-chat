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
import { getGeokgukDescription } from '@/lib/Saju/geokguk'
import {
  generateSibsinText,
  generateTwelveStageText,
} from '@/lib/Saju/textGenerator'
import type { GeokgukType } from '@/lib/Saju/geokguk'
import type { SibsinKind, FiveElement } from '@/lib/Saju/types'

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

/**
 * 본명 사주 narration 한국어 라인 묶음 — deepAnalysis에 prepend하기 좋도록 한 단락 합성.
 * matrixInput에 격국·12운성·십신·신살이 이미 채워져 있어서 그대로 재해석.
 */
export function buildSajuNarrationKo(input: MatrixCalculationInput): string {
  const lines: string[] = []

  // 1) 격국 — 본명의 큰 성격 한 줄
  if (input.geokguk) {
    const desc = getGeokgukDescription(input.geokguk as GeokgukType)
    if (desc) {
      lines.push(`본명이 ${input.geokguk}이라 ${desc}하는 분이에요.`)
    }
  }

  // 2) 12운성 — 일간 기준 가장 두드러진 단계 한 줄 (formal 톤)
  const topStage = topEntry(input.twelveStages)
  if (topStage) {
    const stageText = generateTwelveStageText(topStage, { style: 'formal' })
    if (stageText?.main) {
      lines.push(stageText.main)
    }
  }

  // 3) 십신 — 가장 강한 십신 한 줄 (formal 톤)
  // generateSibsinText는 SIBSIN_INTERPRETATIONS에 없는 키엔 throw하므로 방어적으로 wrap
  const topSibsin = topEntry<SibsinKind>(input.sibsinDistribution)
  if (topSibsin) {
    try {
      const sibsinText = generateSibsinText(topSibsin, { style: 'formal' })
      if (sibsinText?.main) {
        lines.push(sibsinText.main)
      }
    } catch {
      // 데이터 사전에 없는 십신이면 라이브러리가 throw — 조용히 스킵
    }
  }

  // 4) 신살 — 활성 신살 중 위 사전에 있는 항목들을 자연어로 묶음
  if (input.shinsalList && input.shinsalList.length > 0) {
    const top = input.shinsalList.slice(0, 3) as string[]
    const blurbs = top
      .map((k) => KO_SHINSAL_BLURB[k])
      .filter(Boolean)
    if (blurbs.length > 0) {
      lines.push(
        `본명에 ${top.join('·')}이(가) 활성화돼 ${blurbs.join(', ')} 작용합니다.`
      )
    }
  }

  return lines.join(' ')
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

const ELEMENT_FLAVOR_KO: Record<string, string> = {
  목: '자라남·계획·시작이 강해지는',
  화: '표현·확장·열정이 뜨거워지는',
  토: '신뢰·축적·중재가 단단해지는',
  금: '결단·구조·정리가 또렷해지는',
  수: '지혜·휴식·내적 흐름이 깊어지는',
}

// 본명 일간 원소와 시기 원소 관계 → 한 줄 카운슬링
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
  if (ni < 0 || ci < 0) return `${cycleLabel}은 ${cycle} 기운이라 ${flavor}`
  const diff = (ci - ni + 5) % 5
  // 0=동기 1=설기 2=재 3=관 4=인
  const relationNarr = [
    '본명과 같은 기운이 모이는',
    '본인 기운이 밖으로 풀려나가는',
    '본인이 다스리고 통제하는',
    '본인을 누르고 시험하는',
    '본인을 받쳐주고 길러주는',
  ][diff]
  return `${cycleLabel}은 ${cycle} — ${relationNarr} 결이라 ${flavor}`
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
  const paragraphs: string[] = []
  const natal = input.dayMasterElement
  const natalKo = natal ? ELEMENT_KO_LABEL[natal] || '' : ''

  // ───────── ¶1: 본명 인격 — 격국 + 12운성 + 십신 + 신살을 한 호흡으로 ─────────
  const p1: string[] = []
  if (input.geokguk) {
    const desc = getGeokgukDescription(input.geokguk as GeokgukType)
    if (desc) p1.push(`이 분은 ${input.geokguk}으로 들어가신 분이라 ${desc}하는 분이에요.`)
  }
  const topStage = topEntry(input.twelveStages)
  if (topStage) {
    const stagePhrase = STAGE_LIFE_PHRASE[topStage]
    if (stagePhrase) {
      p1.push(`12운성으로 보면 일간이 마침 ${topStage} 단계에 들어와 있는데, 이게 ${stagePhrase} 시기라서 평소 머리로만 알던 흐름이 실제 행동으로 옮겨갑니다.`)
    }
  }
  const topSibsin = topEntry(input.sibsinDistribution)
  if (topSibsin) {
    p1.push(`십신 중에서는 ${topSibsin}${iga(topSibsin as string)} 가장 두텁게 잡혀 있어 이 흐름이 본명 안에서 꽉 맞물려 작동합니다.`)
  }
  if (input.shinsalList && input.shinsalList.length > 0) {
    const top = input.shinsalList.slice(0, 3) as string[]
    const blurbs = top.map((k) => SHINSAL_THEMATIC_KO[k]).filter(Boolean) as string[]
    if (blurbs.length > 0) {
      const lastWord = top[top.length - 1]
      p1.push(`거기에 ${top.join('·')}${iga(lastWord)} 활성화돼 ${blurbs.join(', ')}, 그래서 한 자리에 머물기보다 자기 색을 점점 키워가는 분이에요.`)
    }
  }
  if (p1.length > 0) paragraphs.push(p1.join(' '))

  // ───────── ¶ Specific 천간/지지: 본명 안에 이미 형성된 관계 한 줄 ─────────
  const natalRel = buildNatalRelationKo(input)
  if (natalRel) paragraphs.push(natalRel)

  // ───────── ¶ 시계열: 이전 → 현재 → 다음 대운 + 세운 arc ─────────
  const storyArc = buildStoryArcKo(input)
  if (storyArc) paragraphs.push(storyArc)

  // ───────── ¶2: 시기 흐름 — 대운/세운/월운 + 사이클 충돌·상생 narration ─────────
  const p2: string[] = []
  const daeunRel = describeCycleRelation(natal, input.currentDaeunElement, '대운', '인생 전반을 그 색으로 물들이는')
  const saeunRel = describeCycleRelation(natal, input.currentSaeunElement, '올해 세운', '한 해 동안 환경을 그쪽으로 밀어붙이는')
  const wolunRel = describeCycleRelation(natal, input.currentWolunElement, '이번 달 월운', '한 달 톤을 살짝 비추는')
  const iljinRel = describeCycleRelation(natal, input.currentIljinElement, '오늘 일운', '오늘 하루 분위기를 잡아주는')

  if (daeunRel) p2.push(`${daeunRel} 시기예요.`)
  if (saeunRel) p2.push(`${saeunRel} 형국입니다.`)
  // 대운 ↔ 세운 사이클 충돌 narration
  const daeunSaeunClash = describeCycleClash(input.currentDaeunElement, input.currentSaeunElement, '대운', '세운')
  if (daeunSaeunClash) p2.push(`두 흐름을 함께 보면 ${daeunSaeunClash} 형국이라, 큰 방향이 정해진 가운데 한 해 단위로 환경이 어떻게 받쳐주는지가 중요해집니다.`)
  if (wolunRel) p2.push(`${wolunRel} 결이 깔립니다.`)
  if (iljinRel) p2.push(`${iljinRel} 흐름이고요.`)
  if (p2.length > 0) paragraphs.push(p2.join(' '))

  // ───────── ¶3: 사주↔점성 정합 + scenario ─────────
  const p3: string[] = []
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
      p3.push(`점성으로 보면 ${w} 기운이 가장 강조되는 차트라, ${matchHint} 형국이에요.`)
    }
  }
  if (aspectsCount >= 3) {
    p3.push(`주요 어스펙트가 ${aspectsCount}개 활성화돼 있어 본명 차트의 변동성과 자극이 평균보다 많은 편입니다.`)
  }

  // 시나리오 한 줄 — 격국 + 대운 element 조합으로
  if (input.geokguk && input.currentDaeunElement && natalKo) {
    const daeunKo = ELEMENT_KO_LABEL[input.currentDaeunElement] || ''
    if (daeunKo) {
      const SEQ = ['목', '화', '토', '금', '수']
      const ni = SEQ.indexOf(natalKo)
      const di = SEQ.indexOf(daeunKo)
      const diff = ni >= 0 && di >= 0 ? (di - ni + 5) % 5 : -1
      let scenario = ''
      if (diff === 1) scenario = `${input.geokguk}의 강점을 밖으로 표현하기 좋은 구간이라 발표·확장·새 시도에 힘을 실어보세요.`
      else if (diff === 3) scenario = `${input.geokguk}의 책임 무게가 더 무거워지는 구간이라 무리한 확장보다 기존 책임을 정리하는 편이 안전합니다.`
      else if (diff === 4) scenario = `${input.geokguk}을(를) 받쳐주는 흐름이 들어와 있어 학습·재정비·내적 충전에 시간 쓰기 좋은 시기입니다.`
      else if (diff === 0) scenario = `${input.geokguk} 색이 더 진해지는 구간이라 본인이 가진 기조를 더 분명히 드러내는 결정에 무게가 실립니다.`
      else if (diff === 2) scenario = `${input.geokguk}이(가) 환경을 통제하는 위치라 외부 자원·계약·대인 관계 정리에 유리합니다.`
      if (scenario) p3.push(scenario)
    }
  }
  if (p3.length > 0) paragraphs.push(p3.join(' '))

  return paragraphs.join('\n\n')
}

// ──────────────────────────────────────────────────────────
// 천간/지지 specific 페어 narration (甲庚충 / 甲己합 등)
// ──────────────────────────────────────────────────────────

const STEM_KO_ELEMENT: Record<string, string> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const BRANCH_KO_ELEMENT: Record<string, string> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}
const RELATION_KIND_BLURB: Record<string, string> = {
  천간합: '천간합으로 부드럽게 맞물려 협력·동의가 자연스럽게 떨어집니다',
  천간충: '천간충으로 부딪쳐 추진력은 있지만 갈등·압박이 함께 옵니다',
  지지육합: '지지육합으로 일상이 단단해지고 가까운 관계가 더 깊어집니다',
  지지삼합: '지지삼합으로 큰 흐름이 한 방향으로 모이는 강한 추진 구도예요',
  지지방합: '지지방합으로 같은 계절 기운이 모여 안정적인 진도가 나옵니다',
  지지충: '지지충으로 환경·이동·관계 변동이 잦은 결입니다',
  지지형: '지지형으로 마찰·실수가 노출되기 쉬워 평소보다 한 번 더 점검해야 합니다',
  지지파: '지지파로 진행 중인 일이 살짝 틀어질 가능성이 있습니다',
  지지해: '지지해로 오해·어긋남이 쌓이기 쉬우니 해석 일치 확인이 먼저예요',
  원진: '원진으로 미묘한 거부감과 오해가 자라기 쉬운 구도입니다',
  공망: '공망에 들어가 결정 무게가 가벼워지니 새 일은 다음 흐름으로 미루는 편이 좋아요',
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

/** 본명 4기둥 안에서 이미 형성된 specific 천간/지지 관계를 자연어로 한 줄. */
export function buildNatalRelationKo(input: MatrixCalculationInput): string {
  const relations = input.relations || []
  if (relations.length === 0) return ''
  // 강도 큰 관계 우선 — 충/형/공망 > 합 > 해/파 > 원진
  const priority = ['천간충', '지지충', '지지형', '공망', '천간합', '지지삼합', '지지육합', '지지방합', '지지해', '지지파', '원진']
  const sorted = [...relations].sort(
    (a, b) => priority.indexOf(a.kind) - priority.indexOf(b.kind)
  )
  const top = sorted[0]
  if (!top) return ''
  const blurb = RELATION_KIND_BLURB[top.kind] || ''
  const detail = top.detail ? `(${top.detail})` : ''
  if (!blurb) return ''
  return `본명 안에서 이미 ${top.kind}${detail}이 형성돼 있어, ${blurb}.`
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
  heavenlyStem?: string
  earthlyBranch?: string
  element?: string
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
    lines.push(`지금 ${range} ${currG} 대운으로 들어와 ${currEl} 흐름이 본명을 새로 물들이는 구간입니다.`)
  }
  if (nextG && nextEl) {
    lines.push(`10년 뒤 ${arc.next?.age}~${(arc.next?.age ?? 0) + 9}세 ${nextG} 대운에서는 ${nextEl}이 다음 챕터를 열어주게 되니, 지금 흐름을 잘 정리해두면 자연스럽게 옮겨갑니다.`)
  }

  // 세운 arc
  const targetIso =
    (input as { currentDateIso?: string }).currentDateIso ||
    new Date().toISOString().slice(0, 10)
  const currentYear = Number(targetIso.slice(0, 4))
  if (!Number.isNaN(currentYear)) {
    const aArc = readAnnualArc(input, currentYear)
    const cur = aArc.current
    const prev = aArc.prev
    const next = aArc.next
    const curG = ganjiLabel(cur?.heavenlyStem, cur?.earthlyBranch)
    if (curG) {
      const prevG2 = ganjiLabel(prev?.heavenlyStem, prev?.earthlyBranch)
      const nextG2 = ganjiLabel(next?.heavenlyStem, next?.earthlyBranch)
      const annualLine =
        prevG2 && nextG2
          ? `세운으로 보면 ${currentYear - 1}년 ${prevG2} 흐름에서 시작된 줄기가 올해 ${currentYear}년 ${curG}로 넘어왔고, 내년 ${nextG2}에서 한 번 더 정리될 가능성이 있어요.`
          : `올해 ${currentYear}년 세운은 ${curG}로 흐릅니다.`
      lines.push(annualLine)
    }
  }

  return lines.join(' ')
}
