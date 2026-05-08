/**
 * Pillar table section.
 *
 * Reproduces the 4-pillar grid the /api/saju route ships in `byPillar` and
 * folds it into a single markdown-style table the counselor LLM can read
 * inline. Each pillar exposes:
 *   - 천간 + 지지
 *   - 지지장간 (display: 한자(십신) · 한자(십신) · ...)
 *   - 12운성
 *   - 12신살
 *   - 길성·신살 리스트
 *
 * Saved into prompt so the LLM can quote precise pillar-level details
 * ("辛/未 일주는 지장간이 丁(편관)·乙(편재)·己(편인) — 정통적 깊이의 자기 표현
 * 코어") rather than guessing.
 */

import {
  buildJijangganRaw,
  coerceJijanggan,
  enrichSibsin,
} from '@/app/api/saju/services/jijangganFormatter'
import {
  getTwelveStagesForPillars,
  getTwelveShinsalSingleByPillar,
  getShinsalHits,
} from '@/lib/Saju/shinsal'
import type { SajuPillarsLike } from '@/lib/Saju/shinsal'

interface PillarLikeData {
  heavenlyStem?: { name?: string; element?: string; yin_yang?: string }
  earthlyBranch?: { name?: string; element?: string; yin_yang?: string }
  jijanggan?: unknown
}

interface SajuShape {
  yearPillar?: PillarLikeData
  monthPillar?: PillarLikeData
  dayPillar?: PillarLikeData
  timePillar?: PillarLikeData
}

const PILLAR_LABEL_KO: Record<'year' | 'month' | 'day' | 'time', string> = {
  year: '연주(年柱) — 사회·조상',
  month: '월주(月柱) — 직업·부모',
  day: '일주(日柱) — 자아·배우자',
  time: '시주(時柱) — 자녀·노년',
}

const PILLAR_LABEL_EN: Record<'year' | 'month' | 'day' | 'time', string> = {
  year: 'Year — society / ancestors',
  month: 'Month — work / parents',
  day: 'Day — self / spouse',
  time: 'Hour — children / late life',
}

export function buildPillarTableSection(
  saju: unknown,
  lang: 'ko' | 'en',
): string {
  if (!saju || typeof saju !== 'object') return ''
  const s = saju as SajuShape
  const dayMasterStem = s.dayPillar?.heavenlyStem?.name
  if (!dayMasterStem) return ''

  // Recompute shinsal + twelveStages here (lightweight) so we don't depend on
  // chart-calculator wiring more state through.
  const sajuLike: SajuPillarsLike = {
    year: s.yearPillar as unknown as SajuPillarsLike['year'],
    month: s.monthPillar as unknown as SajuPillarsLike['month'],
    day: s.dayPillar as unknown as SajuPillarsLike['day'],
    time: s.timePillar as unknown as SajuPillarsLike['time'],
  }
  let twelveStages: Record<string, string> = {}
  let twelveShinsal: Record<string, unknown> = {}
  let rawShinsal: Array<{ kind: string; pillars?: string[]; target?: string; detail?: string }> = []
  try {
    twelveStages = getTwelveStagesForPillars(sajuLike, 'day') as unknown as Record<string, string>
  } catch {
    /* fallthrough */
  }
  try {
    twelveShinsal = getTwelveShinsalSingleByPillar(sajuLike, {
      includeTwelveAll: true,
      useMonthCompletion: false,
      ruleSet: 'your',
    }) as unknown as Record<string, unknown>
  } catch {
    /* fallthrough */
  }
  try {
    rawShinsal = getShinsalHits(sajuLike, {
      includeLucky: true,
      includeUnlucky: true,
      includeTwelveAll: true,
      useMonthCompletion: false,
      includeGeneralShinsal: true,
      includeLuckyDetails: true,
      ruleSet: 'your',
    }) as unknown as typeof rawShinsal
  } catch {
    /* fallthrough */
  }

  const isKo = lang === 'ko'
  const lines: string[] = []
  lines.push('')
  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push(isKo ? '[📋 사주 4기둥 테이블 — 지장간·십신·12운성·신살]' : '[📋 Four-Pillar Table]')
  lines.push('═══════════════════════════════════════════════════════════════')

  for (const key of ['year', 'month', 'day', 'time'] as const) {
    const pillar = (s as Record<string, PillarLikeData | undefined>)[`${key}Pillar`]
    if (!pillar?.heavenlyStem?.name || !pillar?.earthlyBranch?.name) continue

    const jgRaw = buildJijangganRaw(pillar.jijanggan as Parameters<typeof buildJijangganRaw>[0])
    const jgObj = enrichSibsin(
      coerceJijanggan(pillar.jijanggan as Parameters<typeof coerceJijanggan>[0]),
      dayMasterStem,
    )
    const display = (['chogi', 'junggi', 'jeonggi'] as const)
      .map((slot) => {
        const it = jgObj[slot]
        if (!it?.name) return ''
        return `${it.name}${it.sibsin ? `(${it.sibsin})` : ''}`
      })
      .filter(Boolean)
      .join(' · ')

    const stage = twelveStages[key]
    const shinsalRaw = (twelveShinsal as Record<string, unknown>)[key]
    const shinsals = Array.isArray(shinsalRaw)
      ? shinsalRaw.filter(Boolean).map(String).join('·')
      : typeof shinsalRaw === 'string'
        ? shinsalRaw
        : ''
    const luckyShinsal = rawShinsal
      .filter((h) => h.pillars?.includes(key) && /귀인|문창|학당|월덕|천덕|복성|금여/.test(h.kind))
      .map((h) => h.kind)
      .join('·')
    const allShinsal = rawShinsal
      .filter((h) => h.pillars?.includes(key))
      .map((h) => h.kind)
      .join('·')

    const labelMap = isKo ? PILLAR_LABEL_KO : PILLAR_LABEL_EN
    lines.push('')
    lines.push(`### ${labelMap[key]}`)
    lines.push(
      `  간지: ${pillar.heavenlyStem.name}${pillar.earthlyBranch.name} (${pillar.heavenlyStem.element}-${pillar.heavenlyStem.yin_yang} / ${pillar.earthlyBranch.element}-${pillar.earthlyBranch.yin_yang})`,
    )
    if (jgRaw.list?.length) {
      lines.push(`  지장간: ${display || '-'} [raw: ${jgRaw.raw}]`)
    }
    if (stage) lines.push(`  12운성: ${stage}`)
    if (shinsals) lines.push(`  12신살: ${shinsals}`)
    if (luckyShinsal) lines.push(`  길성: ${luckyShinsal}`)
    if (allShinsal && allShinsal !== luckyShinsal) lines.push(`  전체 신살: ${allShinsal}`)
  }
  lines.push('')

  return lines.join('\n')
}
