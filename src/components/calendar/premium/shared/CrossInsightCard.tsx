'use client'

/**
 * 사주↔점성 교차 인사이트 카드 — 한 기간(month / year) 동안 두 시스템이
 * 얼마나 합의했는지 + 왜 그런지 근거를 같이 보여준다.
 *
 *   1. 좌/우 두 원 (사주 amber / 점성 cyan) — 평균 raw 점수 = 원 크기
 *   2. 합의 분포 막대 (aligned / mixed / opposed 일 카운트 비율)
 *   3. 근거 예시 — 가장 강한 합치 일 1 개 + 가장 큰 엇갈림 일 1 개
 *      (각 일의 사주 신호 top1 + 점성 신호 top1)
 *
 * 데이터: scoreBreakdown.{sajuAxisRaw, astroAxisRaw, axisAgreement} +
 *        evidence.cross.{sajuDetails, astroDetails}. 없으면 카드 자체 스킵.
 */

import { motion } from 'framer-motion'
import { Compass } from 'lucide-react'
import type { ImportantDate } from '../../types'
import { getCalLabels, type CalLocale } from '../labels'

interface Props {
  dates: ImportantDate[]
  locale?: CalLocale
}

type AgreementKind = 'aligned' | 'mixed' | 'opposed'

interface SampleDay {
  date: string
  /** 엔진이 만든 자연어 한 줄 ("사주는 X, 점성은 Y..."). 가장 의미 직접적. */
  bridge: string | null
  /** bridge 없을 때 폴백 — 사주 신호 텍스트 */
  saju: string | null
  /** bridge 없을 때 폴백 — 점성 신호 텍스트 */
  astro: string | null
}

/**
 * % 기반 자연어 한 줄 — yearlyDates 의 buildCrossCheckLineKo/En 와 같은 로직.
 * 서버측 함수 import 못 하므로 client 에 동일 룰 복사.
 */
function buildAgreementLine(percent: number, locale?: CalLocale): string {
  const p = Math.round(percent)
  if (locale === 'en') {
    if (p >= 75)
      return `Saju and astrology align at ${p}% — both axes back the same direction, so confidence is high.`
    if (p >= 55)
      return `Cross-check ${p}% — broad direction holds but details diverge; keep the core moves and defer the rest.`
    return `Cross-check ${p}% — signals diverge. Don't move on a single axis; verify on the other before committing.`
  }
  if (p >= 75)
    return `사주와 점성이 ${p}%로 같은 방향을 가리킵니다. 둘이 동시에 받쳐줘 결정의 신뢰도가 높습니다.`
  if (p >= 55)
    return `사주·점성 일치도 ${p}% — 큰 줄기는 같지만 세부가 갈리니, 핵심만 잡고 나머지는 미루는 편이 안전합니다.`
  return `사주·점성 일치도 ${p}% — 신호가 발산됩니다. 한쪽만 보고 움직이지 말고 다른 축에서 다시 확인하세요.`
}

export default function CrossInsightCard({ dates, locale }: Props) {
  const t = getCalLabels(locale)

  let sajuSum = 0
  let sajuCount = 0
  let astroSum = 0
  let astroCount = 0
  let alignedDays = 0
  let mixedDays = 0
  let opposedDays = 0

  let bestAligned: { date: string; score: number } | null = null
  let biggestOpposed: { date: string; gap: number } | null = null

  for (const d of dates) {
    const sb = d.scoreBreakdown
    if (!sb) continue
    const saju = typeof sb.sajuAxisRaw === 'number' ? sb.sajuAxisRaw : sb.sajuAxis
    const astro = typeof sb.astroAxisRaw === 'number' ? sb.astroAxisRaw : sb.astroAxis
    sajuSum += saju
    sajuCount += 1
    astroSum += astro
    astroCount += 1

    const ag: AgreementKind = sb.axisAgreement
    if (ag === 'aligned') {
      alignedDays += 1
      const s = d.displayScore ?? d.score
      if (!bestAligned || s > bestAligned.score) {
        bestAligned = { date: d.date, score: s }
      }
    } else if (ag === 'opposed') {
      opposedDays += 1
      const gap = Math.abs(saju - astro)
      if (!biggestOpposed || gap > biggestOpposed.gap) {
        biggestOpposed = { date: d.date, gap }
      }
    } else if (ag === 'mixed') {
      mixedDays += 1
    }
  }

  if (sajuCount === 0) return null

  const sajuAvg = Math.round(sajuSum / sajuCount)
  const astroAvg = Math.round(astroSum / astroCount)
  const total = alignedDays + mixedDays + opposedDays
  const alignedPct = total > 0 ? (alignedDays / total) * 100 : 0
  const mixedPct = total > 0 ? (mixedDays / total) * 100 : 0
  const opposedPct = total > 0 ? (opposedDays / total) * 100 : 0

  const sajuRadius = 20 + (sajuAvg / 100) * 25
  const astroRadius = 20 + (astroAvg / 100) * 25
  const closeness = total > 0 ? alignedDays / total : 0.5
  const gap = 60 - closeness * 50
  const cx1 = 80 - gap / 2
  const cx2 = 80 + gap / 2

  // 근거 일자 추출 — bridges (자연어 한 줄, 엔진이 톤·합치 기반 생성) 우선,
  // 없으면 신호 텍스트 폴백.
  const extractSample = (target: { date: string } | null): SampleDay | null => {
    if (!target) return null
    const d = dates.find((x) => x.date === target.date)
    if (!d) return null
    return {
      date: d.date,
      bridge: d.evidence?.cross?.bridges?.[0] ?? null,
      saju: d.evidence?.cross?.sajuDetails?.[0] ?? null,
      astro: d.evidence?.cross?.astroDetails?.[0] ?? null,
    }
  }
  const alignedSample = extractSample(bestAligned)
  const opposedSample = extractSample(biggestOpposed)

  // 평균 합치율 % — 합치 100% / 혼합 50% / 엇갈림 0% 가중 평균.
  // 이걸 buildAgreementLine 에 넣어 "왜 이 카드가 이렇게 보이는지" 자연어 한 줄.
  const avgPct = total > 0 ? alignedPct + mixedPct / 2 : null
  const agreementLine = avgPct !== null ? buildAgreementLine(avgPct, locale) : null

  return (
    <div className="relative bg-gradient-to-br from-zinc-900/55 via-zinc-900/40 to-emerald-950/15 backdrop-blur-sm border border-emerald-500/15 rounded-2xl p-6 overflow-hidden">
      <div className="pointer-events-none absolute -top-12 -right-10 w-32 h-32 bg-emerald-500/8 blur-3xl rounded-full" />
      <h3 className="relative text-base font-semibold text-emerald-200 flex items-center gap-2 mb-2 group">
        <Compass className="w-4 h-4 text-emerald-400 group-hover:text-emerald-300 transition" />
        {t.crossInsightTitle}
      </h3>
      {/* % 기반 자연어 한 줄 — 카드 의미 직접 설명 */}
      {agreementLine && (
        <p className="relative text-[12px] text-zinc-200 leading-relaxed mb-4">{agreementLine}</p>
      )}

      <div className="relative flex items-center gap-5 mb-4">
        <svg viewBox="0 0 160 110" className="w-40 h-28 shrink-0">
          <defs>
            <radialGradient id="sajuGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.15" />
            </radialGradient>
            <radialGradient id="astroGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.15" />
            </radialGradient>
          </defs>
          <motion.circle
            cx={cx1}
            cy="55"
            r={sajuRadius}
            fill="url(#sajuGrad)"
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeOpacity="0.6"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          <motion.circle
            cx={cx2}
            cy="55"
            r={astroRadius}
            fill="url(#astroGrad)"
            stroke="#06b6d4"
            strokeWidth="1.5"
            strokeOpacity="0.6"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
          />
          <text x={cx1} y="58" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fde68a">
            {sajuAvg}
          </text>
          <text x={cx2} y="58" textAnchor="middle" fontSize="11" fontWeight="700" fill="#a5f3fc">
            {astroAvg}
          </text>
          <text x={cx1} y="105" textAnchor="middle" fontSize="9" fill="#a16207" letterSpacing="1">
            {t.dayWhySajuLabel}
          </text>
          <text x={cx2} y="105" textAnchor="middle" fontSize="9" fill="#0891b2" letterSpacing="1">
            {t.dayWhyAstroLabel}
          </text>
        </svg>

        <div className="flex-1 min-w-0 space-y-2">
          {total > 0 && (
            <>
              <div className="flex items-baseline justify-between text-[11px]">
                <span className="text-zinc-400 font-medium">{t.crossInsightAgreementLabel}</span>
                <span className="text-emerald-300 font-bold tabular-nums">
                  {Math.round(alignedPct)}%
                </span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-zinc-800/60">
                {alignedDays > 0 && (
                  <motion.div
                    className="bg-emerald-400/80"
                    initial={{ width: 0 }}
                    animate={{ width: `${alignedPct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                )}
                {mixedDays > 0 && (
                  <motion.div
                    className="bg-zinc-500/70"
                    initial={{ width: 0 }}
                    animate={{ width: `${mixedPct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                  />
                )}
                {opposedDays > 0 && (
                  <motion.div
                    className="bg-rose-400/80"
                    initial={{ width: 0 }}
                    animate={{ width: `${opposedPct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                  />
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <CountChip
                  color="emerald"
                  label={t.crossInsightAligned}
                  hint={t.crossInsightAlignedHint}
                  count={alignedDays}
                />
                <CountChip
                  color="zinc"
                  label={t.crossInsightMixed}
                  hint={t.crossInsightMixedHint}
                  count={mixedDays}
                />
                <CountChip
                  color="rose"
                  label={t.crossInsightOpposed}
                  hint={t.crossInsightOpposedHint}
                  count={opposedDays}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {(alignedSample || opposedSample) && (
        <div className="relative pt-3 border-t border-white/5 space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
            {t.crossInsightEvidenceLabel}
          </p>
          {alignedSample && (
            <EvidenceBlock
              tone="aligned"
              dateLabel={formatDate(alignedSample.date, locale)}
              kindLabel={t.crossInsightAligned}
              bridge={alignedSample.bridge}
              saju={alignedSample.saju}
              astro={alignedSample.astro}
              sajuLabel={t.dayWhySajuLabel}
              astroLabel={t.dayWhyAstroLabel}
            />
          )}
          {opposedSample && (
            <EvidenceBlock
              tone="opposed"
              dateLabel={formatDate(opposedSample.date, locale)}
              kindLabel={t.crossInsightOpposed}
              bridge={opposedSample.bridge}
              saju={opposedSample.saju}
              astro={opposedSample.astro}
              sajuLabel={t.dayWhySajuLabel}
              astroLabel={t.dayWhyAstroLabel}
            />
          )}
        </div>
      )}
    </div>
  )
}

function CountChip({
  color,
  label,
  hint,
  count,
}: {
  color: 'emerald' | 'zinc' | 'rose'
  label: string
  hint: string
  count: number
}) {
  const dotClass =
    color === 'emerald' ? 'bg-emerald-400' : color === 'rose' ? 'bg-rose-400' : 'bg-zinc-500'
  const countClass =
    color === 'emerald' ? 'text-emerald-300' : color === 'rose' ? 'text-rose-300' : 'text-zinc-300'
  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1">
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
        <span className="text-zinc-400">{label}</span>
        <span className={`font-bold tabular-nums ml-auto ${countClass}`}>{count}</span>
      </div>
      <p className="text-[9px] text-zinc-600 leading-snug">{hint}</p>
    </div>
  )
}

/**
 * 근거 일자 블록 — bridges 자연어 (엔진이 톤 + 합치/엇갈림 기반 한 줄 생성) 우선.
 * bridges 없을 때만 신호 텍스트 (사주 X · 점성 Y) 폴백.
 */
function EvidenceBlock({
  tone,
  dateLabel,
  kindLabel,
  bridge,
  saju,
  astro,
  sajuLabel,
  astroLabel,
}: {
  tone: 'aligned' | 'opposed'
  dateLabel: string
  kindLabel: string
  bridge: string | null
  saju: string | null
  astro: string | null
  sajuLabel: string
  astroLabel: string
}) {
  const kindColor = tone === 'aligned' ? 'text-emerald-300' : 'text-rose-300'
  const borderColor = tone === 'aligned' ? 'border-emerald-500/20' : 'border-rose-500/20'
  return (
    <div className={`rounded-lg border ${borderColor} bg-zinc-950/30 p-2.5 space-y-1.5`}>
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-zinc-200 font-bold tabular-nums">{dateLabel}</span>
        <span className={`font-bold uppercase tracking-wider text-[9px] ${kindColor}`}>
          {kindLabel}
        </span>
      </div>
      {bridge ? (
        <p className="text-[11px] text-zinc-300 leading-relaxed">{bridge}</p>
      ) : (
        <p className="text-[11px] text-zinc-400 leading-snug">
          {saju && (
            <>
              <span className="text-amber-300/80 font-semibold">{sajuLabel}</span>{' '}
              <span className="text-zinc-300">{saju}</span>
            </>
          )}
          {saju && astro && <span className="text-zinc-600"> · </span>}
          {astro && (
            <>
              <span className="text-cyan-300/80 font-semibold">{astroLabel}</span>{' '}
              <span className="text-zinc-300">{astro}</span>
            </>
          )}
        </p>
      )}
    </div>
  )
}

function formatDate(iso: string, locale?: CalLocale): string {
  // "2026-05-21" → KO "5/21" / EN "May 21"
  const m = iso.match(/^\d{4}-(\d{2})-(\d{2})$/)
  if (!m) return iso
  const month = Number(m[1])
  const day = Number(m[2])
  if (locale === 'en') {
    const monthsEn = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]
    return `${monthsEn[month - 1]} ${day}`
  }
  return `${month}/${day}`
}
