'use client'

import React from 'react'
import { getHanjaRich } from '@/lib/chart-dictionary'
import { HanjaBubble } from './HanjaBubble'
import { SibsinChip } from './SibsinChip'

/**
 * 대운 (10년 단위) 8개를 가로로 펼친 timeline. 현재 대운 강조.
 *
 * 비전공자가 "내가 인생 어느 흐름에 있는지" 한눈에 보게 만드는 띠.
 * 각 cycle 은 시작 나이 + 천간/지지 한자 + (있으면) 십성 chip 한 column.
 * 천간 오행으로 색을 입혀서 시선만으로 흐름 변화 감지 가능.
 *
 * 데이터 fallback chain:
 *   saju.daeun.list  (/api/saju 응답 형태)
 *   saju.daeWoon.list (NatalContext.saju 형태)
 *
 * 현재 대운 판정: birthYear → currentAge → list 에서 age <= currentAge 마지막 항목.
 * birthYear 없으면 현재 강조 없이 그냥 timeline 만 노출.
 */

interface DaeunCycle {
  age?: number
  heavenlyStem?: string
  earthlyBranch?: string
  ganji?: string
  sibsin?: { cheon?: string; ji?: string }
}

interface SajuLike {
  daeun?: { list?: DaeunCycle[] }
  daeWoon?: { list?: DaeunCycle[] }
}

interface DaeunTimelineProps {
  /** 사주 raw — saju.daeun.list 또는 saju.daeWoon.list 둘 다 받음 */
  saju: unknown
  /** 출생년 — 현재 나이 계산용 */
  birthYear?: number
  lang?: 'ko' | 'en'
  className?: string
}

// 오행 색 토큰 — 한국어 키 (chart-dictionary 의 hanja element 도 한국어 '목/화/토/금/수').
const ELEMENT_COLOR: Record<string, string> = {
  목: '#34d399', // emerald
  화: '#f87171', // rose
  토: '#fbbf24', // amber
  금: '#cbd5e1', // slate
  수: '#60a5fa', // blue
}

// 오행별 한 줄 tagline — 현재 대운 description 용.
const ELEMENT_TAGLINE_KO: Record<string, string> = {
  목: '성장의 시기',
  화: '확장의 시기',
  토: '안정의 시기',
  금: '결실의 시기',
  수: '흐름의 시기',
}
const ELEMENT_TAGLINE_EN: Record<string, string> = {
  목: 'Season of growth',
  화: 'Season of expansion',
  토: 'Season of stability',
  금: 'Season of harvest',
  수: 'Season of flow',
}

function extractList(saju: unknown): DaeunCycle[] {
  if (!saju || typeof saju !== 'object') return []
  const s = saju as SajuLike
  return s.daeun?.list ?? s.daeWoon?.list ?? []
}

function findCurrentIdx(list: DaeunCycle[], currentAge: number): number {
  let idx = -1
  for (let i = 0; i < list.length; i++) {
    if ((list[i].age ?? 0) <= currentAge) idx = i
    else break
  }
  return idx
}

function stemElement(stem: string | undefined, lang: 'ko' | 'en'): string | undefined {
  if (!stem) return undefined
  const entry = getHanjaRich(stem, lang)
  if (!entry) return undefined
  // stems 엔트리만 element 가지지만, branches 도 element 키 있음 — 둘 다 동작.
  return entry.element
}

export function DaeunTimeline({
  saju,
  birthYear,
  lang = 'ko',
  className,
}: DaeunTimelineProps) {
  const list = extractList(saju)
  if (list.length === 0) return null

  const currentAge = birthYear ? new Date().getFullYear() - birthYear : -1
  const currentIdx = currentAge >= 0 ? findCurrentIdx(list, currentAge) : -1
  const current = currentIdx >= 0 ? list[currentIdx] : null

  // 현재 대운 description.
  const currentLine = (() => {
    if (!current) return null
    const stem = current.heavenlyStem ?? ''
    const branch = current.earthlyBranch ?? ''
    const ganji = current.ganji ?? `${stem}${branch}`.trim()
    if (!ganji) return null
    const element = stemElement(stem, lang)
    const tagline = element
      ? (lang === 'en' ? ELEMENT_TAGLINE_EN : ELEMENT_TAGLINE_KO)[element]
      : undefined
    if (lang === 'en') {
      return `Now: from age ${current.age ?? 0} — ${ganji}${tagline ? ` · ${tagline}` : ''}`
    }
    return `현재: ${current.age ?? 0}세~ ${ganji} 대운${tagline ? ` — ${tagline}` : ''}`
  })()

  const header =
    lang === 'en'
      ? 'Daeun (10-year cycles) · Flow of life'
      : '대운 (10년 단위) · 인생의 흐름'
  const explainer =
    lang === 'en'
      ? "8 cycles of 10 years each = 80-year life flow. Gold border = current cycle. Color = the cycle's element."
      : '10년씩 8 구간, 총 80년 운의 흐름. 금색 칸이 지금 시기, 색은 그 시기의 기운(오행)이에요.'
  const nowLabel = lang === 'en' ? 'NOW' : 'NOW'

  return (
    <div
      className={`rounded-lg p-3 ${className ?? ''}`}
      style={{
        background: 'var(--ds-dark-surface)',
        border: '1px solid var(--ds-dark-border)',
      }}
    >
      {/* Header */}
      <div className="mb-1 px-1">
        <div
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: 'var(--ds-gold-on-dark)' }}
        >
          {header}
        </div>
      </div>
      {/* Plain-language explainer — 비전공자 대상. */}
      <div
        className="mb-3 px-1 text-[11px] leading-snug"
        style={{ color: 'var(--ds-dark-text-muted)' }}
      >
        {explainer}
      </div>

      {/* Timeline — 모바일: 가로 스크롤, 데스크탑: 8개 한 줄 (flex). */}
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-1.5 sm:min-w-0 sm:justify-between">
          {list.map((cycle, idx) => {
            const stem = cycle.heavenlyStem ?? ''
            const branch = cycle.earthlyBranch ?? ''
            const element = stemElement(stem, lang)
            const color = element ? ELEMENT_COLOR[element] : undefined
            const isCurrent = idx === currentIdx
            const cheonSibsin = cycle.sibsin?.cheon

            return (
              <div
                key={`${cycle.age ?? idx}-${stem}${branch}`}
                className={`flex min-w-[44px] flex-1 flex-col items-center rounded-md px-1 py-1.5 transition-transform ${
                  isCurrent ? '-translate-y-1' : ''
                }`}
                style={{
                  border: isCurrent
                    ? '2px solid var(--ds-gold-on-dark)'
                    : '1px solid var(--ds-dark-border)',
                  background: isCurrent
                    ? 'rgba(212, 181, 114, 0.08)'
                    : 'transparent',
                }}
              >
                {/* 시작 나이 */}
                <div
                  className="text-[10px] font-medium leading-none"
                  style={{ color: 'var(--ds-dark-text-muted)' }}
                >
                  {cycle.age ?? 0}
                </div>

                {/* 천간 — 오행 색 */}
                <div
                  className="mt-1 text-[15px] font-semibold leading-none"
                  style={{ color: color ?? 'var(--ds-dark-text)' }}
                >
                  {stem ? (
                    <HanjaBubble hanja={stem}>{stem}</HanjaBubble>
                  ) : (
                    <span>·</span>
                  )}
                </div>

                {/* 지지 */}
                <div
                  className="mt-0.5 text-[13px] leading-none"
                  style={{ color: 'var(--ds-dark-text)' }}
                >
                  {branch ? (
                    <HanjaBubble hanja={branch}>{branch}</HanjaBubble>
                  ) : (
                    <span>·</span>
                  )}
                </div>

                {/* 십성 chip (있으면) */}
                {cheonSibsin && (
                  <div className="mt-1">
                    <SibsinChip sibsin={cheonSibsin} size="xs" />
                  </div>
                )}

                {/* NOW 라벨 */}
                {isCurrent && (
                  <div
                    className="mt-1 rounded-sm px-1 py-0.5 text-[8px] font-bold leading-none"
                    style={{
                      background: 'var(--ds-gold-on-dark)',
                      color: '#1a1226',
                    }}
                  >
                    {nowLabel}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 현재 대운 description */}
      {currentLine && (
        <div
          className="mt-3 px-1 text-sm leading-snug"
          style={{ color: 'var(--ds-dark-text)' }}
        >
          {currentLine}
        </div>
      )}
    </div>
  )
}
