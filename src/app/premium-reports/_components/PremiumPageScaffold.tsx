import type { ReactNode } from 'react'

type Accent = 'violet' | 'cyan' | 'amber' | 'emerald'

interface PremiumPageScaffoldProps {
  children: ReactNode
  accent?: Accent
}

const ACCENT_CLASSES: Record<Accent, string[]> = {
  violet: ['from-violet-500/16 to-fuchsia-500/0', 'from-cyan-400/10 to-blue-500/0'],
  cyan: ['from-cyan-500/16 to-sky-500/0', 'from-indigo-500/12 to-violet-500/0'],
  amber: ['from-amber-500/16 to-orange-500/0', 'from-cyan-500/10 to-blue-500/0'],
  emerald: ['from-emerald-500/16 to-teal-500/0', 'from-cyan-500/10 to-indigo-500/0'],
}

export default function PremiumPageScaffold({
  children,
  accent = 'violet',
}: PremiumPageScaffoldProps) {
  const [firstOrb, secondOrb] = ACCENT_CLASSES[accent]

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-[#03060d] text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div
          className={`absolute -left-24 top-[-180px] h-[420px] w-[420px] rounded-full bg-gradient-to-br ${firstOrb} blur-3xl`}
        />
        <div
          className={`absolute bottom-[-220px] right-[-110px] h-[460px] w-[460px] rounded-full bg-gradient-to-br ${secondOrb} blur-3xl`}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(18,28,44,0.52)_0%,rgba(3,6,13,0.96)_58%,rgba(3,6,13,1)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(120,160,230,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,160,230,0.06)_1px,transparent_1px)] bg-[size:36px_36px] opacity-[0.14]" />
        <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.05),transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_top,rgba(0,0,0,0.4),transparent)]" />
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  )
}
