'use client'

/**
 * CompatShareCard (v6, 한지 리포트 카드) — 궁합 결과를 SNS 공유용 1080×1080 으로.
 * 운세차트와 같은 종이 톤. 두루뭉술한 한 줄 대신 엔진이 콕 집은 구체 내용을
 * 라벨 행으로 — 핵심(배우자성/시너스트리) · 강점/조심 · 별자리.
 *
 * 채팅(상담) 자체가 아니라 결정론 엔진의 "결과"만 그린다 — 사적 대화는 공유 안 됨.
 * 캡처 안정성(html-to-image): 가짜 정밀 숫자·이모지·웹폰트 의존 회피, 명시 hex,
 * 평범한 <img>, serif 폴백.
 */

import React from 'react'

export type CompatCoupleTone = 'aligned' | 'mixed' | 'tension' | 'neutral'

export interface CompatShareElement {
  stem: string
  el: string
  /** 오행 평이한 한 단어 (성장/열정/안정/결단/지혜) — 비전공자용. */
  vibe?: string
  textColor: string
  bgColor: string
}

export interface CompatShareCardData {
  title: string
  coupleType: string
  tier: string
  fillPct: number
  /** 핵심 한 줄 — 배우자성 또는 결정적 시너스트리. */
  headline: string
  /** 별자리 신호 — 핵심이 배우자성일 때만. */
  signal?: string
  /** 강점(밴드 최고). */
  strength?: string
  /** 조심(밴드 최저). */
  caution?: string
  elements: { a: CompatShareElement; b: CompatShareElement; relation?: string } | null
  isKo: boolean
}

const PAPER = '#f4f1ea'
const INK = '#1c1917'
const INK_MUTED = '#57534e'
const GOLD = '#a07a3c'
const GOLD_SOFT = '#c19b56'
const LINE = '#dcd6c8'
const SERIF = "var(--font-cinzel), 'Noto Serif KR', 'Nanum Myeongjo', Georgia, serif"

export const COMPAT_SHARE_CARD_SIZE = 1080

// 일간 셀 — 명식처럼 천간(큰 한자) + 오행(작은 한자), 오행 색 타일.
function PillarCell({ el }: { el: CompatShareElement }) {
  return (
    <div
      style={{
        width: 132,
        height: 150,
        borderRadius: 16,
        background: el.bgColor,
        border: `1.5px solid ${el.textColor}33`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        boxShadow: '0 6px 16px rgba(60,50,30,0.10)',
      }}
    >
      <span
        style={{
          fontFamily: SERIF,
          fontSize: 64,
          fontWeight: 700,
          lineHeight: 1,
          color: el.textColor,
        }}
      >
        {el.stem}
      </span>
      <span style={{ fontFamily: SERIF, fontSize: 23, color: el.textColor, opacity: 0.85 }}>
        {el.el}
        {el.vibe ? ` · ${el.vibe}` : ''}
      </span>
    </div>
  )
}

// 리포트 행 — 골드 태그 + 먹 텍스트.
function Row({ tag, children, big }: { tag: string; children: React.ReactNode; big?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, width: '100%' }}>
      <span
        style={{
          flexShrink: 0,
          width: 92,
          fontFamily: SERIF,
          fontSize: 24,
          fontWeight: 700,
          color: GOLD,
          letterSpacing: '0.02em',
        }}
      >
        {tag}
      </span>
      <span style={{ fontSize: big ? 31 : 27, lineHeight: 1.4, color: INK, wordBreak: 'keep-all' }}>
        {children}
      </span>
    </div>
  )
}

export const CompatShareCard = React.forwardRef<HTMLDivElement, { data: CompatShareCardData }>(
  function CompatShareCard({ data }, ref) {
    const {
      title,
      coupleType,
      tier,
      fillPct,
      headline,
      signal,
      strength,
      caution,
      elements,
      isKo,
    } = data
    const typeFont = coupleType.length > 12 ? 34 : 40

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
          background: PAPER,
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(120,110,90,0.06) 1px, transparent 0)',
          backgroundSize: '22px 22px',
          color: INK,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* 골드 이중 프레임 */}
        <div
          style={{
            position: 'absolute',
            inset: 24,
            border: `2px solid ${GOLD}`,
            borderRadius: 24,
            opacity: 0.5,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 32,
            border: `1px solid ${GOLD_SOFT}`,
            borderRadius: 18,
            opacity: 0.5,
            pointerEvents: 'none',
          }}
        />

        {/* 헤더 — 브랜드 + 제목 + 커플 유형 */}
        <div
          style={{
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/logo.png"
              alt="DestinyPal"
              width={30}
              height={30}
              style={{ width: 30, height: 30, objectFit: 'contain', borderRadius: 7 }}
            />
            <span
              style={{
                fontFamily: SERIF,
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: '0.05em',
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
              fontWeight: 700,
              lineHeight: 1.15,
              color: INK,
              textAlign: 'center',
              wordBreak: 'keep-all',
            }}
          >
            {title}
          </div>
          <div
            style={{
              padding: '8px 26px',
              borderRadius: 999,
              background: 'rgba(160,122,60,0.10)',
              border: `1px solid ${GOLD}`,
              fontFamily: SERIF,
              fontSize: typeFont,
              fontWeight: 700,
              color: GOLD,
              wordBreak: 'keep-all',
              textAlign: 'center',
              maxWidth: 760,
              lineHeight: 1.2,
            }}
          >
            {coupleType}
          </div>
        </div>

        {/* 명식 셀 + 등급 + 채움 바 */}
        <div
          style={{
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          {elements ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
              <PillarCell el={elements.a} />
              {elements.relation ? (
                <span
                  style={{
                    padding: '6px 16px',
                    borderRadius: 999,
                    border: `1px solid ${GOLD}`,
                    background: PAPER,
                    color: GOLD,
                    fontFamily: SERIF,
                    fontSize: 24,
                    fontWeight: 700,
                  }}
                >
                  {elements.relation}
                </span>
              ) : (
                <span style={{ width: 36, height: 2, background: GOLD_SOFT }} />
              )}
              <PillarCell el={elements.b} />
            </div>
          ) : null}
          {/* 등급 + 채움 바 (큰 숫자 대신) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: SERIF, fontSize: 30, fontWeight: 700, color: GOLD }}>
              {tier}
            </span>
            <div
              style={{
                width: 300,
                height: 10,
                borderRadius: 999,
                background: '#e7e5e4',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.max(0, Math.min(100, fillPct))}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: GOLD,
                }}
              />
            </div>
          </div>
        </div>

        {/* 리포트 행 — 구체 내용 */}
        <div
          style={{ zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <div style={{ height: 1, background: LINE, width: '100%' }} />
          {headline ? (
            <Row tag={isKo ? '핵심' : 'KEY'} big>
              {headline}
            </Row>
          ) : null}
          {(strength || caution) && (
            <div style={{ display: 'flex', gap: 44, width: '100%' }}>
              {strength ? (
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                  <span style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 700, color: GOLD }}>
                    {isKo ? '강점' : 'STRONG'}
                  </span>
                  <span style={{ fontSize: 27, color: INK }}>{strength}</span>
                </span>
              ) : null}
              {caution ? (
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                  <span
                    style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 700, color: '#b45309' }}
                  >
                    {isKo ? '조심' : 'WATCH'}
                  </span>
                  <span style={{ fontSize: 27, color: INK }}>{caution}</span>
                </span>
              ) : null}
            </div>
          )}
          {signal ? <Row tag={isKo ? '별자리' : 'STARS'}>{signal}</Row> : null}
          <div style={{ height: 1, background: LINE, width: '100%' }} />
        </div>

        {/* CTA */}
        <div
          style={{
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            fontSize: 22,
            color: INK_MUTED,
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              background: GOLD,
              transform: 'rotate(45deg)',
              display: 'inline-block',
            }}
          />
          <span>{isKo ? '너희는 무슨 커플?' : 'What couple are you?'}</span>
          <span style={{ color: LINE }}>·</span>
          <span>destinypal.com</span>
        </div>
      </div>
    )
  }
)
