// src/components/astrology/components/AdvancedPanel.tsx
import React, { useState } from 'react';
import type { AdvancedData, AdvancedPoint, LocaleKey } from '../types';
import { LABELS, EXTRA_NAMES } from '../constants';
import { localizePlanetLabel } from '../utils';

interface AdvancedPanelProps {
  advanced: AdvancedData;
  locKey: LocaleKey;
  onToggle?: (isOpen: boolean) => void;
}

export default function AdvancedPanel({ advanced, locKey, onToggle }: AdvancedPanelProps) {
  const [open, setOpen] = useState(false);

  if (!advanced) {return null;}

  const L = LABELS[locKey];
  const opts = advanced.options || {};
  const meta = advanced.meta || {};
  const advPoints = Array.isArray(advanced.points) ? advanced.points : [];

  const extraPoints = advPoints.filter((p: AdvancedPoint) => {
    const n = String(p?.name ?? '').trim();
    return EXTRA_NAMES.has(n);
  });

  const isRx = (p: AdvancedPoint) =>
    Boolean(p?.rx || (typeof p?.speed === 'number' && p.speed < 0));

  const handleToggle = () => {
    const newOpen = !open;
    setOpen(newOpen);
    if (newOpen && onToggle) {
      onToggle(true);
    }
  };

  return (
    <section className="mt-8">
      {/* Divider */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-400/20 to-transparent" />
        <span className="text-purple-400/40 text-xs">✧</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-purple-400/20 to-transparent" />
      </div>

      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-purple-500/10 hover:from-purple-500/15 hover:via-indigo-500/15 hover:to-purple-500/15 border border-purple-400/20 hover:border-purple-400/40 rounded-xl px-5 py-4 transition-all"
      >
        <span className="flex items-center gap-2 font-semibold text-purple-200">
          <span className="text-purple-400/60">⚙</span>
          {L.advanced}
        </span>
        <span className="text-purple-400/60 text-lg transition-transform duration-300" style={{ transform: open ? 'rotate(45deg)' : 'none' }}>+</span>
      </button>

      {open && (
        <div className="mt-5 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Engine & Options */}
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-purple-200/90 mb-4">
              <span className="text-purple-400/50">⚡</span>
              Engine & Options
            </h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border border-purple-400/15 p-4 space-y-2">
                <div className="flex justify-between"><span className="text-white/50">{L.engine}</span><span className="text-white/90 font-medium">{meta.engine || '—'}</span></div>
                <div className="flex justify-between"><span className="text-white/50">{L.se}</span><span className="text-white/90 font-medium">{meta.seVersion || meta.sweVersion || '—'}</span></div>
                <div className="flex justify-between"><span className="text-white/50">{L.nodeType}</span><span className="text-white/90 font-medium">{meta.nodeType || opts.nodeType || '—'}</span></div>
                <div className="flex justify-between"><span className="text-white/50">{L.houseSystem}</span><span className="text-white/90 font-medium">{meta.houseSystem || opts.houseSystem || '—'}</span></div>
                <div className="flex justify-between"><span className="text-white/50">{L.theme}</span><span className="text-white/90 font-medium">{opts.theme || '—'}</span></div>
              </div>
              <div className="rounded-xl bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border border-purple-400/15 p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/50">{L.includeMinor}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${(opts.includeMinorAspects ?? meta.includeMinorAspects) ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-500/20 text-slate-400'}`}>
                    {String(!!(opts.includeMinorAspects ?? meta.includeMinorAspects))}
                  </span>
                </div>
                <div className="pt-2 border-t border-white/5">
                  <div className="text-white/50 mb-2">{L.enable}</div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className={`text-center px-2 py-1.5 rounded-lg text-xs ${opts.enable?.chiron ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-slate-800/50 text-slate-500'}`}>
                      {L.chiron}
                    </div>
                    <div className={`text-center px-2 py-1.5 rounded-lg text-xs ${opts.enable?.lilith ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30' : 'bg-slate-800/50 text-slate-500'}`}>
                      {L.lilith}
                    </div>
                    <div className={`text-center px-2 py-1.5 rounded-lg text-xs ${opts.enable?.pof ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800/50 text-slate-500'}`}>
                      {L.pof}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Extra Points */}
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-purple-200/90 mb-4">
              <span className="text-purple-400/50">★</span>
              {L.extraOnly}
            </h3>
            {extraPoints.length === 0 ? (
              <div className="rounded-xl border border-purple-400/10 bg-purple-900/10 p-4 text-sm text-white/60 text-center">
                {L.noData}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-purple-400/10 bg-gradient-to-br from-slate-800/50 to-purple-900/20">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-purple-200/70 border-b border-purple-400/15 bg-gradient-to-r from-purple-900/30 to-transparent">
                      <th className="py-3 px-4 font-semibold">{L.planet}</th>
                      <th className="py-3 px-4 font-semibold">{L.position}</th>
                      <th className="py-3 px-4 font-semibold">{L.house}</th>
                      <th className="py-3 px-4 font-semibold">{L.speed}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {extraPoints.map((p: AdvancedPoint, i: number) => (
                      <tr key={`extra-${i}`} className="border-b border-white/5 hover:bg-purple-400/5 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-medium text-white/95">
                            {localizePlanetLabel(String(p.name || p.key || ''), locKey)}
                          </span>
                          {isRx(p) && (
                            <span
                              className="ml-2 align-middle text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/40 text-amber-200 font-bold"
                              title={L.retrograde}
                            >
                              R
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-white/90 font-medium">{p.formatted || '−'}</td>
                        <td className="py-3 px-4 text-purple-100/70">{p.house ?? '−'}</td>
                        <td className="py-3 px-4 text-white/60 font-mono text-xs">
                          {typeof p.speed === 'number' ? `${p.speed.toFixed(3)}°/day` : '−'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
