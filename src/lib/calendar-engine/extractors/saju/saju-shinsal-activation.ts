import { computeDayBranch, SHINSAL_POLARITY } from './saju-shinsal'
import { getShinsalInterpretation } from '@/lib/saju/interpretations'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../../types'
import type { ShinsalHit } from '@/lib/saju/types'
import type { ShinsalGrade } from './saju-shinsal'

/**
 * 신살 등급 분류 — saju-shinsal.ts 의 SHINSAL_GRADE 와 일관 doctrine 으로 유지.
 * 정통 4길성(classical-noble) → 록·마(rok-ma) → 도화·화개(dohwa-hwagae) → 속명(common).
 */
const SHINSAL_GRADE_LOCAL: Record<string, ShinsalGrade> = {
  // classical-noble: 정통 4길성
  천을귀인: 'classical-noble',
  천덕귀인: 'classical-noble',
  월덕귀인: 'classical-noble',
  태극귀인: 'classical-noble',

  // rok-ma: 록·마·문창류
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

  // dohwa-hwagae: 도화·화개·홍염
  도화: 'dohwa-hwagae',
  년살: 'dohwa-hwagae',
  홍염살: 'dohwa-hwagae',
  화개: 'dohwa-hwagae',
  화개살: 'dohwa-hwagae',
}

function gradeOf(name: string): ShinsalGrade {
  return SHINSAL_GRADE_LOCAL[name] ?? 'common'
}

/**
 * 본명 신살 일진 활성 추출기 (natalShinsal × daily branch).
 *
 * `natal.saju.natalShinsal` 에 본명 4기둥이 가진 신살(각 hit 의 `target` 은
 * 해당 지지)이 정리돼 있다. 매일 일진의 지지가 그 anchor 지지와 일치하면
 * "오늘 그 신살이 활성화되었다" 로 본다.
 *
 *  e.g.  본명에 일지 巳 = 천을귀인 → 일진 지지가 巳 인 날 천을귀인 활성.
 *
 * shinsal extractor 와 차이:
 *  - saju-shinsal.ts 는 본명 일주 stem/branch 기준으로 day pillar 와 매칭해
 *    "타게팅 신살"을 새로 계산한다 (rule re-eval).
 *  - 이 추출기는 본명 차트가 이미 가지고 있던 신살이 그 anchor 지지를 만난
 *    날 깨어난다는 관점 — `natal.saju.natalShinsal` 필드를 소비.
 *
 * 활성 윈도우: 해당 일진 1일.
 */

// 신살별 polarity 는 saju-shinsal.ts 의 canonical SHINSAL_POLARITY 를 재사용한다.
// (직전엔 이 파일이 자체 테이블을 들고 있어 천을귀인 2 vs 3, 도화 0 vs 1,
//  역마 -1 vs 0, 공망 -2 vs -1 처럼 같은 신살이 추출기마다 다른 점수로 나왔다.)

const sajuShinsalActivationExtractor: SignalExtractor = {
  source: 'saju',
  kind: 'shinsal',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const signals: ActiveSignal[] = []
    const { natal, range } = ctx
    const natalShinsal: ShinsalHit[] = natal.saju?.natalShinsal ?? []
    if (natalShinsal.length === 0) return signals

    // 같은 지지에 여러 신살이 anchor 돼있을 수 있어 anchor branch → kinds 맵.
    // 중복 hit (동일 신살이 여러 기둥에 anchor) 는 set 으로 dedup.
    const anchorMap = new Map<string, Map<string, Set<string>>>()
    // branch → kind → Set<pillarKind>
    for (const hit of natalShinsal) {
      const branch = hit.target
      if (!branch) continue
      const inner = anchorMap.get(branch) ?? new Map<string, Set<string>>()
      const pillars = inner.get(hit.kind) ?? new Set<string>()
      for (const p of hit.pillars) pillars.add(p)
      inner.set(hit.kind, pillars)
      anchorMap.set(branch, inner)
    }

    if (anchorMap.size === 0) return signals

    const start = new Date(range.start)
    const end = new Date(range.end)
    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const date = new Date(t)
      const targetBranch = computeDayBranch(date)
      if (!targetBranch) continue
      const hitsForBranch = anchorMap.get(targetBranch)
      if (!hitsForBranch) continue

      const dayIso = date.toISOString().slice(0, 10)
      const startIso = `${dayIso}T00:00:00.000Z`
      const peakIso = `${dayIso}T12:00:00.000Z`
      const endIso = `${dayIso}T23:59:59.999Z`

      for (const [kind, pillarSet] of hitsForBranch) {
        const polarity = (SHINSAL_POLARITY[kind] ?? 0) as Polarity
        const pillars = Array.from(pillarSet).sort()
        const grade = gradeOf(kind)
        signals.push({
          id: `saju.shinsal-activation.${kind}.${dayIso}`,
          source: 'saju',
          kind: 'shinsal',
          name: `${kind} 활성`,
          korean: `오늘 ${kind} 활성`,
          english: `${getShinsalInterpretation(kind)?.name_en ?? getShinsalInterpretation(kind.replace(/살$/, ''))?.name_en ?? kind} active today`,
          polarity,
          layer: 'daily',
          active: { start: startIso, peak: peakIso, end: endIso },
          weight: weightFor(polarity, grade),
          evidence: {
            module: 'saju-shinsal-activation',
            shinsalName: kind,
            pillars,
            detail: {
              source: 'natal-anchor',
              anchorBranch: targetBranch,
              natalPillars: pillars,
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
 * 본명 신살 활성 weight.
 *
 * 정통 doctrine: 본명 차트에 새겨진 신살이 그 anchor 지지를 만나 깨어나는
 * 것은 룰 재계산(saju-shinsal.ts)보다 한 단계 무겁다 — 운명에 박힌 자국
 * 이라 그렇다. 그렇지만 십신·격국·용신(0.55~0.85) 보다 위로 올라서면
 * 안 됨 — 정통은 신살을 보조 신호로 본다.
 *
 * 등급별 base + 폴라리티 보너스.
 */
const GRADE_ACTIVATION_BASE: Record<ShinsalGrade, number> = {
  'classical-noble': 0.65, // 정통 4길성 본명 활성 — 최상 보조
  'rok-ma': 0.55,
  'dohwa-hwagae': 0.5,
  common: 0.4,
}

function weightFor(polarity: Polarity, grade: ShinsalGrade): number {
  const base = GRADE_ACTIVATION_BASE[grade]
  const intensity = Math.abs(polarity) / 3
  const polarityBonus = grade === 'classical-noble' ? intensity * 0.1 : intensity * 0.05
  return Math.min(base + polarityBonus, 0.75)
}

export default sajuShinsalActivationExtractor
