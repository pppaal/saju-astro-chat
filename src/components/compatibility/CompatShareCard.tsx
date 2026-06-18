'use client'

/**
 * CompatShareCard (v3) — 궁합 결과를 SNS 공유용 1080×1080 카드로.
 *
 * 채팅(상담) 자체가 아니라 결정론 엔진이 뽑은 "결과"만 그린다 — 대화의 사적인
 * 내용은 공유되지 않는다. 바이럴 훅: ① 커플 유형 이름 ② 등급(tier) 링
 * ③ 두 사람 일간 오행 ④ 종합 한 줄 ⑤ "너희도?" CTA.
 *
 * 캡처 안정성(html-to-image):
 *  - 가짜 정밀 "N/100" 숫자는 안 박는다(앱 정책) — 링 중앙은 등급 단어.
 *  - 이모지는 플랫폼에 따라 빈 칸/흑백으로 깨질 수 있어 쓰지 않는다 — 오행은
 *    색 점, 구분선은 그린 도형으로 대체(검증된 TarotShareCard 와 동일 결).
 *  - 폰트는 next/font 의 CSS 변수(--font-cinzel)로 참조. 리터럴 'Cinzel' 은
 *    해시된 내부 이름과 안 맞아 Georgia 로 폴백된다(한글은 어차피 serif 폴백).
 *  - CSS 변수 대신 명시 hex, next/image 대신 <img>.
 */

import React from 'react'

export type CompatCoupleTone = 'aligned' | 'mixed' | 'tension' | 'neutral'

export interface CompatShareElement {
  label: string
  color: string
}

export interface CompatShareCardData {
  /** "민지 ♥ 준영" 또는 "우리 궁합". */
  title: string
  /** 커플 유형 이름 — 정체성 훅(히어로). */
  coupleType: string
  /** 등급 단어(링 중앙) — 정밀 숫자 대신. */
  tier: string
  /** 0-100 링 채움 비율(숫자는 표시 안 함). */
  fillPct: number
  /** 동·서 교차 종합 한 줄(또는 verdict 폴백). */
  keyMessage: string
  /** 두 사람 일간 천간+오행(한자) + 오행 관계(상생/상극/비화) — 없으면 생략. */
  elements: { a: CompatShareElement; b: CompatShareElement; relation?: string } | null
  isKo: boolean
}

const SERIF = 'var(--font-cinzel), Georgia, serif'
const GOLD = '#e8cc8a'
const GOLD_SOFT = '#d4b572'
const TEXT = '#f1f3f9'
const MUTED = '#9aa3b8'

export const COMPAT_SHARE_CARD_SIZE = 1080

// 등급 링 — 배경 트랙 + 채움 비율만큼 골드 아크. 중앙은 등급 단어(숫자 아님).
function TierRing({ tier, fillPct }: { tier: string; fillPct: number }) {
  const size = 320
  const stroke = 24
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, fillPct)) / 100
  const center = size / 2
  const tierFont = tier.length > 7 ? 40 : tier.length > 5 ? 50 : 60
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={stroke}
        />
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={GOLD}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: stroke + 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontFamily: SERIF,
            fontSize: tierFont,
            fontWeight: 700,
            lineHeight: 1.15,
            color: GOLD,
            wordBreak: 'keep-all',
          }}
        >
          {tier}
        </span>
      </div>
    </div>
  )
}

function ElementDot({ el }: { el: CompatShareElement }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
      <span
        style={{
          width: 26,
          height: 26,
          borderRadius: 999,
          background: el.color,
          boxShadow: `0 0 16px ${el.color}66`,
        }}
      />
      <span style={{ color: el.color, fontWeight: 600, fontSize: 34 }}>{el.label}</span>
    </span>
  )
}

export const CompatShareCard = React.forwardRef<HTMLDivElement, { data: CompatShareCardData }>(
  function CompatShareCard({ data }, ref) {
    const { title, coupleType, tier, fillPct, keyMessage, elements, isKo } = data
    const typeFont = coupleType.length > 12 ? 38 : 44
    const msgFont = keyMessage.length > 56 ? 28 : 32

    return (
      <div
        ref={ref}
        style={{
          width: COMPAT_SHARE_CARD_SIZE,
          height: COMPAT_SHARE_CARD_SIZE,
          boxSizing: 'border-box',
          padding: 72,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          background:
            'radial-gradient(900px 620px at 25% 6%, rgba(168,131,240,0.20), transparent 60%),' +
            'radial-gradient(820px 700px at 85% 100%, rgba(212,181,114,0.18), transparent 60%),' +
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

        {/* 헤더 — 브랜드 + 제목 */}
        <div
          style={{
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/logo.png"
              alt="DestinyPal"
              width={36}
              height={36}
              style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8 }}
            />
            <span
              style={{
                fontFamily: SERIF,
                fontSize: 26,
                fontWeight: 600,
                letterSpacing: '0.04em',
                color: GOLD,
              }}
            >
              DestinyPal
            </span>
          </div>
          <div
            style={{
              fontFamily: SERIF,
              fontSize: title.length > 18 ? 40 : 50,
              fontWeight: 600,
              lineHeight: 1.2,
              color: TEXT,
              textAlign: 'center',
              wordBreak: 'keep-all',
            }}
          >
            {title}
          </div>
        </div>

        {/* 커플 유형(히어로) + 등급 링 + 두 사람 오행 */}
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
              maxWidth: 860,
              padding: '12px 32px',
              borderRadius: 999,
              background: 'rgba(212,181,114,0.12)',
              border: '1px solid rgba(212,181,114,0.32)',
              fontFamily: SERIF,
              fontSize: typeFont,
              fontWeight: 600,
              color: GOLD,
              textAlign: 'center',
              lineHeight: 1.25,
              wordBreak: 'keep-all',
            }}
          >
            {coupleType}
          </div>

          <TierRing tier={tier} fillPct={fillPct} />

          {elements ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <ElementDot el={elements.a} />
              {elements.relation ? (
                // 오행 관계(상생/상극/비화) — 두 사람 사이에.
                <span
                  style={{
                    padding: '4px 16px',
                    borderRadius: 999,
                    border: '1px solid rgba(212,181,114,0.4)',
                    color: GOLD_SOFT,
                    fontSize: 24,
                    fontWeight: 600,
                  }}
                >
                  {elements.relation}
                </span>
              ) : (
                <span
                  style={{
                    width: 44,
                    height: 2,
                    borderRadius: 2,
                    background: 'rgba(212,181,114,0.55)',
                  }}
                />
              )}
              <ElementDot el={elements.b} />
            </div>
          ) : null}
        </div>

        {/* 종합 한 줄 + CTA */}
        <div style={{ zIndex: 1, textAlign: 'center', maxWidth: 880 }}>
          {keyMessage ? (
            <div
              style={{
                fontSize: msgFont,
                lineHeight: 1.5,
                color: TEXT,
                wordBreak: 'keep-all',
                whiteSpace: 'pre-wrap',
                marginBottom: 24,
              }}
            >
              “{keyMessage}”
            </div>
          ) : null}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              fontSize: 22,
              color: MUTED,
            }}
          >
            {/* 그린 다이아(✦ 이모지 회피) */}
            <span
              style={{
                width: 10,
                height: 10,
                background: GOLD_SOFT,
                transform: 'rotate(45deg)',
                display: 'inline-block',
              }}
            />
            <span>{isKo ? '너희 커플은 몇 점?' : "What's your match?"}</span>
            <span style={{ color: 'rgba(154,163,184,0.5)' }}>·</span>
            <span>destinypal.com</span>
          </div>
        </div>
      </div>
    )
  }
)
