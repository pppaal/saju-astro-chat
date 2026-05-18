'use client'

import {
  Briefcase,
  Heart,
  Baby,
  Coins,
  HeartPulse,
  Users,
  BookOpen,
  Palette,
  Moon,
  type LucideIcon,
} from 'lucide-react'
import type { DomainId, DomainNarrative } from '@/lib/fusion/lifeReport'

interface DomainSectionProps {
  domains: DomainNarrative[]
  isKo: boolean
}

interface DomainStyle {
  icon: LucideIcon
  /** Card border + background accent. */
  card: string
  /** Icon and small-text accent. */
  text: string
}

// One color per life domain. The accent shows on the icon, badge
// label, and a subtle card-border tint — keeps the page scan-able
// even when six sections stack vertically.
const DOMAIN_STYLES: Record<DomainId, DomainStyle> = {
  career: {
    icon: Briefcase,
    card: 'border-cyan-400/25 from-cyan-500/10',
    text: 'text-cyan-200',
  },
  love: {
    icon: Heart,
    card: 'border-rose-400/25 from-rose-500/10',
    text: 'text-rose-200',
  },
  children: {
    icon: Baby,
    card: 'border-amber-400/25 from-amber-500/10',
    text: 'text-amber-200',
  },
  money: {
    icon: Coins,
    card: 'border-emerald-400/25 from-emerald-500/10',
    text: 'text-emerald-200',
  },
  health: {
    icon: HeartPulse,
    card: 'border-teal-400/25 from-teal-500/10',
    text: 'text-teal-200',
  },
  family: {
    icon: Users,
    card: 'border-violet-400/25 from-violet-500/10',
    text: 'text-violet-200',
  },
  wisdom: {
    icon: BookOpen,
    card: 'border-indigo-400/25 from-indigo-500/10',
    text: 'text-indigo-200',
  },
  creativity: {
    icon: Palette,
    card: 'border-pink-400/25 from-pink-500/10',
    text: 'text-pink-200',
  },
  spirituality: {
    icon: Moon,
    card: 'border-purple-400/25 from-purple-500/10',
    text: 'text-purple-200',
  },
}

function hasContent(domain: DomainNarrative, isKo: boolean): boolean {
  return domain.paragraphs.some((p) => (isKo ? p.ko : p.en)?.trim().length)
}

function DomainCard({
  domain,
  isKo,
}: {
  domain: DomainNarrative
  isKo: boolean
}) {
  const style = DOMAIN_STYLES[domain.id]
  const Icon = style.icon
  const title = isKo ? domain.title.ko : domain.title.en

  // Children-only: render an estimated child-count chip in the header.
  const childChip =
    domain.id === 'children' && domain.estimatedChildCount
      ? domain.estimatedChildCount
      : null

  return (
    <article
      className={`rounded-2xl border bg-gradient-to-br to-slate-900/30 p-5 md:p-6 ${style.card}`}
    >
      <header className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${style.text}`} aria-hidden />
          <h3 className="text-sm md:text-base font-bold text-white">{title}</h3>
        </div>
        {childChip && (
          <span
            className={`text-[11px] font-semibold uppercase tracking-wider rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 ${style.text}`}
          >
            {isKo
              ? `예상 자녀 ${childChip.min === childChip.max ? childChip.min : `${childChip.min}–${childChip.max}`}명`
              : `Est. ${childChip.min === childChip.max ? childChip.min : `${childChip.min}–${childChip.max}`} child${childChip.max === 1 ? '' : 'ren'}`}
          </span>
        )}
      </header>

      <div className="space-y-2.5">
        {domain.paragraphs.map((p, i) => {
          const text = isKo ? p.ko : p.en
          if (!text) return null
          return (
            <p
              key={i}
              className="text-sm leading-relaxed text-slate-200 whitespace-pre-line"
            >
              {text}
            </p>
          )
        })}
      </div>
    </article>
  )
}

/**
 * Six-domain section: career / love / children / money / health / family.
 * Each domain renders only if it has non-empty paragraphs (silent hide).
 */
export default function DomainSection({ domains, isKo }: DomainSectionProps) {
  const visible = domains.filter((d) => hasContent(d, isKo))
  if (visible.length === 0) return null

  return (
    <section className="space-y-4">
      {visible.map((d) => (
        <DomainCard key={d.id} domain={d} isKo={isKo} />
      ))}
    </section>
  )
}
