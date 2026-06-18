'use client'

import React from 'react'

/**
 * 궁합 점수 분해 카드 — verdict 밴드 + 5 카테고리 시각 바.
 *
 * 계산은 하지 않는다 — 서버(compatReport)에서 도출한 breakdown 을 받아
 * 표시만 한다. (SSOT: 점수 산식은 서버 한 곳에만.)
 */

interface BreakdownScores {
  /** 사주 합 (천간합·삼합·육합·방합) — 0~100 */
  eastern_hap?: number
  /** 사주 충 (감점 반전 — 높을수록 충 없음) — 0~100 */
  eastern_chung?: number
  /** 오행 보완 — 0~100 */
  elements_match?: number
  /** 시너스트리 트라인/섹스타일 — 0~100 */
  synastry_harmonic?: number
  /** 시너스트리 사각/대립 (감점 반전 — 높을수록 긴장 없음) — 0~100 */
  synastry_tension?: number
}

export interface ScoreBreakdownProps {
  /** 총합 점수 0-100. 미제공 시 breakdown 평균으로 도출. */
  total?: number
  /** 카테고리별 0-100 (서버에서 계산해 전달). */
  breakdown?: BreakdownScores
  lang?: 'ko' | 'en'
  className?: string
  /**
   * 'score' (기본) — 큰 "N / 100" 숫자 + verdict + 분해 바.
   * 'band' — 점수 산식이 보정된 휴리스틱이라 정밀 숫자를 헤드라인으로 박지
   *   않는다. 큰 숫자 대신 verdict 밴드 라벨을 크게 + 분해 바로 근거를 그대로
   *   노출(조화/긴장 포함). 차트 리포트 히어로용.
   */
  variant?: 'score' | 'band'
  /** 'dark'(기본) navy glass 모달 / 'light' 종이·흰 카드 위. */
  theme?: 'dark' | 'light'
}

// ─── verdict ─────────────────────────────────────────────────────────

export function verdictText(total: number, lang: 'ko' | 'en'): string {
  if (lang === 'en') {
    if (total >= 90) return 'Profound bond — naturally aligned'
    if (total >= 75) return 'Complementary differences — deep harmony with gentle spark'
    if (total >= 60) return 'Moderate — grows with mutual effort'
    if (total >= 45) return 'Challenging — mind the friction zones'
    return 'Very different rhythms — approach with care'
  }
  if (total >= 90) return '매우 깊은 인연 — 자연스러운 합'
  if (total >= 75) return '다른 결이 서로 보완 — 깊되 살짝 자극도'
  if (total >= 60) return '보통 — 노력하면 좋아짐'
  if (total >= 45) return '쉽지 않음 — 부딪히는 지점 조심'
  return '결이 많이 달라 — 천천히 다가가기'
}

/**
 * 짧은 등급 라벨 — 공유 카드 링 중앙처럼 한 단어가 필요한 곳에서 verdictText 의
 * 긴 문장 대신 쓴다. 같은 score 임계값을 공유하므로 카드와 차트가 어긋나지 않는다.
 * (정밀 "N/100" 숫자는 안 박는 휴리스틱 정책과 동일 — 등급 단어만.)
 */
export function compatTier(total: number, lang: 'ko' | 'en'): string {
  if (lang === 'en') {
    if (total >= 90) return 'Top Match'
    if (total >= 75) return 'Great Match'
    if (total >= 60) return 'Good Match'
    if (total >= 45) return 'Takes Effort'
    return 'Handle with Care'
  }
  if (total >= 90) return '최고의 합'
  if (total >= 75) return '아주 잘 맞아요'
  if (total >= 60) return '잘 맞아요'
  if (total >= 45) return '노력하면'
  return '조심스러운'
}

// ─── 표시 ────────────────────────────────────────────────────────────

interface RowConfig {
  key: keyof BreakdownScores
  emoji: string
  labelKo: string
  labelEn: string
  /** 바 색 — 조화 계열(골드) vs 긴장 계열(로즈레드). */
  tone: 'harmony' | 'tension'
  /** 0-100 점수에서 빈 바일 때 표시할 보조 텍스트 */
  emptyKo: string
  emptyEn: string
}

const ROWS: RowConfig[] = [
  {
    key: 'eastern_hap',
    emoji: '💕',
    labelKo: '사주 합',
    labelEn: 'Saju Union',
    tone: 'harmony',
    emptyKo: '합 없음',
    emptyEn: 'no union',
  },
  {
    // 충은 "낮을수록 충돌 많음"으로 반전된 값 → 라벨을 긍정(높을수록 좋음)으로 통일.
    // 막대 길이 = 항상 좋음(헷갈림 제거). 낮을 때만 빈상태 텍스트로 충돌을 알림.
    key: 'eastern_chung',
    emoji: '🕊️',
    labelKo: '충 없이 안정',
    labelEn: 'Stable, no clash',
    tone: 'harmony',
    emptyKo: '충돌 있음',
    emptyEn: 'has clash',
  },
  {
    key: 'elements_match',
    emoji: '🌿',
    labelKo: '오행 보완',
    labelEn: 'Element Match',
    tone: 'harmony',
    emptyKo: '보완 적음',
    emptyEn: 'low complement',
  },
  {
    key: 'synastry_harmonic',
    emoji: '✨',
    labelKo: '별자리 조화',
    labelEn: 'Star harmony',
    tone: 'harmony',
    emptyKo: '조화 적음',
    emptyEn: 'low harmony',
  },
  {
    // 긴장도 반전 값(낮을수록 긴장 많음) → 긍정 라벨로 통일.
    key: 'synastry_tension',
    emoji: '🌙',
    labelKo: '긴장 없이 편안',
    labelEn: 'Calm, no tension',
    tone: 'harmony',
    emptyKo: '긴장 있음',
    emptyEn: 'has tension',
  },
]

function ScoreBar({
  value,
  tone = 'harmony',
  theme = 'dark',
}: {
  value: number
  tone?: 'harmony' | 'tension'
  theme?: 'dark' | 'light'
}) {
  const clamped = Math.max(0, Math.min(100, value))
  const isLight = theme === 'light'
  // 긴장 계열(시너 긴장·사주 충)은 로즈레드, 조화 계열은 골드 — 한눈에 좋은
  // 신호 vs 마찰 신호를 색으로 구분. 라이트는 종이 위에서 대비 나도록 진한 톤.
  const fill =
    tone === 'tension'
      ? isLight
        ? 'linear-gradient(90deg, #c0564a 0%, rgba(192,86,74,0.5) 100%)'
        : 'linear-gradient(90deg, #f9a8a8 0%, rgba(249,168,168,0.5) 100%)'
      : isLight
        ? 'linear-gradient(90deg, var(--ds-gold, #a07a3c) 0%, var(--ds-gold-soft, #c19b56) 100%)'
        : 'linear-gradient(90deg, var(--ds-gold-on-dark, #d4af6a) 0%, var(--ds-gold-on-dark-soft, #c9a76a) 100%)'
  return (
    <div
      className="relative h-2 flex-1 overflow-hidden rounded-full"
      style={{ background: isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.08)' }}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${clamped}%`, background: fill }}
      />
    </div>
  )
}

export function ScoreBreakdown({
  total,
  breakdown,
  lang = 'ko',
  className,
  variant = 'score',
  theme = 'dark',
}: ScoreBreakdownProps) {
  const isLight = theme === 'light'
  const pal = isLight
    ? {
        cardBg: 'var(--ds-gold-soft-bg, rgba(160,122,60,0.08))',
        border: 'var(--ds-light-border, #e7e5e4)',
        gold: 'var(--ds-gold, #a07a3c)',
        text: 'var(--ds-light-text, #1c1917)',
        muted: 'var(--ds-light-text-muted, #57534e)',
        glow: 'rgba(160,122,60,0.18)',
      }
    : {
        cardBg: 'linear-gradient(135deg, rgba(212,175,106,0.10) 0%, rgba(168,131,240,0.10) 100%)',
        border: 'var(--ds-dark-border, rgba(255,255,255,0.10))',
        gold: 'var(--ds-gold-on-dark, #d4af6a)',
        text: 'var(--ds-dark-text, rgba(255,255,255,0.85))',
        muted: 'var(--ds-dark-text-muted, rgba(255,255,255,0.55))',
        glow: 'rgba(212,175,106,0.25)',
      }
  const computed: BreakdownScores = breakdown ?? {}

  const availableRows = ROWS.filter((r) => computed[r.key] !== undefined)

  // 총합: 명시 total > breakdown 평균 > 0
  let totalScore: number
  if (typeof total === 'number') {
    totalScore = Math.max(0, Math.min(100, total))
  } else {
    const vals = availableRows
      .map((r) => computed[r.key])
      .filter((v): v is number => typeof v === 'number')
    totalScore = vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0
  }

  if (availableRows.length === 0 && total === undefined) {
    return null
  }

  const verdict = verdictText(totalScore, lang)
  const headerKo = '총합 궁합 점수'
  const headerEn = 'Overall Compatibility'

  return (
    <div
      className={`rounded-xl p-4 ${className ?? ''}`}
      style={{ background: pal.cardBg, border: `1px solid ${pal.border}` }}
    >
      {/* 총점 헤더 */}
      <div className="flex flex-col items-center gap-1 pb-3">
        <div
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: pal.gold }}
        >
          {lang === 'en' ? headerEn : headerKo}
        </div>
        {variant === 'band' ? (
          // 밴드 모드 — 큰 숫자(가짜 정밀) 대신: 3초 안에 읽히는 등급 단어를 제일
          // 크게(직관), 그 아래 결을 설명하는 verdict 문장. 근거는 분해 바.
          <>
            <div
              className="text-center font-bold"
              style={{
                fontSize: 34,
                lineHeight: 1.1,
                fontFamily: 'var(--font-cinzel), Georgia, serif',
                color: pal.gold,
                textShadow: `0 1px 12px ${pal.glow}`,
              }}
            >
              {compatTier(totalScore, lang)}
            </div>
            <div className="px-2 text-center text-[13px]" style={{ color: pal.text }}>
              {verdict}
            </div>
          </>
        ) : (
          <>
            <div
              className="font-bold leading-none"
              style={{ fontSize: 32, fontWeight: 700, color: pal.gold }}
            >
              {totalScore}
              <span className="text-base font-normal" style={{ color: pal.muted }}>
                {' '}
                / 100
              </span>
            </div>
            <div className="text-center text-xs" style={{ color: pal.text }}>
              {verdict}
            </div>
          </>
        )}
      </div>

      {/* 구분선 */}
      <div className="my-2 h-px" style={{ background: pal.border }} />

      {/* 카테고리 바 */}
      <ul className="space-y-2">
        {availableRows.map((row) => {
          const score = computed[row.key] ?? 0
          const isEmpty = score <= 5
          return (
            <li key={row.key} className="flex items-center gap-3 text-xs">
              <span className="flex w-24 shrink-0 items-center gap-1.5" style={{ color: pal.text }}>
                <span aria-hidden="true">{row.emoji}</span>
                <span>{lang === 'en' ? row.labelEn : row.labelKo}</span>
              </span>
              <ScoreBar value={score} tone={row.tone} theme={theme} />
              <span
                className="w-14 shrink-0 text-right tabular-nums"
                style={{ color: isEmpty ? pal.muted : pal.gold }}
              >
                {isEmpty ? (lang === 'en' ? row.emptyEn : row.emptyKo) : Math.round(score)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
