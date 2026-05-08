'use client'

import {
  getChironInsight,
  getPartOfFortuneInsight,
  getVertexInsight,
  getDraconicInsight,
  getHarmonicsInsight,
  getLilithInsight,
  getAsteroidsInsight,
  getFixedStarsInsight,
  getEclipsesInsight,
} from './astrology'
import type { AstroData } from './types'

interface AdvancedAstroInsightsProps {
  astro?: AstroData
  lang?: string
  className?: string
}

/**
 * Surfaces the 9 advanced astrology insight modules that were already
 * built but mostly unused. FreeReport previously only rendered Chiron;
 * the other 8 (Part of Fortune, Vertex, Draconic, Harmonics, Lilith,
 * Asteroids, Fixed Stars, Eclipses) were quietly orphaned.
 *
 * Renders each as a card. Skips silently when an insight returns null
 * (e.g. user's chart has no notable fixed-star conjunction within orb).
 */
export default function AdvancedAstroInsights({
  astro,
  lang = 'ko',
  className = '',
}: AdvancedAstroInsightsProps) {
  if (!astro) return null

  const cards: Array<{
    key: string
    title: string
    emoji: string
    body: React.ReactNode
  }> = []

  const chiron = getChironInsight(astro, lang)
  if (chiron) {
    cards.push({
      key: 'chiron',
      title: chiron.title,
      emoji: chiron.emoji,
      body: <p className="text-sm text-slate-300 leading-relaxed">{chiron.message}</p>,
    })
  }

  const pof = getPartOfFortuneInsight(astro, lang)
  if (pof) {
    cards.push({
      key: 'pof',
      title: pof.title,
      emoji: pof.emoji,
      body: (
        <>
          <p className="text-sm text-slate-300 leading-relaxed">{pof.message}</p>
          <p className="text-[11px] text-amber-300 font-mono mt-2">House {pof.house}</p>
        </>
      ),
    })
  }

  const vertex = getVertexInsight(astro, lang)
  if (vertex) {
    cards.push({
      key: 'vertex',
      title: vertex.title,
      emoji: vertex.emoji,
      body: (
        <>
          <p className="text-sm text-slate-300 leading-relaxed">{vertex.message}</p>
          <p className="text-[11px] text-purple-300 font-mono mt-2">House {vertex.house}</p>
        </>
      ),
    })
  }

  const lilith = getLilithInsight(astro, lang)
  if (lilith) {
    cards.push({
      key: 'lilith',
      title: lilith.title,
      emoji: lilith.emoji,
      body: <p className="text-sm text-slate-300 leading-relaxed">{lilith.message}</p>,
    })
  }

  const asteroids = getAsteroidsInsight(astro, lang)
  if (asteroids) {
    cards.push({
      key: 'asteroids',
      title: asteroids.title,
      emoji: asteroids.emoji,
      body: (
        <ul className="space-y-2">
          {asteroids.insights.map((a, i) => (
            <li key={i} className="text-sm text-slate-300">
              <span className="font-semibold text-fuchsia-300">{a.name}</span>
              <span className="text-slate-400"> — </span>
              {a.message}
            </li>
          ))}
        </ul>
      ),
    })
  }

  const fixedStars = getFixedStarsInsight(astro, lang)
  if (fixedStars) {
    cards.push({
      key: 'fixedStars',
      title: fixedStars.title,
      emoji: fixedStars.emoji,
      body: (
        <>
          <p className="text-sm text-slate-300 leading-relaxed">{fixedStars.message}</p>
          {fixedStars.stars.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {fixedStars.stars.map((s, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-200"
                >
                  ⭐ {s}
                </span>
              ))}
            </div>
          )}
        </>
      ),
    })
  }

  const harmonics = getHarmonicsInsight(astro, lang)
  if (harmonics) {
    cards.push({
      key: 'harmonics',
      title: harmonics.title,
      emoji: harmonics.emoji,
      body: (
        <ul className="space-y-1">
          {harmonics.talents.map((t, i) => (
            <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
              <span className="text-cyan-400">✦</span> <span>{t}</span>
            </li>
          ))}
        </ul>
      ),
    })
  }

  const eclipses = getEclipsesInsight(astro, lang)
  if (eclipses) {
    cards.push({
      key: 'eclipses',
      title: eclipses.title,
      emoji: eclipses.emoji,
      body: <p className="text-sm text-slate-300 leading-relaxed">{eclipses.message}</p>,
    })
  }

  const draconic = getDraconicInsight(astro, lang)
  if (draconic) {
    cards.push({
      key: 'draconic',
      title: draconic.title,
      emoji: draconic.emoji,
      body: <p className="text-sm text-slate-300 leading-relaxed">{draconic.message}</p>,
    })
  }

  if (cards.length === 0) return null

  return (
    <section className={`mt-8 ${className}`.trim()}>
      <div className="mb-3">
        <h3 className="text-lg font-bold text-white">🌌 고급 점성 인사이트</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          소행성 · Chiron · 항성 · 노드 · Part of Fortune · Vertex · Lilith · Eclipses · Harmonics
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cards.map((c) => (
          <div
            key={c.key}
            className="rounded-2xl border border-purple-400/20 bg-gradient-to-br from-purple-500/5 via-fuchsia-500/5 to-transparent p-4 backdrop-blur-md"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{c.emoji}</span>
              <h4 className="text-sm font-semibold text-white">{c.title}</h4>
            </div>
            {c.body}
          </div>
        ))}
      </div>
    </section>
  )
}
