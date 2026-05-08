/**
 * UnifiedSummaryCard — 6 서비스 공통으로 사용하는 운명력 요약 카드.
 *
 * 한 줄 사용:
 *   <UnifiedSummaryCard birthDate="..." birthTime="..." gender="male" />
 *
 * 자동으로 useUnifiedSlice 호출 + 로딩/에러 처리 + 통합 데이터 표시.
 *
 * 표시:
 *   1. 현재 인생 챕터 (32~41세 甲戌 정재격 안정·정착 챕터)
 *   2. 6 테마 점수 한눈에 (직업·재물·사랑·건강·성장·가족)
 *   3. 5축 동·서 비교 (정체성/감정/직업/관계/성장)
 *   4. 현재 핵심 advice (2-3줄)
 */
'use client'

import { useUnifiedSlice } from '@/hooks/useUnifiedSlice'
import type { UnifiedBirthInput } from '@/components/counselor/free-report/analyzers/unifiedAdapter'
import type { ThemeKind } from '@/lib/matrix/cross'

interface Props extends UnifiedBirthInput {
  /** 카드 표시 모드: full (모든 정보) | compact (점수만) | mini (한 줄) */
  variant?: 'full' | 'compact' | 'mini'
  className?: string
  isKo?: boolean
}

const THEME_LABEL_KO: Record<ThemeKind, string> = {
  career: '직업',
  wealth: '재물',
  love: '사랑',
  health: '건강',
  growth: '학업',
  family: '가족',
}

const THEME_EMOJI: Record<ThemeKind, string> = {
  career: '💼', wealth: '💰', love: '💕',
  health: '🏃', growth: '📚', family: '👨‍👩‍👧',
}

export default function UnifiedSummaryCard({
  variant = 'compact',
  className = '',
  isKo = true,
  ...birthInput
}: Props) {
  const { slice, isLoading, error } = useUnifiedSlice(birthInput)

  if (isLoading) {
    return (
      <div className={`rounded-2xl bg-slate-900/40 border border-slate-700/50 p-4 animate-pulse ${className}`}>
        <p className="text-xs text-slate-400">{isKo ? '운명력 분석 중...' : 'Analyzing...'}</p>
      </div>
    )
  }
  if (error || !slice) return null

  const themes: ThemeKind[] = ['career', 'wealth', 'love', 'health', 'growth', 'family']

  // ── mini: 한 줄 헤더 ──
  if (variant === 'mini') {
    return (
      <div className={`text-xs text-slate-300 ${className}`}>
        {slice.header?.currentChapter ? `📅 ${slice.header.currentChapter}` : ''}
        {slice.header?.currentDaeun ? ` · ${slice.header.currentDaeun}` : ''}
      </div>
    )
  }

  // ── compact: 점수 + 챕터 ──
  if (variant === 'compact') {
    return (
      <div className={`rounded-2xl bg-gradient-to-br from-violet-900/20 to-slate-900/80 border border-violet-500/30 p-4 space-y-3 ${className}`}>
        {slice.header?.currentChapter && (
          <div className="text-xs text-violet-300 font-semibold">
            📅 {slice.header.currentChapter} {slice.header.currentDaeun && `· ${slice.header.currentDaeun}`}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          {themes.map((t) => {
            const score = slice.unifiedScores?.[t]?.blendedScore
            const grade = slice.unifiedScores?.[t]?.grade
            return (
              <div key={t} className="text-center p-2 rounded-lg bg-slate-800/40 border border-slate-700/40">
                <div className="text-base">{THEME_EMOJI[t]}</div>
                <div className="text-[10px] text-slate-400">{THEME_LABEL_KO[t]}</div>
                <div className="text-sm font-bold text-violet-300">{score?.toFixed(1) ?? '-'}</div>
                <div className="text-[9px] text-slate-500">{grade ?? '-'}</div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── full: 챕터 + 점수 + 5축 + advice ──
  const careerCell = slice.themeMatrix?.career?.daeun
  const lifeTheme = slice.life?.summary.overallTheme
  return (
    <div className={`rounded-2xl bg-gradient-to-br from-violet-900/30 to-slate-900/80 border border-violet-500/40 p-5 space-y-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">🌌</span>
        <h3 className="text-base font-bold text-violet-300">
          {isKo ? '운명력 종합' : 'Unified Engine Summary'}
        </h3>
      </div>

      {slice.header?.currentChapter && (
        <div className="text-xs text-violet-200 font-semibold">
          📅 {slice.header.currentChapter}
          {slice.header.currentDaeun && ` · ${slice.header.currentDaeun}`}
          {slice.header.daeunPhase && ` (${slice.header.daeunPhase})`}
        </div>
      )}

      {lifeTheme && (
        <div className="text-[11px] text-slate-300 leading-relaxed border-l-2 border-violet-500/50 pl-3">
          {lifeTheme}
        </div>
      )}

      <div className="grid grid-cols-6 gap-1">
        {themes.map((t) => {
          const score = slice.unifiedScores?.[t]?.blendedScore
          const grade = slice.unifiedScores?.[t]?.grade
          return (
            <div key={t} className="text-center p-1.5 rounded-md bg-slate-800/60 border border-slate-700/40">
              <div className="text-sm">{THEME_EMOJI[t]}</div>
              <div className="text-[9px] text-slate-400">{THEME_LABEL_KO[t]}</div>
              <div className="text-xs font-bold text-violet-300">{score?.toFixed(1) ?? '-'}</div>
              <div className="text-[8px] text-slate-500">{grade ?? '-'}</div>
            </div>
          )
        })}
      </div>

      {slice.axes && (
        <div className="space-y-1 text-[10px] text-slate-400 pt-2 border-t border-slate-700/30">
          <div className="font-semibold text-cyan-300 mb-1">{isKo ? '동·서 5축' : '5 Axes'}</div>
          {(Object.entries(slice.axes) as Array<[string, { agreement: string }]>).map(([key, axis]) => (
            <span key={key} className="inline-block mr-2">
              <span className="text-cyan-400">{key}</span>{' '}
              <span className={
                axis.agreement === 'aligned' ? 'text-emerald-400' :
                axis.agreement === 'opposed' ? 'text-rose-400' :
                'text-amber-400'
              }>{axis.agreement === 'aligned' ? '✓' : axis.agreement === 'opposed' ? '✗' : '~'}</span>
            </span>
          ))}
        </div>
      )}

      {careerCell?.actions && careerCell.actions.length > 0 && (
        <div className="text-[10px] text-slate-300 pt-2 border-t border-slate-700/30">
          <div className="font-semibold text-violet-300 mb-1">{isKo ? '핵심 advice' : 'Key Advice'}</div>
          {careerCell.actions.slice(0, 2).map((a, i) => (
            <div key={i}>· {a}</div>
          ))}
        </div>
      )}
    </div>
  )
}
