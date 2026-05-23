'use client'

import React from 'react'
import { AXES, deriveCounts, type Counts } from '@/components/destiny-map/charts/ElementRadar'

/**
 * 궁합용 오행 비교 레이더. 한 오각형 위에 두 사람의 오행 균형을
 * 색으로 구분해 겹쳐 그린다(A rose, B sky). 두 사람을 같은 척도로
 * 비교하려고 둘의 최댓값으로 함께 정규화한다.
 */

interface CompatRadarOverlayProps {
  sajuA?: unknown
  sajuB?: unknown
  nameA?: string
  nameB?: string
  lang?: 'ko' | 'en'
}

const W = 300
const H = 248
const CX = W / 2
const CY = 116
const R = 64

const pt = (r: number, i: number) => {
  const deg = -90 + i * 72
  const rad = (deg * Math.PI) / 180
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

export function CompatRadarOverlay({
  sajuA,
  sajuB,
  nameA = 'A',
  nameB = 'B',
  lang = 'ko',
}: CompatRadarOverlayProps) {
  const isKo = lang === 'ko'
  const a = deriveCounts(sajuA)
  const b = deriveCounts(sajuB)
  const max = Math.max(...AXES.map((x) => Math.max(a[x.key], b[x.key])), 1)

  const sumA = AXES.reduce((s, x) => s + a[x.key], 0)
  const sumB = AXES.reduce((s, x) => s + b[x.key], 0)
  if (sumA <= 0 && sumB <= 0) {
    return (
      <div className="rounded-xl border border-[#e7e4df] bg-[#fcfbfa] p-4 text-center text-sm text-[#a8a29e]">
        {isKo ? '오행 정보가 아직 계산되지 않았습니다.' : 'Element data is not ready yet.'}
      </div>
    )
  }

  const ringPoly = (frac: number) => AXES.map((_, i) => { const p = pt(R * frac, i); return `${p.x},${p.y}` }).join(' ')
  const poly = (c: Counts) => AXES.map((x, i) => { const p = pt(R * Math.max(0.04, c[x.key] / max), i); return `${p.x},${p.y}` }).join(' ')

  const domOf = (c: Counts) =>
    (Object.keys(c) as Array<keyof Counts>).reduce((p, q) => (c[q] > c[p] ? q : p), 'wood')
  const domA = AXES.find((x) => x.key === domOf(a))!
  const domB = AXES.find((x) => x.key === domOf(b))!

  const rose = '#fb7185'
  const sky = '#38bdf8'

  return (
    <div className="rounded-xl border border-[#e7e4df] bg-[#fcfbfa] p-3">
      <div className="mb-1 flex items-center justify-center gap-4 text-[11px] font-semibold">
        <span className="flex items-center gap-1.5" style={{ color: rose }}>
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: rose }} />{nameA}
        </span>
        <span className="flex items-center gap-1.5" style={{ color: sky }}>
          <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: sky }} />{nameB}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} points={ringPoly(f)} fill="none" stroke="rgba(28,25,23,0.10)" strokeWidth="1" />
        ))}
        {AXES.map((_, i) => { const p = pt(R, i); return <line key={i} x1={CX} y1={CY} x2={p.x} y2={p.y} stroke="rgba(28,25,23,0.10)" strokeWidth="1" /> })}

        {sumA > 0 && <polygon points={poly(a)} fill="rgba(251,113,133,0.28)" stroke={rose} strokeWidth="2" />}
        {sumB > 0 && <polygon points={poly(b)} fill="rgba(56,189,248,0.24)" stroke={sky} strokeWidth="2" />}

        {AXES.map((x, i) => {
          const lp = pt(R + 18, i)
          const c = Math.cos((-90 + i * 72) * Math.PI / 180)
          const anchor = c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle'
          return (
            <text key={x.key} x={lp.x} y={lp.y} fill="#57534e" fontSize="11" fontWeight="600" textAnchor={anchor} dominantBaseline="middle">
              {isKo ? x.ko : x.en}
            </text>
          )
        })}
      </svg>

      <div className="mt-2 rounded-xl border border-[#ebe8e3] bg-[#faf9f7] p-3 text-center text-sm leading-relaxed text-[#44403c]">
        {isKo ? (
          <>
            <span className="font-bold" style={{ color: rose }}>{nameA}</span>는 <span className="font-bold text-[#a07a3c]">{domA.ko}</span>,{' '}
            <span className="font-bold" style={{ color: sky }}>{nameB}</span>는 <span className="font-bold text-[#a07a3c]">{domB.ko}</span>이(가) 가장 두드러져요.
          </>
        ) : (
          <>
            <span className="font-bold" style={{ color: rose }}>{nameA}</span> leans <span className="font-bold text-[#a07a3c]">{domA.en}</span>,{' '}
            <span className="font-bold" style={{ color: sky }}>{nameB}</span> leans <span className="font-bold text-[#a07a3c]">{domB.en}</span>.
          </>
        )}
      </div>
    </div>
  )
}

export default CompatRadarOverlay
