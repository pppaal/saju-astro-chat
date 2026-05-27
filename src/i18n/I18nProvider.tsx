'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { allExtensions } from '@/lib/i18n/extensions'
import { repairMojibakeText } from '@/lib/text/mojibake'

type Locale = 'en' | 'ko'
type DictValue = Record<string, unknown>

// Cache for loaded dictionaries
const dictsCache: Partial<Record<Locale, DictValue>> = {}
let dictsInitialized = false

// Async function to load dictionaries for a specific locale
async function loadLocaleDict(locale: Locale): Promise<DictValue> {
  // Return cached if available
  if (dictsCache[locale]) {
    return dictsCache[locale]!
  }

  // Dynamically import all translation files for the locale
  // personality / destinyMatch JSON 은 PR #691 에서 페이지 삭제 시 같이 제거됨 — 임포트
  // 도 빼야 Turbopack 빌드 통과. 추후 페이지 부활 시 JSON 도 다시 추가.
  const modules = await Promise.all([
    import(`./locales/${locale}/common.json`),
    import(`./locales/${locale}/landing.json`),
    import(`./locales/${locale}/chat.json`),
    import(`./locales/${locale}/services.json`),
    import(`./locales/${locale}/tarot.json`),
    import(`./locales/${locale}/calendar.json`),
    import(`./locales/${locale}/compatibility.json`),
    import(`./locales/${locale}/destinymap.json`),
    import(`./locales/${locale}/features.json`),
    import(`./locales/${locale}/misc.json`),
  ])

  // Deep merge helper for combining translation modules with overlapping namespaces
  const deepMerge = (target: DictValue, source: DictValue): DictValue => {
    for (const key of Object.keys(source)) {
      if (
        target[key] &&
        typeof target[key] === 'object' &&
        !Array.isArray(target[key]) &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        target[key] = deepMerge({ ...(target[key] as DictValue) }, source[key] as DictValue)
      } else {
        target[key] = source[key]
      }
    }
    return target
  }

  // Merge all modules into single dictionary (deep merge to preserve overlapping namespaces)
  const dict = modules.reduce(
    (acc, mod) => deepMerge(acc, mod.default as DictValue),
    {} as DictValue
  )

  // Merge extensions
  if (allExtensions[locale]) {
    for (const [ns, translations] of Object.entries(allExtensions[locale])) {
      dict[ns] = { ...(dict[ns] || {}), ...translations }
    }
  }

  // Cache the result
  dictsCache[locale] = dict
  return dict
}

// Fill missing translations with English fallback
function fillMissing(base: Record<string, unknown>, target: Record<string, unknown>) {
  for (const [k, v] of Object.entries(base)) {
    if (!(k in target)) {
      target[k] = v
      continue
    }
    if (
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      target[k] &&
      typeof target[k] === 'object'
    ) {
      fillMissing(v as Record<string, unknown>, target[k] as Record<string, unknown>)
    }
  }
}

// Initialize dictionaries (load English by default, Korean on demand)
async function initializeDicts() {
  if (dictsInitialized) return
  dictsInitialized = true

  // Load English as the default/fallback
  await loadLocaleDict('en')
}

type I18nContextType = {
  locale: Locale
  language: Locale
  setLocale: (l: Locale) => void
  t: (path: string, fallback?: string) => string
  translate: (path: string, fallback?: string) => string
  dir: 'ltr' | 'rtl'
  hydrated: boolean
}

// Export for backward compatibility (will be empty initially, populated on demand)
export const DICTS = dictsCache

const I18nContext = createContext<I18nContextType | null>(null)

// Only support en/ko
export const SUPPORTED_LOCALES: Locale[] = ['en', 'ko']
const isRtl = (_l: Locale) => false // No RTL languages supported

const toSafeFallbackText = (path: string) => {
  const candidate = path.split('.').pop() || path
  const normalized = candidate
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
  if (!normalized) {
    return 'Content unavailable'
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1)
}

const isRawKeyLeak = (value: string, path: string) => {
  const leaf = path.split('.').pop() || path
  return value === path || value === leaf
}

const normalizeTranslationText = (value: string) => {
  if (!value) {
    return value
  }
  return repairMojibakeText(value).trim()
}

// Read locale from cookie on first render so SSR + client agree
function readCookieLocale(): Locale | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]+)/)
  if (!match) return null
  const value = decodeURIComponent(match[1]) as Locale
  return SUPPORTED_LOCALES.includes(value) ? value : null
}

function writeCookieLocale(locale: Locale) {
  if (typeof document === 'undefined') return
  // 1 year, lax — matches middleware
  document.cookie = `locale=${locale}; max-age=${60 * 60 * 24 * 365}; path=/; samesite=lax`
}

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode
  initialLocale?: Locale
}) {
  // Lazy init: prefer SSR-provided locale, fall back to cookie, then English.
  // Avoids hydration mismatch — first client render matches what server rendered.
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (initialLocale && SUPPORTED_LOCALES.includes(initialLocale)) return initialLocale
    return readCookieLocale() ?? 'en'
  })
  const [hydrated, setHydrated] = useState(false)
  // dictVersion bumps every time a dict finishes loading, forcing `t` re-memo
  // so consumers re-render with newly-available translations.
  const [dictVersion, setDictVersion] = useState(0)

  // Initialize English (default/fallback) on mount
  useEffect(() => {
    initializeDicts().then(() => setDictVersion((v) => v + 1))
  }, [])

  useEffect(() => {
    setHydrated(true)
  }, [])

  // Load dict for current locale; bump version when ready so consumers re-render
  useEffect(() => {
    if (dictsCache[locale]) {
      // Already cached — no-op (already triggered re-render via dictVersion bump on load)
      return
    }
    let cancelled = false
    loadLocaleDict(locale).then((dict) => {
      if (cancelled) return
      if (locale !== 'en' && dictsCache.en) {
        fillMissing(dictsCache.en, dict)
      }
      setDictVersion((v) => v + 1)
    })
    return () => {
      cancelled = true
    }
  }, [locale])

  // Sync locale to cookie + html lang
  useEffect(() => {
    writeCookieLocale(locale)
    try {
      localStorage.setItem('locale', locale)
    } catch {}
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
      document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr'
    }
  }, [locale])

  const setLocale = (next: Locale) => {
    setLocaleState(next)
  }

  const t = useMemo(() => {
    const getter = (obj: unknown, path: string) => {
      if (!path) {
        return undefined
      }
      const parts = path.split('.')
      let cur: unknown = obj
      for (const k of parts) {
        if (cur !== null && typeof cur === 'object' && k in (cur as Record<string, unknown>)) {
          cur = (cur as Record<string, unknown>)[k]
        } else {
          return undefined
        }
      }
      return cur
    }

    const isLikelyCorrupted = (value: string) => {
      if (!value) {
        return true
      }
      if (/[^\u0009\u000A\u000D\u0020-\u007E\u00A0-\uD7FF\uE000-\uFFFD]/.test(value)) {
        return true
      }
      if (/[\u0400-\u04FF]/.test(value) || value.includes('\uFFFD')) {
        return true
      }
      const suspiciousMatches =
        value.match(/[\u00C3\u00C2\u00E2\u00EC\u00EB\u00EA\u00ED\u00F0]/g) || []
      if (suspiciousMatches.length >= 3) {
        return true
      }
      return suspiciousMatches.length / Math.max(1, value.length) > 0.15
    }

    return (path: string, fallback?: string) => {
      const currentDict = dictsCache[locale]
      if (!currentDict) {
        if (fallback) {
          return normalizeTranslationText(fallback)
        }
        return toSafeFallbackText(path)
      }

      const got = getter(currentDict, path)
      if (typeof got === 'string') {
        const normalizedGot = normalizeTranslationText(got)
        if (isRawKeyLeak(normalizedGot, path)) {
          const fb = getter(dictsCache.en, path)
          if (typeof fb === 'string' && !isRawKeyLeak(fb, path)) {
            return normalizeTranslationText(fb)
          }
          if (fallback) {
            return normalizeTranslationText(fallback)
          }
          return toSafeFallbackText(path)
        }

        if (locale === 'ko' && isLikelyCorrupted(normalizedGot)) {
          const fb = getter(dictsCache.en, path)
          if (typeof fb === 'string') {
            return normalizeTranslationText(fb)
          }
          if (fallback) {
            return normalizeTranslationText(fallback)
          }
          return toSafeFallbackText(path)
        }

        return normalizedGot
      }

      const fb = getter(dictsCache.en, path)
      if (typeof fb === 'string') {
        return normalizeTranslationText(fb)
      }

      if (fallback) {
        return normalizeTranslationText(fallback)
      }

      return toSafeFallbackText(path)
    }
    // dictVersion in deps: when a newly-loaded dict arrives, t() re-creates
    // and downstream consumers (via context value) re-render with fresh strings.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, dictVersion])

  const value = useMemo<I18nContextType>(
    () => ({
      locale,
      language: locale,
      setLocale,
      t,
      translate: t,
      dir: isRtl(locale) ? 'rtl' : 'ltr',
      hydrated,
    }),
    [locale, t, hydrated]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return ctx
}
