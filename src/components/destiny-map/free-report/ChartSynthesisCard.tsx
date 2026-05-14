'use client'

import type { ChartSynthesis } from '@/lib/astrology/foundation/synthesis'

const ELEMENT_KO: Record<string, string> = {
  fire: '불(화)', earth: '땅(토)', air: '바람(공)', water: '물(수)',
}
const ELEMENT_TONE: Record<string, string> = {
  fire: 'bg-rose-500/20 text-rose-200 border-rose-400/30',
  earth: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
  air: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/30',
  water: 'bg-blue-500/20 text-blue-200 border-blue-400/30',
}
const ELEMENT_BAR: Record<string, string> = {
  fire: 'bg-rose-400/70',
  earth: 'bg-amber-400/70',
  air: 'bg-cyan-400/70',
  water: 'bg-blue-400/70',
}
const MODALITY_KO: Record<string, string> = {
  cardinal: '활동형(주도)', fixed: '고정형(지속)', mutable: '변동형(유연)',
}
const SHAPE_KO: Record<string, { label: string; desc: string }> = {
  bundle: { label: '번들', desc: '120° 안에 모든 행성 — 한 영역에 강하게 집중된 결' },
  bowl: { label: '보울', desc: '180° 안에 행성 모임 — 한쪽으로 기울어진 큰 그릇' },
  bucket: { label: '버킷', desc: '보울 + 반대편 한 행성이 손잡이 — 그 행성이 인생의 채널' },
  locomotive: { label: '로코모티브', desc: '240° 분포, 한 1/3 비어있음 — 동력원이 있는 추진형' },
  seesaw: { label: '시소', desc: '두 무리가 마주보며 진동 — 상반된 영역을 오가는 결' },
  splay: { label: '스플레이', desc: '3 묶음 분산 — 다재다능, 여러 갈래로 뻗는 결' },
  splash: { label: '스플래시', desc: '12 사인에 골고루 — 다방면 관심, 산만함과 다재의 양면' },
}

export default function ChartSynthesisCard({ synth }: { synth: ChartSynthesis }) {
  const { balance, dominant, shape, patterns, emphasizedHouse } = synth
  const shapeMeta = SHAPE_KO[shape]

  return (
    <section className="rounded-3xl border border-purple-400/30 bg-gradient-to-br from-purple-500/10 via-fuchsia-500/5 to-transparent p-5 sm:p-6 backdrop-blur-md">
      <div className="mb-4">
        <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-purple-300 mb-1">
          Chart Synthesis
        </p>
        {synth.signature && (
          <h3 className="text-lg font-bold text-white">{synth.signature}</h3>
        )}
        {synth.archetype && (
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">{synth.archetype}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Element balance */}
        <div className="rounded-xl bg-slate-900/40 border border-white/10 p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-2">
            원소 균형 (점성 4원소)
          </div>
          <div className="space-y-1.5">
            {(['fire', 'earth', 'air', 'water'] as const).map((el) => {
              const v = balance.element[el]
              const tone = ELEMENT_TONE[el]
              return (
                <div key={el} className="flex items-center gap-2 text-xs">
                  <span className={`w-14 px-2 py-0.5 rounded-md border text-center ${tone}`}>
                    {ELEMENT_KO[el]}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className={ELEMENT_BAR[el]} style={{ width: `${v}%`, height: '100%' }} />
                  </div>
                  <span className="w-10 text-right font-mono text-slate-300">{v}%</span>
                </div>
              )
            })}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            우세: <span className="text-white font-medium">{ELEMENT_KO[balance.element.dominant]}</span>
            {balance.element.lacking && (
              <> · 부족: <span className="text-slate-300">{ELEMENT_KO[balance.element.lacking]}</span></>
            )}
          </p>
        </div>

        {/* Modality balance */}
        <div className="rounded-xl bg-slate-900/40 border border-white/10 p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-2">
            속성 균형
          </div>
          <div className="space-y-1.5">
            {(['cardinal', 'fixed', 'mutable'] as const).map((m) => {
              const v = balance.modality[m]
              return (
                <div key={m} className="flex items-center gap-2 text-xs">
                  <span className="w-24 text-slate-300">{MODALITY_KO[m]}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="bg-fuchsia-400/40 h-full" style={{ width: `${v}%` }} />
                  </div>
                  <span className="w-10 text-right font-mono text-slate-300">{v}%</span>
                </div>
              )
            })}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            우세: <span className="text-white font-medium">{MODALITY_KO[balance.modality.dominant]}</span>
          </p>
        </div>

        {/* Hemisphere */}
        <div className="rounded-xl bg-slate-900/40 border border-white/10 p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-2">
            반구 분포 (행성 수)
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-slate-300">
              낮·공적 (H7–12):{' '}
              <span className="text-white font-bold">{balance.hemisphere.daytime}개</span>
            </div>
            <div className="text-slate-300">
              밤·사적 (H1–6):{' '}
              <span className="text-white font-bold">{balance.hemisphere.nighttime}개</span>
            </div>
            <div className="text-slate-300">
              자기 (H10–12·1–3):{' '}
              <span className="text-white font-bold">{balance.hemisphere.eastern}개</span>
            </div>
            <div className="text-slate-300">
              타인 (H4–9):{' '}
              <span className="text-white font-bold">{balance.hemisphere.western}개</span>
            </div>
          </div>
        </div>

        {/* Dominant + emphasized house */}
        <div className="rounded-xl bg-slate-900/40 border border-white/10 p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-2">
            우세 행성 / 강조 하우스
          </div>
          {dominant ? (
            <p className="text-sm text-slate-200">
              <span className="text-fuchsia-300 font-bold">{dominant.name}</span> — 어스펙트{' '}
              {dominant.aspectCount}개 (영향력 {dominant.totalScore}점)
            </p>
          ) : (
            <p className="text-sm text-slate-400">감지된 어스펙트가 없어요</p>
          )}
          {emphasizedHouse !== null ? (
            <p className="text-sm text-slate-200 mt-1">
              강조 하우스: <span className="text-fuchsia-300 font-bold">{emphasizedHouse}H</span>
            </p>
          ) : (
            <p className="text-xs text-slate-500 mt-1">하우스 분포 균등</p>
          )}
        </div>
      </div>

      {/* Chart shape */}
      <div className="mt-4 rounded-xl bg-slate-900/40 border border-purple-400/20 p-4">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[10px] font-mono uppercase tracking-widest text-purple-300">
            차트 모양
          </span>
          <span className="text-base font-bold text-white">{shapeMeta?.label || shape}</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">{shapeMeta?.desc || ''}</p>
      </div>

      {/* Aspect patterns */}
      {patterns.length > 0 && (
        <div className="mt-3 rounded-xl bg-slate-900/40 border border-amber-400/20 p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-amber-300 mb-2">
            감지된 패턴
          </div>
          <ul className="space-y-1">
            {patterns.map((p, i) => (
              <li
                key={`${p}-${i}`}
                className="text-sm text-amber-100 flex items-start gap-2"
              >
                <span className="text-amber-400">⚡</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
