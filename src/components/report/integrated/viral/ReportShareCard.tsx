'use client'

/**
 * ReportShareCard — 무료 리포트의 바이럴 "한 장 요약"을 SNS(인스타/카톡) 공유용
 * 1080×1080 정사각 카드로 그린다. html-to-image 로 이 DOM 노드를 그대로 PNG
 * 캡처한다 (ShareReportButton).
 *
 * 디자인: 타로/오늘의운세 공유 카드와 같은 **다크 프리미엄 우주 테마** —
 * 깊은 네이비(#070a1a) 바탕 + 골드(#e8cc8a / rgba(212,181,114,*)) 강조.
 *
 * 캡처 호환성(DayShareCard 와 동일 규칙):
 *  - CSS 변수/모듈 대신 명시 hex 색을 인라인으로(html-to-image 가 커스텀
 *    프로퍼티·CSS modules 인라인이 불안정).
 *  - next/image 가 아니라 평범한 <img> 로 로고 렌더(srcset/lazy 회피).
 *
 * 부모가 화면 밖(off-screen)에 1080×1080 으로 렌더해 두고 ref 로 캡처한다.
 * summary 필드는 호출부에서 이미 lang 해석을 끝낸 값이다 — en 분기에 한국어
 * 리터럴을 절대 추가하지 말 것.
 */

import React from 'react'
import type { ViralSummary } from './viralArchetype'

export const SHARE_CARD_SIZE = 1080

// 이미지 공유는 클릭 불가라 받는 사람이 돌아올 경로(도메인)를 카드에 박는다.
// NEXT_PUBLIC_ 이라 클라 번들에 인라인됨(서버 siteBaseUrl 과 동일 폴백).
const SHARE_DOMAIN = (process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com')
  .replace(/^https?:\/\//, '')
  .replace(/\/$/, '')

export interface ReportShareData {
  summary: ViralSummary
  /** 출생자 이름 — 카드 상단에 옅게. */
  name: string
  /** 표시용 생년월일 — ko 는 '1990년 1월 1일', en 은 '1990-01-01'. */
  dateLabel: string
  isKo: boolean
}

// ── 다크 프리미엄 우주 팔레트 ──────────────────────────────────────────────
const BG = '#070a1a'
const BG_HI = '#0d1230'
const GOLD = '#e8cc8a'
const GOLD_SOFT = 'rgba(212,181,114,0.55)'
const GOLD_LINE = 'rgba(212,181,114,0.28)'
const GOLD_GLOW = 'rgba(212,181,114,0.10)'
const TEXT = '#f4eede'
const TEXT_DIM = '#c9c3b2'
const TEXT_MUTE = '#8c93ad'

const SERIF = "'Newsreader', 'Gowun Batang', 'Noto Serif KR', 'Noto Serif CJK KR', Georgia, serif"
const SANS = "'Gowun Dodum', 'Noto Sans KR', 'Apple SD Gothic Neo', system-ui, sans-serif"

export const ReportShareCard = React.forwardRef<HTMLDivElement, { data: ReportShareData }>(
  function ReportShareCard({ data }, ref) {
    const { summary, name, dateLabel, isKo } = data
    const hashtags = summary.hashtags.filter(Boolean).slice(0, 3)
    const resonant = summary.resonant.filter(Boolean)

    return (
      <div
        ref={ref}
        style={{
          width: SHARE_CARD_SIZE,
          height: SHARE_CARD_SIZE,
          boxSizing: 'border-box',
          padding: 80,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          background:
            'radial-gradient(900px 640px at 22% 6%, rgba(96,116,196,0.16), transparent 60%),' +
            `radial-gradient(820px 720px at 86% 102%, ${GOLD_GLOW}, transparent 60%),` +
            `linear-gradient(160deg, ${BG_HI} 0%, ${BG} 60%, #04060f 100%)`,
          color: TEXT,
          fontFamily: SANS,
        }}
      >
        {/* 골드 내부 프레임 */}
        <div
          style={{
            position: 'absolute',
            inset: 32,
            border: `1px solid ${GOLD_LINE}`,
            borderRadius: 14,
            pointerEvents: 'none',
          }}
        />

        {/* 상단 — 이름·생년월일 (옅게) */}
        <div
          style={{
            zIndex: 1,
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            fontSize: 22,
            color: TEXT_MUTE,
          }}
        >
          <span style={{ fontFamily: SERIF, letterSpacing: '0.02em' }}>{name}</span>
          <span style={{ letterSpacing: '0.04em' }}>{dateLabel}</span>
        </div>

        {/* 본체 — 유형 */}
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
          {/* eyebrow */}
          <div
            style={{
              fontFamily: SANS,
              fontSize: 24,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: GOLD_SOFT,
              marginBottom: 28,
              wordBreak: 'keep-all',
            }}
          >
            {isKo ? '나의 사주 × 별자리 유형' : 'My Korean Astrology × Zodiac type'}
          </div>

          {/* emoji */}
          <div style={{ fontSize: 120, lineHeight: 1, marginBottom: 18 }}>{summary.emoji}</div>

          {/* 강약 결 칩 */}
          {summary.subtype && (
            <div
              style={{
                display: 'inline-block',
                fontFamily: SANS,
                fontSize: 26,
                fontWeight: 700,
                color: GOLD_SOFT,
                border: `2px solid ${GOLD_LINE}`,
                borderRadius: 999,
                padding: '6px 22px',
                marginBottom: 18,
              }}
            >
              {summary.subtype}
            </div>
          )}

          {/* archetype name */}
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 68,
              lineHeight: 1.12,
              fontWeight: 700,
              color: GOLD,
              wordBreak: 'keep-all',
              marginBottom: summary.iljuLine ? 14 : 28,
            }}
          >
            {summary.name}
          </div>

          {/* 일주(60갑자) 별명 — 유형명(30조합) 아래 60-way 개인화 축.
              친구끼리 카드가 같은 문장으로 보이지 않게 하는 핵심 줄. */}
          {summary.iljuLine && (
            <div
              style={{
                fontSize: 26,
                lineHeight: 1.4,
                color: TEXT_DIM,
                wordBreak: 'keep-all',
                marginBottom: 26,
                maxWidth: 820,
              }}
            >
              {summary.iljuLine}
            </div>
          )}

          {/* one-liner */}
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 34,
              lineHeight: 1.5,
              color: TEXT,
              wordBreak: 'keep-all',
              whiteSpace: 'pre-wrap',
              maxWidth: 820,
            }}
          >
            {summary.oneLiner}
          </div>

          {/* 콕 집는 한 줄 */}
          {summary.edgeLine && (
            <div
              style={{
                marginTop: 24,
                fontFamily: SERIF,
                fontSize: 32,
                fontWeight: 600,
                lineHeight: 1.45,
                color: GOLD_SOFT,
                wordBreak: 'keep-all',
                border: `2px solid ${GOLD_LINE}`,
                borderRadius: 16,
                padding: '14px 26px',
                maxWidth: 820,
              }}
            >
              🔪 {summary.edgeLine}
            </div>
          )}

          {/* hashtags */}
          {hashtags.length > 0 && (
            <div
              style={{
                marginTop: 32,
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                gap: 14,
              }}
            >
              {hashtags.map((tag, i) => (
                <span
                  key={`h-${i}`}
                  style={{
                    fontSize: 24,
                    color: GOLD,
                    padding: '8px 20px',
                    borderRadius: 999,
                    border: `1px solid ${GOLD_SOFT}`,
                    background: 'rgba(212,181,114,0.16)',
                    wordBreak: 'keep-all',
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 수렴 훅 + 궁합 */}
        <div
          style={{
            zIndex: 1,
            width: '100%',
            maxWidth: 880,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 22,
          }}
        >
          {/* divider */}
          <div
            style={{
              width: 180,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${GOLD_SOFT}, transparent)`,
            }}
          />

          {resonant.length > 0 && (
            <div
              style={{
                fontSize: 28,
                lineHeight: 1.5,
                color: TEXT_DIM,
                textAlign: 'center',
                wordBreak: 'keep-all',
              }}
            >
              {isKo
                ? `🔮 사주와 별자리가 ${resonant.join(' · ')}을 둘 다 가리켜요`
                : `🔮 Saju & astrology both point to ${resonant.join(' · ')}`}
            </div>
          )}

          {/* 동·서양이 엇갈린 지점 — "둘 다 너"라는 현실 모순 훅. 카드에서 가장
              차트-고유한 줄이라, 받은 사람의 "내 것도 궁금" 호기심을 만든다. */}
          {summary.clash && (
            <div
              style={{
                fontSize: 26,
                lineHeight: 1.5,
                color: TEXT_DIM,
                textAlign: 'center',
                wordBreak: 'keep-all',
              }}
            >
              {isKo
                ? `⚡ ${summary.clash.category}에선 갈렸어 — 사주는 "${summary.clash.saju}", 별자리는 "${summary.clash.astro}"`
                : `⚡ They split on ${summary.clash.category} — Saju: "${summary.clash.saju}", stars: "${summary.clash.astro}"`}
            </div>
          )}

          {summary.partner && (
            <div
              style={{
                fontSize: 26,
                lineHeight: 1.5,
                color: TEXT_DIM,
                textAlign: 'center',
                wordBreak: 'keep-all',
              }}
            >
              💞 {summary.partner}
            </div>
          )}
        </div>

        {/* 푸터 — 브랜드 */}
        <div
          style={{
            zIndex: 1,
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
              color: GOLD,
            }}
          >
            DestinyPal
          </span>
          <span style={{ color: GOLD_LINE, fontSize: 22 }}>·</span>
          <span style={{ fontSize: 22, color: TEXT_MUTE, wordBreak: 'keep-all' }}>
            {isKo ? '무료 사주 리포트' : 'free birth-chart report'}
          </span>
          {/* 이미지 공유엔 링크가 없으니 도메인을 박아 복귀 경로를 남긴다 */}
          <span style={{ marginLeft: 'auto', fontSize: 24, fontWeight: 600, color: GOLD_SOFT }}>
            {SHARE_DOMAIN}
          </span>
        </div>
      </div>
    )
  }
)
