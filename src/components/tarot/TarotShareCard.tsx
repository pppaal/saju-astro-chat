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
  /**
   * 추천 링크(?ref=코드)를 인코딩한 QR 의 data URL. 공유 이미지를 본
   * 친구가 스캔→가입하면 양쪽 다 크레딧을 받는 바이럴 루프의 진입점.
   * 게스트이거나 QR 생성 실패 시 undefined — 그때는 텍스트 핸들로 폴백.
   */
  qrDataUrl?: string
  /** QR 아래/옆에 적는 사람이 읽을 짧은 링크 (예: destinypal.me). */
  shareUrl?: string
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
    const { question, spreadTitle, cards, keyMessage, isKo, qrDataUrl, shareUrl } = data
    const shown = cards.slice(0, 5)
    const readableUrl = (shareUrl || 'destinypal.me').replace(/^https?:\/\//, '').replace(/\/$/, '')
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
              fontSize: question.length > 40 ? 40 : 50,
              lineHeight: 1.3,
              fontWeight: 600,
              color: TEXT,
              // html-to-image 캡처에서 -webkit-line-clamp 가 안 먹어 한 줄로
              // 잘리던 문제 → 일반 줄바꿈 사용. 한국어는 단어 중간 분리 방지.
              wordBreak: 'keep-all',
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

        {/* 한 줄 메시지 */}
        <div style={{ zIndex: 1, maxWidth: 880, textAlign: 'center' }}>
          {keyMessage ? (
            <div
              style={{
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: 30,
                lineHeight: 1.5,
                color: GOLD,
                // 캡처에서 line-clamp 가 안 먹어 한 줄로 잘리던 문제 → 일반 줄바꿈.
                wordBreak: 'keep-all',
                whiteSpace: 'pre-wrap',
              }}
            >
              “{keyMessage}”
            </div>
          ) : null}
        </div>

        {/* 푸터 — 추천 QR + 초대 CTA (바이럴 루프 진입점) */}
        <div
          style={{
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: qrDataUrl ? 'space-between' : 'center',
            gap: 22,
            width: '100%',
            maxWidth: 880,
          }}
        >
          {/* 왼쪽: 브랜드 + 초대 카피 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, textAlign: 'left' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 20, color: MUTED }}
            >
              <span style={{ color: GOLD_SOFT }}>✦</span>
              <span>{spreadTitle}</span>
            </div>
            {qrDataUrl ? (
              <>
                <div style={{ fontSize: 26, fontWeight: 600, color: GOLD, lineHeight: 1.35 }}>
                  {isKo ? '나도 카드 뽑아보기' : 'Pull your own cards'}
                </div>
                <div style={{ fontSize: 19, color: MUTED, lineHeight: 1.4 }}>
                  {isKo
                    ? 'QR 스캔하면 친구·나 둘 다 무료 크레딧'
                    : 'Scan the QR — you both get free credits'}
                </div>
                <div style={{ fontSize: 19, color: GOLD_SOFT, letterSpacing: '0.02em' }}>
                  {readableUrl}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 20, color: MUTED }}>{readableUrl}</div>
            )}
          </div>

          {/* 오른쪽: 추천 링크 QR */}
          {qrDataUrl ? (
            <div
              style={{
                width: 168,
                height: 168,
                borderRadius: 18,
                padding: 12,
                background: '#ffffff',
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                flexShrink: 0,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt={isKo ? '추천 링크 QR' : 'Referral link QR'}
                width={144}
                height={144}
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            </div>
          ) : null}
        </div>
      </div>
    )
  }
)
