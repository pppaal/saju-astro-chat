// src/lib/social/aiImage.ts
//
// 소셜 카드 AI 배경 생성 — Replicate(FLUX schnell)로 버티컬별 무드 이미지를
// 만들어 Vercel Blob 에 영구 저장하고, 카드 라우트(/api/social/card)가 bg 로
// 깔아 그 위에 후크 텍스트를 코드로 얹는다(AI 는 글자를 못 그린다 — 특히
// 한글은 전부 깨지므로 배경만 AI, 텍스트는 satori).
//
// 왜 저장을 거치나: Replicate 출력 URL 은 ~1시간 뒤 만료되는데 발행 크론은
// 생성(06:00 KST) 후 최대 반나절 뒤에도 이미지를 읽는다. Blob URL 은 영구.
// 하루 × 카테고리당 1장(ko/en 공유) — 비용은 flux-schnell 기준 월 수백 원.
//
// 실패는 전부 null 폴백 — 기존 그라데이션 카드가 그대로 나간다(발행 무중단).
// 서버 전용.

import { put } from '@vercel/blob'
import { cacheGet, cacheSet } from '@/lib/cache/redis-cache'
import { logger } from '@/lib/logger'
import { computeDayPillarIndices } from '@/lib/saju/dayPillar'
import { SOCIAL_CATEGORIES, type SocialCategory } from './types'

const REPLICATE_API =
  'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions'
// 생성(사흘 보관 — 당일 발행 + 재시도 여유)과 Blob 경로가 date 키라 멱등.
const CACHE_TTL_SECONDS = 3 * 24 * 60 * 60

/** AI 배경 생성이 가능한 설정인가. SOCIAL_AI_IMAGES=off 로 끌 수 있다. */
export function aiImagesConfigured(): boolean {
  const toggle = (process.env.SOCIAL_AI_IMAGES || '').trim().toLowerCase()
  if (toggle === 'off' || toggle === 'false' || toggle === '0') return false
  return (
    (process.env.REPLICATE_API_TOKEN || '').trim() !== '' &&
    (process.env.BLOB_READ_WRITE_TOKEN || '').trim() !== ''
  )
}

/**
 * 카드 라우트 bg 허용 검사 — 우리 Blob 스토어의 공개 URL 만. 카드 라우트는
 * 공개 엔드포인트라 임의 URL 을 받으면 SSRF/외부 이미지 악용 통로가 된다.
 */
export function isAllowedCardBg(url: string): boolean {
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && u.hostname.endsWith('.public.blob.vercel-storage.com')
  } catch {
    return false
  }
}

// 버티컬별 프롬프트 — 텍스트 금지, 세로(4:5) 무드 이미지. 카드 하단에 후크가
// 얹히므로 "어두운 아래쪽" 지시로 대비를 확보한다.
const PROMPTS: Record<SocialCategory, string> = {
  tarot:
    'Mystical tarot card table scene, ornate golden card backs, candlelight, deep purple velvet, ethereal smoke, moody cinematic lighting, dark bottom half, no text, no letters',
  saju: 'Korean traditional five elements abstract art, ink wash mountains, gold leaf accents on deep indigo silk, hanji paper texture, serene and mystical, dark bottom half, no text, no letters',
  astrology:
    'Night sky constellation map, glowing zodiac star lines, deep navy cosmos with nebula, delicate gold astral ornaments, cinematic, dark bottom half, no text, no letters',
  compatibility:
    'Two intertwined red threads of fate over a soft rose and midnight-blue gradient, delicate bokeh lights, romantic mystical atmosphere, dark bottom half, no text, no letters',
  calendar:
    'Moon phases arc over calm midnight landscape, amber lantern glow, flowing time imagery, mystical minimalist, dark bottom half, no text, no letters',
  zodiac:
    'East Asian zodiac animals silhouette procession under a red-gold lunar sky, paper-cut art style, lanterns, mystical night, dark bottom half, no text, no letters',
}

function cacheKey(date: string, category: SocialCategory): string {
  return `social:bg:${date}:${category}`
}

/** 날짜×카테고리 시드 — 같은 날 같은 카테고리는 항상 같은 그림(멱등/캐시 친화). */
function seedFor(date: string, category: SocialCategory): number {
  const [y, m, d] = date.split('-').map(Number)
  const { jdn } = computeDayPillarIndices(y, m, d)
  return jdn * 7 + SOCIAL_CATEGORIES.indexOf(category)
}

/**
 * 카테고리 배경 1장 확보 — Redis 히트면 그 URL, 아니면 Replicate 생성 →
 * Blob 저장 → 캐시. 어떤 실패든 null(그라데이션 카드 폴백).
 */
export async function ensureCategoryBackground(
  date: string,
  category: SocialCategory
): Promise<string | null> {
  if (!aiImagesConfigured()) return null

  const key = cacheKey(date, category)
  const cached = await cacheGet<string>(key)
  if (cached) return cached

  try {
    // Prefer: wait — flux-schnell 은 보통 1~3초라 동기 응답으로 충분.
    const res = await fetch(REPLICATE_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${(process.env.REPLICATE_API_TOKEN || '').trim()}`,
        'Content-Type': 'application/json',
        Prefer: 'wait=30',
      },
      body: JSON.stringify({
        input: {
          prompt: PROMPTS[category],
          aspect_ratio: '4:5',
          output_format: 'jpg',
          output_quality: 85,
          seed: seedFor(date, category),
        },
      }),
      cache: 'no-store',
    })
    const body = (await res.json().catch(() => null)) as {
      status?: string
      output?: string[] | string
      error?: string
    } | null
    const output = Array.isArray(body?.output) ? body?.output[0] : body?.output
    if (!res.ok || body?.status !== 'succeeded' || !output) {
      logger.warn('[social/aiImage] replicate failed', {
        category,
        status: body?.status ?? res.status,
        error: body?.error,
      })
      return null
    }

    // Replicate 출력은 곧 만료 — 즉시 받아서 Blob 으로 영구화.
    const imgRes = await fetch(output, { cache: 'no-store' })
    if (!imgRes.ok) {
      logger.warn('[social/aiImage] download failed', { category, status: imgRes.status })
      return null
    }
    const bytes = await imgRes.arrayBuffer()
    const blob = await put(`social/bg/${date}-${category}.jpg`, bytes, {
      access: 'public',
      contentType: 'image/jpeg',
      addRandomSuffix: false,
      allowOverwrite: true,
    })

    await cacheSet(key, blob.url, CACHE_TTL_SECONDS)
    logger.info('[social/aiImage] generated', { date, category, url: blob.url })
    return blob.url
  } catch (error) {
    logger.warn('[social/aiImage] error', { category, error })
    return null
  }
}

/**
 * 하루치 배경 일괄 확보(타로 제외 — 타로는 실제 카드 아트를 쓴다).
 * 부분 실패 허용 — 실패한 카테고리만 그라데이션 카드로 나간다.
 */
export async function ensureDailyBackgrounds(
  date: string,
  categories: readonly SocialCategory[] = SOCIAL_CATEGORIES
): Promise<Partial<Record<SocialCategory, string>>> {
  if (!aiImagesConfigured()) return {}
  const targets = categories.filter((c) => c !== 'tarot')
  const urls = await Promise.all(targets.map((c) => ensureCategoryBackground(date, c)))
  const map: Partial<Record<SocialCategory, string>> = {}
  targets.forEach((c, i) => {
    if (urls[i]) map[c] = urls[i] as string
  })
  return map
}
