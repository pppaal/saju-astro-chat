'use client'

/**
 * CompatShareCard — 무료 궁합 결과의 SNS(인스타/카톡) 공유용 1080×1080 정사각 카드.
 *
 * 타로 TarotShareCard 와 같은 결: html-to-image 로 이 DOM 노드를 그대로 PNG
 * 캡처한다(ShareCompatibilityButton). 캡처 호환을 위해 CSS 변수 대신 명시 hex,
 * 평범한 <img> 대신 그라데이션·텍스트로만 구성(외부 이미지 의존 없음 — 두 사람
 * 차트엔 보여줄 단일 이미지가 없으므로, 큰 점수 링이 주인공이 된다).
 *
 * 주인공은 헤드라인 총점(끌림 82 식). 점신·포스텔러처럼 "숫자"가 캡처되어
 * 재공유되게 한다. 부모가 화면 밖에 1080×1080 으로 렌더해 두고 ref 로 캡처.
 */

import React from 'react'
import type { CompatVerdictTone } from '@/lib/tarot/shareLink'

const GOLD = '#e8cc8a'
const GOLD_SOFT = '#d4b572'
const GOLD_WASH = 'rgba(212,181,114,0.16)'
const TEXT = '#f1f3f9'
const MUTED = '#9aa3b8'
const ROSE = '#fda4af'
const PINK = '#ec4899'
const BASE = '#0b1022'

export const COMPAT_SHARE_CARD_SIZE = 1080

/** 점수 칩 — 테마 차원 라벨 + 0~100. (마찰은 로즈로 구분) */
export interface CompatShareChip {
  label: string
  value: number
  clash?: boolean
}

export interface CompatShareCardData {
  isKo: boolean
  nameA: string
  nameB: string
  verdict: string
  verdictTone: CompatVerdictTone
  /** 공개 링크(/r/[token]) OG·페이지에 실을 보조 한 줄(배우자성/시너스트리). 이미지 카드엔 미표시. */
  headline?: string
  /** 헤드라인 총점(0~100) — 없으면 점수 링 대신 verdict 가 더 크게. */
  score?: number | null
  /** 총점 등급 라벨 — 예: "찰떡 궁합". */
  grade?: string | null
  /** 상위 테마 점수 칩 2~4개 — 예: 끌림 88 · 케미 82 · 소통 79. */
  chips?: CompatShareChip[]
}

function verdictColor(tone: CompatVerdictTone): string {
  if (tone === 'aligned') return GOLD
  if (tone === 'tension') return ROSE
  if (tone === 'mixed') return '#fbbf24'
  return '#dfe3ee'
}

export const CompatShareCard = React.forwardRef<HTMLDivElement, { data: CompatShareCardData }>(
  function CompatShareCard({ data }, ref) {
    const { isKo, nameA, nameB, verdict, verdictTone, score, grade, chips } = data
    const hasScore = typeof score === 'number'
    const vColor = verdictColor(verdictTone)
    const shownChips = (chips ?? []).slice(0, 4)
    // 링 채움 각도(도) — 0~100 → 0~360.
    const ringDeg = hasScore ? Math.round((score as number) * 3.6) : 0

    return (
      <div
        ref={ref}
        style={{
          width: COMPAT_SHARE_CARD_SIZE,
          height: COMPAT_SHARE_CARD_SIZE,
          boxSizing: 'border-box',
          padding: 64,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          background:
            'radial-gradient(900px 620px at 25% 8%, rgba(236,72,153,0.16), transparent 60%),' +
            'radial-gradient(820px 700px at 85% 100%, rgba(212,181,114,0.16), transparent 60%),' +
            'linear-gradient(160deg, #0b1022 0%, #070a1a 58%, #0a0e1f 100%)',
          color: TEXT,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* 골드 내부 프레임 */}
        <div
          style={{
            position: 'absolute',
            inset: 28,
            border: '1px solid rgba(212,181,114,0.28)',
            borderRadius: 28,
            pointerEvents: 'none',
          }}
        />

        {/* 상단 — 라벨 + 두 사람 */}
        <div style={{ zIndex: 1, textAlign: 'center', marginTop: 8 }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: GOLD_SOFT,
              marginBottom: 18,
            }}
          >
            {isKo ? '우리 궁합' : 'OUR MATCH'}
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 800,
              color: TEXT,
              wordBreak: 'keep-all',
              overflowWrap: 'anywhere',
            }}
          >
            {nameA} <span style={{ color: PINK }}>♥</span> {nameB}
          </div>
        </div>

        {/* 가운데 — 헤드라인 총점 링(주인공). 점수 없으면 verdict 가 자리를 채운다. */}
        {hasScore ? (
          <div
            style={{
              zIndex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 26,
            }}
          >
            <div
              style={{
                position: 'relative',
                width: 340,
                height: 340,
                borderRadius: '50%',
                background: `conic-gradient(${GOLD} ${ringDeg}deg, ${GOLD_WASH} 0)`,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 22,
                  borderRadius: '50%',
                  background: BASE,
                }}
              />
              <div style={{ position: 'relative', textAlign: 'center' }}>
                <div style={{ fontSize: 168, fontWeight: 800, lineHeight: 1, color: GOLD }}>
                  {score}
                </div>
              </div>
            </div>
            {grade ? (
              <div
                style={{
                  padding: '12px 32px',
                  borderRadius: 999,
                  background: 'rgba(232,204,138,0.12)',
                  border: '1px solid rgba(232,204,138,0.45)',
                  fontSize: 40,
                  fontWeight: 800,
                  color: GOLD,
                }}
              >
                {grade}
              </div>
            ) : null}
          </div>
        ) : (
          <div style={{ zIndex: 1, maxWidth: 880, textAlign: 'center' }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 64,
                lineHeight: 1.35,
                color: vColor,
                textShadow: '0 2px 24px rgba(212,181,114,0.18)',
                wordBreak: 'keep-all',
                overflowWrap: 'anywhere',
              }}
            >
              {verdict}
            </div>
          </div>
        )}

        {/* verdict 한 줄 — 점수가 주인공일 때는 그 아래 받쳐주는 카피. */}
        {hasScore && verdict ? (
          <div style={{ zIndex: 1, maxWidth: 900, textAlign: 'center' }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 44,
                lineHeight: 1.4,
                color: vColor,
                textShadow: '0 2px 24px rgba(212,181,114,0.18)',
                wordBreak: 'keep-all',
                overflowWrap: 'anywhere',
              }}
            >
              {verdict}
            </div>
          </div>
        ) : null}

        {/* 상위 테마 점수 칩 — 끌림 88 · 케미 82 · 소통 79 */}
        {shownChips.length ? (
          <div
            style={{
              zIndex: 1,
              display: 'flex',
              alignItems: 'stretch',
              justifyContent: 'center',
              gap: 14,
              flexWrap: 'nowrap',
            }}
          >
            {shownChips.map((c, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  padding: '18px 26px',
                  borderRadius: 20,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(212,181,114,0.22)',
                }}
              >
                <span style={{ fontSize: 22, fontWeight: 700, color: MUTED }}>{c.label}</span>
                <span
                  style={{
                    fontSize: 46,
                    fontWeight: 800,
                    lineHeight: 1,
                    color: c.clash ? ROSE : GOLD,
                  }}
                >
                  {c.value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex' }} />
        )}

        {/* 푸터 */}
        <div
          style={{
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 22,
            color: MUTED,
          }}
        >
          <span style={{ color: GOLD_SOFT }}>✦</span>
          <span>{isKo ? '무료 궁합' : 'Free compatibility'}</span>
          <span style={{ color: 'rgba(154,163,184,0.5)' }}>·</span>
          <span>destinypal.com</span>
        </div>
      </div>
    )
  }
)
