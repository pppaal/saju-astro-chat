'use client'

/**
 * CompatShareCard (v2, 점수 중심) — 궁합 결과를 SNS 공유용 1080×1080 카드로.
 *
 * 채팅(상담) 자체가 아니라 결정론 엔진이 뽑은 "결과"만 그린다 — 대화의 사적인
 * 내용은 공유되지 않는다. 바이럴 최적화: ① 큰 궁합 점수(도넛) ② 커플 유형
 * 이름(정체성 훅) ③ 두 사람 일간 오행 ④ 종합 한 줄 ⑤ "너희도 몇 점?" CTA.
 *
 * 캡처 호환성(TarotShareCard 규칙): CSS 변수 대신 명시 hex, next/image 대신
 * 평범한 <img>, 시스템 serif 폴백. 숫자는 SVG text 대신 HTML 오버레이로 그려
 * html-to-image 가 확실히 캡처하게 한다. 부모(ShareImageButton)가 화면 밖에
 * 1080×1080 으로 렌더해 두고 ref 로 캡처한다.
 */

import React from 'react'

export type CompatCoupleTone = 'aligned' | 'mixed' | 'tension' | 'neutral'

export interface CompatShareElement {
  label: string
  emoji: string
  color: string
}

export interface CompatShareCardData {
  /** "민지 ♥ 준영" 또는 "우리 궁합". */
  title: string
  /** 0-100 궁합 점수. */
  score: number
  /** 커플 유형 — 정체성 훅. */
  coupleType: { name: string; emoji: string }
  /** 동·서 교차 종합 한 줄(또는 verdict 폴백). */
  keyMessage: string
  /** 두 사람 일간 오행 — 없으면 생략. */
  elements: { a: CompatShareElement; b: CompatShareElement } | null
  isKo: boolean
}

const GOLD = '#e8cc8a'
const GOLD_SOFT = '#d4b572'
const TEXT = '#f1f3f9'
const MUTED = '#9aa3b8'

export const COMPAT_SHARE_CARD_SIZE = 1080

// 도넛 링 — 배경 트랙 + 점수 비율만큼 골드 아크. 가운데 숫자는 HTML 오버레이.
function ScoreRing({ score }: { score: number }) {
  const size = 320
  const stroke = 26
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, score)) / 100
  const center = size / 2
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
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: "'Cinzel', Georgia, serif",
            fontSize: 130,
            fontWeight: 700,
            lineHeight: 1,
            color: GOLD,
          }}
        >
          {Math.round(score)}
        </span>
        <span style={{ fontSize: 26, letterSpacing: '0.16em', color: GOLD_SOFT, marginTop: 6 }}>
          / 100
        </span>
      </div>
    </div>
  )
}

export const CompatShareCard = React.forwardRef<HTMLDivElement, { data: CompatShareCardData }>(
  function CompatShareCard({ data }, ref) {
    const { title, score, coupleType, keyMessage, elements, isKo } = data

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

        {/* 헤더 — 브랜드 + 제목(두 사람) */}
        <div
          style={{
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 18,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/logo.png"
              alt="DestinyPal"
              width={38}
              height={38}
              style={{ width: 38, height: 38, objectFit: 'contain', borderRadius: 8 }}
            />
            <span
              style={{
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: 28,
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
              fontFamily: "'Cinzel', Georgia, serif",
              fontSize: title.length > 22 ? 40 : 52,
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

        {/* 커플 유형(히어로) + 점수 도넛 */}
        <div
          style={{
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 28,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 30px',
              borderRadius: 999,
              background: 'rgba(212,181,114,0.12)',
              border: '1px solid rgba(212,181,114,0.32)',
            }}
          >
            <span style={{ fontSize: 40 }}>{coupleType.emoji}</span>
            <span
              style={{
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: coupleType.name.length > 14 ? 38 : 44,
                fontWeight: 600,
                color: GOLD,
                wordBreak: 'keep-all',
              }}
            >
              {coupleType.name}
            </span>
          </div>

          <ScoreRing score={score} />

          {/* 두 사람 일간 오행 */}
          {elements ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 26, fontSize: 34 }}>
              <span style={{ color: elements.a.color, fontWeight: 600 }}>
                {elements.a.emoji} {elements.a.label}
              </span>
              <span style={{ color: MUTED, fontSize: 30 }}>↔</span>
              <span style={{ color: elements.b.color, fontWeight: 600 }}>
                {elements.b.emoji} {elements.b.label}
              </span>
            </div>
          ) : null}
        </div>

        {/* 종합 한 줄 + CTA */}
        <div style={{ zIndex: 1, textAlign: 'center', maxWidth: 880 }}>
          {keyMessage ? (
            <div
              style={{
                fontSize: keyMessage.length > 64 ? 28 : 32,
                lineHeight: 1.5,
                color: TEXT,
                wordBreak: 'keep-all',
                whiteSpace: 'pre-wrap',
                marginBottom: 26,
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
            <span style={{ color: GOLD_SOFT }}>✦</span>
            <span>{isKo ? '너희 커플은 몇 점?' : "What's your score?"}</span>
            <span style={{ color: 'rgba(154,163,184,0.5)' }}>·</span>
            <span>destinypal.com</span>
          </div>
        </div>
      </div>
    )
  }
)
