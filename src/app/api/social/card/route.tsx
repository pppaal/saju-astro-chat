// src/app/api/social/card/route.tsx
//
// 소셜 발행용 동적 카드 이미지(1080×1350 세로 — IG/Threads 최적). 드래프트의 후크를
// 크게 박은 브랜디드 카드를 서버사이드(satori/next-og, 브라우저 불필요)로 렌더한다.
// generateDrafts 가 cardImage 로 이 URL 을 싣고, publish 어댑터가 image_url 로 발행한다.
// 파라미터로만 렌더 → 같은 입력=같은 이미지(CDN 캐시 가능). 한글은 loadOgFonts 서브셋.

import { ImageResponse } from 'next/og'
import { loadOgFonts } from '@/lib/share/ogFont'
import { SOCIAL_CATEGORIES, type SocialCategory } from '@/lib/social/types'
import { siteBaseUrl } from '@/lib/tarot/shareLink'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SIZE = { width: 1080, height: 1350 }

function clamp(s: string, max: number): string {
  const t = (s || '').trim()
  return t.length > max ? `${t.slice(0, max - 1).trim()}…` : t
}

// 버티컬별 강조색 — 카드 결을 가른다(사주=골드, 점성=별빛, 궁합=로즈…).
const ACCENT: Record<SocialCategory, string> = {
  tarot: '#c9a0ff',
  saju: '#e8cc8a',
  astrology: '#8ab4ff',
  compatibility: '#ff8fb0',
  calendar: '#e8a24d',
}
// 강조색의 반투명 버전 — 오라 글로우/글리프 워터마크용(rgba, satori 안전).
const SOFT: Record<SocialCategory, string> = {
  tarot: 'rgba(201,160,255,',
  saju: 'rgba(232,204,138,',
  astrology: 'rgba(138,180,255,',
  compatibility: 'rgba(255,143,176,',
  calendar: 'rgba(232,162,77,',
}
export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const vRaw = url.searchParams.get('v') || 'saju'
  const v: SocialCategory = (SOCIAL_CATEGORIES as readonly string[]).includes(vRaw)
    ? (vRaw as SocialCategory)
    : 'saju'
  const isKo = (url.searchParams.get('lang') || 'ko') !== 'en'
  const title = clamp(url.searchParams.get('t') || '', 42)
  // 후크가 비면 제목을 헤드라인으로 승격(빈 카드 방지).
  const hook = clamp(url.searchParams.get('h') || title, 56)
  const glyph = clamp(url.searchParams.get('g') || '', 4)
  const accent = ACCENT[v]
  const soft = SOFT[v]
  // 브랜드 라인 — 동·서양 융합이 우리 차별점이라 이걸 아이브로로. 버티컬은 강조색·
  // 후크·제목으로 구분(카테고리명 중복 노출은 뺀다).
  const eyebrow = isKo ? '사주 × 별자리' : 'SAJU × ASTROLOGY'
  const domain = siteBaseUrl()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
  const cta = isKo ? `생일만 넣으면 무료로 · ${domain}` : `Free — just your birthday · ${domain}`
  // 후크가 짧으면 더 크게(임팩트), 길면 줄여 넘침 방지.
  const hookSize = hook.length <= 22 ? 96 : hook.length <= 38 ? 82 : 70

  const fonts = await loadOgFonts(eyebrow, hook, title, cta, glyph)
  return new ImageResponse(
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        background: 'linear-gradient(158deg, #16111f 0%, #0b0812 54%, #180a16 100%)',
        color: '#f3eee6',
        fontFamily: 'NotoKR, sans-serif',
      }}
    >
      {/* 오라 글로우 — 상단 강조색 빛무리로 깊이감 */}
      <div
        style={{
          position: 'absolute',
          top: -320,
          right: -220,
          width: 1000,
          height: 1000,
          display: 'flex',
          background: `radial-gradient(closest-side, ${soft}0.22), ${soft}0) 72%)`,
        }}
      />
      {/* 글리프 워터마크 — 간지/오행 한자로 버티컬 정체성 시각화 */}
      {glyph ? (
        <div
          style={{
            position: 'absolute',
            right: -30,
            bottom: -140,
            display: 'flex',
            fontSize: glyph.length >= 2 ? 400 : 560,
            lineHeight: 1,
            fontFamily: 'HeavyKR, sans-serif',
            color: `${soft}0.16)`,
          }}
        >
          {glyph}
        </div>
      ) : null}

      {/* 콘텐츠 — 오라·글리프 위에 */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 88,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 33, letterSpacing: 1, color: accent, fontWeight: 700 }}>
            {eyebrow}
          </div>
          <div style={{ fontSize: 29, color: '#8a8398', letterSpacing: 2 }}>DestinyPal</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div
            style={{
              fontSize: hookSize,
              fontWeight: 800,
              lineHeight: 1.14,
              fontFamily: 'HeavyKR, sans-serif',
              color: '#fbf7ef',
            }}
          >
            {hook}
          </div>
          {title && title !== hook ? (
            <div style={{ fontSize: 37, color: '#c3bccc', lineHeight: 1.35 }}>{title}</div>
          ) : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{ width: 48, height: 5, background: accent, borderRadius: 3, display: 'flex' }}
          />
          <div style={{ fontSize: 30, color: '#a7afc0' }}>{cta}</div>
        </div>
      </div>
    </div>,
    { ...SIZE, fonts: fonts.length ? fonts : undefined }
  )
}
