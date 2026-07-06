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
  /** 상단 라벨 — 일반 리딩 "타로 리딩", 데일리 "오늘의 타로". 미지정 시 기본값. */
  eyebrow?: string
  /** 후크 아래 살짝 보여줄 해석 티저(궁금증 유발 — "…"로 끊김). 선택. */
  teaser?: string
  /**
   * QR 코드 data URL(선택) — 우하단 코너에 박아, 스크린샷을 찍어 올려도 스캔
   * 한 번에 무료 진입점으로 온다(재공유 시 출처·유입이 따라온다). 부모(버튼)가
   * 캡처 전에 생성해 넘긴다.
   */
  qrDataUrl?: string
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
    const { question, spreadTitle, cards, keyMessage, isKo, eyebrow, teaser, qrDataUrl } = data
    const eyebrowLabel = eyebrow ?? (isKo ? '타로 리딩' : 'TAROT READING')
    // 티저가 후크와 같으면(중복) 숨김.
    const showTeaser = !!teaser && teaser.trim() !== keyMessage.trim()
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
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
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

        {/* 상단 브랜드는 제거 — 카드/문구에 시선 집중. 브랜드는 하단 푸터에만. */}

        {/* 질문 — 맥락 라인(작게). 주인공은 아래 펀치라인. */}
        <div style={{ zIndex: 1, textAlign: 'center', maxWidth: 880 }}>
          <div
            style={{
              fontSize: 20,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: GOLD_SOFT,
              marginBottom: 14,
            }}
          >
            {eyebrowLabel}
          </div>
          <div
            style={{
              fontSize: 27,
              lineHeight: 1.35,
              color: MUTED,
              // 한국어 단어 중간 분리 방지 + 일반 줄바꿈(캡처 line-clamp 미동작).
              // 영어 긴 토큰(URL 등)은 넘치지 않게 anywhere 폴백.
              wordBreak: 'keep-all',
              overflowWrap: 'anywhere',
              whiteSpace: 'pre-wrap',
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

        {/* 펀치라인 — 카드의 주인공(가장 큼). 이게 캡처·재공유되는 한 줄. */}
        <div style={{ zIndex: 1, maxWidth: 920, textAlign: 'center' }}>
          {keyMessage ? (
            <div
              style={{
                fontWeight: 800,
                // 짧을수록 더 크게. 한국어 22자/영어 ~40자 기준 2단계.
                fontSize: keyMessage.length > 22 ? 48 : 58,
                lineHeight: 1.4,
                letterSpacing: isKo ? '-0.01em' : '0',
                color: GOLD,
                textShadow: '0 2px 24px rgba(212,181,114,0.18)',
                // 한국어는 어절 보존(keep-all). 단, 공백 없는 초장문 어절은
                // 프레임 밖으로 삐져나가지 않게 anywhere 로 폴백.
                wordBreak: 'keep-all',
                overflowWrap: 'anywhere',
              }}
            >
              {keyMessage}
            </div>
          ) : null}

          {/* 해석 티저 — 후크 아래 3~4줄, "…"로 끊어 궁금증을 남긴다. */}
          {showTeaser ? (
            <div
              style={{
                marginTop: 22,
                fontSize: 27,
                lineHeight: 1.55,
                color: '#c7cedd',
                wordBreak: 'keep-all',
                overflowWrap: 'anywhere',
              }}
            >
              {teaser}
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

        {/* QR — 우하단 코너(절대 위치라 space-between 레이아웃에 영향 없음).
            스크린샷만 봐도 스캔 한 번에 무료 진입점으로 유입된다. */}
        {qrDataUrl ? (
          <div
            style={{
              position: 'absolute',
              right: 52,
              bottom: 48,
              zIndex: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <div
              style={{
                padding: 8,
                background: '#ffffff',
                borderRadius: 12,
                boxShadow: '0 6px 20px rgba(0,0,0,0.4)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="" width={104} height={104} style={{ display: 'block' }} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 600, color: GOLD_SOFT }}>
              {isKo ? '스캔 · 무료' : 'Scan · free'}
            </span>
          </div>
        ) : null}
      </div>
    )
  }
)
