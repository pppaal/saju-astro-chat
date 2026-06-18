'use client'

/**
 * DayShareCard — 오늘의 운세(1일 티어)를 SNS(인스타/카톡) 공유용 1080×1080
 * 정사각 카드로 그린다. html-to-image 로 이 DOM 노드를 그대로 PNG 캡처한다
 * (ShareDayButton).
 *
 * 캡처 호환성(TarotShareCard 와 동일 원칙):
 *  - CSS 변수 대신 명시 hex 색 사용(html-to-image 가 커스텀 프로퍼티 인라인 불안정).
 *  - next/image 가 아니라 평범한 <img> 로 로고 렌더(srcset/lazy 회피).
 *  - 제목은 시스템 serif(Georgia) 폴백으로 웹폰트 임베드 이슈 회피.
 *
 * 개인정보: DestinyDay 에는 사용자 이름이 없다(운세 산문·일진·점수뿐). 그래도
 * 출생정보·이름은 카드에 싣지 않는다 — 날짜·일진·톤·한줄·사유만 노출.
 *
 * 부모가 화면 밖(off-screen)에 1080×1080 으로 렌더해 두고 ref 로 캡처한다.
 */

import React from 'react'

export interface DayShareData {
  isKo: boolean
  /** 표시용 날짜 — ko 는 '2026년 6월 15일', en 은 '2026-06-15'. */
  dateLabel: string
  /** 일진 천간+지지 한자 — '辛巳'. */
  iljinHanja: string
  /** 일진 한글 — '신사'. */
  iljinKr: string
  /** 일간 기준 십신 라벨(이미 로케일 반영). */
  sibsinLabel: string
  /** 톤 단어 — 순풍/평이/역풍 · Tailwind/Steady/Headwind. */
  toneWord: string
  tone: 'positive' | 'mixed' | 'caution'
  /** 한 줄 결론(이미 로케일 반영). */
  oneLine: string
  /** 상위 우호 사유(최대 3, 로케일 반영·화살표 제거). */
  goods: string[]
  /** 상위 주의 사유(최대 3, 로케일 반영·화살표 제거). */
  cautions: string[]
}

const GOLD = '#e8cc8a'
const GOLD_SOFT = '#d4b572'
const TEXT = '#f1f3f9'
const MUTED = '#9aa3b8'

// 톤별 강조색 — ToneDial(positive/mixed/caution)과 같은 의미축, 캡처용 명시 hex.
const TONE_COLOR: Record<DayShareData['tone'], string> = {
  positive: '#86e0a3',
  mixed: '#e6c27a',
  caution: '#f3a0ae',
}

export const SHARE_CARD_SIZE = 1080

export const DayShareCard = React.forwardRef<HTMLDivElement, { data: DayShareData }>(
  function DayShareCard({ data }, ref) {
    const {
      isKo,
      dateLabel,
      iljinHanja,
      iljinKr,
      sibsinLabel,
      toneWord,
      tone,
      oneLine,
      goods,
      cautions,
    } = data
    const toneCol = TONE_COLOR[tone]
    const goodsShown = goods.slice(0, 3)
    const cautionsShown = cautions.slice(0, 3)

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

        {/* 날짜 + 일진 + 톤 */}
        <div style={{ zIndex: 1, textAlign: 'center', maxWidth: 900 }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: GOLD_SOFT,
              marginBottom: 18,
            }}
          >
            {isKo ? '오늘의 운세' : "TODAY'S FORTUNE"}
          </div>
          <div style={{ fontSize: 28, color: MUTED, marginBottom: 26 }}>{dateLabel}</div>

          {/* 일진 한자 — 큰 글자 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'center',
              gap: 18,
              marginBottom: 14,
            }}
          >
            <span
              style={{
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: 132,
                lineHeight: 1,
                fontWeight: 700,
                color: TEXT,
              }}
            >
              {iljinHanja}
            </span>
            <span style={{ fontSize: 38, color: MUTED }}>{iljinKr}</span>
          </div>
          <div style={{ fontSize: 24, color: GOLD_SOFT, marginBottom: 26 }}>{sibsinLabel}</div>

          {/* 톤 배지 */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              padding: '12px 28px',
              borderRadius: 999,
              border: `1px solid ${toneCol}`,
              background: 'rgba(255,255,255,0.04)',
            }}
          >
            <span style={{ width: 14, height: 14, borderRadius: 999, background: toneCol }} />
            <span style={{ fontSize: 30, fontWeight: 600, color: toneCol }}>{toneWord}</span>
          </div>
        </div>

        {/* 한 줄 결론 */}
        <div style={{ zIndex: 1, maxWidth: 900, textAlign: 'center' }}>
          {oneLine ? (
            <div
              style={{
                fontFamily: "'Cinzel', Georgia, serif",
                fontSize: 34,
                lineHeight: 1.5,
                color: GOLD,
                wordBreak: 'keep-all',
                whiteSpace: 'pre-wrap',
              }}
            >
              “{oneLine}”
            </div>
          ) : null}
        </div>

        {/* 좋은 흐름 / 조심 */}
        <div
          style={{
            zIndex: 1,
            width: '100%',
            maxWidth: 880,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {goodsShown.map((g, i) => (
            <div
              key={`g-${i}`}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 24 }}
            >
              <span style={{ color: TONE_COLOR.positive, fontWeight: 700 }}>↑</span>
              <span style={{ color: TEXT, wordBreak: 'keep-all', textAlign: 'left' }}>{g}</span>
            </div>
          ))}
          {cautionsShown.map((c, i) => (
            <div
              key={`c-${i}`}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 24 }}
            >
              <span style={{ color: TONE_COLOR.caution, fontWeight: 700 }}>↓</span>
              <span style={{ color: TEXT, wordBreak: 'keep-all', textAlign: 'left' }}>{c}</span>
            </div>
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
          <span>{isKo ? '사주 × 점성 운흐름 캘린더' : 'Saju × Astrology timing'}</span>
          <span style={{ color: 'rgba(154,163,184,0.5)' }}>·</span>
          <span>destinypal.com</span>
        </div>
      </div>
    )
  }
)
