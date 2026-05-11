// src/components/destiny-map/Analyzer.ts
import { logger } from '@/lib/logger'
import { normalizeGender } from '@/lib/utils/gender'
import { tryNormalizeTime } from '@/lib/saju/normalizer'

export type LangKey = 'en' | 'ko' | 'ja' | 'zh' | 'es'

export type DestinyInput = {
  name: string
  birthDate: string
  birthTime: string
  city: string
  latitude: number
  longitude: number
  gender: string
  lang?: LangKey
  theme?: string // 단일 테마 (사용자 선택)
  themes?: string[] // 멀티 테마 (옵션)
  userTimezone?: string // 사용자 현재 위치 타임존 (운세 날짜 계산용)
}

export type ThemedBlock = {
  scores?: Record<string, number>
  interpretation?: string
  highlights?: string[]
}

export type DestinyResult = {
  profile?: DestinyInput
  interpretation?: string
  saju?: Record<string, unknown>
  astrology?: Record<string, unknown>
  astro?: Record<string, unknown> // alias for astrology
  error?: string
  errorMessage?: string
  lang?: LangKey
  themes?: Record<string, ThemedBlock>
  defaultTheme?: string
  requestedThemes?: string[]
  usedFabricator?: boolean
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

// 🔮 Client‑side Destiny Analyzer
export async function analyzeDestiny(input: DestinyInput): Promise<DestinyResult> {
  try {
    // ✅ base URL 자동 감지
    const baseUrl =
      typeof window !== 'undefined'
        ? window.location.origin
        : process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : 'http://localhost:3000'

    const lang: LangKey = input.lang ?? 'ko'

    // ✅ 사용자 선택 테마 또는 기본 'life' 사용
    let themes: string[] = []
    if (input.themes && input.themes.length > 0) {
      themes = input.themes
    } else if (input.theme) {
      themes = [input.theme]
    }

    // ✅ 사용자가 선택한 테마 (없으면 기본 life)
    const activeTheme = themes[0] ?? 'life'

    if (!input.latitude || !input.longitude) {
      logger.warn(
        '[Analyzer] 좌표(latitude/longitude)가 비어 있습니다. 도시 선택이 완료되었는지 확인하세요.'
      )
    }

    // ✅ 전체 요청 페이로드
    const payload = {
      name: input.name,
      birthDate: input.birthDate,
      birthTime: tryNormalizeTime(input.birthTime)?.time ?? input.birthTime,
      city: input.city,
      latitude: input.latitude,
      longitude: input.longitude,
      gender: normalizeGender(input.gender) || input.gender,
      lang,
      theme: activeTheme, // ✅ 사용자 지정 테마 반영!
      themes,
      userTimezone: input.userTimezone, // 사용자 현재 타임존 (운세 날짜용)
    }

    const response = await fetch(`${baseUrl}/api/destiny-map`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': process.env.NEXT_PUBLIC_API_TOKEN || '',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })

    const result = (await response.json().catch(() => null)) as Record<string, unknown> | null

    if (!response.ok) {
      let msg = `API Error: ${response.status}`
      if (result) {
        const errValue = result.error
        if (typeof errValue === 'string') {
          msg = errValue
        } else if (isRecord(errValue) && typeof errValue.message === 'string') {
          msg = errValue.message
        }
      }

      // 429 에러에 대한 사용자 친화적 메시지
      if (response.status === 429) {
        msg =
          lang === 'ko'
            ? '요청이 너무 많습니다. 30초 후 다시 시도해주세요.'
            : 'Too many requests. Please wait 30 seconds and try again.'
      }

      logger.error('[Analyzer] API Error:', { message: msg, response: result })
      return {
        profile: input,
        interpretation: `⚠️ API 요청 실패: ${msg}`,
        error: msg,
        errorMessage: msg,
        lang,
      }
    }

    // ✅ 정상 결과 반환
    const normalized = isRecord(result) ? result : {}
    const resultLang = typeof normalized.lang === 'string' ? normalized.lang : lang
    const astro = isRecord(normalized.astro)
      ? normalized.astro
      : isRecord(normalized.astrology)
        ? normalized.astrology
        : undefined

    return {
      ...normalized,
      profile: input,
      lang: resultLang as LangKey,
      astro,
    } as DestinyResult
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error('[Analyzer] Exception caught:', msg)
    return {
      profile: input,
      interpretation: `⚠️ Analysis Error:\n${msg}`,
      error: msg,
      errorMessage: msg,
      lang: input.lang ?? 'ko',
    }
  }
}
