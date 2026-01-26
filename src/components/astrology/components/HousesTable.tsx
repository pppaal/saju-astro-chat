// src/components/astrology/components/HousesTable.tsx
import React from 'react';
import type { LocalizedHouse, LocaleKey } from '../types';
import { LABELS } from '../constants';

interface HousesTableProps {
  houses: LocalizedHouse[];
  locKey: LocaleKey;
}

export default function HousesTable({ houses, locKey }: HousesTableProps) {
  if (!houses?.length) {return null;}

  const L = LABELS[locKey];

  return (
    <div className="mt-6">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-amber-200/90 mb-4">
        <span className="text-amber-400/50">⌂</span>
        Houses
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {houses.map((h, idx) => (
          <div
            key={`house-${idx + 1}`}
            className="rounded-lg border border-amber-400/10 bg-gradient-to-br from-slate-800/40 to-indigo-900/20 p-3 hover:border-amber-400/25 transition-colors"
          >
            <div className="text-amber-300/60 text-xs font-semibold mb-1 tracking-wider uppercase">
              {`${L.house} ${idx + 1}`}
            </div>
            <div className="text-white/90 font-medium">{h.formatted}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
