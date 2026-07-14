// src/app/api/social/card/route.tsx
//
// 소셜 발행용 동적 카드 이미지(1080×1350 세로 — IG/Threads 최적). 드래프트의 후크를
// 크게 박은 브랜디드 카드를 서버사이드(satori/next-og, 브라우저 불필요)로 렌더한다.
// generateDrafts 가 cardImage 로 이 URL 을 싣고, publish 어댑터가 image_url 로 발행한다.
// 파라미터로만 렌더 → 같은 입력=같은 이미지(CDN 캐시 가능). 한글은 loadOgFonts 서브셋.

import { ImageResponse } from 'next/og'
import { loadOgFonts } from '@/lib/share/ogFont'
import { isAllowedCardBg } from '@/lib/social/aiImage'
import { SOCIAL_CATEGORIES, type SocialCategory } from '@/lib/social/types'
import { siteBaseUrl } from '@/lib/tarot/shareLink'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SIZE = { width: 1080, height: 1350 }

function clamp(s: string, max: number): string {
  const t = (s || '').trim()
  return t.length > max ? `${t.slice(0, max - 1).trim()}…` : t
}

// 후크용 — 단어 중간에서 자르지 않는다(공백/구두점 경계에서만). 영어는 한글보다
// 덜 촘촘해 같은 폭에 더 많은 글자가 들어가므로 max 를 언어별로 다르게 준다.
function clampWords(s: string, max: number): string {
  const t = (s || '').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const lastBreak = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf('—'), cut.lastIndexOf(','))
  const base = lastBreak > max * 0.5 ? cut.slice(0, lastBreak) : cut
  return `${base.trim().replace(/[,—-]$/, '')}…`
}

// 버티컬별 강조색 — 카드 결을 가른다(사주=골드, 점성=별빛, 궁합=로즈…).
const ACCENT: Record<SocialCategory, string> = {
  tarot: '#c9a0ff',
  saju: '#e8cc8a',
  astrology: '#8ab4ff',
  compatibility: '#ff8fb0',
  calendar: '#e8a24d',
  zodiac: '#ff9d6b',
}
// 강조색의 반투명 버전 — 오라 글로우/글리프 워터마크용(rgba, satori 안전).
const SOFT: Record<SocialCategory, string> = {
  tarot: 'rgba(201,160,255,',
  saju: 'rgba(232,204,138,',
  astrology: 'rgba(138,180,255,',
  compatibility: 'rgba(255,143,176,',
  calendar: 'rgba(232,162,77,',
  zodiac: 'rgba(255,157,107,',
}
export async function GET(req: Request): Promise<Response> {
  // 비인증·미들웨어 미적용 라우트 — 요청마다 1080×1350 satori 렌더 + (텍스트별)
  // Google Fonts 서브셋 외부 fetch 가 돈다. 무제한이면 파라미터만 바꿔 반복 호출해
  // CPU·아웃바운드를 증폭시킬 수 있으므로 IP 레이트리밋을 직접 건다. 정상 발행
  // 흐름은 카드당 한두 번이라 60/min 은 체감 영향 없음.
  const ip = getClientIp(req.headers)
  const rl = await rateLimit(`social:card:${ip}`, { limit: 60, windowSeconds: 60 })
  if (!rl.allowed) {
    return new Response('Too Many Requests', { status: 429 })
  }

  const url = new URL(req.url)
  const vRaw = url.searchParams.get('v') || 'saju'
  const v: SocialCategory = (SOCIAL_CATEGORIES as readonly string[]).includes(vRaw)
    ? (vRaw as SocialCategory)
    : 'saju'
  const isKo = (url.searchParams.get('lang') || 'ko') !== 'en'
  const title = clamp(url.searchParams.get('t') || '', 42)
  // 후크가 비면 제목을 헤드라인으로 승격(빈 카드 방지). 영어는 덜 촘촘해 max 를 넉넉히.
  const hook = clampWords(url.searchParams.get('h') || title, isKo ? 54 : 66)
  const glyph = clamp(url.searchParams.get('g') || '', 4)
  // AI 배경(aiImage.ts 가 Blob 에 저장) — 우리 스토어 URL 만 허용(SSRF/악용 차단).
  const bgRaw = url.searchParams.get('bg') || ''
  const bg = bgRaw && isAllowedCardBg(bgRaw) ? bgRaw : null
  const accent = ACCENT[v]
  const soft = SOFT[v]
  // 브랜드 라인 — 동·서양 융합이 우리 차별점이라 이걸 아이브로로. EN 은 K-웨이브
  // 후광을 탄 'KOREAN ASTROLOGY'(발견 훅)를 앞세우고, 서양이 아는 'ZODIAC'와 융합해
  // 우리 moat(사주 × 서양 점성)를 드러낸다. 버티컬은 강조색·후크·제목으로 구분.
  const eyebrow = isKo ? '사주 × 별자리' : 'KOREAN ASTROLOGY × ZODIAC'
  const domain = siteBaseUrl()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
  const cta = isKo ? `생일만 넣으면 무료로 · ${domain}` : `Free — just your birthday · ${domain}`
  // 후크가 짧으면 더 크게(임팩트), 길면 줄여 넘침 방지.
  const hookSize = hook.length <= 22 ? 96 : hook.length <= 40 ? 80 : hook.length <= 54 ? 70 : 62

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
      {/* AI 배경 — 전면 깔고 어두운 오버레이로 텍스트 대비 확보 */}
      {bg ? (
        // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- satori(ImageResponse) 렌더러는 원시 <img> 만 지원하고 alt 는 무의미(출력물이 이미지)
        <img
          src={bg}
          width={SIZE.width}
          height={SIZE.height}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : null}
      {bg ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            background:
              'linear-gradient(180deg, rgba(11,8,18,0.55) 0%, rgba(11,8,18,0.35) 42%, rgba(11,8,18,0.82) 100%)',
          }}
        />
      ) : null}
      {/* 오라 글로우 — 상단 강조색 빛무리로 깊이감 (AI 배경 위엔 과해서 생략) */}
      {!bg ? (
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
      ) : null}
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
