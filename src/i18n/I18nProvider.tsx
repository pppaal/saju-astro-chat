'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { allExtensions } from '@/lib/i18n/extensions'
import { repairMojibakeText } from '@/lib/text/mojibake'

type Locale = 'en' | 'ko'
type DictValue = Record<string, unknown>

// Cache for loaded dictionaries
const dictsCache: Partial<Record<Locale, DictValue>> = {}
// In-flight loads, deduped per locale (see loadLocaleDict).
const dictsLoading: Partial<Record<Locale, Promise<DictValue>>> = {}
let dictsInitialized = false

// Dedupe concurrent loads of the same locale. initializeDicts() and the
// active-locale effect can both request 'en' at the same time; without sharing
// one in-flight promise a second concurrent dynamic import of the same JSON
// module can resolve empty and overwrite the cache. One promise per locale.
async function loadLocaleDict(locale: Locale): Promise<DictValue> {
  if (dictsCache[locale]) {
    return dictsCache[locale]!
  }
  if (dictsLoading[locale]) {
    return dictsLoading[locale]!
  }
  const promise = loadLocaleDictUncached(locale)
  dictsLoading[locale] = promise
  try {
    return await promise
  } finally {
    delete dictsLoading[locale]
  }
}

// Async function to load dictionaries for a specific locale
async function loadLocaleDictUncached(locale: Locale): Promise<DictValue> {
  // Return cached if available
  if (dictsCache[locale]) {
    return dictsCache[locale]!
  }

  // Dynamically import all translation files for the locale
  // personality / destinyMatch JSON 은 PR #691 에서 페이지 삭제 시 같이 제거됨 — 임포트
  // 도 빼야 Turbopack 빌드 통과. 추후 페이지 부활 시 JSON 도 다시 추가.
  const modules = await Promise.all([
    import(`./locales/${locale}/common.json`),
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

  // Repair mojibake ONCE here, at dict-load time, instead of on every `t()` call.
  // The dict is static build-time JSON, so repairing each string value a single
  // time when the locale is loaded/merged produces identical output to the old
  // per-lookup repair while avoiding the repeated work on the hot translation path.
  const repaired = repairDictMojibake(dict)

  // Cache the result
  dictsCache[locale] = repaired
  return repaired
}

// Recursively repair mojibake in every string value of a (just-loaded) dict.
// Mirrors the prior per-lookup `repairMojibakeText(value)` so output is unchanged.
function repairDictMojibake(value: unknown): DictValue {
  return repairDictMojibakeValue(value) as DictValue
}

function repairDictMojibakeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return repairMojibakeText(value)
  }
  if (Array.isArray(value)) {
    return value.map((item) => repairDictMojibakeValue(item))
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = repairDictMojibakeValue(v)
    }
    return out
  }
  return value
}

/**
 * Heuristic to detect genuinely mojibake / corrupted translation strings so we
 * can fall back to English rather than show garbage to the user.
 *
 * IMPORTANT: this MUST be code-point aware. A naive UTF-16 code-unit scan treats
 * the surrogate range (U+D800–U+DFFF) as illegal, but every astral-plane emoji
 * (🌟 🌍 🎯 📊 💰, all U+1F300+) is encoded as a surrogate *pair* in JS strings.
 * The old regex `[^...퟿-\uFFFD]` excluded the surrogate range and so
 * flagged ~7% of perfectly valid Korean strings (those containing emoji) as
 * corrupted — Korean users silently saw the English fallback instead.
 *
 * We instead iterate Unicode code points (`[...value]`) and explicitly allow the
 * emoji/symbol/pictograph blocks while still catching the real corruption cases
 * this was designed for: U+FFFD replacement chars, stray Cyrillic embedded in
 * otherwise-Korean text, control characters, and dense Latin-1 mojibake runs.
 */
export function isLikelyCorrupted(value: string): boolean {
  if (!value) {
    return true
  }

  // Hard signal: Unicode replacement char always means a decode went wrong.
  // (escape so the mojibake linter doesn't flag this detector's own literal)
  if (value.includes('\uFFFD')) {
    return true
  }

  let suspiciousLatin1 = 0
  let codePointCount = 0

  for (const ch of value) {
    codePointCount++
    const cp = ch.codePointAt(0)!

    // Allowed: emoji, symbols, pictographs and their helpers.
    if (
      (cp >= 0x1f000 && cp <= 0x1faff) || // emoji & supplementary symbols/pictographs
      (cp >= 0x2600 && cp <= 0x27bf) || // misc symbols + dingbats
      (cp >= 0x2190 && cp <= 0x21ff) || // arrows
      (cp >= 0x2300 && cp <= 0x23ff) || // misc technical (⌚ etc.)
      (cp >= 0x2b00 && cp <= 0x2bff) || // misc symbols & arrows (⭐ etc.)
      (cp >= 0x1f1e6 && cp <= 0x1f1ff) || // regional indicators (flags)
      (cp >= 0xfe00 && cp <= 0xfe0f) || // variation selectors
      cp === 0x200d || // zero-width joiner (emoji sequences)
      cp === 0x20e3 // combining enclosing keycap
    ) {
      continue
    }

    // Allowed plain text: tab / newline / CR.
    if (cp === 0x09 || cp === 0x0a || cp === 0x0d) {
      continue
    }

    // Disallowed: other control characters (C0 + C1 + DEL).
    if (cp < 0x20 || (cp >= 0x7f && cp <= 0x9f)) {
      return true
    }

    // Disallowed: stray Cyrillic embedded in (otherwise Korean) UI text — a
    // classic single-byte decode artifact.
    if (cp >= 0x0400 && cp <= 0x04ff) {
      return true
    }

    // Count Latin-1 chars that commonly appear in UTF-8-decoded-as-Latin-1
    // mojibake (Ã Â â ì ë ê í ð …). A few may be legitimate; a dense run is not.
    if (
      cp === 0x00c3 ||
      cp === 0x00c2 ||
      cp === 0x00e2 ||
      cp === 0x00ec ||
      cp === 0x00eb ||
      cp === 0x00ea ||
      cp === 0x00ed ||
      cp === 0x00f0
    ) {
      suspiciousLatin1++
    }
  }

  if (suspiciousLatin1 >= 3) {
    return true
  }
  return suspiciousLatin1 / Math.max(1, codePointCount) > 0.15
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

// Mojibake repair now happens once at dict-load time (see repairDictMojibake),
// so the per-lookup normalize only trims. Dict values arrive pre-repaired; the
// trim preserves the previous `repairMojibakeText(value).trim()` output (and also
// trims caller-supplied fallback strings exactly as before).
const normalizeTranslationText = (value: string) => {
  if (!value) {
    return value
  }
  return value.trim()
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

  const setLocale = useCallback((next: Locale) => {
    // 쿠키를 먼저 동기로 써서, 이어지는 요청이 새 로케일을 읽게 한다.
    writeCookieLocale(next)
    // 서버 컴포넌트(/free·/integrated-report 등 x-locale·쿠키로 렌더)는 클라
    // 상태만 바뀌어선 안 바뀐다. 전체 리로드로 새 로케일을 확실히 반영한다.
    // 이때 URL 에 박힌 ?lang/?locale 핀(생일 게이트가 붙임)은 쿠키 토글을
    // 덮어쓰므로 제거하고 리로드 — 그래야 영어 토글이 리포트·카드까지 먹는다.
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      const hadPin = url.searchParams.has('lang') || url.searchParams.has('locale')
      url.searchParams.delete('lang')
      url.searchParams.delete('locale')
      if (hadPin) window.location.replace(url.toString())
      else window.location.reload()
      return
    }
    setLocaleState(next)
  }, [])

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
    [locale, t, hydrated, setLocale]
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
