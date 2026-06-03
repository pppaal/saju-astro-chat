import { ImageResponse } from 'next/og'

export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

interface OgImageOptions {
  title: string
  subtitle?: string
  emoji?: string
}

/**
 * 공용 링크 미리보기(OG) 카드 — 카톡/와츠앱/슬랙/트위터/iMessage 등 모든 공유
 * 채널이 읽는 1200×630 이미지. 브랜드 톤(딥 코스믹 + 골드 액센트)으로 통일.
 */
export function generateOgImage({ title, subtitle }: OgImageOptions) {
  const GOLD = '#e8cc8a'
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          background: 'linear-gradient(135deg, #0b0a1f 0%, #2a2456 48%, #1a1733 100%)',
          fontFamily: 'sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* 부드러운 보라/골드 글로우로 깊이감 */}
        <div
          style={{
            position: 'absolute',
            top: -160,
            left: 380,
            width: 700,
            height: 700,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(167,139,250,0.45) 0%, rgba(167,139,250,0) 62%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -220,
            right: -120,
            width: 620,
            height: 620,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(232,204,138,0.28) 0%, rgba(232,204,138,0) 60%)',
          }}
        />

        {/* 브랜드 모노그램 엠블럼 — 골드 링 안에 "dp". 이모지는 일부 환경에서
            폰트 로드가 실패하면 빈 칸으로 보이므로, 항상 렌더되는 텍스트 마크 사용. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 132,
            height: 132,
            borderRadius: 32,
            marginBottom: 30,
            background: 'rgba(255,255,255,0.06)',
            border: `2px solid ${GOLD}`,
            boxShadow: '0 18px 60px rgba(167,139,250,0.45)',
            fontSize: 62,
            fontWeight: 800,
            color: GOLD,
            letterSpacing: '-0.04em',
          }}
        >
          dp
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 60,
            fontWeight: 800,
            color: '#ffffff',
            textAlign: 'center',
            maxWidth: '82%',
            lineHeight: 1.18,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </div>

        {/* 골드 구분선 */}
        <div
          style={{
            width: 92,
            height: 4,
            borderRadius: 999,
            marginTop: 26,
            marginBottom: 22,
            background: GOLD,
          }}
        />

        {subtitle && (
          <div
            style={{
              display: 'flex',
              fontSize: 30,
              color: 'rgba(233,231,240,0.82)',
              textAlign: 'center',
              maxWidth: '74%',
              lineHeight: 1.4,
            }}
          >
            {subtitle}
          </div>
        )}

        {/* 브랜드 푸터 */}
        <div
          style={{
            position: 'absolute',
            bottom: 38,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 26,
            fontWeight: 700,
            color: GOLD,
            letterSpacing: '0.04em',
          }}
        >
          DestinyPal
        </div>
      </div>
    ),
    { ...OG_SIZE }
  )
}
