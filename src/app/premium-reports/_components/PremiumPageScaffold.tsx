import type { ReactNode } from 'react'

type Accent = 'violet' | 'cyan' | 'amber' | 'emerald'

interface PremiumPageScaffoldProps {
  children: ReactNode
  accent?: Accent
}

const ACCENT_CLASSES: Record<Accent, string[]> = {
  violet: ['from-violet-500/30 to-fuchsia-500/0', 'from-cyan-400/20 to-blue-500/0'],
  cyan: ['from-cyan-500/30 to-sky-500/0', 'from-indigo-500/20 to-violet-500/0'],
  amber: ['from-amber-500/30 to-orange-500/0', 'from-cyan-500/20 to-blue-500/0'],
  emerald: ['from-emerald-500/30 to-teal-500/0', 'from-cyan-500/20 to-indigo-500/0'],
}

const STAR_POINTS = [
  { left: '6%', top: '12%', size: 'h-1.5 w-1.5', delay: '0s' },
  { left: '14%', top: '70%', size: 'h-1 w-1', delay: '0.7s' },
  { left: '26%', top: '38%', size: 'h-2 w-2', delay: '1.4s' },
  { left: '42%', top: '18%', size: 'h-1.5 w-1.5', delay: '0.3s' },
  { left: '58%', top: '74%', size: 'h-1 w-1', delay: '1.2s' },
  { left: '72%', top: '28%', size: 'h-2 w-2', delay: '0.5s' },
  { left: '84%', top: '64%', size: 'h-1.5 w-1.5', delay: '1.8s' },
  { left: '92%', top: '16%', size: 'h-1 w-1', delay: '0.9s' },
]

export default function PremiumPageScaffold({
  children,
  accent = 'violet',
}: PremiumPageScaffoldProps) {
  const [firstOrb, secondOrb] = ACCENT_CLASSES[accent]

  return (
    <div className="relative min-h-[100svh] overflow-hidden bg-[#040714]">
      <div className="pointer-events-none absolute inset-0">
        <div
          className={`absolute -left-24 -top-32 h-[420px] w-[420px] rounded-full bg-gradient-to-br ${firstOrb} blur-3xl`}
        />
        <div
          className={`absolute -bottom-40 right-[-110px] h-[460px] w-[460px] rounded-full bg-gradient-to-br ${secondOrb} blur-3xl`}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(25,40,74,0.35)_0%,rgba(4,7,20,0.95)_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(120,160,230,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,160,230,0.08)_1px,transparent_1px)] bg-[size:34px_34px] opacity-20" />

        {STAR_POINTS.map((point, index) => (
          <span
            key={`${point.left}-${point.top}-${index}`}
            className={`absolute ${point.size} rounded-full bg-cyan-200/70 shadow-[0_0_18px_rgba(56,189,248,0.8)] animate-pulse`}
            style={{
              left: point.left,
              top: point.top,
              animationDelay: point.delay,
            }}
          />
        ))}
      </div>

      <div className="relative z-10">{children}</div>
    </div>
  )
}
