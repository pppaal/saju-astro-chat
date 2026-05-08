'use client'

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles, Shield, ScrollText, Heart, Activity, Clock, 
  Zap, Globe, Infinity as InfinityIcon,
  MessageSquare, TrendingUp, AlertCircle, CheckCircle,
} from 'lucide-react'
import type { CompatibilityPremiumReport } from '@/lib/compatibility/premiumReport'
import type { CoupleMatrixCell } from '@/lib/compatibility/coupleMatrix'
import NineLayerGrid from '@/components/compatibility/NineLayerGrid'
import CompatibilityShareBar from '@/components/compatibility/CompatibilityShareBar'

type TabKey = 'overall' | 'yearly' | 'monthly' | 'counselor'

const TABS: Array<{ key: TabKey; label: string; icon: React.ElementType }> = [
  { key: 'overall', label: '전체 리포트', icon: ScrollText },
  { key: 'yearly', label: '년별 흐름', icon: TrendingUp },
  { key: 'monthly', label: '월별 흐름', icon: Clock },
  { key: 'counselor', label: 'AI 상담사', icon: MessageSquare },
]

// ── SVG Radar (recharts 대체) ──────────────────────────────────────────
function RadarSvg({ data }: { data: { subject: string; score: number }[] }) {
  const size = 320
  const cx = size / 2
  const cy = size / 2
  const radius = 110
  const n = data.length
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const point = (i: number, val: number) => {
    const r = (val / 100) * radius
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))] as const
  }
  const polyPoints = data.map((d, i) => point(i, d.score).join(',')).join(' ')
  const gridLevels = [25, 50, 75, 100]
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
      {gridLevels.map((lvl) => (
        <polygon
          key={lvl}
          points={data.map((_, i) => point(i, lvl).join(',')).join(' ')}
          fill="none"
          stroke="rgba(168,85,247,0.15)"
          strokeWidth="1"
        />
      ))}
      {data.map((_, i) => {
        const [x, y] = point(i, 100)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(168,85,247,0.15)" strokeWidth="1" />
      })}
      <polygon points={polyPoints} fill="rgba(192,132,252,0.25)" stroke="#c084fc" strokeWidth="2" />
      {data.map((d, i) => {
        const [x, y] = point(i, 100)
        const labelOffsetX = (x - cx) * 0.18
        const labelOffsetY = (y - cy) * 0.18
        return (
          <text
            key={d.subject}
            x={x + labelOffsetX}
            y={y + labelOffsetY}
            fill="#cbd5e1"
            fontSize="11"
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="monospace"
          >
            {d.subject}
          </text>
        )
      })}
      {data.map((d, i) => {
        const [x, y] = point(i, d.score)
        return <circle key={`p-${i}`} cx={x} cy={y} r="3" fill="#c084fc" />
      })}
    </svg>
  )
}

function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0)
  React.useEffect(() => {
    let start = 0
    const duration = 1200
    const step = value / (duration / 16)
    const id = setInterval(() => {
      start += step
      if (start >= value) {
        setDisplay(value)
        clearInterval(id)
      } else {
        setDisplay(start)
      }
    }, 16)
    return () => clearInterval(id)
  }, [value])
  return <span>{display.toFixed(1)}</span>
}

// ── Tab content: Overall ───────────────────────────────────────────────
function OverallTab({ report }: { report: CompatibilityPremiumReport }) {
  const { matrix, radar, summaryNarrative } = report.overall
  const layers: Array<[string, CoupleMatrixCell[]]> = [
    ['L1 element resonance', matrix.layers.L1_element],
    ['L2 sibsin × planet', matrix.layers.L2_sibsin_planet],
    ['L3 천간합', matrix.layers.L3_stem_combination],
    ['L4 지지 합/충/형/파/해', matrix.layers.L4_branch_interaction],
    ['L5 점성 어스펙트', matrix.layers.L5_aspect_bridge],
    ['L6 대운 동기', matrix.layers.L6_daewoon_sync],
    ['L7 대운 × natal', matrix.layers.L7_daeun_natal],
    ['L8 신살 × planet', matrix.layers.L8_shinsal_planet],
    ['L9 격국 × dominant', matrix.layers.L9_geokguk_dominant],
  ]
  return (
    <div className="space-y-12">
      {/* 종합 점수 + 레이더 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center bg-slate-900/50 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-white/10 shadow-2xl">
        <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
          <span className="text-purple-400 text-sm tracking-widest mb-4 font-mono uppercase">
            Couple Matrix Synergy Score
          </span>
          <div className="text-7xl md:text-8xl font-light text-white mb-6 tracking-tighter flex items-baseline">
            <AnimatedCounter value={matrix.summary.totalScore} />
            <span className="text-2xl md:text-3xl text-slate-500 ml-2 font-mono">/100</span>
          </div>
          <p className="text-slate-300 text-base md:text-lg leading-relaxed break-keep">
            {summaryNarrative}
          </p>
          <div className="grid grid-cols-3 gap-3 mt-6 w-full">
            <Metric label="overlap" value={(matrix.summary.overlapStrength * 100).toFixed(0) + '%'} />
            <Metric label="positive" value={String(matrix.summary.polarityBalance.positive)} />
            <Metric label="negative" value={String(matrix.summary.polarityBalance.negative)} />
          </div>
        </div>
        <div className="h-80 md:h-96">
          <RadarSvg data={radar} />
        </div>
      </div>

      {/* 9 레이어 개요 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {layers.map(([name, cells]) => (
          <div
            key={name}
            className="bg-slate-900/40 border border-white/10 rounded-2xl p-5 backdrop-blur-md"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-xs font-mono uppercase tracking-wider">{name}</span>
              <span className="text-fuchsia-400 font-bold text-lg">{cells.length}</span>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed line-clamp-2">
              {cells[0]?.description || '(데이터 없음 — 자연 미발생)'}
            </p>
          </div>
        ))}
      </div>

      {/* Top 결속/주의 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Panel title="🔥 결속 셀 (top 5)" tone="positive" cells={matrix.summary.topPositiveCells} />
        <Panel title="⚠ 주의 셀 (top 5)" tone="negative" cells={matrix.summary.topCautionCells} />
      </div>

      {/* 9-레이어 격자 (셀 클릭 가능) */}
      <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-white/10">
        <NineLayerGrid matrix={matrix} />
      </div>

      {/* 마스터 서사 (간소화 버전) */}
      <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl p-8 md:p-16 border border-purple-500/20 shadow-[0_0_50px_rgba(168,85,247,0.1)] space-y-12">
        <ChapterCard
          icon={Zap}
          color="from-cyan-300 to-blue-400"
          title="제1장: 사주 일간 교차"
          body={matrix.layers.L1_element.map((c) => c.description).join(' · ') || '데이터 없음'}
        />
        <ChapterCard
          icon={Heart}
          color="from-rose-300 to-pink-400"
          title="제2장: 십성 × 점성 행성 — 끌림의 결"
          body={matrix.layers.L2_sibsin_planet.slice(0, 4).map((c) => c.description).join(' / ')}
        />
        <ChapterCard
          icon={Sparkles}
          color="from-amber-300 to-yellow-400"
          title="제3장: 천간합·지지합 — 화학적 결속"
          body={
            [...matrix.layers.L3_stem_combination, ...matrix.layers.L4_branch_interaction]
              .filter((c) => c.polarity === 'positive')
              .slice(0, 4)
              .map((c) => c.description)
              .join(' / ') || '천간합/지지합 미발생'
          }
        />
        <ChapterCard
          icon={Activity}
          color="from-purple-300 to-fuchsia-400"
          title="제4장: 점성 어스펙트 — 정서·욕망 동조"
          body={matrix.layers.L5_aspect_bridge.slice(0, 5).map((c) => c.description).join(' / ')}
        />
        <ChapterCard
          icon={Clock}
          color="from-indigo-300 to-blue-400"
          title="제5장: 대운 동기 + 시간축 압력"
          body={
            [...matrix.layers.L6_daewoon_sync, ...matrix.layers.L7_daeun_natal]
              .map((c) => c.description)
              .join(' / ')
          }
        />
        <ChapterCard
          icon={Shield}
          color="from-emerald-300 to-teal-400"
          title="제6장: 천을귀인 발화"
          body={matrix.layers.L8_shinsal_planet.map((c) => c.description).join(' / ') || '귀인 매치 없음'}
        />
        <ChapterCard
          icon={Globe}
          color="from-violet-300 to-purple-400"
          title="제7장: 격국 × 점성 우세 원소"
          body={matrix.layers.L9_geokguk_dominant.map((c) => c.description).join(' / ') || '격국 미해결 또는 우세 원소 부재'}
        />
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
      <div className="text-slate-400 text-[10px] uppercase font-mono tracking-widest mb-1">{label}</div>
      <div className="text-white text-lg font-bold">{value}</div>
    </div>
  )
}

function Panel({ title, tone, cells }: { title: string; tone: 'positive' | 'negative'; cells: CoupleMatrixCell[] }) {
  const ringColor = tone === 'positive' ? 'border-emerald-400/30 shadow-emerald-500/10' : 'border-rose-400/30 shadow-rose-500/10'
  return (
    <div className={`bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 border ${ringColor} shadow-[0_0_30px]`}>
      <h3 className="text-white font-bold text-lg mb-4">{title}</h3>
      <ul className="space-y-3">
        {cells.length === 0 && <li className="text-slate-500 text-sm">(데이터 없음)</li>}
        {cells.map((c, i) => (
          <li key={i} className="flex items-start space-x-3 text-sm">
            {tone === 'positive' ? (
              <CheckCircle className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 text-rose-400 shrink-0" />
            )}
            <span className="text-slate-200 leading-relaxed">
              <span className="text-slate-500 mr-1">[{c.score}]</span>
              {c.description}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ChapterCard({
  icon: Icon,
  color,
  title,
  body,
}: {
  icon: React.ElementType
  color: string
  title: string
  body: string
}) {
  return (
    <div className="space-y-4">
      <h3
        className={`text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${color} flex items-center border-b border-white/10 pb-4`}
      >
        <Icon className="w-7 h-7 mr-3 opacity-80" />
        {title}
      </h3>
      <p className="text-slate-300 text-base leading-loose break-keep whitespace-pre-line">
        {body}
      </p>
    </div>
  )
}

// Deterministic interpretation strings — derive a short narrative from
// the highest/lowest year/month so each tab carries a "why" line per
// data point instead of just numbers + a global recommendation.
function yearNarrative(y: CompatibilityPremiumReport['yearly'][number]): string {
  const ds = y.domainScores
  const peak = (Object.entries(ds) as Array<[keyof typeof ds, number]>).reduce(
    (a, b) => (b[1] > a[1] ? b : a),
  )
  const dip = (Object.entries(ds) as Array<[keyof typeof ds, number]>).reduce(
    (a, b) => (b[1] < a[1] ? b : a),
  )
  const peakLabel: Record<keyof typeof ds, string> = {
    attraction: '서로 끌리는 힘',
    stability: '안정적 결',
    growth: '함께 자라는 흐름',
    conflict: '갈등 견딤력',
    timing: '시기 동기화',
  }
  const dipLabel: Record<keyof typeof ds, string> = {
    attraction: '매력',
    stability: '안정',
    growth: '성장',
    conflict: '갈등',
    timing: '시기',
  }
  return `${peakLabel[peak[0]]}이 가장 두드러지는 해 — 다만 ${dipLabel[dip[0]]} 영역(${dip[1]})은 의식해서 채워야 합니다.`
}

function monthNarrative(m: CompatibilityPremiumReport['monthly'][number]): string {
  if (m.conflict <= 35) return '갈등견딤이 약해 마찰이 잦은 시기 — 큰 결정·이사·동거 시작을 미루는 게 좋습니다.'
  if (m.attraction >= 75) return '서로 가까워지는 자기장이 가장 강한 시기 — 데이트 빈도/스킨십 회복에 좋은 창입니다.'
  if (m.stability >= 75) return '루틴이 안정되는 시기 — 함께 사는 결정·공간 정비를 묶기에 적기.'
  return '균형 구간 — 큰 변동 없이 일상 합을 다질 수 있는 시기.'
}

// ── Tab content: Yearly ────────────────────────────────────────────────
function YearlyTab({ report }: { report: CompatibilityPremiumReport }) {
  return (
    <div className="space-y-6">
      <p className="text-slate-300 text-base leading-relaxed">
        현재 매트릭스를 기준으로 향후 5년간 도메인 점수 흐름을 sampling합니다. 사주 세운(年運) 변동 + 점성 트랜짓 결합 가중치 적용.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {report.yearly.map((y) => (
          <div
            key={y.year}
            className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 hover:border-fuchsia-400/40 transition-colors"
          >
            <div className="text-xs text-fuchsia-400 font-mono mb-2">YEAR</div>
            <div className="text-3xl font-bold text-white mb-3">{y.year}</div>
            <div className="text-5xl font-light text-white tracking-tight mb-3">{y.totalScore}</div>
            <div className="space-y-1.5 text-xs font-mono mb-3">
              <Bar label="매력" v={y.domainScores.attraction} color="bg-pink-400" />
              <Bar label="안정" v={y.domainScores.stability} color="bg-emerald-400" />
              <Bar label="성장" v={y.domainScores.growth} color="bg-cyan-400" />
              <Bar label="갈등" v={y.domainScores.conflict} color="bg-amber-400" />
              <Bar label="시기" v={y.domainScores.timing} color="bg-violet-400" />
            </div>
            <p className="text-[11px] text-slate-300 leading-snug border-t border-white/5 pt-3">
              {yearNarrative(y)}
            </p>
          </div>
        ))}
      </div>
      <div className="bg-slate-900/40 rounded-2xl p-6 border border-white/10 text-slate-300 text-sm leading-relaxed">
        <strong className="text-fuchsia-300">권고:</strong> 시기 점수가 가장 높은 해에 결혼·동거·창업 같은 큰 결정을 묶는 게 매트릭스 흐름과 정렬됩니다.
        안정 점수가 낮은 해에는 일상 루틴/공간 분리, 갈등 점수가 낮은 해에는 명시적 역할 분담이 필요합니다.
      </div>
    </div>
  )
}

function Bar({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <div className="flex items-center space-x-2">
      <span className="w-8 text-slate-400">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className={`${color} h-full`} style={{ width: `${v}%` }} />
      </div>
      <span className="w-8 text-right text-slate-300">{v}</span>
    </div>
  )
}

// ── Tab content: Monthly ───────────────────────────────────────────────
function MonthlyTab({ report }: { report: CompatibilityPremiumReport }) {
  const max = Math.max(...report.monthly.map((m) => m.totalScore))
  return (
    <div className="space-y-6">
      <p className="text-slate-300 text-base leading-relaxed">
        향후 12개월 월별 변동. 매력 / 안정 / 갈등견딤 점수와 매트릭스 drivers·cautions를 월 단위로 sampling.
      </p>
      <div className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 border border-white/10">
        <div className="grid grid-cols-12 gap-2 items-end h-40">
          {report.monthly.map((m) => {
            const h = (m.totalScore / 100) * 100
            return (
              <div key={m.yearMonth} className="flex flex-col items-center justify-end">
                <div
                  className="w-full bg-gradient-to-t from-fuchsia-500 to-purple-400 rounded-t-md"
                  style={{ height: `${h}%` }}
                  title={`${m.yearMonth} — ${m.totalScore}`}
                />
                <div className="text-[10px] text-slate-500 mt-1 font-mono">{m.yearMonth.slice(5)}</div>
              </div>
            )
          })}
        </div>
        <div className="text-xs text-slate-500 mt-3 font-mono">최고 {max} / 최저 {Math.min(...report.monthly.map((m) => m.totalScore))}</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {report.monthly.map((m) => (
          <div key={m.yearMonth} className="bg-slate-900/40 rounded-xl p-4 border border-white/10">
            <div className="text-xs text-fuchsia-400 font-mono mb-1">{m.yearMonth}</div>
            <div className="text-2xl font-bold text-white mb-2">{m.totalScore}</div>
            <div className="text-[11px] space-y-0.5 text-slate-300">
              <div>매력 {m.attraction} · 안정 {m.stability} · 갈등 {m.conflict}</div>
              {m.drivers[0] && <div className="text-emerald-400 truncate">+ {m.drivers[0]}</div>}
              {m.cautions[0] && <div className="text-rose-400 truncate">- {m.cautions[0]}</div>}
            </div>
            <p className="text-[11px] text-slate-300/90 leading-snug mt-2 pt-2 border-t border-white/5">
              {monthNarrative(m)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tab content: Counselor (chat-style) ────────────────────────────────
function CounselorTab({ report }: { report: CompatibilityPremiumReport }) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([
    {
      role: 'ai',
      text:
        `${report.meta.a.name}(${report.meta.a.dayMaster})와 ${report.meta.b.name}(${report.meta.b.dayMaster})의 궁합을 풀이하는 AI 상담사입니다. ` +
        `매트릭스 종합 ${report.overall.matrix.summary.totalScore}점 / 매력 ${report.overall.matrix.summary.domainScores.attraction} · 안정 ${report.overall.matrix.summary.domainScores.stability}을 기준으로 답변합니다. ` +
        `궁금한 영역(연애·결혼·재물·갈등·시기)을 입력해주세요.`,
    },
  ])
  const [input, setInput] = useState('')

  const seedQuestions = [
    '결혼하면 어떤 부분이 가장 부딪히나요?',
    '둘이 사업 같이 하면 잘 될까요?',
    '갈등이 가장 잦을 시기는 언제예요?',
    '오래 가려면 뭘 조심해야 해요?',
  ]

  const matrixContext = useMemo(() => {
    const m = report.overall.matrix
    const drivers = m.summary.drivers.join(' / ') || '없음'
    const cautions = m.summary.cautions.join(' / ') || '없음'
    const top = m.summary.topPositiveCells
      .slice(0, 3)
      .map((c) => `+ ${c.description}`)
      .join('\n')
    const bot = m.summary.topCautionCells
      .slice(0, 3)
      .map((c) => `- ${c.description}`)
      .join('\n')
    return [
      `종합 ${m.summary.totalScore} / overlap ${m.summary.overlapStrength}`,
      `매력 ${m.summary.domainScores.attraction} · 안정 ${m.summary.domainScores.stability} · 성장 ${m.summary.domainScores.growth} · 갈등 ${m.summary.domainScores.conflict} · 시기 ${m.summary.domainScores.timing}`,
      `Drivers: ${drivers}`,
      `Cautions: ${cautions}`,
      `\n[ Top positive ]\n${top}`,
      `\n[ Top caution ]\n${bot}`,
    ].join('\n')
  }, [report])

  const ask = (text: string) => {
    if (!text.trim()) return
    const userMsg = { role: 'user' as const, text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    // Local heuristic answer (deterministic). The real production hook
    // would POST to /api/compatibility/chat with { messages, matrixContext }.
    setTimeout(() => {
      const m = report.overall.matrix
      const ds = m.summary.domainScores
      let reply = ''
      const t = text.toLowerCase()
      if (t.includes('결혼') || t.includes('동거') || t.includes('marriage')) {
        reply =
          `안정 ${ds.stability} / 갈등견딤 ${ds.conflict} 기준으로 보면, 함께 살 때 마찰 영역은 일상 루틴(L4 지지 충/형 발화)이에요. ` +
          `가장 강한 결속은 "${m.summary.topPositiveCells[0]?.description || '천간합 또는 삼합'}". 결정 자체는 시기 점수 ${ds.timing}을 보면 지금 흐름이 ${ds.timing >= 80 ? '매우 우호적' : '평이함'}입니다.`
      } else if (t.includes('사업') || t.includes('비즈니스') || t.includes('재물')) {
        reply =
          `재물 영역은 두 분의 격국 정합도(L9)와 정관/정재 흐름이 핵심. 현재 매트릭스에서 격국×우세 셀: ${m.layers.L9_geokguk_dominant.map((c) => c.description).join(' / ') || '미해결'}. ` +
          `대운 시너지 ${m.layers.L6_daewoon_sync[0]?.description || '없음'} 조건이라 ${m.layers.L6_daewoon_sync[0]?.polarity === 'positive' ? '함께 비즈니스 시작 적기' : '단독 진행 후 합류 권고'}.`
      } else if (t.includes('갈등') || t.includes('싸움') || t.includes('충돌')) {
        const conflicts = m.layers.L4_branch_interaction.filter((c) => c.polarity === 'negative')
        reply =
          `구체 갈등 셀은 L4(${conflicts.length}건)와 L7 시간축 압력. ` +
          `가장 큰 신호: ${conflicts[0]?.description || '없음'}. ` +
          `자주 뜨는 시기: 월별 갈등 점수 가장 낮은 ${report.monthly.reduce((min, m) => (m.conflict < min.conflict ? m : min), report.monthly[0]).yearMonth}.`
      } else if (t.includes('시기') || t.includes('언제') || t.includes('타이밍')) {
        const best = report.yearly.reduce((b, y) => (y.totalScore > b.totalScore ? y : b), report.yearly[0])
        reply = `향후 5년 중 가장 우호적인 해는 ${best.year} (${best.totalScore}점). 이때 큰 결정 묶는 게 가장 좋습니다.`
      } else {
        reply = `매트릭스 컨텍스트: ${matrixContext.split('\n').slice(0, 3).join(' · ')}. 더 구체 질문(결혼/사업/갈등/시기)을 주시면 셀-단위로 답변합니다.`
      }
      setMessages((prev) => [...prev, { role: 'ai', text: reply }])
    }, 400)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 border border-white/10 flex flex-col h-[600px]">
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-gradient-to-br from-fuchsia-600 to-purple-600 text-white'
                    : 'bg-white/5 border border-white/10 text-slate-200'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {seedQuestions.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => ask(q)}
              className="px-3 py-1.5 rounded-full text-xs bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              {q}
            </button>
          ))}
        </div>
        <div className="flex space-x-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && ask(input)}
            placeholder="질문 입력..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-fuchsia-400/50"
          />
          <button
            type="button"
            onClick={() => ask(input)}
            className="px-5 rounded-xl bg-gradient-to-br from-fuchsia-500 to-purple-500 text-white font-semibold hover:shadow-lg hover:shadow-fuchsia-500/30"
          >
            전송
          </button>
        </div>
      </div>
      <aside className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-6 border border-white/10">
        <h3 className="text-white font-bold mb-4 flex items-center">
          <Activity className="w-4 h-4 mr-2 text-fuchsia-400" /> 매트릭스 컨텍스트
        </h3>
        <pre className="text-[11px] text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
          {matrixContext}
        </pre>
      </aside>
    </div>
  )
}

// ── Main client ────────────────────────────────────────────────────────
export default function CompatibilityReportClient({
  report,
}: {
  report: CompatibilityPremiumReport
}) {
  const [tab, setTab] = useState<TabKey>('overall')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-fuchsia-500 selection:text-white pb-24">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-indigo-600 opacity-20 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-fuchsia-600 opacity-20 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-slate-950/50 backdrop-blur-2xl sticky top-0">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              <InfinityIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-widest text-white uppercase">
                Couple Matrix Premium
              </h1>
              <p className="text-xs text-fuchsia-400 flex items-center tracking-widest font-mono mt-1">
                <Shield className="w-3 h-3 mr-1" /> 9-LAYER · CELL-LEVEL · DETERMINISTIC
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-3 text-xs font-mono text-slate-400">
            <span className="text-slate-200">{report.meta.a.name}</span>
            <span className="text-slate-500">×</span>
            <span className="text-slate-200">{report.meta.b.name}</span>
          </div>
        </div>
      </header>

      {/* Share / save bar */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-6 flex justify-end">
        <CompatibilityShareBar
          title={`${report.meta.a.name} × ${report.meta.b.name} 궁합 리포트`}
          summary={`종합 ${report.overall.matrix.summary.totalScore}점 — 매력 ${report.overall.matrix.summary.domainScores.attraction} · 안정 ${report.overall.matrix.summary.domainScores.stability} · 성장 ${report.overall.matrix.summary.domainScores.growth}`}
        />
      </section>

      {/* Couple meta */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[report.meta.a, report.meta.b].map((p, i) => (
            <div
              key={i}
              className="bg-slate-900/40 backdrop-blur-md rounded-2xl p-5 border border-white/10 flex items-center space-x-4"
            >
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-fuchsia-500/30">
                {p.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-base">{p.name}</div>
                <div className="text-slate-400 text-xs font-mono mt-1">
                  {p.pillar} · 일간 {p.dayMaster} · ASC {p.ascSign}
                </div>
                <div className="text-fuchsia-400 text-xs font-mono mt-0.5">{p.profile}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tabs */}
      <nav className="relative z-10 max-w-5xl mx-auto px-6 pt-10">
        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
          {TABS.map((t) => {
            const active = tab === t.key
            const Icon = t.icon
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex items-center space-x-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
                  active
                    ? 'bg-gradient-to-br from-fuchsia-600 to-purple-600 text-white shadow-lg shadow-fuchsia-500/30'
                    : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {tab === 'overall' && <OverallTab report={report} />}
          {tab === 'yearly' && <YearlyTab report={report} />}
          {tab === 'monthly' && <MonthlyTab report={report} />}
          {tab === 'counselor' && <CounselorTab report={report} />}
        </motion.div>
      </main>
    </div>
  )
}
