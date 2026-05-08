/**
 * UnifiedInsightsPanel — runUnifiedEngine 결과를 받아 표시하는 공용 패널.
 *
 * 입력: UnifiedOutput (또는 그 일부)
 * 출력: 사주 13 advice + 점성 5 advance + 교차 5축/highlights + 매트릭스 6 도메인
 *
 * 사용처: calendar, compatibility (각 사람 패널), 기타 풍부 표시 필요한 곳
 */
'use client'

import type { UnifiedOutput } from '@/lib/engine/types'

interface Props {
  unified: UnifiedOutput | null | undefined
  /** 표시 모드: full=모든 섹션, summary=핵심만 */
  variant?: 'full' | 'summary'
  /** 외부 사용자 ID (라벨용 — '본인' / 상대 이름 등) */
  label?: string
  className?: string
  isKo?: boolean
}

export default function UnifiedInsightsPanel({
  unified,
  variant = 'summary',
  label,
  className = '',
  isKo = true,
}: Props) {
  if (!unified) return null

  const saju = unified.saju
  const astro = unified.astro as
    | (NonNullable<UnifiedOutput['astro']> & {
        advanced?: {
          asteroids?: Record<string, { sign: string; degree: number; house: number }>
          upcomingEclipses?: Array<{ date: string; type: string; sign: string }>
          fixedStars?: Array<{
            star: { name_ko?: string; name: string; nature: string; keywords: string[] }
            planet?: string
            orb: number
          }>
          harmonics?: { strongestHarmonics?: Array<{ harmonic: number; strength: number }> }
          midpointActivations?: Array<{
            midpoint: { planet1: string; planet2: string; name_ko?: string }
            activator: string
            aspectType: string
          }>
        }
      })
    | undefined
  const cross = unified.cross
  const fi = saju?.fullInsights
  const elementBalance = saju?.lifeNarrative?.summary?.elementBalance
  const domains = unified.unified?.scores.domains

  const themes: Array<{ key: string; emoji: string; ko: string }> = [
    { key: 'career', emoji: '💼', ko: '직업' },
    { key: 'wealth', emoji: '💰', ko: '재물' },
    { key: 'love', emoji: '💕', ko: '사랑' },
    { key: 'health', emoji: '🏃', ko: '건강' },
    { key: 'growth', emoji: '📚', ko: '학업' },
    { key: 'family', emoji: '👨‍👩‍👧', ko: '가족' },
  ]

  return (
    <div
      className={`rounded-2xl bg-gradient-to-br from-slate-900/60 via-violet-900/20 to-slate-900/80 border border-violet-500/30 p-5 space-y-4 text-slate-200 ${className}`}
    >
      {label && (
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🌌</span>
          <h3 className="text-base font-bold text-violet-300">{label}</h3>
        </div>
      )}

      {/* 명조 핵심 */}
      {saju?.pillars?.day && saju.advanced && (
        <div className="text-[11px] space-y-1">
          <div className="font-semibold text-violet-300">{isKo ? '명조 핵심' : 'Natal Core'}</div>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-900/30 border border-amber-500/30 text-amber-200">
              일주 {saju.pillars.day.ganzhi} ({saju.pillars.day.element})
            </span>
            <span className="px-2 py-0.5 rounded bg-cyan-900/30 border border-cyan-500/30 text-cyan-200">
              격국 {saju.advanced.geokguk?.type}
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-900/30 border border-emerald-500/30 text-emerald-200">
              용신 {saju.advanced.yongsin?.primary}
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-900/30 border border-rose-500/30 text-rose-200">
              강약 {saju.advanced.strength?.level}
            </span>
          </div>
        </div>
      )}

      {/* 점성 빅3 */}
      {astro?.bigThree && (
        <div className="text-[11px] space-y-1">
          <div className="font-semibold text-indigo-300">{isKo ? '점성 빅3' : 'Astro Big Three'}</div>
          <div className="flex flex-wrap gap-2">
            <span className="px-2 py-0.5 rounded bg-indigo-900/30 border border-indigo-500/30 text-indigo-200">
              ☉ {astro.bigThree.sun.sign}
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-900/30 border border-blue-500/30 text-blue-200">
              ☽ {astro.bigThree.moon.sign}
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-900/30 border border-purple-500/30 text-purple-200">
              ASC {astro.bigThree.ascendant.sign}
            </span>
          </div>
        </div>
      )}

      {/* 6 테마 점수 */}
      {domains && (
        <div className="grid grid-cols-6 gap-1">
          {themes.map((t) => {
            const d = domains[t.key]
            return (
              <div
                key={t.key}
                className="text-center p-1.5 rounded-md bg-slate-800/60 border border-slate-700/40"
              >
                <div className="text-sm">{t.emoji}</div>
                <div className="text-[9px] text-slate-400">{t.ko}</div>
                <div className="text-xs font-bold text-violet-300">
                  {d?.blendedScore?.toFixed(1) ?? '-'}
                </div>
                <div className="text-[8px] text-slate-500">{d?.grade ?? '-'}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* 교차 5축 */}
      {cross?.axes && (
        <div className="text-[10px]">
          <div className="font-semibold text-cyan-300 mb-1">{isKo ? '동·서 5축' : '5 Axes'}</div>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(cross.axes) as Array<[string, { agreement: string }]>).map(([k, v]) => (
              <span
                key={k}
                className={`px-2 py-0.5 rounded-full ${
                  v.agreement === 'aligned'
                    ? 'bg-emerald-900/30 text-emerald-300'
                    : v.agreement === 'opposed'
                      ? 'bg-rose-900/30 text-rose-300'
                      : 'bg-amber-900/30 text-amber-300'
                }`}
              >
                {k} {v.agreement === 'aligned' ? '✓' : v.agreement === 'opposed' ? '✗' : '~'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 교차 hightlights */}
      {cross?.highlights && (
        <div className="text-[10px] space-y-0.5">
          <div className="font-semibold text-violet-300 mb-1">{isKo ? '교차 하이라이트' : 'Cross Highlights'}</div>
          {cross.highlights.bestThemeNow && (
            <div>
              ✨ 최고 지금: <span className="text-emerald-300">{cross.highlights.bestThemeNow.theme}</span> ({cross.highlights.bestThemeNow.horizon}, {cross.highlights.bestThemeNow.score})
            </div>
          )}
          {cross.highlights.worstThemeNow && (
            <div>
              ⚠ 최저 지금: <span className="text-rose-300">{cross.highlights.worstThemeNow.theme}</span> ({cross.highlights.worstThemeNow.horizon}, {cross.highlights.worstThemeNow.score})
            </div>
          )}
        </div>
      )}

      {/* 오행 결핍 */}
      {elementBalance?.balance === '결핍' && (
        <div className="text-[10px] text-amber-200 bg-amber-900/15 border-l-2 border-amber-500/40 pl-3 py-2 rounded">
          <div className="font-semibold text-amber-300 mb-0.5">⚠ {isKo ? '오행 결핍' : 'Element Deficiency'}</div>
          <div>{elementBalance.interpretation}</div>
        </div>
      )}

      {/* 종합 advice */}
      {fi?.narrative?.advice && (
        <div className="text-[10px]">
          <div className="font-semibold text-violet-300 mb-1">💡 {isKo ? '종합 advice' : 'Insight'}</div>
          <div className="leading-relaxed text-slate-200">{fi.narrative.advice}</div>
        </div>
      )}

      {variant === 'full' && (
        <>
          {/* 다년 트렌드 */}
          {fi?.comprehensivePrediction?.multiYearTrend && (
            <div className="text-[10px]">
              <div className="font-semibold text-emerald-300 mb-1">📈 {isKo ? '다년 트렌드' : 'Multi-year Trend'}</div>
              <div>{fi.comprehensivePrediction.multiYearTrend.summary || ''}</div>
              {(fi.comprehensivePrediction.multiYearTrend.peakYears?.length ?? 0) > 0 && (
                <div className="text-emerald-400">
                  🌟 정점: {fi.comprehensivePrediction.multiYearTrend.peakYears!.join(', ')}년
                </div>
              )}
            </div>
          )}

          {/* 라이프스테이지 */}
          {(fi?.extendedAnalysis?.lifeStages?.length ?? 0) > 0 && (
            <div className="text-[10px]">
              <div className="font-semibold text-cyan-300 mb-1">📅 {isKo ? '인생 단계' : 'Life Stages'}</div>
              {fi!.extendedAnalysis!.lifeStages!.slice(0, 4).map((s, i) => {
                const sa = s as { ageRange?: string; stage?: string; description?: string; theme?: string }
                return (
                  <div key={i} className="leading-snug">
                    · <span className="text-cyan-400">{sa.ageRange || sa.stage}</span> — {sa.theme || sa.description}
                  </div>
                )
              })}
            </div>
          )}

          {/* 다가올 일/월식 */}
          {(astro?.advanced?.upcomingEclipses?.length ?? 0) > 0 && (
            <div className="text-[10px]">
              <div className="font-semibold text-indigo-300 mb-1">🌒 {isKo ? '다가올 일/월식' : 'Upcoming Eclipses'}</div>
              {astro!.advanced!.upcomingEclipses!.slice(0, 3).map((e, i) => (
                <div key={i}>
                  · {e.date}: {e.type} {e.sign}
                </div>
              ))}
            </div>
          )}

          {/* 본명 고정성 */}
          {(astro?.advanced?.fixedStars?.length ?? 0) > 0 && (
            <div className="text-[10px]">
              <div className="font-semibold text-yellow-300 mb-1">★ {isKo ? '본명 고정성' : 'Fixed Stars'}</div>
              {astro!.advanced!.fixedStars!.slice(0, 2).map((f, i) => (
                <div key={i} className="leading-snug">
                  · {f.star.name_ko || f.star.name} ({f.star.nature}) ↔ {f.planet || '-'}
                </div>
              ))}
            </div>
          )}

          {/* 건강·직업 */}
          {fi?.healthCareer && (
            <div className="text-[10px]">
              <div className="font-semibold text-rose-300 mb-1">💪 {isKo ? '건강·직업' : 'Health & Career'}</div>
              <div>
                건강 {(fi.healthCareer.health as { overallScore?: number })?.overallScore}/100 · 체질{' '}
                {(fi.healthCareer.health as { constitution?: string })?.constitution}
              </div>
              <div>업무 스타일: {(fi.healthCareer.career as { workStyle?: { type?: string } })?.workStyle?.type || '-'}</div>
              {(fi.healthCareer.career as { primaryFields?: Array<{ category?: string }> })?.primaryFields?.length && (
                <div>
                  적성:{' '}
                  {(fi.healthCareer.career as { primaryFields?: Array<{ category?: string }> })
                    .primaryFields!.slice(0, 3)
                    .map((p) => p.category)
                    .join(', ')}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
