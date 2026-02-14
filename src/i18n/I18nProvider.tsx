'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { allExtensions } from '@/lib/i18n/extensions'

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
  const modules = await Promise.all([
    import(`./locales/${locale}/common.json`),
    import(`./locales/${locale}/landing.json`),
    import(`./locales/${locale}/chat.json`),
    import(`./locales/${locale}/services.json`),
    import(`./locales/${locale}/tarot.json`),
    import(`./locales/${locale}/calendar.json`),
    import(`./locales/${locale}/personality.json`),
    import(`./locales/${locale}/dream.json`),
    import(`./locales/${locale}/numerology.json`),
    import(`./locales/${locale}/iching.json`),
    import(`./locales/${locale}/pastlife.json`),
    import(`./locales/${locale}/compatibility.json`),
    import(`./locales/${locale}/destinymap.json`),
    import(`./locales/${locale}/destinyMatch.json`),
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

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en')
  const [hydrated, setHydrated] = useState(false)
  const [dictsLoaded, setDictsLoaded] = useState(false)

  // Initialize dictionaries on mount
  useEffect(() => {
    initializeDicts().then(() => setDictsLoaded(true))
  }, [])

  useEffect(() => {
    setHydrated(true)
    try {
      const stored = localStorage.getItem('locale') as Locale | null
      if (stored && SUPPORTED_LOCALES.includes(stored)) {
        setLocale(stored)
        // Preload the stored locale
        loadLocaleDict(stored)
        return
      }
    } catch {}
    try {
      const nav2 = navigator.language?.slice(0, 2) as Locale | undefined
      if (nav2 && SUPPORTED_LOCALES.includes(nav2)) {
        setLocale(nav2)
        loadLocaleDict(nav2)
      }
    } catch {}
  }, [])

  // Load locale dictionary when locale changes (only loads the needed locale)
  useEffect(() => {
    if (!dictsLoaded) return
    // Skip if already cached
    if (dictsCache[locale]) return

    loadLocaleDict(locale).then((dict) => {
      // Fill missing translations with English fallback
      if (locale !== 'en' && dictsCache.en) {
        fillMissing(dictsCache.en, dict)
      }
      // Force re-render after loading new locale
      setDictsLoaded((prev) => !prev)
      setDictsLoaded(true)
    })
  }, [locale, dictsLoaded])

  useEffect(() => {
    try {
      localStorage.setItem('locale', locale)
    } catch {}
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
      document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr'
    }
  }, [locale])

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

    const isLikelyCorrupted = (value: string) =>
      /[\u0400-\u04FF]/.test(value) || value.includes('�')

    return (path: string, fallback?: string) => {
      const currentDict = dictsCache[locale]
      if (!currentDict) {
        return fallback || toSafeFallbackText(path)
      }

      const got = getter(currentDict, path)
      if (typeof got === 'string') {
        // Some locale files were corrupted (Cyrillic/�). If detected, fall back to English.
        if (locale === 'ko' && isLikelyCorrupted(got)) {
          const fb = getter(dictsCache.en, path)
          if (typeof fb === 'string') {
            return fb
          }
          if (fallback) {
            return fallback
          }
          return toSafeFallbackText(path)
        }
        return got
      }

      const fb = getter(dictsCache.en, path)
      if (typeof fb === 'string') {
        return fb
      }

      if (fallback) {
        return fallback
      }

      return toSafeFallbackText(path)
    }
  }, [locale])

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
