import 'server-only'

import { cookies, headers } from 'next/headers'
import commonEn from './locales/en/common.json'
import miscEn from './locales/en/misc.json'
import destinymapEn from './locales/en/destinymap.json'
import commonKo from './locales/ko/common.json'
import miscKo from './locales/ko/misc.json'
import destinymapKo from './locales/ko/destinymap.json'
import {
  getPathValue,
  isPlaceholderTranslation,
  toSafeFallbackText,
  type I18nMessages,
} from './utils'

export type ServerLocale = 'en' | 'ko'

const deepMerge = (target: I18nMessages, source: I18nMessages): I18nMessages => {
  for (const key of Object.keys(source)) {
    const targetValue = target[key]
    const sourceValue = source[key]

    if (
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue) &&
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue)
    ) {
      target[key] = deepMerge({ ...(targetValue as I18nMessages) }, sourceValue as I18nMessages)
    } else {
      target[key] = sourceValue
    }
  }

  return target
}

const EN_MESSAGES = deepMerge(
  deepMerge({}, commonEn as I18nMessages),
  deepMerge(miscEn as I18nMessages, destinymapEn as I18nMessages)
)

const KO_MESSAGES = deepMerge(
  deepMerge({}, commonKo as I18nMessages),
  deepMerge(miscKo as I18nMessages, destinymapKo as I18nMessages)
)

const MESSAGES_BY_LOCALE: Record<ServerLocale, I18nMessages> = {
  en: EN_MESSAGES,
  ko: KO_MESSAGES,
}

const pickLocale = (raw?: string | null): ServerLocale | null => {
  if (!raw) {
    return null
  }
  const normalized = raw.toLowerCase()
  if (normalized.startsWith('ko')) {
    return 'ko'
  }
  if (normalized.startsWith('en')) {
    return 'en'
  }
  return null
}

async function detectServerLocale(): Promise<ServerLocale> {
  // Prefer the middleware-set `x-locale` header first. Middleware resolves the
  // locale (cookie → accept-language) once per request and stamps it on both the
  // request headers and the layout's `<html lang>` / initialLocale. Reading it
  // here keeps server components in agreement with the layout — even on a
  // brand-new visit where the locale cookie hasn't been persisted yet.
  const requestHeaders = await headers()
  const middlewareLocale = pickLocale(requestHeaders.get('x-locale'))
  if (middlewareLocale) {
    return middlewareLocale
  }

  const cookieStore = await cookies()
  const localeCookie = cookieStore.get('locale')?.value ?? cookieStore.get('NEXT_LOCALE')?.value
  const cookieLocale = pickLocale(localeCookie)
  if (cookieLocale) {
    return cookieLocale
  }

  const headerLocale = pickLocale(requestHeaders.get('accept-language'))
  return headerLocale ?? 'en'
}

export async function getServerI18n() {
  const locale = await detectServerLocale()
  return {
    locale,
    messages: MESSAGES_BY_LOCALE[locale],
  }
}

export function getServerTranslation(
  messages: I18nMessages,
  path: string,
  fallback?: string
): string {
  const current = getPathValue(messages, path)
  if (typeof current === 'string' && !isPlaceholderTranslation(current, path)) {
    return current
  }

  const english = getPathValue(EN_MESSAGES, path)
  if (typeof english === 'string' && !isPlaceholderTranslation(english, path)) {
    return english
  }

  if (fallback) {
    return fallback
  }

  return toSafeFallbackText(path)
}
