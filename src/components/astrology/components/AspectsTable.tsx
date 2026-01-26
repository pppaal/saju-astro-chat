// src/components/astrology/components/AspectsTable.tsx
import React from 'react';
import type { AspectData, LocaleKey } from '../types';
import { LABELS } from '../constants';
import { localizePlanetLabel, localizeAspectType, getAspectColor } from '../utils';

interface AspectsTableProps {
  aspects: AspectData[];
  locKey: LocaleKey;
}

export default function AspectsTable({ aspects, locKey }: AspectsTableProps) {
  if (!aspects?.length) {return null;}

  const L = LABELS[locKey];

  return (
    <div className="mt-6">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-amber-200/90 mb-4">
        <span className="text-amber-400/50">◇</span>
        {L.aspect}
      </h3>
      <div className="overflow-x-auto rounded-xl border border-amber-400/10 bg-gradient-to-br from-slate-800/50 to-indigo-900/30">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-amber-200/70 border-b border-amber-400/15 bg-gradient-to-r from-amber-900/20 to-transparent">
              <th className="py-3 px-4 font-semibold tracking-wide">{L.aspect}</th>
              <th className="py-3 px-4 font-semibold tracking-wide">{L.from}</th>
              <th className="py-3 px-4 font-semibold tracking-wide">{L.to}</th>
              <th className="py-3 px-4 font-semibold tracking-wide">Orb</th>
              <th className="py-3 px-4 font-semibold tracking-wide">Score</th>
            </tr>
          </thead>
          <tbody>
            {aspects.slice(0, 100).map((a, i) => {
              const fromVal = typeof a?.from === 'object' ? a.from?.name : a?.from;
              const toVal = typeof a?.to === 'object' ? a.to?.name : a?.to;
              const fromName = localizePlanetLabel(String(fromVal || ''), locKey);
              const toName = localizePlanetLabel(String(toVal || ''), locKey);
              const colorClass = getAspectColor(a.type || '');
              return (
                <tr
                  key={`asp-${i}`}
                  className="border-b border-white/5 hover:bg-amber-400/5 transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClass}`}>
                      {localizeAspectType(a.type || '', locKey)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white/90 font-medium">{fromName}</td>
                  <td className="py-3 px-4 text-white/90 font-medium">{toName}</td>
                  <td className="py-3 px-4 text-white/60 font-mono text-xs">
                    {typeof a.orb === 'number' ? `${a.orb.toFixed(2)}°` : '-'}
                  </td>
                  <td className="py-3 px-4">
                    {typeof a.score === 'number' ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-slate-700/50 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
                            style={{ width: `${Math.min(Math.abs(a.score) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-white/50 text-xs font-mono">{a.score.toFixed(2)}</span>
                      </div>
                    ) : '-'}
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
