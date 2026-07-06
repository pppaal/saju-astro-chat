'use client'

/**
 * CompatShareCard — 무료 궁합 결과의 SNS(인스타/카톡) 공유용 1080×1080 정사각 카드.
 *
 * 타로 TarotShareCard 와 같은 결: html-to-image 로 이 DOM 노드를 그대로 PNG
 * 캡처한다(ShareCompatibilityButton). 캡처 호환을 위해:
 *  - CSS 변수 대신 명시 hex.
 *  - 외부 비트맵 이미지 의존 없음(두 차트엔 대표 이미지가 없음) — 별·게이지·
 *    텍스트만으로 구성. 게이지 그라데이션은 SVG stroke(캡처 안전), 점수·강조는
 *    단색 골드(background-clip:text 캡처 이슈 회피).
 *  - 디스플레이는 세리프 스택(없으면 시스템 serif 폴백) — 디바이스 한글 폰트로.
 *
 * 주인공은 자극적 헤드라인(punch) + 헤드라인 총점 게이지. "숫자와 후크"가
 * 캡처되어 재공유되게 한다. 부모가 화면 밖에 1080 으로 렌더해 두고 ref 로 캡처.
 */

import React from 'react'
import type { CompatVerdictTone } from '@/lib/tarot/shareLink'

const GOLD = '#e8c88c'
const TEXT = '#f3f0ff'
const MUTED = '#9c93c4'
const ROSE = '#ff8fae'
const PINK = '#ff5e8a'

const SERIF = "'Noto Serif KR', 'Nanum Myeongjo', 'Apple SD Gothic Neo', serif"
const SANS = "'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

export const COMPAT_SHARE_CARD_SIZE = 1080

/** 점수 칩 — 테마 차원 라벨 + 0~100. (마찰은 로즈로 구분) */
export interface CompatShareChip {
  label: string
  value: number
  clash?: boolean
}

export interface CompatShareCardData {
  isKo: boolean
  nameA: string
  nameB: string
  verdict: string
  verdictTone: CompatVerdictTone
  /** 공개 링크(/r/[token]) OG·페이지용 보조 한 줄. 이미지 카드엔 미표시. */
  headline?: string
  /** 헤드라인 총점(0~100). 없으면 게이지 대신 punch 가 더 크게. */
  score?: number | null
  /** 자극적 등급 pill — 예: "위험할 만큼 잘 맞아". */
  grade?: string | null
  /** 자극적 헤드라인(여러 줄 가능 — \n). */
  punch?: string | null
  /** punch 안에서 골드로 강조할 핵심 구(없으면 강조 없음). */
  accent?: string | null
  /** 상위 테마 점수 칩 2~4개 — 끌림 88 · 케미 82 · 소통 79. */
  chips?: CompatShareChip[]
  /**
   * QR 코드 data URL(선택) — 우하단 코너에 박아, 스크린샷을 찍어 올려도 스캔
   * 한 번에 무료 궁합 진입점으로 온다(재공유 시 출처·유입이 따라온다).
   */
  qrDataUrl?: string
}

// 결정적 별 좌표(1080 캔버스) — 캡처마다 같게. r>1.3 은 부드러운 헤일로 추가.
const STARS: [number, number, number][] = [
  [120, 160, 1.6],
  [300, 90, 1.1],
  [760, 140, 1.8],
  [930, 220, 1.2],
  [180, 400, 1.0],
  [980, 520, 1.5],
  [90, 640, 1.3],
  [1000, 760, 1.1],
  [160, 860, 1.6],
  [320, 960, 1.2],
  [560, 120, 1.0],
  [640, 980, 1.4],
  [860, 900, 1.1],
  [40, 300, 1.2],
  [1020, 360, 1.0],
  [460, 60, 1.3],
  [720, 40, 1.0],
  [900, 60, 1.2],
  [60, 980, 1.0],
  [520, 1010, 1.1],
  [240, 260, 0.9],
  [820, 300, 1.0],
  [400, 820, 1.0],
  [680, 760, 0.9],
  [140, 520, 0.8],
  [960, 640, 0.9],
]

// punch 한 줄을 accent 기준으로 쪼개 골드 강조. accent 없거나 미발견 시 통문자열.
function renderPunchLine(line: string, accent?: string | null): React.ReactNode {
  if (!accent || !line.includes(accent)) return line
  const idx = line.indexOf(accent)
  return (
    <>
      {line.slice(0, idx)}
      <span style={{ color: GOLD }}>{accent}</span>
      {line.slice(idx + accent.length)}
    </>
  )
}

export const CompatShareCard = React.forwardRef<HTMLDivElement, { data: CompatShareCardData }>(
  function CompatShareCard({ data }, ref) {
    const { isKo, nameA, nameB, score, grade, punch, accent, chips, qrDataUrl } = data
    const hasScore = typeof score === 'number'
    const shownChips = (chips ?? []).slice(0, 4)
    const punchLines = (punch ?? '').split('\n')

    // SVG 게이지 — r=174, 둘레 ≈ 1093. 점수만큼 채우고 나머지는 offset.
    const R = 174
    const C = 2 * Math.PI * R // ≈ 1093.0
    const dashoffset = hasScore ? Math.round(C * (1 - (score as number) / 100)) : C

    return (
      <div
        ref={ref}
        style={{
          width: COMPAT_SHARE_CARD_SIZE,
          height: COMPAT_SHARE_CARD_SIZE,
          boxSizing: 'border-box',
          position: 'relative',
          overflow: 'hidden',
          color: TEXT,
          fontFamily: SANS,
          background:
            'radial-gradient(1100px 800px at 22% 12%, rgba(124,92,255,0.30), transparent 58%),' +
            'radial-gradient(950px 760px at 84% 90%, rgba(232,180,120,0.22), transparent 60%),' +
            'radial-gradient(700px 900px at 50% 50%, rgba(60,40,120,0.25), transparent 70%),' +
            'linear-gradient(160deg, #0b0a1f 0%, #0a0817 55%, #0c0a1d 100%)',
        }}
      >
        {/* 별 흩뿌리기 */}
        <svg
          width={COMPAT_SHARE_CARD_SIZE}
          height={COMPAT_SHARE_CARD_SIZE}
          style={{ position: 'absolute', inset: 0 }}
          aria-hidden="true"
        >
          {STARS.map(([x, y, r], i) => (
            <g key={i}>
              {r > 1.3 ? <circle cx={x} cy={y} r={r * 2.4} fill="#fff" opacity={0.08} /> : null}
              <circle cx={x} cy={y} r={r} fill="#fff" opacity={0.25 + r * 0.3} />
            </g>
          ))}
        </svg>
        {/* 비네트 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 46%, transparent 52%, rgba(0,0,0,0.5) 100%)',
          }}
        />
        {/* 골드 프레임 + 코너 */}
        <div
          style={{
            position: 'absolute',
            inset: 30,
            border: '1px solid rgba(232,200,140,0.30)',
            borderRadius: 34,
            boxShadow: 'inset 0 0 80px rgba(124,92,255,0.10)',
            pointerEvents: 'none',
          }}
        />

        {/* 콘텐츠 */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            height: '100%',
            padding: '92px 84px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* 라벨 + 두 사람(성좌선) */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                fontSize: 22,
                letterSpacing: '0.42em',
                textTransform: 'uppercase',
                color: GOLD,
              }}
            >
              {isKo ? '우리 궁합' : 'Our Match'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 30, marginTop: 28 }}>
              <span style={{ fontFamily: SERIF, fontSize: 52, fontWeight: 700, color: '#fff' }}>
                {nameA}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: GOLD,
                    boxShadow: '0 0 16px 4px rgba(232,200,140,0.8)',
                  }}
                />
                <span
                  style={{
                    width: 64,
                    height: 1,
                    background:
                      'repeating-linear-gradient(90deg, rgba(232,200,140,0.7) 0 7px, transparent 7px 14px)',
                  }}
                />
                <span
                  style={{
                    fontSize: 34,
                    color: PINK,
                    filter: 'drop-shadow(0 0 14px rgba(255,94,138,0.7))',
                  }}
                >
                  ♥
                </span>
                <span
                  style={{
                    width: 64,
                    height: 1,
                    background:
                      'repeating-linear-gradient(90deg, rgba(232,200,140,0.7) 0 7px, transparent 7px 14px)',
                  }}
                />
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: GOLD,
                    boxShadow: '0 0 16px 4px rgba(232,200,140,0.8)',
                  }}
                />
              </span>
              <span style={{ fontFamily: SERIF, fontSize: 52, fontWeight: 700, color: '#fff' }}>
                {nameB}
              </span>
            </div>
          </div>

          {/* 점수 게이지(주인공) */}
          {hasScore ? (
            <div
              style={{
                position: 'relative',
                width: 400,
                height: 400,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <svg width={400} height={400} viewBox="0 0 400 400">
                <defs>
                  <linearGradient id="compatGauge" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#fff2cf" />
                    <stop offset="0.5" stopColor="#e8c88c" />
                    <stop offset="1" stopColor="#ff7e9d" />
                  </linearGradient>
                  <filter id="compatGlow" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="8" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <circle
                  cx="200"
                  cy="200"
                  r={R}
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={19}
                />
                <circle
                  cx="200"
                  cy="200"
                  r={R}
                  fill="none"
                  stroke="url(#compatGauge)"
                  strokeWidth={19}
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={dashoffset}
                  transform="rotate(-90 200 200)"
                  filter="url(#compatGlow)"
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: 188, fontWeight: 900, lineHeight: 0.9, color: GOLD }}>
                  {score}
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 600,
                    letterSpacing: '0.3em',
                    color: '#b9a8e6',
                    marginTop: 4,
                  }}
                >
                  ／100
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex' }} />
          )}

          {/* 자극적 헤드라인 + 등급 pill */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {punch ? (
              <div
                style={{
                  maxWidth: 840,
                  textAlign: 'center',
                  fontFamily: SERIF,
                  fontSize: 60,
                  fontWeight: 900,
                  lineHeight: 1.32,
                  color: '#fff',
                  textShadow: '0 2px 36px rgba(124,92,255,0.55)',
                  wordBreak: 'keep-all',
                }}
              >
                {punchLines.map((line, i) => (
                  <div key={i}>{renderPunchLine(line, accent)}</div>
                ))}
              </div>
            ) : null}
            {grade ? (
              <div
                style={{
                  marginTop: 20,
                  fontSize: 30,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: ROSE,
                  border: '1px solid rgba(255,143,174,0.45)',
                  borderRadius: 999,
                  padding: '10px 28px',
                  background: 'rgba(255,94,138,0.10)',
                }}
              >
                {grade}
              </div>
            ) : null}
          </div>

          {/* 상위 테마 점수 칩 */}
          {shownChips.length ? (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {shownChips.map((c, i) => (
                <div
                  key={i}
                  style={{
                    padding: '0 40px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    borderLeft: i === 0 ? 'none' : '1px solid rgba(232,200,140,0.28)',
                  }}
                >
                  <span
                    style={{ fontSize: 24, fontWeight: 600, letterSpacing: '0.08em', color: MUTED }}
                  >
                    {c.label}
                  </span>
                  <span
                    style={{
                      fontSize: 56,
                      fontWeight: 800,
                      lineHeight: 1,
                      color: c.clash ? ROSE : GOLD,
                    }}
                  >
                    {c.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex' }} />
          )}

          {/* 푸터 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              fontSize: 24,
              color: '#8d85b0',
            }}
          >
            <span style={{ color: GOLD }}>✦</span>
            <span>
              {isKo ? '무료 궁합 · destinypal.com' : 'Free compatibility · destinypal.com'}
            </span>
          </div>
        </div>

        {/* QR — 우하단 코너(절대 위치). 스크린샷만 봐도 스캔 한 번에 무료 궁합으로. */}
        {qrDataUrl ? (
          <div
            style={{
              position: 'absolute',
              right: 58,
              bottom: 52,
              zIndex: 4,
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
                boxShadow: '0 6px 20px rgba(0,0,0,0.45)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="" width={104} height={104} style={{ display: 'block' }} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 600, color: GOLD }}>
              {isKo ? '스캔 · 무료' : 'Scan · free'}
            </span>
          </div>
        ) : null}
      </div>
    )
  }
)
