import { STEMS, BRANCHES } from '@/lib/saju/constants'
import { computeDayPillarIndices } from '@/lib/saju/dayPillar'
import { getShinsalHitsForDailyTarget } from '@/lib/saju/shinsal'
import { getShinsalInterpretation } from '@/lib/saju/interpretations'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../../types'

/**
 * 일진 신살 → 흐름(flow) 한 줄. interpretations.json 의 effect(없으면 meaning)를
 * 재사용. 이름이 '역마살'/'화개살' 처럼 '살' 접미사 변형이면 떼고/붙여 재탐색.
 */
function shinsalInfoFor(name: string) {
  return (
    getShinsalInterpretation(name) ??
    getShinsalInterpretation(name.replace(/살$/, '')) ??
    getShinsalInterpretation(`${name}살`)
  )
}

function shinsalFlowLine(name: string): string {
  const info = shinsalInfoFor(name)
  if (!info) return ''
  const body = info.effect || info.meaning
  return body ? `오늘 ${name} — ${body}` : ''
}

function shinsalFlowLineEn(name: string): string {
  const info = shinsalInfoFor(name)
  if (!info) return ''
  const label = info.name_en || name
  const body = info.effect_en || info.meaning_en
  return body ? `${label} active today — ${body}` : ''
}

/**
 * 신살 (神煞) 일진 활성 추출기.
 *
 * 매일 일진(日柱)을 계산하고, 본명 일주 기준으로 활성 신살을 뽑음.
 * shinsal.getShinsalHitsForDailyTarget()이 50+ 신살 룰을 이미 가지고 있어
 * 추출기는 호출과 ActiveSignal 변환만 담당.
 *
 * 활성 윈도우: 해당 일진 1일 (00:00 ~ 23:59), peak는 정오.
 *
 * ── 정통 사주의 신살 등급화 ──
 * 자평명리(子平命理)에서 신살은 격국·용신·십신의 보조 신호로, 단독으로
 * 일진의 핵심 신호가 되어선 안 된다. 그러나 등급은 분명히 존재한다:
 *
 *  1. classical-noble: 4길성(천을·천덕·월덕·태극귀인). 정통 doctrine 최상위.
 *  2. rok-ma:          록·마류(건록·역마·금여·문창귀인 등). 활동·기회 신호.
 *  3. dohwa-hwagae:    도화·화개·홍염류. 인연·예술 신호. 부드러운 강도.
 *  4. common:          속명 흉살(공망·고진과숙·양인·백호·괴강·재살 등).
 *
 * base weight 도 십신(0.55~0.85)·격국·용신 대비 종속적인 0.4 로 낮춤.
 * 등급 보너스는 0.0(common) → 0.20(classical-noble) 범위.
 */

// 신살 polarity 테이블. 키는 extractor가 실제 emit하는 hit.kind 이름.
// '괘살'/'길성'/'흉성'/'화해' 같은 막연한 분류명은 명리적 근거가 없어 제거.
// canonical 신살 polarity 테이블. saju-shinsal-activation 도 이 테이블을 재사용해
// 같은 신살이 두 추출기에서 다른 polarity 로 나오던 불일치를 없앤다(단일 출처).
export const SHINSAL_POLARITY: Record<string, Polarity> = {
  // ─── 12신살 (일지 기준 12개) ───
  장성: 2,
  장성살: 2,
  반안: 1,
  반안살: 1,
  역마: 0,
  역마살: 0,
  육해: -1,
  육해살: -1,
  화개: 1,
  화개살: 1,
  겁살: -3,
  재살: -2,
  천살: -2,
  월살: -1,
  망신: -2,
  망신살: -2,
  지살: 0,
  년살: 0,

  // ─── 길성 (귀인·문창류) ───
  천을귀인: 3,
  태극귀인: 2,
  천덕귀인: 2,
  월덕귀인: 2,
  천주귀인: 2,
  암록: 2,
  금여성: 2,
  천의성: 2,
  천문성: 2,
  문창: 2,
  문곡: 2,
  학당귀인: 2,
  건록: 2,
  제왕: 1,

  // ─── 흉신·살 ───
  도화: 1,
  홍염살: 1,
  현침: -1,
  고신: -1,
  과숙: -1,
  괴강: -1,
  양인: -2,
  백호: -2,
  공망: -1,
  귀문관: -1,
  원진: -2,
  천라지망: -2,
  삼재: -2,
}

/**
 * 신살 등급 분류.
 * 정통 doctrine 상의 길성·흉살 위계를 한 곳에 정의.
 */
export type ShinsalGrade =
  | 'classical-noble' // 정통 4길성 (천을·천덕·월덕·태극귀인) — 최상위
  | 'rok-ma' // 록·마류 (건록·역마·금여·문창·암록·학당) — 활동
  | 'dohwa-hwagae' // 도화·화개·홍염류 — 인연·예술
  | 'common' // 속명 흉살 / 12신살 잡살 — 부차

const SHINSAL_GRADE: Record<string, ShinsalGrade> = {
  // classical-noble: 정통 4길성
  천을귀인: 'classical-noble',
  천덕귀인: 'classical-noble',
  월덕귀인: 'classical-noble',
  태극귀인: 'classical-noble',

  // rok-ma: 록·마 활동류
  건록: 'rok-ma',
  역마: 'rok-ma',
  역마살: 'rok-ma',
  금여성: 'rok-ma',
  문창: 'rok-ma',
  문곡: 'rok-ma',
  학당귀인: 'rok-ma',
  암록: 'rok-ma',
  천주귀인: 'rok-ma',
  천의성: 'rok-ma',
  천문성: 'rok-ma',
  제왕: 'rok-ma',

  // dohwa-hwagae: 도화·화개·홍염류
  도화: 'dohwa-hwagae',
  년살: 'dohwa-hwagae', // = 도화살의 이명
  홍염살: 'dohwa-hwagae',
  화개: 'dohwa-hwagae',
  화개살: 'dohwa-hwagae',

  // 나머지 12신살 잡살 + 흉살은 default common 으로 처리.
}

const GRADE_WEIGHT: Record<ShinsalGrade, number> = {
  // 일진 신살은 격국·용신(0.65~0.85)·십신(0.55~0.85) 대비 부차.
  // 정통 4길성만 십신 daily 최저(0.55)에 비교될 정도로 격상.
  'classical-noble': 0.6,
  'rok-ma': 0.5,
  'dohwa-hwagae': 0.45,
  common: 0.35,
}

function gradeOf(shinsalName: string): ShinsalGrade {
  return SHINSAL_GRADE[shinsalName] ?? 'common'
}

const sajuShinsalExtractor: SignalExtractor = {
  source: 'saju',
  kind: 'shinsal',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const signals: ActiveSignal[] = []
    const { natal, range } = ctx
    const dayPillar = natal.saju.pillars.day
    const monthPillar = natal.saju.pillars.month
    const natalDayStem = dayPillar.heavenlyStem?.name ?? ''
    const natalDayBranch = dayPillar.earthlyBranch?.name ?? ''
    // 본명 월지 — 천의성·귀문관·천덕귀인·월덕귀인 계산에 필요.
    const natalMonthBranch = monthPillar?.earthlyBranch?.name ?? undefined

    if (!natalDayStem || !natalDayBranch) return signals

    const start = new Date(range.start)
    const end = new Date(range.end)
    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const date = new Date(t)
      const targetBranch = computeDayBranch(date)
      if (!targetBranch) continue
      // 천덕귀인·월덕귀인은 target 일간(stem)이 있어야 매칭됨.
      const targetStem = computeDayStem(date) ?? undefined

      const hits = getShinsalHitsForDailyTarget(
        natalDayStem,
        natalDayBranch,
        targetBranch,
        natalMonthBranch,
        targetStem
      )
      const dayIso = date.toISOString().slice(0, 10)
      const peakIso = `${dayIso}T12:00:00.000Z`
      const startIso = `${dayIso}T00:00:00.000Z`
      const endIso = `${dayIso}T23:59:59.999Z`

      for (const hit of hits) {
        const polarity = SHINSAL_POLARITY[hit.kind] ?? 0
        const grade = gradeOf(hit.kind)
        signals.push({
          id: `saju.shinsal.${hit.kind}.${dayIso}`,
          source: 'saju',
          kind: 'shinsal',
          name: hit.kind,
          ...(shinsalFlowLine(hit.kind) ? { korean: shinsalFlowLine(hit.kind) } : {}),
          ...(shinsalFlowLineEn(hit.kind) ? { english: shinsalFlowLineEn(hit.kind) } : {}),
          polarity,
          layer: 'daily',
          active: { start: startIso, peak: peakIso, end: endIso },
          weight: weightForDailyShinsal(polarity, grade),
          evidence: {
            module: 'saju-shinsal',
            shinsalName: hit.kind,
            detail: {
              basis: hit.basis,
              targetBranch,
              natalDayStem,
              natalDayBranch,
              grade,
            },
          },
        })
      }
    }

    return signals
  },
}

/**
 * 일진 신살 weight 계산.
 *
 * 정통 사주에서 신살은 격국·용신·십신의 보조 신호다. 따라서:
 *  - base 는 등급별로 0.35 ~ 0.60 사이.
 *  - 길흉 강도(polarity)는 등급 안에서 ±0.10 의 작은 보너스만 부여.
 *
 * 이전(2.x audit) 구현은 base 0.60 + intensity 0.30 으로 강한 신살이
 * 일진 신호의 최상위로 떠올라 십신·격국을 압도하던 문제가 있었다.
 */
function weightForDailyShinsal(polarity: Polarity, grade: ShinsalGrade): number {
  const base = GRADE_WEIGHT[grade]
  const intensity = Math.abs(polarity) / 3 // 0 ~ 1
  // classical-noble 만 강한 폴라리티에 +0.10 까지, 나머지는 +0.05 미만.
  const polarityBonus = grade === 'classical-noble' ? intensity * 0.1 : intensity * 0.05
  return Math.min(base + polarityBonus, 0.7)
}

/**
 * Date → 일지(地支) 한 글자 계산.
 * 일기둥 계산은 @/lib/saju/dayPillar 단일 소스를 쓴다 (saju 본 계산 ·
 * 일진 달력과 동일 JDN 공식).
 */
function computeDayBranch(date: Date): string | null {
  const { branchIndex } = computeDayPillarIndices(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate()
  )
  return BRANCHES[branchIndex]?.name ?? null
}

/** 일진의 천간 — 다른 추출기에서도 쓰일 수 있어 export. */
export function computeDayStem(date: Date): string | null {
  const { stemIndex } = computeDayPillarIndices(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate()
  )
  return STEMS[stemIndex]?.name ?? null
}

export { computeDayBranch }
export default sajuShinsalExtractor
