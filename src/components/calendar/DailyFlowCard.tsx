'use client'

import { Sparkles } from 'lucide-react'
import { ganjiToKorean } from '@/lib/saju/ganjiKo'
import {
  cleanSignalName,
  isAxisConverged,
  isHeavyAstro,
  isHeavySaju,
  MIN_IMPACT,
} from '@/lib/calendar-engine/derivers/convergence-heavy'
import type { ImportantDate } from './types'

interface Props {
  importantDate: ImportantDate | null
}

// ── 그날 "큰일" 수렴 — convergence 디라이버(월간)와 같은 무거움 기준을 하루에
// 적용. 분류(SLOW_PLANETS/HEAVY_*_KINDS/isHeavy*)는 convergence-heavy.ts 단일
// 정의를 공유. 무거운 점성 vs 무거운 사주를 나눠 보여주고, 둘 다면 "양쪽 수렴".
const THEME_LABEL_KO: Record<string, string> = {
  love: '연애',
  money: '재물',
  career: '직업',
  health: '건강',
  growth: '성장',
}

type EngineSignal = NonNullable<ImportantDate['engineSignals']>[number]

interface DailyConvergence {
  astro: string[]
  saju: string[]
  bothSystems: boolean
  meaning?: string
  /** 전 신호(engineSignals)가 없어 축 점수로만 추정한 경우 (분기 밖) */
  approximate?: boolean
}

function deriveDailyConvergence(signals: EngineSignal[]): DailyConvergence | null {
  let astroHeavy = 0
  let sajuHeavy = 0
  let netPol = 0
  let sumImp = 0
  const astro: string[] = []
  const saju: string[] = []
  const themeAcc: Record<string, number> = {}
  for (const s of signals) {
    const imp = Math.abs(s.polarity) * s.weight
    if (imp < MIN_IMPACT) continue
    const heavyAstro = isHeavyAstro(s)
    const heavySaju = !heavyAstro && isHeavySaju(s)
    if (!heavyAstro && !heavySaju) continue
    if (heavyAstro) {
      astroHeavy += imp
      const n = cleanSignalName(s)
      if (n && astro.length < 3 && !astro.includes(n)) astro.push(n)
    } else {
      sajuHeavy += imp
      const n = cleanSignalName(s)
      if (n && saju.length < 3 && !saju.includes(n)) saju.push(n)
    }
    netPol += s.polarity * imp
    sumImp += imp
    for (const t of s.themes) themeAcc[t] = (themeAcc[t] ?? 0) + imp
  }
  if (astroHeavy === 0 && sajuHeavy === 0) return null
  return {
    astro,
    saju,
    bothSystems: astroHeavy > 0 && sajuHeavy > 0,
    meaning: composeDailyMeaning(themeAcc, netPol, sumImp),
  }
}

function composeDailyMeaning(
  themeAcc: Record<string, number>,
  netPol: number,
  sumImp: number
): string | undefined {
  const top = Object.entries(themeAcc)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([k]) => THEME_LABEL_KO[k])
    .filter(Boolean)
  if (top.length === 0) return undefined
  const ratio = sumImp > 0 ? netPol / sumImp : 0
  const tone = ratio > 0.15 ? '기회가 열리는' : ratio < -0.15 ? '시험받는' : '크게 전환되는'
  return `${top.join('·')} 영역이 ${tone} 날`
}

/**
 * Daily 활성 흐름 카드 — 활성 신호와 신살을 글로 풀어씀.
 *
 * 기존:
 *  - ActiveSignalsList (리스트 ↑↑ ↓↓ 형태)
 *  - 발동 중인 신살 (칩 분리)
 *
 * 신규:
 *  - 2~3 단락 narrative (매칭 패턴 헤드라인 + 신살 + 큰 흐름)
 *  - 신살명은 본문 안에 자연스럽게 녹임
 *
 * 룰 없이 신호 데이터에서 직접 합성 (룰 DB는 monthly에만).
 */
export default function DailyFlowCard({ importantDate }: Props) {
  if (!importantDate) return null

  const patterns = importantDate.matchedPatterns ?? []
  const shinsalActive = importantDate.shinsalActive ?? []
  const signals = importantDate.engineSignals ?? []
  const cycle = importantDate.longCycleContext
  const interactions = importantDate.cycleInteractions ?? []

  if (
    patterns.length === 0 &&
    shinsalActive.length === 0 &&
    signals.length === 0 &&
    !cycle &&
    interactions.length === 0 &&
    !importantDate.dailyGanjiNarrative
  ) {
    return null
  }

  const cycleRow: Array<{ label: string; ganji: string; sibsin?: string }> = []
  if (cycle?.daeun) {
    cycleRow.push({ label: '대운', ganji: cycle.daeun.ganji, sibsin: cycle.daeun.sibsinStem })
  }
  if (cycle?.sewoon) {
    cycleRow.push({ label: '세운', ganji: cycle.sewoon.ganji, sibsin: cycle.sewoon.sibsinStem })
  }
  if (cycle?.wolwoon) {
    cycleRow.push({ label: '월운', ganji: cycle.wolwoon.ganji, sibsin: cycle.wolwoon.sibsinStem })
  }
  if (cycle?.iljin) {
    cycleRow.push({ label: '일진', ganji: cycle.iljin.ganji, sibsin: cycle.iljin.sibsinStem })
  }

  // 0. 일진(60갑자) 한 줄 — 그 날 ganji archetype + 본명 일간 십신 개인화
  const dailyGanji = importantDate.dailyGanjiNarrative

  // 0a. 그날 "큰일" — 점성×사주 무거운 이벤트 수렴 (월간 큰날 로직을 하루에).
  //  전 신호(engineSignals)는 현재±3달만 부착됨 → 그 밖 날은 축 점수(연중
  //  존재)로 추정해 최소 블록이라도 보여줌(올해뷰서 클릭한 큰날과 일관).
  const convergence: DailyConvergence | null =
    deriveDailyConvergence(signals) ??
    (isAxisConverged(importantDate.scoreBreakdown)
      ? { astro: [], saju: [], bothSystems: true, approximate: true }
      : null)

  // 0b. 일진 scope 룰 — "오늘 한 줄" 액션 (그 날 십신/신살/충)
  const dailyActions = importantDate.dailyActions ?? []

  // 1. 핵심 헤드라인 (매칭 패턴 1번째)
  const lead = patterns[0]?.headline

  // 2. 신살 — 길/흉 분류해 문장으로
  const luckyShinsal = shinsalActive.filter((s) => s.type === 'lucky').map((s) => s.name)
  const unluckyShinsal = shinsalActive.filter((s) => s.type === 'unlucky').map((s) => s.name)
  const neutralShinsal = shinsalActive
    .filter((s) => s.type !== 'lucky' && s.type !== 'unlucky')
    .map((s) => s.name)

  // 3. 큰 흐름 신호 — decadal/yearly에서 강한 거 1~2개
  const bigFlow = [...signals]
    .filter((s) => (s.layer === 'decadal' || s.layer === 'yearly') && Math.abs(s.polarity) >= 2)
    .sort((a, b) => Math.abs(b.polarity) * b.weight - Math.abs(a.polarity) * a.weight)
    .slice(0, 2)

  // 4. 일진 디테일 — daily peak 신호 1~2개
  const dailyDetail = [...signals]
    .filter((s) => s.layer === 'daily' && Math.abs(s.polarity) >= 2)
    .sort((a, b) => Math.abs(b.polarity) * b.weight - Math.abs(a.polarity) * a.weight)
    .slice(0, 2)

  return (
    <div className="bg-zinc-900/40 p-5 rounded-2xl border border-white/5">
      <h3 className="text-base font-bold text-zinc-200 mb-3 flex items-center gap-2 tracking-wider uppercase">
        <Sparkles className="w-5 h-5 text-indigo-400" />
        오늘의 활성 흐름
      </h3>

      <div className="text-base text-zinc-200 leading-relaxed space-y-3">
        {/* 일진(60갑자) 한 줄 — 그 날의 ganji 결 + 본명 십신 개인화 */}
        {dailyGanji && (
          <p className="text-indigo-200/90 text-sm bg-zinc-950/40 border border-white/5 rounded-xl px-3 py-2">
            {dailyGanji}
          </p>
        )}

        {/* 그날 큰일 — 점성×사주 수렴 (월간 큰날 카드와 같은 기준, 하루 단위) */}
        {convergence && (
          <div className="bg-zinc-950/40 border border-white/5 rounded-xl px-3 py-2.5 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-zinc-200">🔮 오늘 겹치는 일</span>
              {convergence.bothSystems && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/20">
                  양쪽 수렴
                </span>
              )}
            </div>
            {convergence.astro.length > 0 && (
              <div className="text-xs flex gap-1.5">
                <span className="text-sky-300 font-bold shrink-0">점성</span>
                <span className="text-zinc-400">{convergence.astro.join(' · ')}</span>
              </div>
            )}
            {convergence.saju.length > 0 && (
              <div className="text-xs flex gap-1.5">
                <span className="text-amber-300 font-bold shrink-0">사주</span>
                <span className="text-zinc-400">{convergence.saju.join(' · ')}</span>
              </div>
            )}
            {convergence.meaning && (
              <div className="text-xs text-indigo-200/80 italic pt-0.5">{convergence.meaning}</div>
            )}
            {convergence.approximate && (
              <div className="text-xs text-zinc-500">
                점성·사주 양쪽이 강한 날 — 상세 내역은 이번 분기에서 확인할 수 있어요.
              </div>
            )}
          </div>
        )}

        {/* 오늘 한 줄 — 일진 룰 액션 (짧고 행동 중심) */}
        {dailyActions.length > 0 && (
          <ul className="space-y-1.5">
            {dailyActions.map((line, i) => (
              <li key={i} className="text-sm text-zinc-200 leading-snug flex gap-2">
                <span className="text-indigo-400 shrink-0">·</span>
                <span>{line.replace(/\*\*/g, '')}</span>
              </li>
            ))}
          </ul>
        )}

        {/* 핵심 한 줄 */}
        {lead && <p className="text-amber-200 font-bold text-base">{lead}.</p>}

        {/* 대운/세운/월운/일진 흐름 한 줄 */}
        {cycleRow.length > 0 && (
          <div className="flex flex-wrap gap-2 text-xs">
            {cycleRow.map((c) => (
              <span
                key={c.label}
                className="inline-flex items-center gap-1.5 bg-zinc-950/60 border border-white/5 rounded-full px-2.5 py-1"
              >
                <span className="text-zinc-500">{c.label}</span>
                <span className="text-zinc-100 font-bold tracking-wide">
                  {ganjiToKorean(c.ganji)}
                </span>
                {c.sibsin && <span className="text-indigo-300">{c.sibsin}</span>}
              </span>
            ))}
          </div>
        )}

        {/* 충/합/형 — 큰 흐름 끼리 부딪힘 */}
        {interactions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {interactions.slice(0, 6).map((it, i) => {
              const isClash =
                it.kind.includes('충') ||
                it.kind.includes('형') ||
                it.kind.includes('파') ||
                it.kind.includes('해')
              const tone = isClash
                ? 'bg-rose-900/30 border-rose-500/30 text-rose-200'
                : 'bg-emerald-900/30 border-emerald-500/30 text-emerald-200'
              return (
                <span
                  key={`${it.pair}-${it.kind}-${i}`}
                  title={it.blurb}
                  className={`text-[11px] font-medium border rounded-md px-2 py-0.5 ${tone}`}
                >
                  {ganjiToKorean(it.pair)} {it.kind}
                </span>
              )
            })}
          </div>
        )}

        {/* 큰 흐름 + 일진 디테일 */}
        {(bigFlow.length > 0 || dailyDetail.length > 0) && (
          <p>
            {bigFlow.length > 0 && (
              <>
                현재{' '}
                {bigFlow.map((s, i) => (
                  <span key={s.id}>
                    <span className={s.polarity > 0 ? 'text-emerald-300' : 'text-rose-300'}>
                      {s.korean ?? s.name}
                    </span>
                    {i < bigFlow.length - 1 ? '·' : ''}
                  </span>
                ))}
                의 큰 흐름이 작동하고 있어요.{' '}
              </>
            )}
            {dailyDetail.length > 0 && (
              <>
                오늘 특히{' '}
                {dailyDetail.map((s, i) => (
                  <span key={s.id}>
                    <span className={s.polarity > 0 ? 'text-emerald-300' : 'text-rose-300'}>
                      {s.korean ?? s.name}
                    </span>
                    {i < dailyDetail.length - 1 ? ', ' : ''}
                  </span>
                ))}{' '}
                이(가) 두드러집니다.
              </>
            )}
          </p>
        )}

        {/* 신살 — 길/흉 따로 문장으로 */}
        {(luckyShinsal.length > 0 || unluckyShinsal.length > 0 || neutralShinsal.length > 0) && (
          <p className="text-sm text-zinc-300">
            {luckyShinsal.length > 0 && (
              <>
                길성 발동:{' '}
                <span className="text-emerald-300 font-medium">{luckyShinsal.join(', ')}</span>
                {unluckyShinsal.length > 0 || neutralShinsal.length > 0 ? ' · ' : ''}
              </>
            )}
            {unluckyShinsal.length > 0 && (
              <>
                흉살 발동:{' '}
                <span className="text-rose-300 font-medium">{unluckyShinsal.join(', ')}</span>
                {neutralShinsal.length > 0 ? ' · ' : ''}
              </>
            )}
            {neutralShinsal.length > 0 && (
              <>
                도화·역마 등:{' '}
                <span className="text-amber-300 font-medium">{neutralShinsal.join(', ')}</span>
              </>
            )}
          </p>
        )}

        {/* 매칭 패턴 액션 추천 */}
        {patterns.length > 0 && (
          <p className="text-xs text-zinc-400 pt-2 border-t border-white/5">
            {patterns
              .filter((p) => p.action)
              .slice(0, 2)
              .map((p) => p.action)
              .join(' ')}
          </p>
        )}
      </div>
    </div>
  )
}
