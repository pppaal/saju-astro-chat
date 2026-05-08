/**
 * UnifiedSection — 8 탭이 공유하는 운명력 슬라이스 표시 컴포넌트.
 *
 * 각 탭은 자기 테마에 맞는 슬라이스만 가져가서 표시.
 * data.unified 가 없으면 렌더 안 함 (안전).
 */
import type { ThemeKind } from '@/lib/matrix/cross'
import type { UnifiedSlice } from '../../analyzers/unifiedAdapter'

interface Props {
  unified: UnifiedSlice | null | undefined
  /** 어떤 테마 슬라이스를 표시할지 — 또는 'life'/'axes' 같은 메타 슬라이스 */
  variant: ThemeKind | 'life' | 'axes' | 'cycle'
  isKo: boolean
}

const THEME_LABEL_KO: Record<ThemeKind, string> = {
  career: '직업·승진',
  wealth: '재물·사업',
  love: '사랑·결혼',
  health: '건강·기운',
  growth: '학업·성장',
  family: '가족·인복',
}

export default function UnifiedSection({ unified, variant, isKo }: Props) {
  if (!unified) return null

  // ─── life: 인생 10 챕터 + 단계 테마 ───
  if (variant === 'life') {
    const life = unified.life
    if (!life) return null
    return (
      <div className="rounded-2xl bg-gradient-to-br from-violet-900/30 to-slate-900/80 border border-violet-500/30 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📅</span>
          <h3 className="text-lg font-bold text-violet-300">{isKo ? '인생 전체 흐름' : 'Life Chapters'}</h3>
        </div>

        <div className="space-y-2">
          <p className="text-violet-200 text-sm font-semibold">{isKo ? '단계별 테마' : 'Stage Themes'}</p>
          {life.summary.stageThemes.map((s) => (
            <div key={s.stage} className="text-xs text-slate-300 leading-relaxed">
              <span className="font-semibold text-violet-300">{s.stage} ({s.ages}):</span> {s.theme}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-emerald-300 font-semibold text-xs mb-2">⭐ {isKo ? '인생 정점' : 'Peak'}</p>
            {life.summary.peakChapters.map((p) => (
              <p key={p.age} className="text-xs text-slate-300">{p.ageRange} {p.ganji} ({p.score.toFixed(1)}/8)</p>
            ))}
          </div>
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <p className="text-rose-300 font-semibold text-xs mb-2">💀 {isKo ? '인생 저점' : 'Valley'}</p>
            {life.summary.valleyChapters.map((v) => (
              <p key={v.age} className="text-xs text-slate-300">{v.ageRange} {v.ganji} ({v.score.toFixed(1)}/8)</p>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── axes: 5축 (정체성·감정·직업·관계·성장) ───
  if (variant === 'axes') {
    const axes = unified.axes
    if (!axes) return null
    const list = Object.entries(axes) as Array<[string, { agreement: string; summary: string }]>
    return (
      <div className="rounded-2xl bg-gradient-to-br from-cyan-900/20 to-slate-900/80 border border-cyan-500/30 p-6 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔄</span>
          <h3 className="text-lg font-bold text-cyan-300">{isKo ? '동·서 5축' : 'East·West 5 Axes'}</h3>
        </div>
        {list.map(([key, axis]) => (
          <div key={key} className="text-xs text-slate-300">
            <span className="font-semibold text-cyan-300">[{key}]</span>{' '}
            <span className={
              axis.agreement === 'aligned' ? 'text-emerald-400' :
              axis.agreement === 'opposed' ? 'text-rose-400' :
              'text-amber-400'
            }>{axis.agreement}</span> — {axis.summary}
          </div>
        ))}
      </div>
    )
  }

  // ─── cycle: 9차원 cycle 분석 (대운 기준) ───
  if (variant === 'cycle') {
    const c = unified.cycleAnalysis?.daeun
    if (!c) return null
    return (
      <div className="rounded-2xl bg-gradient-to-br from-amber-900/20 to-slate-900/80 border border-amber-500/30 p-6 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔍</span>
          <h3 className="text-lg font-bold text-amber-300">{isKo ? '운기 깊이 분석' : 'Cycle Deep Analysis'}</h3>
        </div>
        <div className="text-xs text-slate-300 space-y-1">
          <p>· {isKo ? '12운성' : '12 Stages'}: {c.twelveStages.summary}</p>
          <p>· {isKo ? '4기둥 상호작용' : '4-Pillar Interactions'}: {c.pillarInteractions.summary}</p>
          <p>· {isKo ? '통근/투간' : 'Rootedness'}: {c.rootedness.summary}</p>
          <p>· {isKo ? '신살' : 'Shinsal'}: {c.shinsalActivation.summary}</p>
          <p>· {isKo ? '격국 변동' : 'Geokguk Shift'}: {c.geokgukShift.summary}</p>
          <p>· {isKo ? '천간합 化' : 'Hwa Transform'}: {c.hwaTransform.summary}</p>
          <p>· {isKo ? '지장간 잠재 합' : 'Hidden Stem Hap'}: {c.hiddenStemHap.summary}</p>
          {c.samgi.summary && <p>· {isKo ? '삼기' : 'Samgi'}: {c.samgi.summary}</p>}
        </div>
      </div>
    )
  }

  // ─── theme: 6 테마 × 5 시간축 매트릭스 ───
  const theme = variant as ThemeKind
  const themeRow = unified.themeMatrix?.[theme]
  const timing = unified.themeTimings?.[theme]
  const score = unified.unifiedScores?.[theme]
  if (!themeRow) return null

  const horizons: Array<{ key: keyof typeof themeRow; label: string }> = [
    { key: 'life', label: isKo ? '인생' : 'Life' },
    { key: 'daeun', label: isKo ? '대운' : 'Daeun' },
    { key: 'seun', label: isKo ? '세운' : 'Year' },
    { key: 'wolun', label: isKo ? '월운' : 'Month' },
    { key: 'iljin', label: isKo ? '일진' : 'Day' },
  ]

  return (
    <div className="rounded-2xl bg-gradient-to-br from-fuchsia-900/20 to-slate-900/80 border border-fuchsia-500/30 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          <h3 className="text-lg font-bold text-fuchsia-300">
            {isKo ? `${THEME_LABEL_KO[theme]} 매트릭스` : `${theme} Matrix`}
          </h3>
        </div>
        {score && (
          <div className="text-right">
            <p className="text-xs text-slate-400">{isKo ? '통합 점수' : 'Unified'}</p>
            <p className="text-xl font-bold text-fuchsia-400">{score.blendedScore}/10</p>
            <p className="text-[10px] text-slate-500">{score.alignment}</p>
          </div>
        )}
      </div>

      {/* 5 시간축 점수 */}
      <div className="grid grid-cols-5 gap-2">
        {horizons.map((h) => {
          const cell = themeRow[h.key]
          if (!cell) return null
          return (
            <div key={h.key} className="p-2 rounded-lg bg-fuchsia-500/10 border border-fuchsia-500/20 text-center">
              <p className="text-[10px] text-slate-400">{h.label}</p>
              <p className="text-sm font-bold text-fuchsia-300">{cell.score}</p>
              <p className="text-[9px] text-slate-500">{cell.grade}</p>
            </div>
          )
        })}
      </div>

      {/* 현재 (대운) 핵심 verdict + 액션 */}
      {themeRow.daeun && (
        <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/50">
          <p className="text-xs text-fuchsia-300 font-semibold mb-1">{themeRow.daeun.verdict}</p>
          {themeRow.daeun.actions.length > 0 && (
            <ul className="text-[11px] text-slate-300 space-y-0.5 mt-2">
              {themeRow.daeun.actions.slice(0, 4).map((a, i) => (
                <li key={i}>· {a}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* 시기 매칭 */}
      {timing && (
        <div className="text-xs text-slate-300 pt-2 border-t border-slate-700/30">
          <span className="font-semibold text-fuchsia-300">{isKo ? '시기 매칭:' : 'Timing:'}</span> {timing.recommendation}
        </div>
      )}
    </div>
  )
}
