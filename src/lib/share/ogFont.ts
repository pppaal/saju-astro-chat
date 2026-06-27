// src/lib/share/ogFont.ts
//
// next/og(satori) OG 이미지용 한글 폰트 로더. satori 는 기본 라틴 폰트만
// 번들하므로, 한글을 그대로 두면 □□□(두부)로 깨진다. 한국어 제품이라
// 치명적이라 OG 헤드라인에 들어갈 "그 글자들만" 구글 폰트에서 서브셋으로
// 받아 끼운다(text= 파라미터 → 글자 수만큼만, 수십 KB).
//
// - satori 는 woff2 를 못 읽으므로 truetype 을 받아야 한다 → 최신 UA 로
//   요청하면 구글이 /l/font?kit=... (truetype) 를 준다(확인됨).
// - 네트워크 실패해도 절대 OG 렌더를 깨지 않는다(폰트 없으면 라틴/숫자만
//   기본 폰트로, 한글만 빠짐) — best-effort.
// - 같은 (family,weight,글자집합) 은 프로세스 메모리에 캐시.

import { logger } from '@/lib/logger'

export interface OgFont {
  name: string
  data: ArrayBuffer
  weight: 400 | 700 | 800
  style: 'normal'
}

const cache = new Map<string, ArrayBuffer | null>()

// satori 는 woff2 를 못 읽으므로 truetype 서브셋이 필요하다. 구글 폰트는 UA 로
// 포맷을 고르는데, woff2 지원을 광고하지 않는 "수수한" UA 에는 truetype 을 준다
// (Chrome/AppleWebKit 토큰이 들어간 최신 UA 는 woff2 를 줘서 못 쓴다).
const TTF_UA = 'Mozilla/5.0 (X11; Linux x86_64)'

async function fetchSubset(
  family: string,
  weight: number,
  text: string
): Promise<ArrayBuffer | null> {
  // 중복 글자 제거로 URL·캐시 키 안정화.
  const glyphs = Array.from(new Set(Array.from(text))).join('')
  const key = `${family}:${weight}:${glyphs}`
  if (cache.has(key)) return cache.get(key) ?? null
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(glyphs)}`
    const cssRes = await fetch(cssUrl, { headers: { 'User-Agent': TTF_UA } })
    if (!cssRes.ok) {
      cache.set(key, null)
      return null
    }
    const css = await cssRes.text()
    const m = css.match(/src:\s*url\(([^)]+)\)\s*format\(['"]?(?:truetype|opentype)['"]?\)/)
    const fontUrl = m?.[1]
    if (!fontUrl) {
      cache.set(key, null)
      return null
    }
    const fontRes = await fetch(fontUrl)
    if (!fontRes.ok) {
      cache.set(key, null)
      return null
    }
    const buf = await fontRes.arrayBuffer()
    cache.set(key, buf)
    return buf
  } catch (err) {
    logger.warn(
      '[ogFont] subset fetch failed',
      err instanceof Error ? { msg: err.message } : undefined
    )
    cache.set(key, null)
    return null
  }
}

/**
 * OG 이미지에 쓸 폰트 묶음을 만든다. `texts` 의 모든 글자를 커버하는 한글
 * 서브셋(본문 700 / 굵은 헤드 800)을 best-effort 로 받는다. 실패하면 빈 배열
 * (라틴/숫자는 satori 기본 폰트로 렌더, 한글만 빠짐).
 */
export async function loadOgFonts(...texts: Array<string | undefined>): Promise<OgFont[]> {
  const text = texts.filter(Boolean).join(' ').trim()
  if (!text) return []
  const [body, heavy] = await Promise.all([
    fetchSubset('Noto Sans KR', 700, text),
    fetchSubset('Black Han Sans', 400, text),
  ])
  const fonts: OgFont[] = []
  if (body) {
    fonts.push({ name: 'NotoKR', data: body, weight: 700, style: 'normal' })
    // satori 는 weight 별로 폰트를 고르므로 400/800 도 같은 데이터로 등록해
    // 어떤 fontWeight 든 한글이 깨지지 않게 한다.
    fonts.push({ name: 'NotoKR', data: body, weight: 400, style: 'normal' })
  }
  if (heavy) {
    fonts.push({ name: 'HeavyKR', data: heavy, weight: 800, style: 'normal' })
  } else if (body) {
    fonts.push({ name: 'HeavyKR', data: body, weight: 800, style: 'normal' })
  }
  return fonts
}
