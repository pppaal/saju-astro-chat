// src/app/r/[token]/opengraph-image.tsx
//
// 공개 공유 리딩의 동적 OG 이미지(1200×630) — 카톡/엑스/슬랙 등에서 링크를
// 펼칠 때 보이는 미리보기. 후크(펀치라인)를 크게 박아 링크 자체가 클릭을
// 부르게 한다. Redis 조회가 필요하므로 nodejs 런타임.

import { ImageResponse } from 'next/og'
import {
  getShareLink,
  isCompatShare,
  isCalendarShare,
  isLifetimeShare,
  siteBaseUrl,
} from '@/lib/tarot/shareLink'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'DestinyPal Tarot Reading'

function clamp(text: string, max: number): string {
  const s = (text || '').trim()
  return s.length > max ? `${s.slice(0, max - 1).trim()}…` : s
}

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const reading = await getShareLink(token)
  const isKo = reading?.isKo ?? true
  const displayDomain = siteBaseUrl()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')

  // ── 인생 그래프 공유 — 곡선을 막대로 그린 정체성 카드(별도 레이아웃). ──
  if (reading && isLifetimeShare(reading)) {
    const curve = reading.curve.length ? reading.curve : [50]
    const maxV = Math.max(...curve, 1)
    const peakIdx = curve.indexOf(Math.max(...curve))
    const nowIdx = Math.max(
      0,
      Math.min(curve.length - 1, Math.round((reading.nowAge / 85) * (curve.length - 1)))
    )
    const headline = isKo
      ? `내 인생의 정점은 ${clamp(reading.peakLabel, 18)}`
      : `My peak: ${clamp(reading.peakLabel, 22)}`
    const lifeCta = isKo
      ? `나도 내 인생 그래프 보기 · ${displayDomain}`
      : `See your life curve free · ${displayDomain}`
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 64,
            background: 'linear-gradient(160deg, #14110c 0%, #0b0906 60%, #100c07 100%)',
            color: '#f4ecdc',
            fontFamily: 'sans-serif',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#e6b35c', fontSize: 30, fontWeight: 700 }}>
              ✦ DestinyPal
            </div>
            <div style={{ fontSize: 24, letterSpacing: 4, color: '#b9863a', textTransform: 'uppercase' }}>
              {clamp(reading.patternLabel, 22)}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 62, fontWeight: 800, color: '#f0c873', lineHeight: 1.15 }}>
              {headline}
            </div>
            {reading.hook ? (
              <div style={{ fontSize: 30, color: '#bdb29c', lineHeight: 1.4 }}>
                {clamp(reading.hook, 80)}
              </div>
            ) : null}
          </div>

          {/* 인생 곡선 — 막대(satori-safe). 정점=밝은 금, 지금=블루. */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 190 }}>
            {curve.map((v, i) => {
              const h = Math.max(10, Math.round((v / maxV) * 180))
              const isPeak = i === peakIdx
              const isNow = i === nowIdx
              const bg = isNow ? '#7fb0e0' : isPeak ? '#f0c873' : '#7a5a25'
              return (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    flex: 1,
                    height: h,
                    background: bg,
                    borderRadius: 4,
                    opacity: isPeak || isNow ? 1 : 0.55 + (v / maxV) * 0.4,
                  }}
                />
              )
            })}
          </div>

          <div style={{ fontSize: 27, color: '#9a8f76' }}>{lifeCta}</div>
        </div>
      ),
      { ...size }
    )
  }

  // 궁합 공유 — 두 사람 이름 + verdict 한 줄을 주인공으로, CTA 도 궁합용.
  let eyebrow: string
  let headline: string
  let context: string
  let cta: string
  if (reading && isCompatShare(reading)) {
    eyebrow = `${reading.nameA}  ♥  ${reading.nameB}`
    headline = clamp(reading.verdict, 80)
    context = reading.headline ? clamp(reading.headline, 70) : ''
    cta = isKo
      ? `우리 궁합도 무료로 · ${displayDomain}`
      : `Check your match free · ${displayDomain}`
  } else if (reading && isCalendarShare(reading)) {
    eyebrow = clamp(reading.periodLabel, 40)
    headline = clamp(reading.headline, 72)
    context = reading.highlights?.length ? clamp(reading.highlights[0], 70) : ''
    cta = isKo ? `내 운흐름도 무료로 · ${displayDomain}` : `See your timing free · ${displayDomain}`
  } else {
    eyebrow = isKo ? '타로 리딩' : 'TAROT READING'
    headline = reading?.keyMessage
      ? clamp(reading.keyMessage, 64)
      : reading
        ? clamp(reading.question, 64)
        : isKo
          ? '타로 리딩'
          : 'Tarot Reading'
    context = reading?.keyMessage ? clamp(reading.question, 70) : ''
    cta = isKo ? `나도 카드 뽑아보기 · ${displayDomain}` : `Pull your own cards · ${displayDomain}`
  }

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        background: 'linear-gradient(160deg, #0b1022 0%, #070a1a 58%, #0a0e1f 100%)',
        color: '#f1f3f9',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          color: '#e8cc8a',
          fontSize: 34,
          fontWeight: 700,
        }}
      >
        ✦ DestinyPal
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div
          style={{ fontSize: 26, letterSpacing: 6, textTransform: 'uppercase', color: '#d4b572' }}
        >
          {eyebrow}
        </div>
        <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.18, color: '#e8cc8a' }}>
          {headline}
        </div>
        {context ? (
          <div style={{ fontSize: 32, color: '#aab2c6', lineHeight: 1.4 }}>{context}</div>
        ) : null}
      </div>

      <div style={{ fontSize: 28, color: '#9aa3b8' }}>{cta}</div>
    </div>,
    { ...size }
  )
}
