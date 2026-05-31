'use client'

/**
 * FlowLadder — 시간 층 흐름 사다리 (대운 → 세운 → 월운 → 일진).
 *
 * v2 엔진의 시그니처: 운명을 시간의 층으로 본다(10년 대운 → 1년 세운 → 월운 →
 * 일진). 각 층의 간지 + 본명 일간 기준 십신, 그리고 층 사이 충/합/형을 한눈에.
 * 모든 탭(연/월/일) 상단에 고정돼 "지금 어느 흐름 위에 서 있는지" 컨텍스트를 준다.
 */
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { ganjiToKorean } from '@/lib/saju/ganjiKo'
import type { CalLocale } from '../labels'
import type { ImportantDate } from '../../types'

type LongCycle = NonNullable<ImportantDate['longCycleContext']>
type Interaction = NonNullable<ImportantDate['cycleInteractions']>[number]

const LAYER_LABEL: Record<CalLocale, { daeun: string; sewoon: string; wolwoon: string; iljin: string }> = {
  ko: { daeun: '대운', sewoon: '세운', wolwoon: '월운', iljin: '일진' },
  en: { daeun: '10-yr', sewoon: 'Year', wolwoon: 'Month', iljin: 'Day' },
}

const LAYER_SUB: Record<CalLocale, { daeun: string; sewoon: string; wolwoon: string; iljin: string }> = {
  ko: { daeun: '10년 흐름', sewoon: '올해', wolwoon: '이번 달', iljin: '오늘' },
  en: { daeun: 'decade', sewoon: 'this year', wolwoon: 'this month', iljin: 'today' },
}

const KIND_EN: Record<string, string> = {
  천간합: 'stem harmony',
  지지합: 'branch harmony',
  천간충: 'stem clash',
  지지충: 'branch clash',
  지지형: 'punishment',
  지지해: 'harm',
  지지파: 'break',
  자형: 'self-clash',
}

const HARMONY_KINDS = new Set(['천간합', '지지합'])

// 배지가 잘릴 때(>6) 중요한 충·형이 가려지지 않게 — 심각도 내림차순 정렬.
const KIND_SEVERITY: Record<string, number> = {
  천간충: 5,
  지지충: 5,
  지지형: 4,
  자형: 4,
  지지파: 3,
  지지해: 3,
  천간합: 2,
  지지합: 2,
}

function title(label: string, sub: string) {
  return `${label} · ${sub}`
}

function Rung({
  layer,
  ganji,
  sibsin,
  transition,
  locale,
}: {
  layer: string
  ganji: string
  sibsin?: string
  /** 대운 전환 임박 — 다음 간지로 곧 바뀜. */
  transition?: { nextGanji: string }
  locale: CalLocale
}) {
  const reading = locale === 'ko' ? ganjiToKorean(ganji) : null
  return (
    <div className="flex flex-col items-center gap-1 min-w-[58px] shrink-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {layer}
      </span>
      <span className="text-lg font-bold text-amber-200 leading-none tabular-nums">{ganji}</span>
      {reading && <span className="text-[10px] text-zinc-400 leading-none">{reading}</span>}
      {sibsin && (
        <span className="mt-0.5 px-1.5 py-0.5 rounded-md bg-amber-400/10 text-amber-300/90 text-[10px] font-medium border border-amber-400/15">
          {sibsin}
        </span>
      )}
      {transition && (
        <span
          title={locale === 'ko' ? '대운 전환 임박' : 'Decade shift approaching'}
          className="mt-0.5 px-1.5 py-0.5 rounded-md bg-fuchsia-400/10 text-fuchsia-300/90 text-[9px] font-medium border border-fuchsia-400/20 whitespace-nowrap"
        >
          {locale === 'ko' ? `전환 임박 → ${transition.nextGanji}` : `shift → ${transition.nextGanji}`}
        </span>
      )}
    </div>
  )
}

export default function FlowLadder({
  longCycle,
  interactions = [],
  locale = 'ko',
}: {
  longCycle: LongCycle
  interactions?: Interaction[]
  locale?: CalLocale
}) {
  const L = LAYER_LABEL[locale]
  const S = LAYER_SUB[locale]
  const { daeun, sewoon, wolwoon, iljin } = longCycle

  // 표시할 층 — daeun 은 daeunCycles 없으면 생략.
  const rungs: Array<{
    key: string
    layer: string
    ganji: string
    sibsin?: string
    transition?: { nextGanji: string }
  }> = []
  if (daeun?.ganji)
    rungs.push({
      key: 'daeun',
      layer: L.daeun,
      ganji: daeun.ganji,
      sibsin: daeun.sibsinStem,
      transition:
        daeun.transitionImminent && daeun.nextGanji ? { nextGanji: daeun.nextGanji } : undefined,
    })
  if (sewoon?.ganji) rungs.push({ key: 'sewoon', layer: L.sewoon, ganji: sewoon.ganji, sibsin: sewoon.sibsinStem })
  if (wolwoon?.ganji) rungs.push({ key: 'wolwoon', layer: L.wolwoon, ganji: wolwoon.ganji, sibsin: wolwoon.sibsinStem })
  if (iljin?.ganji) rungs.push({ key: 'iljin', layer: L.iljin, ganji: iljin.ganji, sibsin: iljin.sibsinStem })

  if (rungs.length === 0) return null

  const header = locale === 'ko' ? '흐름 사다리' : 'Time-layer flow'

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl bg-zinc-900/40 backdrop-blur-sm border border-white/10 px-4 py-3"
    >
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">
          {header}
        </span>
        <span className="text-[10px] text-zinc-600">
          {locale === 'ko' ? '본명 일간 기준 십신' : 'sibsin vs. natal day-master'}
        </span>
      </div>

      {/* 층 사다리 — 좁은 화면에서 가로 스크롤 */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {rungs.map((r, i) => (
          <div key={r.key} className="flex items-center gap-1">
            <Rung
              layer={r.layer}
              ganji={r.ganji}
              sibsin={r.sibsin}
              transition={r.transition}
              locale={locale}
            />
            {i < rungs.length - 1 && (
              <ChevronRight className="w-4 h-4 text-zinc-700 shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* 운끼리 충/합/형 배지 */}
      {interactions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-white/5">
          {[...interactions]
            .sort((a, b) => (KIND_SEVERITY[b.kind] ?? 0) - (KIND_SEVERITY[a.kind] ?? 0))
            .slice(0, 6)
            .map((it, i) => {
            const harmony = HARMONY_KINDS.has(it.kind)
            const kindLabel = locale === 'ko' ? it.kind : (KIND_EN[it.kind] ?? it.kind)
            return (
              <span
                key={`${it.pair}-${i}`}
                title={it.blurb}
                className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                  harmony
                    ? 'bg-emerald-400/10 text-emerald-300/90 border-emerald-400/20'
                    : 'bg-rose-400/10 text-rose-300/90 border-rose-400/20'
                }`}
              >
                {it.pair} {kindLabel}
              </span>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
