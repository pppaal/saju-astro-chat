// src/components/astrology/components/PlanetsTable.tsx
import React from 'react';
import Image from 'next/image';
import type { LocalizedPlanet, LocaleKey } from '../types';
import { LABELS, PLANET_LABELS } from '../constants';
import { getPlanetImage } from '../utils';

interface PlanetsTableProps {
  planets: LocalizedPlanet[];
  locKey: LocaleKey;
}

export default function PlanetsTable({ planets, locKey }: PlanetsTableProps) {
  if (!planets?.length) return null;

  const L = LABELS[locKey];

  // Find original English planet name for image mapping
  const getOriginalPlanetName = (localizedName: string): string => {
    for (const [_locale, labels] of Object.entries(PLANET_LABELS)) {
      for (const [key, value] of Object.entries(labels)) {
        if (value === localizedName) return key;
      }
    }
    return localizedName;
  };

  return (
    <div className="mt-6">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-amber-200/90 mb-4">
        <span className="text-amber-400/50">◈</span>
        {L.planetPositions}
      </h3>
      <div className="overflow-x-auto rounded-xl border border-amber-400/10 bg-gradient-to-br from-slate-800/50 to-indigo-900/30">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-amber-200/70 border-b border-amber-400/15 bg-gradient-to-r from-amber-900/20 to-transparent">
              <th className="py-3 px-4 font-semibold tracking-wide">{L.planet}</th>
              <th className="py-3 px-4 font-semibold tracking-wide">{L.position}</th>
              <th className="py-3 px-4 font-semibold tracking-wide">{L.house}</th>
              <th className="py-3 px-4 font-semibold tracking-wide">{L.speed}</th>
            </tr>
          </thead>
          <tbody>
            {planets.map((p, idx) => {
              const originalName = getOriginalPlanetName(p.name);
              const planetImage = getPlanetImage(originalName);
              return (
                <tr
                  key={`${p.name}-${idx}`}
                  className="border-b border-white/5 hover:bg-amber-400/5 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {planetImage && (
                        <div className="relative w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden border border-amber-400/20 bg-black/30">
                          <Image
                            src={planetImage}
                            alt={p.name}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-white/95">{p.name}</span>
                        {p.retrograde ? (
                          <span
                            className="ml-2 align-middle text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/40 text-amber-200 font-bold"
                            title={L.retrograde}
                            aria-label={L.retrograde}
                          >
                            R
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-white/90 font-medium">{p.formatted}</td>
                  <td className="py-3 px-4 text-amber-100/70">{`${L.house} ${p.house}`}</td>
                  <td className="py-3 px-4 text-white/60 font-mono text-xs">
                    {typeof p.speed === 'number' ? `${p.speed.toFixed(3)}°/day` : '−'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
