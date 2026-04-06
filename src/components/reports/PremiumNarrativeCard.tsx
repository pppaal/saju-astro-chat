'use client'

import { useMemo, useState, type ReactNode } from 'react'

interface PremiumNarrativeCardProps {
  title: string
  content: string
  defaultOpen?: boolean
  className?: string
}

const HIGHLIGHT_PATTERNS = [
  /"([^"\n]{6,80})"/g,
  /'([^'\n]{6,80})'/g,
  /(\uB610\uD55C[^.!?\n]{8,90})/g,
  /(\uD53C\uD574\uC57C[^.!?\n]{8,90})/g,
  /(\uD575\uC2EC[^.!?\n]{8,90})/g,
  /(\uC8FC\uC758[^.!?\n]{8,90})/g,
  /(\uCD94\uCC9C[^.!?\n]{8,90})/g,
  /(important[^.!?\n]{8,90})/gi,
  /(key[^.!?\n]{8,90})/gi,
  /(avoid[^.!?\n]{8,90})/gi,
]

function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function collectHighlights(text: string): string[] {
  const out = new Set<string>()
  for (const pattern of HIGHLIGHT_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const phrase = (match[1] || match[0] || '').trim()
      if (phrase.length >= 8) out.add(phrase)
      if (out.size >= 8) return [...out]
    }
  }
  return [...out]
}

function highlightText(text: string, phrases: string[]): ReactNode[] {
  if (!phrases.length) return [text]
  const escaped = phrases
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length)
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
  const parts = text.split(regex)
  return parts.map((part, idx) => {
    if (!part) return ''
    const isHit = phrases.some((phrase) => phrase.toLowerCase() === part.toLowerCase())
    if (!isHit) return part
    return (
      <mark key={`${part}-${idx}`} className="rounded bg-amber-200/80 px-1 py-0.5 text-slate-900">
        {part}
      </mark>
    )
  })
}

export default function PremiumNarrativeCard({
  title,
  content,
  defaultOpen = true,
  className = '',
}: PremiumNarrativeCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const paragraphs = useMemo(() => splitParagraphs(content), [content])
  const highlights = useMemo(() => collectHighlights(content), [content])

  if (!content.trim()) return null

  return (
    <section
      className={`overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,28,0.96),rgba(7,11,19,0.92))] text-slate-100 shadow-[0_22px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
        aria-expanded={isOpen}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-200/62">
            Narrative
          </p>
          <h3 className="mt-1 text-xl font-semibold text-white">{title}</h3>
        </div>
        <span
          className={`text-cyan-100/70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          ^
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-white/10 px-5 py-5">
          <div className="space-y-5">
            {paragraphs.map((paragraph, idx) => (
              <p
                key={`${paragraph.slice(0, 24)}-${idx}`}
                className="text-[1.02rem] leading-8 text-slate-200"
              >
                {highlightText(paragraph, highlights)}
              </p>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
