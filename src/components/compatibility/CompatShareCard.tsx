'use client'

/**
 * CompatShareCard (v5, 한지/먹 ink-on-hanji) — 궁합 결과를 SNS 공유용 1080×1080
 * 카드로. 운세차트(IntegratedReport / 궁합 차트 모달)와 같은 종이 톤으로 통일.
 *
 * 채팅(상담) 자체가 아니라 결정론 엔진이 뽑은 "결과"만 그린다 — 대화의 사적인
 * 내용은 공유되지 않는다. 구성: ① 커플 유형 이름 ② 등급(tier) 링 ③ 두 사람
 * 일간을 명식 셀(천간+오행, 오행 색)로 ④ 종합 한 줄 ⑤ CTA.
 *
 * 캡처 안정성(html-to-image): 가짜 정밀 숫자·이모지·웹폰트 의존 회피. 명시 hex,
 * 평범한 <img>, 시스템/serif 폴백. 부모(ShareImageButton)가 화면 밖에 1080×1080
 * 으로 렌더해 두고 ref 로 캡처한다.
 */

import React from 'react'

export type CompatCoupleTone = 'aligned' | 'mixed' | 'tension' | 'neutral'

export interface CompatShareElement {
  /** 천간 한자 (예: 乙) */
  stem: string
  /** 오행 한자 (예: 木) */
  el: string
  textColor: string
  bgColor: string
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
  /** 두 사람 일간(명식 셀) + 오행 관계(상생/상극/비화) — 없으면 생략. */
  elements: { a: CompatShareElement; b: CompatShareElement; relation?: string } | null
  isKo: boolean
}

// 한지/먹 팔레트 (globals.css 라이트 토큰과 동일).
const PAPER = '#f4f1ea'
const INK = '#1c1917'
const INK_MUTED = '#57534e'
const GOLD = '#a07a3c'
const GOLD_SOFT = '#c19b56'
const LINE = '#dcd6c8'
const SERIF = "var(--font-cinzel), 'Noto Serif KR', 'Nanum Myeongjo', Georgia, serif"

export const COMPAT_SHARE_CARD_SIZE = 1080

// 등급 링 — 종이 위 골드 아크. 중앙은 등급 단어(숫자 아님).
function TierRing({ tier, fillPct }: { tier: string; fillPct: number }) {
  const size = 300
  const stroke = 22
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, fillPct)) / 100
  const center = size / 2
  const tierFont = tier.length > 7 ? 38 : tier.length > 5 ? 46 : 56
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={center} cy={center} r={r} fill="none" stroke="#e7e5e4" strokeWidth={stroke} />
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

// 일간 셀 — 명식처럼 천간(큰 한자) + 오행(작은 한자), 오행 색 타일.
function PillarCell({ el }: { el: CompatShareElement }) {
  return (
    <div
      style={{
        width: 150,
        height: 168,
        borderRadius: 18,
        background: el.bgColor,
        border: `1.5px solid ${el.textColor}33`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        boxShadow: '0 6px 18px rgba(60,50,30,0.10)',
      }}
    >
      <span
        style={{
          fontFamily: SERIF,
          fontSize: 84,
          fontWeight: 700,
          lineHeight: 1,
          color: el.textColor,
        }}
      >
        {el.stem}
      </span>
      <span style={{ fontFamily: SERIF, fontSize: 30, color: el.textColor, opacity: 0.85 }}>
        {el.el}
      </span>
    </div>
  )
}

export const CompatShareCard = React.forwardRef<HTMLDivElement, { data: CompatShareCardData }>(
  function CompatShareCard({ data }, ref) {
    const { title, coupleType, tier, fillPct, keyMessage, elements, isKo } = data
    const typeFont = coupleType.length > 12 ? 38 : 44
    const msgFont = keyMessage.length > 56 ? 27 : 31

    return (
      <div
        ref={ref}
        style={{
          width: COMPAT_SHARE_CARD_SIZE,
          height: COMPAT_SHARE_CARD_SIZE,
          boxSizing: 'border-box',
          padding: 70,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          // 한지 — 따뜻한 종이 + 미세 dot 텍스처(궁합 차트 셸과 동일 결).
          background: PAPER,
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(120,110,90,0.06) 1px, transparent 0)',
          backgroundSize: '22px 22px',
          color: INK,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        {/* 골드 이중 프레임 — 전통 차트 느낌 */}
        <div
          style={{
            position: 'absolute',
            inset: 26,
            border: `2px solid ${GOLD}`,
            borderRadius: 26,
            pointerEvents: 'none',
            opacity: 0.5,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 34,
            border: `1px solid ${GOLD_SOFT}`,
            borderRadius: 20,
            pointerEvents: 'none',
            opacity: 0.5,
          }}
        />

        {/* 헤더 — 브랜드 + 제목(두 사람) */}
        <div
          style={{
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo/logo.png"
              alt="DestinyPal"
              width={34}
              height={34}
              style={{ width: 34, height: 34, objectFit: 'contain', borderRadius: 8 }}
            />
            <span
              style={{
                fontFamily: SERIF,
                fontSize: 26,
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
              fontSize: title.length > 18 ? 42 : 54,
              fontWeight: 700,
              lineHeight: 1.2,
              color: INK,
              textAlign: 'center',
              wordBreak: 'keep-all',
            }}
          >
            {title}
          </div>
        </div>

        {/* 커플 유형(히어로) + 등급 링 + 두 사람 명식 셀 */}
        <div
          style={{
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <div
            style={{
              maxWidth: 860,
              padding: '10px 30px',
              borderRadius: 999,
              background: 'rgba(160,122,60,0.10)',
              border: `1px solid ${GOLD}`,
              fontFamily: SERIF,
              fontSize: typeFont,
              fontWeight: 700,
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
              <PillarCell el={elements.a} />
              {elements.relation ? (
                <span
                  style={{
                    padding: '6px 18px',
                    borderRadius: 999,
                    border: `1px solid ${GOLD}`,
                    background: PAPER,
                    color: GOLD,
                    fontFamily: SERIF,
                    fontSize: 26,
                    fontWeight: 700,
                  }}
                >
                  {elements.relation}
                </span>
              ) : (
                <span style={{ width: 40, height: 2, borderRadius: 2, background: GOLD_SOFT }} />
              )}
              <PillarCell el={elements.b} />
            </div>
          ) : null}
        </div>

        {/* 종합 한 줄 + CTA */}
        <div style={{ zIndex: 1, textAlign: 'center', maxWidth: 880 }}>
          {keyMessage ? (
            <div
              style={{
                fontSize: msgFont,
                lineHeight: 1.55,
                color: INK,
                wordBreak: 'keep-all',
                whiteSpace: 'pre-wrap',
                marginBottom: 22,
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
            <span>{isKo ? '너희 궁합은 몇 점?' : "What's your match?"}</span>
            <span style={{ color: LINE }}>·</span>
            <span>destinypal.com</span>
          </div>
        </div>
      </div>
    )
  }
)
