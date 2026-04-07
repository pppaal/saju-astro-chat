'use client'

import { useState } from 'react'
import PremiumNarrativeCard from '@/components/reports/PremiumNarrativeCard'
import type { ReportSection } from '@/app/premium-reports/_lib/types'

type ReportSectionReaderProps = {
  sections: ReportSection[]
  className?: string
}

export default function ReportSectionReader({
  sections,
  className = '',
}: ReportSectionReaderProps) {
  const [activeSection, setActiveSection] = useState(0)

  if (!sections.length) return null

  const safeIndex = Math.min(activeSection, sections.length - 1)
  const active = sections[safeIndex]

  return (
    <div className={className}>
      <div className="mx-auto mt-6 max-w-6xl px-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sections.map((section, index) => (
            <button
              key={`${section.title}-${index}`}
              onClick={() => setActiveSection(index)}
              className={`rounded-xl px-4 py-2.5 whitespace-nowrap text-sm transition ${
                safeIndex === index
                  ? 'border border-cyan-300/35 bg-cyan-400/12 text-cyan-100'
                  : 'border border-white/10 bg-white/[0.03] text-slate-300 hover:border-cyan-300/25 hover:text-white'
              }`}
            >
              {section.title}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6 pb-12">
        <PremiumNarrativeCard
          title={active.title}
          content={active.content}
          defaultOpen
          className="border-white/10"
        />
      </main>
    </div>
  )
}
