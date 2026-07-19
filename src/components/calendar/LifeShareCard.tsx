'use client'

/**
 * LifeShareCard — /destiny 인생유형 + 인생 곡선을 SNS(인스타 스토리·카톡)용
 * 1080×1080 이미지로 그리는 캡처 전용 카드. ShareLifeButton 이 화면 밖에
 * 마운트해 두고 html-to-image 로 PNG 캡처한다 (ReportShareCard 의 인생판).
 *
 * 디자인: /r/[token] 인생 OG 이미지와 같은 **따뜻한 앰버/골드 테마** — 링크
 * 미리보기와 저장 이미지가 "한 얼굴"이 되게 한다.
 *
 * 캡처 호환성(ReportShareCard 와 동일 규칙):
 *  - CSS 변수/모듈 대신 명시 hex 색을 인라인으로.
 *  - 곡선은 buildCurveSvg(순수 함수) → encodeURIComponent data-URI <img> 로
 *    박는다(외부 fetch 없음 → 캡처 시 CORS/타이밍 이슈 없음).
 *  - next/image 대신 평범한 <img> (srcset/lazy 회피).
 */

import React from 'react'
import { buildCurveSvg } from '@/lib/share/curveSvg'
import type { LifeShareData } from './ShareLifeButton'

export const LIFE_CARD_SIZE = 1080

// 이미지 공유는 클릭 불가라 받는 사람이 돌아올 경로(도메인)를 카드에 박는다.
const SHARE_DOMAIN = (process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com')
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '')

// ── 따뜻한 앰버 팔레트 — /r 인생 OG(opengraph-image)와 같은 결 ─────────────
const BG_GRAD = 'linear-gradient(160deg, #1c0f0a 0%, #2c130f 48%, #0c0708 100%)'
const GOLD_HERO = '#ffd9a3'
const GOLD_ACCENT = '#e8a05a'
const GOLD_LINE = 'rgba(232,160,90,0.32)'
const TEXT = '#f6ece0'
const TEXT_DIM = '#d8b89a'
const TEXT_MUTE = '#a98c74'

const SERIF = "'Newsreader', 'Gowun Batang', 'Noto Serif KR', 'Noto Serif CJK KR', Georgia, serif"
const SANS = "'Gowun Dodum', 'Noto Sans KR', 'Apple SD Gothic Neo', system-ui, sans-serif"

/** 곡선 SVG → 클라이언트 안전 data-URI (Buffer 불필요). */
function curveDataUri(curve: number[], markerIndex: number, peakIndex: number): string | null {
  if (!curve || curve.length < 2) return null
  const svg = buildCurveSvg({
    scores: curve,
    markerIndex,
    peakIndex,
    width: 880,
    height: 280,
    strokeWidth: 5,
    theme: {
      stroke: '#ffb454',
      fill: '#ffb454',
      dotGood: '#ffd24d',
      dotMid: 'rgba(255,255,255,0.55)',
      dotLow: '#e88a5a',
      marker: '#ffffff',
      dotStroke: '#1c0f0a',
    },
  })
  return svg ? `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` : null
}

export const LifeShareCard = React.forwardRef<HTMLDivElement, { data: LifeShareData }>(
  function LifeShareCard({ data }, ref) {
    const { isKo } = data
    const curveUri = curveDataUri(
      data.curve.map((n) => Math.round(n)),
      data.markerIndex ?? -1,
      data.peakIndex ?? -1
    )
    const axis = (data.axisLabels ?? []).slice(0, 4)

    return (
      <div
        ref={ref}
        style={{
          width: LIFE_CARD_SIZE,
          height: LIFE_CARD_SIZE,
          boxSizing: 'border-box',
          padding: 76,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          background:
            'radial-gradient(880px 640px at 20% 4%, rgba(255,180,84,0.10), transparent 60%),' +
            `radial-gradient(820px 700px at 88% 104%, rgba(232,160,90,0.12), transparent 62%),${BG_GRAD}`,
          color: TEXT,
          fontFamily: SANS,
        }}
      >
        {/* 골드 내부 프레임 */}
        <div
          style={{
            position: 'absolute',
            inset: 30,
            border: `1px solid ${GOLD_LINE}`,
            borderRadius: 14,
            pointerEvents: 'none',
          }}
        />

        {/* 상단 — eyebrow + 구간 라벨 */}
        <div
          style={{
            zIndex: 1,
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <span
            style={{
              fontSize: 24,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: GOLD_ACCENT,
              wordBreak: 'keep-all',
            }}
          >
            {isKo ? '사주 × 별자리 · 인생유형' : 'Korean Astrology × Zodiac · Life type'}
          </span>
          {data.rangeLabel ? (
            <span style={{ fontSize: 22, color: TEXT_MUTE, letterSpacing: '0.04em' }}>
              {data.rangeLabel}
            </span>
          ) : null}
        </div>

        {/* 본체 — 유형 배지(주인공) + 헤드라인 */}
        <div
          style={{
            zIndex: 1,
            textAlign: 'center',
            maxWidth: 900,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {data.typeName ? (
            <div
              style={{
                fontFamily: SERIF,
                fontSize: 92,
                lineHeight: 1.08,
                fontWeight: 700,
                color: GOLD_HERO,
                wordBreak: 'keep-all',
                marginBottom: 26,
              }}
            >
              {data.typeName}
            </div>
          ) : null}

          <div
            style={{
              fontFamily: SERIF,
              fontSize: data.typeName ? 38 : 56,
              lineHeight: 1.4,
              fontWeight: data.typeName ? 500 : 700,
              color: data.typeName ? TEXT : GOLD_HERO,
              wordBreak: 'keep-all',
              whiteSpace: 'pre-wrap',
              maxWidth: 860,
            }}
          >
            {data.headline}
          </div>

          {data.subline ? (
            <div
              style={{
                marginTop: 20,
                fontSize: 28,
                lineHeight: 1.5,
                color: TEXT_DIM,
                wordBreak: 'keep-all',
                maxWidth: 820,
              }}
            >
              {data.subline}
            </div>
          ) : null}
        </div>

        {/* 곡선 — 인생 흐름 */}
        <div
          style={{
            zIndex: 1,
            width: '100%',
            maxWidth: 900,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {curveUri ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={curveUri}
                alt=""
                width={880}
                height={280}
                style={{ width: 880, height: 280, objectFit: 'contain' }}
              />
              {axis.length > 0 && (
                <div
                  style={{
                    width: 880,
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 6,
                    padding: '0 14px',
                    boxSizing: 'border-box',
                  }}
                >
                  {axis.map((a, i) => (
                    <span key={`ax-${i}`} style={{ fontSize: 22, color: TEXT_MUTE }}>
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* 푸터 — 브랜드 + 복귀 경로(도메인) */}
        <div
          style={{
            zIndex: 1,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo/logo.png"
            alt="DestinyPal"
            width={40}
            height={40}
            style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8 }}
          />
          <span
            style={{
              fontFamily: SERIF,
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: '0.04em',
              color: GOLD_HERO,
            }}
          >
            DestinyPal
          </span>
          <span style={{ color: GOLD_LINE, fontSize: 22 }}>·</span>
          <span style={{ fontSize: 22, color: TEXT_MUTE, wordBreak: 'keep-all' }}>
            {isKo ? '내 인생유형도 무료로' : 'see your life type free'}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: 24, fontWeight: 600, color: GOLD_ACCENT }}>
            {SHARE_DOMAIN}
          </span>
        </div>
      </div>
    )
  }
)

export default LifeShareCard
