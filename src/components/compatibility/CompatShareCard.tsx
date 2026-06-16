'use client'

/**
 * CompatShareCard — 궁합 결과를 SNS 공유용 1080×1080 정사각 카드로.
 *
 * 채팅(상담) 자체가 아니라 결정론 엔진이 뽑은 "결과"(동·서 교차 종합 한 줄 +
 * 밴드 점수)만 카드로 그린다 — 대화의 사적인 내용은 공유되지 않는다.
 *
 * 캡처 호환성은 TarotShareCard 와 동일 규칙: CSS 변수 대신 명시 hex, next/image
 * 대신 평범한 <img>, 시스템 serif 폴백. 부모(ShareImageButton)가 화면 밖에
 * 1080×1080 으로 렌더해 두고 ref 로 캡처한다.
 */

import React from 'react'

export interface CompatShareScore {
  label: string
  /** 0-100 */
  value: number
  tone: 'harmony' | 'tension'
}

export interface CompatShareCardData {
  /** 헤드라인 — "A ♥ B" 또는 "우리 궁합". */
  title: string
  /** 히어로 한 줄 — 동·서 교차 종합(crossVerdict) 또는 밴드 verdict 폴백. */
  keyMessage: string
  scores: CompatShareScore[]
  isKo: boolean
}

const GOLD = '#e8cc8a'
const GOLD_SOFT = '#d4b572'
const ROSE = '#f3a8b4'
const TEXT = '#f1f3f9'
const MUTED = '#9aa3b8'

export const COMPAT_SHARE_CARD_SIZE = 1080

function ScoreRow({ s, isKo }: { s: CompatShareScore; isKo: boolean }) {
  const clamped = Math.max(0, Math.min(100, s.value))
  const empty = clamped <= 5
  const fill =
    s.tone === 'tension'
      ? 'linear-gradient(90deg, #f3a8b4 0%, rgba(243,168,180,0.5) 100%)'
      : 'linear-gradient(90deg, #e8cc8a 0%, rgba(232,204,138,0.5) 100%)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, width: '100%' }}>
      <span style={{ width: 220, flexShrink: 0, fontSize: 26, color: TEXT }}>{s.label}</span>
      <div
        style={{
          position: 'relative',
          flex: 1,
          height: 16,
          borderRadius: 999,
          overflow: 'hidden',
          background: 'rgba(255,255,255,0.10)',
        }}
      >
        <div
          style={{ height: '100%', width: `${clamped}%`, borderRadius: 999, background: fill }}
        />
      </div>
      <span
        style={{
          width: 70,
          flexShrink: 0,
          textAlign: 'right',
          fontSize: 24,
          color: empty ? MUTED : s.tone === 'tension' ? ROSE : GOLD,
        }}
      >
        {empty ? (isKo ? '약함' : 'low') : Math.round(clamped)}
      </span>
    </div>
  )
}

export const CompatShareCard = React.forwardRef<HTMLDivElement, { data: CompatShareCardData }>(
  function CompatShareCard({ data }, ref) {
    const { title, keyMessage, scores, isKo } = data
    const shown = scores.slice(0, 5)

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
            'radial-gradient(900px 620px at 25% 8%, rgba(168,131,240,0.18), transparent 60%),' +
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

        {/* 헤더 — 브랜드 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, zIndex: 1 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/logo.png"
            alt="DestinyPal"
            width={44}
            height={44}
            style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 8 }}
          />
          <span
            style={{
              fontFamily: "'Cinzel', Georgia, serif",
              fontSize: 34,
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: GOLD,
            }}
          >
            DestinyPal
          </span>
        </div>

        {/* 제목 + 히어로 한 줄 */}
        <div style={{ zIndex: 1, textAlign: 'center', maxWidth: 900 }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: GOLD_SOFT,
              marginBottom: 22,
            }}
          >
            {isKo ? '궁합' : 'COMPATIBILITY'}
          </div>
          <div
            style={{
              fontFamily: "'Cinzel', Georgia, serif",
              fontSize: title.length > 26 ? 48 : 60,
              lineHeight: 1.25,
              fontWeight: 600,
              color: TEXT,
              wordBreak: 'keep-all',
              whiteSpace: 'pre-wrap',
              marginBottom: 26,
            }}
          >
            {title}
          </div>
          {keyMessage ? (
            <div
              style={{
                fontSize: keyMessage.length > 70 ? 30 : 34,
                lineHeight: 1.5,
                color: GOLD,
                wordBreak: 'keep-all',
                whiteSpace: 'pre-wrap',
              }}
            >
              “{keyMessage}”
            </div>
          ) : null}
        </div>

        {/* 밴드 점수 바 */}
        <div
          style={{
            zIndex: 1,
            width: '100%',
            maxWidth: 760,
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {shown.map((s, i) => (
            <ScoreRow key={i} s={s} isKo={isKo} />
          ))}
        </div>

        {/* 푸터 */}
        <div
          style={{
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            fontSize: 20,
            color: MUTED,
          }}
        >
          <span style={{ color: GOLD_SOFT }}>✦</span>
          <span>{isKo ? '나도 궁합 보기' : 'See your match'}</span>
          <span style={{ color: 'rgba(154,163,184,0.5)' }}>·</span>
          <span>destinypal.com</span>
        </div>
      </div>
    )
  }
)
