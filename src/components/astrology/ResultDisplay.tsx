// src/components/astrology/ResultDisplay.tsx
'use client';

/**
 * ResultDisplay - Natal Chart Result Display Component (Refactored)
 *
 * This component has been refactored to use modular sub-components:
 * - Card: Main card container with decorative styling
 * - PaywallOverlay: Login/Premium paywall UI
 * - PlanetsTable: Planet positions table
 * - HousesTable: Houses grid display
 * - AspectsTable: Aspects table with scores
 * - AdvancedPanel: Advanced options and extra points
 *
 * Types, constants, and utilities are in separate files.
 */

import React, { useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useI18n } from '@/i18n/I18nProvider';
import type { NatalChartData, PlanetData } from '@/lib/astrology';
import { buildSignInUrl } from '@/lib/auth/signInUrl';

// Types
import type { AspectData, AdvancedData, LocalizedPlanet, LocalizedHouse } from './types';

// Constants
import { LABELS, PAYWALL_LABELS, PLANET_LABELS } from './constants';

// Utils
import {
  normalizeLocale,
  splitSignAndDegree,
  localizeSignLabel,
  localizePlanetLabel,
  getPlanetImage,
  logContentAccess,
} from './utils';

// Components
import {
  Card,
  PaywallOverlay,
  PlanetsTable,
  HousesTable,
  AspectsTable,
  AdvancedPanel,
} from './components';

// Re-export types for external use
export type { AspectData, AdvancedData };

interface ResultDisplayProps {
  interpretation: string | null;
  isLoading: boolean;
  error: string | null;
  chartData?: NatalChartData | null;
  aspects?: AspectData[] | null;
  advanced?: AdvancedData | null;
  isLoggedIn?: boolean;
  isPremium?: boolean;
}

export default function ResultDisplay({
  interpretation,
  isLoading,
  error,
  chartData,
  aspects,
  advanced,
  isLoggedIn = false,
  isPremium = false,
}: ResultDisplayProps) {
  const { locale, dir } = useI18n?.() || { locale: 'en', dir: 'ltr' };
  const locKey = normalizeLocale(locale);
  const L = LABELS[locKey];
  const PL = PAYWALL_LABELS[locKey] || PAYWALL_LABELS.en;
  const signInUrl = buildSignInUrl();

  // Premium content access - temporarily allow all users
  const canAccessPremium = true;

  // Refs for logging deduplication
  const detailsLoggedRef = useRef(false);
  const advancedLoggedRef = useRef(false);

  // Details toggle handler
  const handleDetailsToggle = useCallback((e: React.SyntheticEvent<HTMLDetailsElement>) => {
    const isOpen = (e.target as HTMLDetailsElement).open;
    if (isOpen && canAccessPremium && !detailsLoggedRef.current) {
      detailsLoggedRef.current = true;
      logContentAccess({
        service: 'astrology',
        contentType: 'details',
        locale: locKey,
        metadata: {
          hasChartData: !!chartData,
          hasAspects: !!aspects?.length,
        },
      });
    }
  }, [canAccessPremium, locKey, chartData, aspects]);

  // Advanced toggle handler
  const handleAdvancedToggle = useCallback((isOpen: boolean) => {
    if (isOpen && canAccessPremium && !advancedLoggedRef.current) {
      advancedLoggedRef.current = true;
      logContentAccess({
        service: 'astrology',
        contentType: 'advanced',
        locale: locKey,
        metadata: {
          hasAdvanced: !!advanced,
        },
      });
    }
  }, [canAccessPremium, locKey, advanced]);

  // Clean up interpretation text
  const prettyInterpretation = useMemo(() => {
    if (!interpretation) return null;
    const rawLines = interpretation.split(/\r?\n/);
    const lines = rawLines.map((s) => s.trim()).filter(Boolean);
    const isHeader = (s: string) =>
      /^title$/i.test(s) || /^natal$/i.test(s) || /(요약|summary)$/i.test(s);
    while (lines.length && isHeader(lines[0])) lines.shift();
    const last = lines[lines.length - 1]?.toLowerCase() || '';
    if (/^(주의|note|notice)\s*:/.test(last)) lines.pop();
    return lines.join('\n');
  }, [interpretation]);

  // Localize chart data
  const viewChart = useMemo(() => {
    if (!chartData) return null;
    try {
      const localizedAsc = (() => {
        const { signPart, degreePart } = splitSignAndDegree(
          String(chartData.ascendant?.formatted || '')
        );
        const sign = localizeSignLabel(signPart, locKey);
        return `${sign} ${degreePart}`.trim();
      })();
      const localizedMc = (() => {
        const { signPart, degreePart } = splitSignAndDegree(
          String(chartData.mc?.formatted || '')
        );
        const sign = localizeSignLabel(signPart, locKey);
        return `${sign} ${degreePart}`.trim();
      })();

      const planets: LocalizedPlanet[] = (chartData.planets || []).map((p: PlanetData) => {
        const name = localizePlanetLabel(String(p.name || ''), locKey);
        const { signPart, degreePart } = splitSignAndDegree(String(p.formatted || ''));
        const sign = localizeSignLabel(signPart, locKey);
        return {
          name,
          formatted: `${sign} ${degreePart}`.trim(),
          house: p.house,
          speed: p.speed,
          retrograde: typeof p.speed === 'number' ? p.speed < 0 : false,
        };
      });

      const houses: LocalizedHouse[] = (chartData.houses || []).map((h: { cusp: number; formatted: string }) => {
        const { signPart, degreePart } = splitSignAndDegree(String(h.formatted || ''));
        const sign = localizeSignLabel(signPart, locKey);
        return { cusp: h.cusp, formatted: `${sign} ${degreePart}`.trim() };
      });

      return {
        ascendant: { formatted: localizedAsc },
        mc: { formatted: localizedMc },
        planets,
        houses,
      };
    } catch {
      return null;
    }
  }, [chartData, locKey]);

  // Loading state
  if (isLoading && !interpretation) {
    return (
      <div className="w-full max-w-2xl mt-8 text-center" dir={dir}>
        <p className="text-lg text-white/80">{L.title}</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className="w-full mt-8 p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-200"
        dir={dir}
      >
        <h3 className="font-bold mb-1">Error</h3>
        <p className="text-red-100/90">{error}</p>
      </div>
    );
  }

  if (!prettyInterpretation) return null;

  return (
    <Card dir={dir}>
      {/* Title section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 mb-4">
          <span className="text-amber-400/60">✧</span>
          <h2 className="font-serif text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 bg-clip-text text-transparent tracking-wide">
            {L.title}
          </h2>
          <span className="text-amber-400/60">✧</span>
        </div>
        <div className="w-24 h-px mx-auto bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
      </div>

      {/* Planet image grid - 3 columns */}
      {viewChart && viewChart.planets && viewChart.planets.length > 0 && (
        <div className="mb-6">
          <div className="grid grid-cols-3 gap-3 sm:gap-5">
            {viewChart.planets.map((p: LocalizedPlanet, idx: number) => {
              // Find English planet name
              let englishName = p.name;
              for (const labels of Object.values(PLANET_LABELS)) {
                for (const [key, value] of Object.entries(labels)) {
                  if (value === p.name) {
                    englishName = key;
                    break;
                  }
                }
              }
              const planetImage = getPlanetImage(englishName);

              return (
                <div
                  key={`planet-card-${idx}`}
                  className="group relative flex flex-col items-center p-3 sm:p-5 rounded-xl border border-amber-400/20 bg-gradient-to-br from-slate-800/70 to-indigo-900/50 hover:border-amber-400/50 hover:from-slate-800/90 hover:to-indigo-900/70 transition-all duration-300"
                >
                  {/* Planet image */}
                  {planetImage && (
                    <div className="relative w-[72px] h-[72px] sm:w-28 sm:h-28 mb-2 sm:mb-4 rounded-xl overflow-hidden border-2 border-amber-400/40 bg-black/50 shadow-xl group-hover:border-amber-400/60 transition-colors">
                      <Image
                        src={planetImage}
                        alt={p.name}
                        fill
                        className="object-cover"
                        sizes="112px"
                      />
                    </div>
                  )}
                  {/* Planet name */}
                  <span className="text-base sm:text-lg font-bold text-white text-center">
                    {p.name}
                  </span>
                  {/* Position */}
                  <span className="text-sm sm:text-base text-amber-200/80 text-center mt-1 font-medium">
                    {p.formatted}
                  </span>
                  {/* Retrograde indicator */}
                  {p.retrograde && (
                    <span className="absolute top-2 right-2 text-xs px-2 py-1 rounded-full bg-gradient-to-r from-amber-500/40 to-orange-500/40 border border-amber-400/60 text-amber-100 font-bold shadow-lg">
                      R
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Decorative divider */}
      <div className="flex items-center justify-center gap-4 my-8">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
        <span className="text-amber-400/40 text-sm">✦</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
      </div>

      {viewChart ? (
        <details className="group" onToggle={handleDetailsToggle}>
          <summary className="cursor-pointer select-none flex items-center justify-center gap-3 py-3 px-6 rounded-xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-400/20 hover:border-amber-400/40 transition-all group-open:rounded-b-none">
            <span className="text-amber-200 font-semibold tracking-wide">{L.details}</span>
            {!canAccessPremium && (
              <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-200 border border-amber-400/40 font-semibold">
                Premium
              </span>
            )}
            <span className="text-amber-400/60 group-open:rotate-180 inline-block transition-transform duration-300">
              ▼
            </span>
          </summary>

          <div className="rounded-b-xl border border-t-0 border-amber-400/20 bg-gradient-to-br from-slate-900/80 to-indigo-950/60 p-6 md:p-8">
            {/* Not logged in - login required */}
            {!isLoggedIn && (
              <PaywallOverlay type="login" labels={PL} signInUrl={signInUrl} />
            )}

            {/* Logged in but not premium - payment required */}
            {isLoggedIn && !isPremium && (
              <PaywallOverlay type="premium" labels={PL} signInUrl={signInUrl} />
            )}

            {/* Premium user - show full content */}
            {canAccessPremium && (
              <>
                {/* ASC / MC cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                  <div className="relative overflow-hidden rounded-xl border border-amber-400/20 bg-gradient-to-br from-amber-900/20 via-slate-800/50 to-indigo-900/30 p-5 group/card hover:border-amber-400/40 transition-colors">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full" />
                    <div className="text-amber-300/70 text-xs font-semibold mb-2 tracking-wider uppercase flex items-center gap-2">
                      <span className="text-amber-400/50">↑</span>
                      {L.ascendant}
                    </div>
                    <div className="text-2xl font-bold bg-gradient-to-r from-amber-100 to-amber-200 bg-clip-text text-transparent">
                      {viewChart.ascendant?.formatted}
                    </div>
                  </div>
                  <div className="relative overflow-hidden rounded-xl border border-indigo-400/20 bg-gradient-to-br from-indigo-900/20 via-slate-800/50 to-purple-900/30 p-5 group/card hover:border-indigo-400/40 transition-colors">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-bl-full" />
                    <div className="text-indigo-300/70 text-xs font-semibold mb-2 tracking-wider uppercase flex items-center gap-2">
                      <span className="text-indigo-400/50">◎</span>
                      MC (Midheaven)
                    </div>
                    <div className="text-2xl font-bold bg-gradient-to-r from-indigo-100 to-indigo-200 bg-clip-text text-transparent">
                      {viewChart.mc?.formatted}
                    </div>
                  </div>
                </div>

                <PlanetsTable planets={viewChart.planets} locKey={locKey} />
                <HousesTable houses={viewChart.houses} locKey={locKey} />
                {aspects && <AspectsTable aspects={aspects} locKey={locKey} />}
                {advanced && <AdvancedPanel advanced={advanced} locKey={locKey} onToggle={handleAdvancedToggle} />}
              </>
            )}
          </div>
        </details>
      ) : null}
    </Card>
  );
}
