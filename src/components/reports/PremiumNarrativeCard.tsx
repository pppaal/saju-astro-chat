'use client'

import { useMemo, useState, type ReactNode } from 'react'

interface PremiumNarrativeCardProps {
  title: string
  content: string
  defaultOpen?: boolean
  className?: string
}

// ──────────────────────────────────────────────────────────
// 마크다운 like 마커 파서
// ──────────────────────────────────────────────────────────
//   ## 헤딩      → <h4>
//   - 항목       → <ul><li>
//   > 콜아웃     → 강조 박스
//   **굵게**     → <strong>
//   "인용"        → highlight (기존)
// ──────────────────────────────────────────────────────────

type Block =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[]; trailing?: string }
  | { type: 'callout'; text: string }

function parseBlocks(content: string): Block[] {
  const paragraphs = content
    .replace(/\r/g, '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  const blocks: Block[] = []
  for (const p of paragraphs) {
    // ## 헤딩
    if (p.startsWith('## ')) {
      const lines = p.split('\n')
      const heading = lines[0].slice(3).trim()
      blocks.push({ type: 'heading', text: heading })
      // 나머지 라인 처리 (bullet 목록 + 마무리 텍스트)
      const restLines = lines.slice(1)
      if (restLines.length > 0) {
        const listItems: string[] = []
        const trailParts: string[] = []
        for (const ln of restLines) {
          if (ln.startsWith('- ')) {
            listItems.push(ln.slice(2).trim())
          } else if (ln.trim()) {
            trailParts.push(ln.trim())
          }
        }
        if (listItems.length > 0) {
          blocks.push({
            type: 'list',
            items: listItems,
            trailing: trailParts.join(' ') || undefined,
          })
        } else if (trailParts.length > 0) {
          blocks.push({ type: 'paragraph', text: trailParts.join(' ') })
        }
      }
      continue
    }
    // > 콜아웃
    if (p.startsWith('> ')) {
      blocks.push({ type: 'callout', text: p.slice(2).trim() })
      continue
    }
    // 단일 단락이 다 bullet인 경우
    const lines = p.split('\n')
    if (lines.length > 1 && lines.every((l) => l.startsWith('- '))) {
      blocks.push({
        type: 'list',
        items: lines.map((l) => l.slice(2).trim()),
      })
      continue
    }
    // 일반 단락
    blocks.push({ type: 'paragraph', text: p })
  }
  return blocks
}

// **bold** 처리 (단순 markdown bold)
function renderBold(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={idx} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      )
    }
    return part
  })
}

// 기존 quote highlight + bold 결합
const HIGHLIGHT_PATTERNS = [
  /"([^"\n]{6,80})"/g,
  /'([^'\n]{6,80})'/g,
]

function collectHighlights(text: string): string[] {
  const out = new Set<string>()
  for (const pattern of HIGHLIGHT_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const phrase = (match[1] || match[0] || '').trim()
      if (phrase.length >= 6) out.add(phrase)
      if (out.size >= 10) return [...out]
    }
  }
  return [...out]
}

function renderInline(text: string, phrases: string[]): ReactNode[] {
  // 1. **bold** 처리
  const boldParts = renderBold(text)
  if (!phrases.length) return boldParts
  // 2. quote highlight (bold 처리한 결과의 string 부분에만)
  const escaped = phrases
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .sort((a, b) => b.length - a.length)
  const regex = new RegExp(`(${escaped.join('|')})`, 'gi')
  const out: ReactNode[] = []
  boldParts.forEach((node, nodeIdx) => {
    if (typeof node !== 'string') {
      out.push(node)
      return
    }
    const segments = node.split(regex)
    segments.forEach((seg, segIdx) => {
      if (!seg) return
      const isHit = phrases.some((p) => p.toLowerCase() === seg.toLowerCase())
      if (!isHit) {
        out.push(seg)
        return
      }
      out.push(
        <mark
          key={`${nodeIdx}-${segIdx}-mark`}
          className="rounded-md bg-amber-300/20 px-1.5 py-0.5 text-amber-100 ring-1 ring-amber-300/30"
        >
          {seg}
        </mark>
      )
    })
  })
  return out
}

export default function PremiumNarrativeCard({
  title,
  content,
  defaultOpen = true,
  className = '',
}: PremiumNarrativeCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const blocks = useMemo(() => parseBlocks(content), [content])
  const highlights = useMemo(() => collectHighlights(content), [content])

  if (!content.trim()) return null

  return (
    <section
      className={`overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(10,16,28,0.96),rgba(7,11,19,0.92))] text-slate-100 shadow-[0_22px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl ${className}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 px-6 py-5 text-left transition-colors hover:bg-white/[0.02]"
        aria-expanded={isOpen}
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200/70">
            Narrative
          </p>
          <h3 className="mt-1.5 text-[1.35rem] font-semibold leading-tight text-white">
            {title}
          </h3>
        </div>
        <span
          className={`text-base text-cyan-100/60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-white/[0.07] px-6 py-7">
          <div className="space-y-6">
            {blocks.map((block, idx) => {
              const key = `block-${idx}`
              if (block.type === 'heading') {
                return (
                  <h4
                    key={key}
                    className="mt-2 border-l-[3px] border-cyan-300/55 pl-3 text-[1.05rem] font-semibold tracking-tight text-cyan-50"
                  >
                    {block.text}
                  </h4>
                )
              }
              if (block.type === 'callout') {
                return (
                  <blockquote
                    key={key}
                    className="rounded-2xl border border-amber-200/15 bg-amber-200/[0.04] px-5 py-4 text-[1rem] leading-[1.85] text-amber-50/95 shadow-[0_0_0_1px_rgba(251,191,36,0.05)_inset]"
                  >
                    {renderInline(block.text, highlights)}
                  </blockquote>
                )
              }
              if (block.type === 'list') {
                return (
                  <div key={key} className="space-y-2.5">
                    <ul className="space-y-2 pl-1">
                      {block.items.map((item, i) => (
                        <li
                          key={i}
                          className="relative pl-5 text-[0.985rem] leading-[1.8] text-slate-200"
                        >
                          <span
                            className="absolute left-0 top-[0.7rem] h-1.5 w-1.5 rounded-full bg-cyan-300/70"
                            aria-hidden="true"
                          />
                          {renderInline(item, highlights)}
                        </li>
                      ))}
                    </ul>
                    {block.trailing && (
                      <p className="text-[0.95rem] italic leading-[1.8] text-slate-400">
                        {renderInline(block.trailing, highlights)}
                      </p>
                    )}
                  </div>
                )
              }
              // paragraph
              return (
                <p
                  key={key}
                  className="text-[1rem] leading-[1.85] text-slate-200/95 first-letter:font-medium"
                  style={{
                    letterSpacing: '-0.005em',
                    wordBreak: 'keep-all',
                  }}
                >
                  {renderInline(block.text, highlights)}
                </p>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
