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

// 일주의 12운성을 sajuSnapshot.pillars.day에서 직접 추출 (분포 top이 아니라 본인 일간 stage)
import { getTwelveStage } from '@/lib/Saju/shinsal'
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
 * 본명 사주 narration 한국어 라인 묶음 — deepAnalysis에 prepend하기 좋도록 한 단락 합성.
 * matrixInput에 격국·12운성·십신·신살이 이미 채워져 있어서 그대로 재해석.
 */
export function buildSajuNarrationKo(input: MatrixCalculationInput): string {
  const lines: string[] = []

  // 1) 격국 — 본명의 큰 성격 한 줄
  if (input.geokguk) {
    const desc = getGeokgukDescription(input.geokguk as GeokgukType)
    if (desc) {
      lines.push(`본명이 ${input.geokguk}이라, ${suffixGeokgukDescription(desc)}`)
    }
  }

  // 2) 12운성 — 일주의 실제 stage 우선, 없으면 분포 top 폴백 (formal 톤)
  const topStage = readDayMasterStage(input) || topEntry(input.twelveStages)
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
      const lastWord = top[top.length - 1]
      lines.push(
        `본명에 ${top.join('·')}${iga(lastWord)} 활성화돼 ${blurbs.join(', ')} 작용해요.`
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
  if (ni < 0 || ci < 0) return `${cycleLabel}은 ${cycle} 기운이 도는 자리라 ${flavor}`
  const diff = (ci - ni + 5) % 5
  // 0=동기 1=설기 2=재 3=관 4=인
  const relationLines = [
    `${cycleLabel}은 ${cycle} — 본명과 같은 기운이 한 자리에 모이는 구간이라 ${flavor}`,
    `${cycleLabel}은 ${cycle} — 본인 기운을 밖으로 풀어내는 국면이라 ${flavor}`,
    `${cycleLabel}은 ${cycle} — 본인이 환경을 다스리고 통제하는 구도라 ${flavor}`,
    `${cycleLabel}은 ${cycle} — 본인을 누르고 시험하는 형국이라 ${flavor}`,
    `${cycleLabel}은 ${cycle} — 본인을 받쳐주고 길러주는 인성 구도라 ${flavor}`,
  ]
  return relationLines[diff]
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
    if (desc) p1.push(`본명이 ${input.geokguk}으로 짜여 있어, ${suffixGeokgukDescription(desc)}`)
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
  const wolunRel = describeCycleRelation(natal, input.currentWolunElement, '이번 달 월운', '한 달 분위기를 살짝 끌어주는')
  const iljinRel = describeCycleRelation(natal, input.currentIljinElement, '오늘 일운', '오늘 하루 톤을 잡아주는')

  if (daeunRel) p2.push(`${daeunRel} 시기예요.`)
  if (saeunRel) p2.push(`${saeunRel} 한 해예요.`)
  // (B) Specific timing anchor — 일간 vs 세운 관계로 월별 peak 한 줄
  const annualPeak = describeAnnualPeak(input.currentSaeunElement, natal)
  if (annualPeak) p2.push(annualPeak)
  // 대운 ↔ 세운 사이클 충돌 narration
  const daeunSaeunClash = describeCycleClash(input.currentDaeunElement, input.currentSaeunElement, '대운', '세운')
  if (daeunSaeunClash) p2.push(`두 사이클을 함께 보면 ${daeunSaeunClash} 그림이라, 큰 방향이 정해진 가운데 한 해 단위로 환경이 어떻게 받쳐주는지가 중요해져요.`)
  if (wolunRel) p2.push(`${wolunRel} 색이 깔려요.`)
  if (iljinRel) p2.push(`${iljinRel} 분위기로 마무리돼요.`)
  if (p2.length > 0) paragraphs.push(p2.join(' '))

  // ───────── ¶3: 사주↔점성 정합 + 점성 본명 디테일 + scenario ─────────
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
      // (D) 사주↔점성 cross integration — 두 시스템이 한 사람 안에서 어떻게 만나는지
      const crossLine = buildCrossIntegrationKo(natalKo, dominantWestern)
      if (crossLine) p3.push(crossLine)
    }
  }

  // 점성 본명 디테일 — 태양·달·금성·화성 sign + ASC 추정
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
  if (sunSign && SIGN_KO[sunSign]) {
    p3.push(`태양 ${SIGN_KO[sunSign]}로 자아의 색은 ${SIGN_TRAIT[sunSign]} 쪽이에요.`)
  }
  const moonSign = signs.Moon as string | undefined
  if (moonSign && SIGN_KO[moonSign]) {
    p3.push(`달이 ${SIGN_KO[moonSign]}에 있어 정서·내면은 ${SIGN_TRAIT[moonSign]} 쪽으로 작동해요.`)
  }
  const venusSign = signs.Venus as string | undefined
  if (venusSign && SIGN_KO[venusSign]) {
    p3.push(`금성 ${SIGN_KO[venusSign]} — 관계·가치관에서 ${SIGN_TRAIT[venusSign]} 색이 두드러져요.`)
  }
  const marsSign = signs.Mars as string | undefined
  if (marsSign && SIGN_KO[marsSign]) {
    p3.push(`화성 ${SIGN_KO[marsSign]} — 추진·욕구는 ${SIGN_TRAIT[marsSign]} 방식으로 풀려요.`)
  }
  // 의미 있는 행성 하우스 highlight
  if (houses.Jupiter && [9, 10, 11].includes(houses.Jupiter)) {
    p3.push(`목성이 ${houses.Jupiter}하우스에 있어 확장·기회가 ${houses.Jupiter === 10 ? '커리어·사회 무대' : houses.Jupiter === 9 ? '학문·해외·신념' : '커뮤니티·미래 비전'} 쪽으로 열려요.`)
  }
  if (houses.Saturn && [1, 4, 10].includes(houses.Saturn)) {
    p3.push(`토성이 ${houses.Saturn}하우스라 ${houses.Saturn === 1 ? '자기 정체성 형성' : houses.Saturn === 4 ? '가정·뿌리 안정' : '커리어·책임 무게'}에 구조와 시간이 필요한 차트예요.`)
  }
  if (aspectsCount >= 8) {
    p3.push(`주요 어스펙트가 ${aspectsCount}개 활성화돼 있어 본명 차트의 변동성과 자극이 평균보다 많은 편이에요.`)
  }

  // 시나리오 한 줄 — 격국 있으면 격국+대운, 없으면 일간+대운 폴백
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
      if (scenario) p3.push(scenario)
    }
  }
  if (p3.length > 0) paragraphs.push(p3.join(' '))

  return paragraphs.join('\n\n')
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

// 일간 element vs 세운 element diff → 월별 peak 한 줄
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
  return `사주는 ${ko1}을 가리키는데 점성은 ${ko2}을 부추기는 결이라, 한 사람 안에 brake와 accelerator가 같이 들어 있어요. 잘 맞물리면 '계산된 모험'이 되고, 어긋나면 결정 직전 늘 한 박자 망설이는 톤이 돼요.`
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
  if (!blurb) return ''
  const detail = top.detail ? `(${top.detail})` : ''
  // kind 이름을 기준으로 조사 결정 (괄호 안 detail은 무시)
  return `본명 안에 이미 ${top.kind}${detail}${iga(top.kind)} 형성돼 있어, ${blurb}.`
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
    lines.push(`지금 ${range} ${currG} 대운으로 들어와 ${currEl}이 본명을 새로 물들이는 구간이에요.`)
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
