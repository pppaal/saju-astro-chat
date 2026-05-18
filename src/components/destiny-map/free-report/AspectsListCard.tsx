'use client'

import { Network } from 'lucide-react'

interface AspectEndLike {
  name?: string
  sign?: string
  longitude?: number
}
interface AspectLike {
  from?: AspectEndLike | string
  to?: AspectEndLike | string
  type?: string
  orb?: number
  applying?: boolean
}

interface Props {
  aspects?: AspectLike[] | null
  isKo: boolean
}

const ASPECT_GROUPS: Array<{ types: string[]; label_ko: string; label_en: string; tone: string }> = [
  {
    types: ['conjunction'],
    label_ko: '합 (Conjunction)',
    label_en: 'Conjunctions',
    tone: 'text-fuchsia-300 border-fuchsia-400/30 bg-fuchsia-500/10',
  },
  {
    types: ['trine'],
    label_ko: '삼각 (Trine)',
    label_en: 'Trines',
    tone: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10',
  },
  {
    types: ['sextile'],
    label_ko: '육각 (Sextile)',
    label_en: 'Sextiles',
    tone: 'text-cyan-300 border-cyan-400/30 bg-cyan-500/10',
  },
  {
    types: ['square'],
    label_ko: '사각 (Square)',
    label_en: 'Squares',
    tone: 'text-rose-300 border-rose-400/30 bg-rose-500/10',
  },
  {
    types: ['opposition'],
    label_ko: '충 (Opposition)',
    label_en: 'Oppositions',
    tone: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
  },
  {
    types: ['quincunx', 'semisextile', 'quintile', 'biquintile'],
    label_ko: '마이너 어스펙트',
    label_en: 'Minor Aspects',
    tone: 'text-slate-300 border-slate-400/30 bg-slate-500/10',
  },
]

function endName(end: AspectEndLike | string | undefined): string {
  if (!end) return '?'
  if (typeof end === 'string') return end
  return end.name || '?'
}

export default function AspectsListCard({ aspects, isKo }: Props) {
  if (!aspects || aspects.length === 0) return null

  // Filter to natal-natal aspects (exclude transit/progressed if labelled)
  const natal = aspects.filter((a) => {
    const from = a.from
    const to = a.to
    if (typeof from === 'object' && from && (from as { kind?: string }).kind === 'transit') return false
    if (typeof to === 'object' && to && (to as { kind?: string }).kind === 'transit') return false
    return true
  })

  if (natal.length === 0) return null

  const grouped = ASPECT_GROUPS.map((g) => ({
    ...g,
    items: natal
      .filter((a) => g.types.includes(String(a.type || '').toLowerCase()))
      .sort((a, b) => (a.orb ?? 99) - (b.orb ?? 99)),
  })).filter((g) => g.items.length > 0)

  if (grouped.length === 0) return null

  return (
    <section className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/40 p-5 md:p-6">
      <div className="flex items-center gap-2 mb-3">
        <Network className="w-4 h-4 text-purple-300" />
        <h3 className="text-sm font-bold text-white">
          {isKo ? '본명 어스펙트 (Natal Aspects)' : 'Natal Aspects'}
        </h3>
      </div>
      <p className="text-xs text-slate-400 mb-3">
        {isKo
          ? '출생 차트 내 행성 간 각도 — 합 / 삼각 / 육각 / 사각 / 충'
          : 'Angular relationships between natal planets'}
      </p>

      <div className="space-y-3">
        {grouped.map((g, gi) => (
          <div key={gi} className="rounded-xl border border-white/10 bg-slate-900/40 p-3">
            <div className="flex items-baseline justify-between mb-2">
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full border font-mono ${g.tone}`}
              >
                {isKo ? g.label_ko : g.label_en}
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                {g.items.length}{isKo ? '개' : ''}
              </span>
            </div>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-1">
              {g.items.slice(0, 12).map((a, i) => (
                <li key={i} className="text-xs text-slate-300 flex items-center gap-2">
                  <span className="font-mono text-white">{endName(a.from)}</span>
                  <span className="text-slate-500">—</span>
                  <span className="font-mono text-white">{endName(a.to)}</span>
                  {typeof a.orb === 'number' && (
                    <span className="text-[10px] font-mono text-slate-500 ml-auto">
                      {a.orb.toFixed(1)}°
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
