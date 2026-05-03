'use client'

import ReportSurfaceSection from './ReportSurfaceSection'

type ReportBulletListSectionProps = {
  title: string
  items: string[]
  tone?: 'cyan' | 'emerald' | 'amber'
  className?: string
}

export default function ReportBulletListSection({
  title,
  items,
  tone = 'cyan',
  className = '',
}: ReportBulletListSectionProps) {
  if (!items.length) return null

  return (
    <ReportSurfaceSection title={title} tone={tone} className={className}>
      <ul className="space-y-2.5">
        {items.map((item, index) => (
          <li
            key={`${item}-${index}`}
            className="text-[15px] leading-[1.75] text-slate-200"
            style={{ wordBreak: 'keep-all' }}
          >
            • {item}
          </li>
        ))}
      </ul>
    </ReportSurfaceSection>
  )
}
