// src/app/r/[token]/opengraph-image.tsx
//
// 공개 공유 리딩의 동적 OG 이미지(1200×630) — 카톡/엑스/슬랙 등에서 링크를
// 펼칠 때 보이는 미리보기. 질문 + 핵심 메시지 + 브랜드를 담아 링크 자체가
// 클릭을 부르게 한다. prisma 조회가 필요하므로 nodejs 런타임.

import { ImageResponse } from 'next/og'
import { getSharedReadingByToken } from '@/lib/tarot/sharedReading'

export const runtime = 'nodejs'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'DestinyPal Tarot Reading'

function firstSentence(text: string, max: number): string {
  const s = (text || '').trim()
  if (!s) return ''
  const m = s.match(/^[\s\S]*?[.!?。！？]/)
  const out = (m ? m[0] : s).trim()
  return out.length > max ? `${out.slice(0, max - 1).trim()}…` : out
}

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const reading = await getSharedReadingByToken(token)
  const isKo = reading?.locale === 'ko'
  const question = reading
    ? reading.question.length > 60
      ? `${reading.question.slice(0, 59)}…`
      : reading.question
    : isKo
      ? '타로 리딩'
      : 'Tarot Reading'
  const message = reading ? firstSentence(reading.affirmation || reading.overallMessage, 96) : ''

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div
          style={{
            fontSize: 26,
            letterSpacing: 6,
            textTransform: 'uppercase',
            color: '#d4b572',
          }}
        >
          {isKo ? '타로 리딩' : 'TAROT READING'}
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.2 }}>{question}</div>
        {message ? (
          <div style={{ fontSize: 34, color: '#cfd6e6', lineHeight: 1.4 }}>“{message}”</div>
        ) : null}
      </div>

      <div style={{ fontSize: 28, color: '#9aa3b8' }}>
        {isKo ? '나도 카드 뽑아보기 · destinypal.me' : 'Pull your own cards · destinypal.me'}
      </div>
    </div>,
    { ...size }
  )
}
