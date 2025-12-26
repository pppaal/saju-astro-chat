// src/components/destiny-map/fun-insights/components/AstrologyInsightsSection.tsx
// Advanced astrology insights section (Chiron, Lilith, Asteroids, etc.)

"use client";

import { InsightCard, InsightContent } from "./InsightCard";
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
} from "../astrology";

import type { AstroData } from "../types";

interface AstrologyInsightsSectionProps {
  astro: AstroData | undefined;
  lang: string;
}

export function AstrologyInsightsSection({ astro, lang }: AstrologyInsightsSectionProps) {
  const isKo = lang === "ko";

  // Get all insights
  const chironInsight = getChironInsight(astro, lang);
  const partOfFortuneInsight = getPartOfFortuneInsight(astro, lang);
  const vertexInsight = getVertexInsight(astro, lang);
  const draconicInsight = getDraconicInsight(astro, lang);
  const harmonicsInsight = getHarmonicsInsight(astro, lang);
  const lilithInsight = getLilithInsight(astro, lang);
  const asteroidsInsight = getAsteroidsInsight(astro, lang);
  const starsInsight = getFixedStarsInsight(astro, lang);
  const eclipsesInsight = getEclipsesInsight(astro, lang);

  // Check if any insights are available
  const hasAnyInsight =
    chironInsight ||
    partOfFortuneInsight ||
    vertexInsight ||
    draconicInsight ||
    harmonicsInsight ||
    lilithInsight ||
    asteroidsInsight ||
    starsInsight ||
    eclipsesInsight;

  if (!hasAnyInsight) return null;

  return (
    <>
      {/* 치유 포인트 (Chiron) */}
      {chironInsight && (
        <InsightCard emoji={chironInsight.emoji} title={chironInsight.title} colorTheme="rose">
          <InsightContent colorTheme="rose">
            <p className="text-gray-300 text-sm leading-relaxed">{chironInsight.message}</p>
          </InsightContent>
        </InsightCard>
      )}

      {/* 행운 포인트 (Part of Fortune) */}
      {partOfFortuneInsight && (
        <InsightCard
          emoji={partOfFortuneInsight.emoji}
          title={partOfFortuneInsight.title}
          colorTheme="amber"
        >
          <InsightContent colorTheme="amber">
            <p className="text-gray-300 text-sm leading-relaxed">{partOfFortuneInsight.message}</p>
          </InsightContent>
        </InsightCard>
      )}

      {/* 운명의 만남 (Vertex) */}
      {vertexInsight && (
        <InsightCard emoji={vertexInsight.emoji} title={vertexInsight.title} colorTheme="pink">
          <InsightContent colorTheme="pink">
            <p className="text-gray-300 text-sm leading-relaxed">{vertexInsight.message}</p>
          </InsightContent>
        </InsightCard>
      )}

      {/* 영혼의 목적 (Draconic) */}
      {draconicInsight && (
        <InsightCard
          emoji={draconicInsight.emoji}
          title={draconicInsight.title}
          colorTheme="indigo"
        >
          <InsightContent colorTheme="indigo">
            <p className="text-gray-300 text-sm leading-relaxed">{draconicInsight.message}</p>
          </InsightContent>
        </InsightCard>
      )}

      {/* 숨은 재능 (Harmonics) */}
      {harmonicsInsight && (
        <InsightCard
          emoji={harmonicsInsight.emoji}
          title={harmonicsInsight.title}
          colorTheme="emerald"
        >
          <div className="space-y-2">
            {harmonicsInsight.talents.map((talent: string, idx: number) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20"
              >
                <span className="text-emerald-400">✦</span>
                <p className="text-gray-300 text-sm">{talent}</p>
              </div>
            ))}
          </div>
        </InsightCard>
      )}

      {/* 숨겨진 욕망 (Lilith) */}
      {lilithInsight && (
        <InsightCard emoji={lilithInsight.emoji} title={lilithInsight.title} colorTheme="violet">
          <InsightContent colorTheme="violet">
            <p className="text-gray-300 text-sm leading-relaxed">{lilithInsight.message}</p>
          </InsightContent>
        </InsightCard>
      )}

      {/* 소행성 특성 (Asteroids) */}
      {asteroidsInsight && (
        <InsightCard
          emoji={asteroidsInsight.emoji}
          title={asteroidsInsight.title}
          colorTheme="cyan"
        >
          <div className="space-y-3">
            {asteroidsInsight.insights.map(
              (insight: { name: string; message: string }, idx: number) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20"
                >
                  <div className="font-medium text-cyan-300 text-sm mb-1">{insight.name}</div>
                  <p className="text-gray-300 text-sm leading-relaxed">{insight.message}</p>
                </div>
              )
            )}
          </div>
        </InsightCard>
      )}

      {/* 항성의 축복 (Fixed Stars) */}
      {starsInsight && (
        <InsightCard emoji={starsInsight.emoji} title={starsInsight.title} colorTheme="yellow">
          <InsightContent colorTheme="yellow" className="mb-3">
            <p className="text-gray-300 text-sm leading-relaxed">{starsInsight.message}</p>
          </InsightContent>
          {starsInsight.stars.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {starsInsight.stars.map((star: string, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-xs font-medium"
                >
                  {star}
                </span>
              ))}
            </div>
          )}
        </InsightCard>
      )}

      {/* 일식/월식 영향 (Eclipses) */}
      {eclipsesInsight && (
        <InsightCard emoji={eclipsesInsight.emoji} title={eclipsesInsight.title} colorTheme="gray">
          <InsightContent colorTheme="gray">
            <p className="text-gray-300 text-sm leading-relaxed">{eclipsesInsight.message}</p>
          </InsightContent>
        </InsightCard>
      )}
    </>
  );
}

export default AstrologyInsightsSection;
