'use client'

/**
 * TarotShareCard — SNS(인스타/카톡) 공유용 1080×1080 정사각 카드.
 *
 * html-to-image 로 이 DOM 노드를 그대로 PNG 캡처한다(ShareTarotButton).
 * 캡처 호환성을 위해:
 *  - CSS 변수 대신 명시 hex 색을 쓴다(html-to-image 가 커스텀 프로퍼티를
 *    항상 인라인하지 못함).
 *  - next/image 가 아니라 평범한 <img> 로 카드/로고를 그린다(srcset/lazy 회피).
 *  - 웹폰트 임베드 이슈를 피하려 제목은 시스템 serif(Georgia) 폴백.
 *
 * 부모가 화면 밖(off-screen)에 1080×1080 으로 렌더해 두고 ref 로 캡처한다.
 */

import React from 'react'

export interface ShareCardData {
  question: string
  spreadTitle: string
  /** 카드별 표시 정보 — 이미 언어 반영된 name 을 받는다. */
  cards: Array<{ image: string; name: string; isReversed: boolean }>
  /** 한 줄 핵심 메시지(따옴표로 강조). */
  keyMessage: string
  isKo: boolean
}

const GOLD = '#e8cc8a'
const GOLD_SOFT = '#d4b572'
const TEXT = '#f1f3f9'
const MUTED = '#9aa3b8'

export const SHARE_CARD_SIZE = 1080

function cardWidthFor(n: number): number {
  if (n <= 1) return 280
  if (n === 2) return 230
  if (n === 3) return 205
  if (n === 4) return 172
  return 150
}

export const TarotShareCard = React.forwardRef<HTMLDivElement, { data: ShareCardData }>(
  function TarotShareCard({ data }, ref) {
    const { question, spreadTitle, cards, keyMessage, isKo } = data
    const shown = cards.slice(0, 5)
    const cardW = cardWidthFor(shown.length)
    const cardH = Math.round(cardW * 1.6)

    return (
      <div
        ref={ref}
        style={{
          width: SHARE_CARD_SIZE,
          height: SHARE_CARD_SIZE,
          boxSizing: 'border-box',
          padding: 64,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          background:
            'radial-gradient(900px 620px at 25% 8%, rgba(99,124,200,0.18), transparent 60%),' +
            'radial-gradient(820px 700px at 85% 100%, rgba(212,181,114,0.16), transparent 60%),' +
            'linear-gradient(160deg, #0b1022 0%, #070a1a 58%, #0a0e1f 100%)',
          color: TEXT,
          fontFamily:
            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* 골드 내부 프레임 */}
        <div
          style={{
            position: 'absolute',
            inset: 28,
            border: `1px solid rgba(212,181,114,0.28)`,
            borderRadius: 28,
            pointerEvents: 'none',
          }}
        />

        {/* 헤더 — 브랜드 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            zIndex: 1,
          }}
        >
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

        {/* 질문 */}
        <div style={{ zIndex: 1, textAlign: 'center', maxWidth: 880 }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: GOLD_SOFT,
              marginBottom: 22,
            }}
          >
            {isKo ? '오늘의 타로' : 'TAROT READING'}
          </div>
          <div
            style={{
              fontFamily: "'Cinzel', Georgia, serif",
              fontSize: question.length > 60 ? 42 : 52,
              lineHeight: 1.25,
              fontWeight: 600,
              color: TEXT,
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {question}
          </div>
        </div>

        {/* 카드 그림 */}
        <div
          style={{
            zIndex: 1,
            display: 'flex',
            gap: shown.length > 4 ? 14 : 20,
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}
        >
          {shown.map((c, i) => (
            <div
              key={i}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}
            >
              <div
                style={{
                  width: cardW,
                  height: cardH,
                  borderRadius: 14,
                  overflow: 'hidden',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
                  border: '1px solid rgba(212,181,114,0.35)',
                  background: 'rgba(255,255,255,0.04)',
                  transform: c.isReversed ? 'rotate(180deg)' : 'none',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.image}
                  alt={c.name}
                  width={cardW}
                  height={cardH}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
              <span
                style={{
                  fontSize: 18,
                  color: c.isReversed ? '#f3bcc6' : MUTED,
                  maxWidth: cardW + 8,
                  textAlign: 'center',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.name}
                {c.isReversed ? (isKo ? ' (역)' : ' (R)') : ''}
              </span>
            </div>
          ))}
        </div>

        {/* 한 줄 메시지 */}
        <div style={{ zIndex: 1, maxWidth: 880, textAlign: 'center' }}>
          {keyMessage ? (
            <div
              style={{
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: 30,
                lineHeight: 1.5,
                color: GOLD,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              “{keyMessage}”
            </div>
          ) : null}
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
          <span>{spreadTitle}</span>
          <span style={{ color: 'rgba(154,163,184,0.5)' }}>·</span>
          <span>destinypal.com</span>
        </div>
      </div>
    )
  }
)
