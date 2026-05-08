/**
 * Cross-rules section builder.
 *
 * Calls the 5106-line `runFortune` engine (saju + astro classical pattern
 * detection — stellium / mutual reception / dignity / sect / lots / 종왕격
 * / 종강격 / 격국 patterns / 12운성 등) and turns its FortuneReport into
 * a prompt section the counselor LLM can read directly.
 *
 * Cheap when called once per session — runFortune already runs in parallel
 * for saju/astro adapters.
 */

import { runFortune, type BirthProfile, type FortuneReport } from '@/lib/fortune/cross-rules'
import { logger } from '@/lib/logger'

interface BuildCrossSectionInput {
  birthDate: string
  birthTime: string
  gender: 'male' | 'female'
  latitude: number
  longitude: number
  timezone?: string
  lang: 'ko' | 'en'
}

const TONE_LABEL_KO: Record<string, string> = {
  positive: '🟢 긍정',
  negative: '🔴 부정',
  mixed: '🟡 양면',
  neutral: '⚪ 중립',
}

const TONE_LABEL_EN: Record<string, string> = {
  positive: 'positive',
  negative: 'negative',
  mixed: 'mixed',
  neutral: 'neutral',
}

const DOMAIN_LABEL_KO: Record<string, string> = {
  self: '자아·정체성',
  love: '사랑·관계',
  money: '재물·자원',
  career: '커리어·일',
  health: '건강·생명력',
  family: '가족·뿌리',
}

const DOMAIN_LABEL_EN: Record<string, string> = {
  self: 'Self / Identity',
  love: 'Love / Relationships',
  money: 'Wealth / Resources',
  career: 'Career / Work',
  health: 'Health / Vitality',
  family: 'Family / Roots',
}

export async function buildCrossRulesSection(input: BuildCrossSectionInput): Promise<string> {
  try {
    const birth: BirthProfile = {
      birthDate: input.birthDate,
      birthTime: input.birthTime,
      gender: input.gender,
      latitude: input.latitude,
      longitude: input.longitude,
      timezone: input.timezone ?? 'Asia/Seoul',
    }
    const report = await runFortune({ birth, skipReturns: true })
    return formatReport(report, input.lang)
  } catch (error) {
    logger.warn('[crossRulesBuilder] runFortune failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return ''
  }
}

function formatReport(report: FortuneReport, lang: 'ko' | 'en'): string {
  const isKo = lang === 'ko'
  const out: string[] = []
  out.push('')
  out.push('═══════════════════════════════════════════════════════════════')
  out.push(
    isKo
      ? '[🔥 교차 룰 엔진 — 사주×점성 정통 패턴 + 클래식 격국]'
      : '[🔥 CROSS-RULES ENGINE — Saju × Astrology classical patterns]',
  )
  out.push('═══════════════════════════════════════════════════════════════')

  // Themes (meta-rule cross-domain combinations).
  if (report.themes.length > 0) {
    out.push('')
    out.push(isKo ? '--- 통합 테마 (Meta) ---' : '--- Cross-domain themes ---')
    for (const t of report.themes.slice(0, 5)) {
      out.push(`  ★ ${t.rule.meaning}`)
      if (t.rule.narrative) out.push(`    → ${t.rule.narrative}`)
    }
  }

  // Per-domain aggregates.
  out.push('')
  out.push(isKo ? '--- 도메인별 신호 (cross-confirmed) ---' : '--- Per-domain signals ---')
  const domainKeys = Object.keys(report.byDomain) as Array<keyof typeof report.byDomain>
  for (const d of domainKeys) {
    const agg = report.byDomain[d]
    const labelMap = isKo ? DOMAIN_LABEL_KO : DOMAIN_LABEL_EN
    const toneMap = isKo ? TONE_LABEL_KO : TONE_LABEL_EN
    const totalSignals = agg.confirms.length + agg.conflicts.length + agg.silents.length
    if (totalSignals === 0) continue

    out.push('')
    out.push(`  ◆ ${labelMap[d] ?? d} — ${toneMap[agg.tone] ?? agg.tone}`)

    // Top confirms (cross-validated saju + astro).
    for (const c of agg.confirms.slice(0, 3)) {
      const intensity = c.intensity === 'strong' ? '★★★' : c.intensity === 'moderate' ? '★★' : '★'
      const polarity = c.polarity === 'confirm' ? '+' : c.polarity === 'conflict' ? '−' : '='
      out.push(`    ${intensity} [${polarity}] ${c.rule.meaning}`)
      if (c.rule.narrative?.confirm) out.push(`        ${c.rule.narrative.confirm}`)
    }

    // Conflicts (saju says X, astro says ¬X — preserves duality).
    if (agg.conflicts.length > 0) {
      const top = agg.conflicts[0]
      const intensity =
        top.intensity === 'strong' ? '★★★' : top.intensity === 'moderate' ? '★★' : '★'
      out.push(
        `    ⚡ ${intensity} 양면 — ${top.rule.meaning}`,
      )
      if (top.rule.narrative?.conflict) out.push(`        ${top.rule.narrative.conflict}`)
    }
  }

  // Context (life stage + daeun cycle position).
  if (report.context) {
    const { ageYears, lifeStage, daeun } = report.context
    out.push('')
    out.push(isKo ? '--- 컨텍스트 ---' : '--- Context ---')
    if (ageYears != null) {
      out.push(
        isKo ? `  나이: ${ageYears}세 (${lifeStage ?? '-'})` : `  Age: ${ageYears} (${lifeStage ?? '-'})`,
      )
    }
    if (daeun) {
      const transitionTag = daeun.transitionImminent ? (isKo ? ' · 전환 임박' : ' · transition imminent') : ''
      out.push(
        isKo
          ? `  대운: ${daeun.yearsIntoCurrent}년 진입 / ${daeun.yearsToNext}년 후 다음${transitionTag}`
          : `  Daeun: ${daeun.yearsIntoCurrent}y in / ${daeun.yearsToNext}y to next${transitionTag}`,
      )
      if (daeun.previousSibsin || daeun.nextSibsin) {
        out.push(
          isKo
            ? `  이전 십신: ${daeun.previousSibsin ?? '-'} → 다음: ${daeun.nextSibsin ?? '-'}`
            : `  Prev sibsin: ${daeun.previousSibsin ?? '-'} → Next: ${daeun.nextSibsin ?? '-'}`,
        )
      }
    }
  }
  out.push('')

  return out.join('\n')
}
