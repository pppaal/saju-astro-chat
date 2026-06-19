// src/app/r/[token]/opengraph-image.tsx
//
// 공개 공유 리딩의 동적 OG 이미지(1200×630) — 카톡/엑스/슬랙 등에서 링크를
// 펼칠 때 보이는 미리보기. 후크(펀치라인)를 크게 박아 링크 자체가 클릭을
// 부르게 한다. Redis 조회가 필요하므로 nodejs 런타임.

import { ImageResponse } from 'next/og'
import { getShareLink, siteBaseUrl } from '@/lib/tarot/shareLink'

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
  const headline = reading?.keyMessage
    ? clamp(reading.keyMessage, 64)
    : reading
      ? clamp(reading.question, 64)
      : isKo
        ? '타로 리딩'
        : 'Tarot Reading'
  const context = reading?.keyMessage ? clamp(reading.question, 70) : ''
  const displayDomain = siteBaseUrl()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')

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
          {isKo ? '타로 리딩' : 'TAROT READING'}
        </div>
        <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.18, color: '#e8cc8a' }}>
          {headline}
        </div>
        {context ? (
          <div style={{ fontSize: 32, color: '#aab2c6', lineHeight: 1.4 }}>{context}</div>
        ) : null}
      </div>

      <div style={{ fontSize: 28, color: '#9aa3b8' }}>
        {isKo ? `나도 카드 뽑아보기 · ${displayDomain}` : `Pull your own cards · ${displayDomain}`}
      </div>
    </div>,
    { ...size }
  )
}
