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
      className={`rounded-2xl border border-slate-300/70 bg-white/95 text-slate-800 shadow-sm ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={isOpen}
      >
        <h3 className="text-xl font-semibold">{title}</h3>
        <span
          className={`text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          ^
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-slate-200 px-4 py-4">
          <div className="space-y-5">
            {paragraphs.map((paragraph, idx) => (
              <p key={`${paragraph.slice(0, 24)}-${idx}`} className="text-[1.05rem] leading-8">
                {highlightText(paragraph, highlights)}
              </p>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
