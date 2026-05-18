'use client'

import { Crown } from 'lucide-react'

interface JonggeokLike {
  isJonggeok?: boolean
  type?: string
  description?: string
  advice?: string
}
interface HwagyeokLike {
  isHwagyeok?: boolean
  type?: string
  description?: string
  transformSuccess?: boolean
}
interface IljuLike {
  ilju?: string
  iljuCharacter?: string
  characteristics?: string[]
  strengths?: string[]
}
interface GongmangLike {
  gongmangBranches?: string[]
  interpretation?: string
  type?: string
}
interface SamgiLike {
  hasSamgi?: boolean
  type?: string
  description?: string
  blessing?: string[]
}
interface UltraAdvancedLike {
  jonggeok?: JonggeokLike
  hwagyeok?: HwagyeokLike
  iljuDeep?: IljuLike
  gongmang?: GongmangLike
  samgi?: SamgiLike
  specialFormations?: string[]
  masterySummary?: string
}

interface Props {
  ultra?: UltraAdvancedLike | null
  isKo: boolean
}

export default function UltraAdvancedSajuCard({ ultra, isKo }: Props) {
  if (!ultra) return null

  const blocks: Array<{ title: string; body: React.ReactNode }> = []

  if (ultra.jonggeok?.isJonggeok && ultra.jonggeok.type) {
    blocks.push({
      title: isKo ? `종격 — ${ultra.jonggeok.type}` : `Jonggeok — ${ultra.jonggeok.type}`,
      body: (
        <>
          {ultra.jonggeok.description && (
            <p className="text-sm text-slate-300 leading-relaxed">{ultra.jonggeok.description}</p>
          )}
          {ultra.jonggeok.advice && (
            <p className="text-xs text-fuchsia-200 mt-1.5">💡 {ultra.jonggeok.advice}</p>
          )}
        </>
      ),
    })
  }

  if (ultra.hwagyeok?.isHwagyeok && ultra.hwagyeok.type) {
    blocks.push({
      title: isKo ? `화격 — ${ultra.hwagyeok.type}` : `Hwagyeok — ${ultra.hwagyeok.type}`,
      body: (
        <>
          {ultra.hwagyeok.description && (
            <p className="text-sm text-slate-300 leading-relaxed">{ultra.hwagyeok.description}</p>
          )}
          {typeof ultra.hwagyeok.transformSuccess === 'boolean' && (
            <p className="text-[11px] text-slate-400 font-mono mt-1.5">
              {ultra.hwagyeok.transformSuccess
                ? isKo
                  ? '✓ 화 성립'
                  : '✓ Transformation successful'
                : isKo
                  ? '○ 화 불성립'
                  : '○ Transformation incomplete'}
            </p>
          )}
        </>
      ),
    })
  }

  if (ultra.iljuDeep?.ilju) {
    blocks.push({
      title: isKo ? `일주 심화 — ${ultra.iljuDeep.ilju}` : `Ilju Deep — ${ultra.iljuDeep.ilju}`,
      body: (
        <>
          {ultra.iljuDeep.iljuCharacter && (
            <p className="text-sm text-slate-300 leading-relaxed">
              {ultra.iljuDeep.iljuCharacter}
            </p>
          )}
          {(ultra.iljuDeep.characteristics?.length ?? 0) > 0 && (
            <ul className="space-y-1 mt-2">
              {ultra.iljuDeep.characteristics!.slice(0, 4).map((c, i) => (
                <li key={i} className="text-xs text-slate-300 flex gap-1.5">
                  <span className="text-fuchsia-300">·</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      ),
    })
  }

  if ((ultra.gongmang?.gongmangBranches?.length ?? 0) > 0) {
    blocks.push({
      title: isKo ? '공망' : 'Gongmang',
      body: (
        <>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {ultra.gongmang!.gongmangBranches!.map((b, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded-full bg-slate-700/40 border border-slate-500/30 text-slate-200"
              >
                {b}
              </span>
            ))}
            {ultra.gongmang?.type && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-200">
                {ultra.gongmang.type}
              </span>
            )}
          </div>
          {ultra.gongmang?.interpretation && (
            <p className="text-sm text-slate-300 leading-relaxed">
              {ultra.gongmang.interpretation}
            </p>
          )}
        </>
      ),
    })
  }

  if (ultra.samgi?.hasSamgi && ultra.samgi.type) {
    blocks.push({
      title: isKo ? `삼기 — ${ultra.samgi.type}` : `Samgi — ${ultra.samgi.type}`,
      body: (
        <>
          {ultra.samgi.description && (
            <p className="text-sm text-slate-300 leading-relaxed">{ultra.samgi.description}</p>
          )}
          {(ultra.samgi.blessing?.length ?? 0) > 0 && (
            <ul className="space-y-1 mt-2">
              {ultra.samgi.blessing!.map((b, i) => (
                <li key={i} className="text-xs text-amber-200 flex gap-1.5">
                  <span className="text-amber-400">✦</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      ),
    })
  }

  if ((ultra.specialFormations?.length ?? 0) > 0) {
    blocks.push({
      title: isKo ? '특수 격' : 'Special Formations',
      body: (
        <ul className="space-y-1">
          {ultra.specialFormations!.map((f, i) => (
            <li key={i} className="text-sm text-slate-200 flex gap-1.5">
              <span className="text-amber-400">⚡</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      ),
    })
  }

  if (blocks.length === 0 && !ultra.masterySummary) return null

  return (
    <section className="rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-800/40 p-5 md:p-6">
      <div className="flex items-center gap-2 mb-3">
        <Crown className="w-4 h-4 text-amber-300" />
        <h3 className="text-sm font-bold text-white">
          {isKo ? '명리학 고급 분석' : 'Advanced Saju Analysis'}
        </h3>
      </div>

      {ultra.masterySummary && (
        <p className="text-sm md:text-base text-slate-300 leading-relaxed mb-4 border-l-2 border-amber-400/40 pl-3">
          {ultra.masterySummary}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {blocks.map((b, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/10 bg-slate-900/40 p-3"
          >
            <h4 className="text-sm font-semibold text-white mb-1.5">{b.title}</h4>
            {b.body}
          </div>
        ))}
      </div>
    </section>
  )
}
