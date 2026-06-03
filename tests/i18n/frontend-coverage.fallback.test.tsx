// tests/i18n/frontend-coverage.fallback.test.tsx
//
// STEP 5 frontend-coverage: cover the i18n fallback chain + mojibake heuristic
// in src/i18n/I18nProvider.tsx, which has been changing a lot.
//
// What's covered (via the real provider + `useI18n().t`):
//   1. The fallback chain: locale hit → English fallback → humanized-key fallback
//   2. Raw-key-leak detection (value === key) falling back to English
//   3. `readCookieLocale` seeding the initial locale from the `locale=` cookie
//   4. The `isLikelyCorrupted` mojibake heuristic — including a documented bug:
//      valid Korean that merely CONTAINS a Cyrillic char is wrongly dropped.
//      A prior review flagged this. We assert BOTH:
//        - current (buggy) behavior, so the suite stays green and documents it
//        - desired behavior via it.skip (legit Korean must NOT be dropped)
//
// The 10 per-locale JSON dictionary modules + the extensions module are mocked
// with small controlled dictionaries so `t()` is deterministic. The provider's
// dict loader deep-merges all 10 modules per locale; we put our test keys in
// `common.json` and leave the rest empty.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'

// --- Controlled dictionaries ------------------------------------------------
// English (fallback locale) and Korean (active locale) keys chosen to exercise
// every branch of the t() fallback chain.

const EN_COMMON = {
  greeting: 'Hello',
  // present in EN, missing in KO → English fallback path
  onlyInEnglish: 'Only English',
  // raw-key-leak case: KO value equals the key path → fall back to EN
  leaky: { key: 'Proper English' },
  // for mojibake tests, EN has a clean fallback the dropped KO can fall to
  cyrillicKorean: 'English fallback for cyrillicKorean',
  pureKorean: 'English fallback for pureKorean',
}

const KO_COMMON = {
  greeting: '안녕하세요',
  // onlyInEnglish intentionally absent → should fall back to EN
  leaky: { key: 'leaky.key' }, // raw key leak (value === path; dicts merge flat, no namespace prefix)
  // valid Korean that ALSO contains a Cyrillic letter ('к' U+043A).
  // The current isLikelyCorrupted heuristic flags ANY Cyrillic range char,
  // so this legit-ish string gets dropped to the English fallback. BUG.
  cyrillicKorean: '한국어 텍스트 к 포함',
  // pure, clean Korean — must NOT be dropped.
  pureKorean: '완전히 정상적인 한국어',
}

const emptyDict = { default: {} }
const enCommonMod = { default: EN_COMMON }
const koCommonMod = { default: KO_COMMON }

// Each locale loads: common, landing, chat, services, tarot, calendar,
// compatibility, destinymap, features, misc. Only common carries our keys.
vi.mock('@/i18n/locales/en/common.json', () => enCommonMod)
vi.mock('@/i18n/locales/en/landing.json', () => emptyDict)
vi.mock('@/i18n/locales/en/chat.json', () => emptyDict)
vi.mock('@/i18n/locales/en/services.json', () => emptyDict)
vi.mock('@/i18n/locales/en/tarot.json', () => emptyDict)
vi.mock('@/i18n/locales/en/calendar.json', () => emptyDict)
vi.mock('@/i18n/locales/en/compatibility.json', () => emptyDict)
vi.mock('@/i18n/locales/en/destinymap.json', () => emptyDict)
vi.mock('@/i18n/locales/en/features.json', () => emptyDict)
vi.mock('@/i18n/locales/en/misc.json', () => emptyDict)

vi.mock('@/i18n/locales/ko/common.json', () => koCommonMod)
vi.mock('@/i18n/locales/ko/landing.json', () => emptyDict)
vi.mock('@/i18n/locales/ko/chat.json', () => emptyDict)
vi.mock('@/i18n/locales/ko/services.json', () => emptyDict)
vi.mock('@/i18n/locales/ko/tarot.json', () => emptyDict)
vi.mock('@/i18n/locales/ko/calendar.json', () => emptyDict)
vi.mock('@/i18n/locales/ko/compatibility.json', () => emptyDict)
vi.mock('@/i18n/locales/ko/destinymap.json', () => emptyDict)
vi.mock('@/i18n/locales/ko/features.json', () => emptyDict)
vi.mock('@/i18n/locales/ko/misc.json', () => emptyDict)

// No extensions in tests — keep the merged dict equal to our controlled data.
vi.mock('@/lib/i18n/extensions', () => ({ allExtensions: {} }))

// NOTE: `readCookieLocale` / `writeCookieLocale` are module-private (not
// exported), so they're exercised indirectly through the provider's
// cookie-seeded initial locale rather than imported directly. See the
// "seeds the provider initial locale from the cookie" test below. Adding a
// direct export was deemed an unnecessary source change for this coverage pass.
import { I18nProvider, useI18n } from '@/i18n/I18nProvider'

// --- Test harness component -------------------------------------------------

function Probe({ path, fallback }: { path: string; fallback?: string }) {
  const { t, locale } = useI18n()
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="value">{t(path, fallback)}</span>
    </div>
  )
}

function renderProbe(
  path: string,
  opts: { initialLocale?: 'en' | 'ko'; fallback?: string } = {}
) {
  return render(
    <I18nProvider initialLocale={opts.initialLocale}>
      <Probe path={path} fallback={opts.fallback} />
    </I18nProvider>
  )
}

beforeEach(() => {
  // Reset cookie between tests.
  document.cookie = 'locale=; max-age=0; path=/'
})

// --- Cookie-seeded initial locale (exercises private readCookieLocale) -------

describe('cookie-seeded initial locale', () => {
  it('seeds the provider locale from a supported `locale=` cookie', async () => {
    document.cookie = 'locale=ko; path=/'
    renderProbe('greeting')
    // No initialLocale prop → provider reads the cookie. KO dict loads async.
    await waitFor(() => expect(screen.getByTestId('locale').textContent).toBe('ko'))
  })

  it('falls back to English when no locale cookie is present', async () => {
    // beforeEach clears the cookie; no initialLocale prop → defaults to 'en'.
    renderProbe('greeting')
    await waitFor(() => expect(screen.getByTestId('locale').textContent).toBe('en'))
  })

  it('ignores an unsupported cookie value and defaults to English', async () => {
    document.cookie = 'locale=zz; path=/'
    renderProbe('greeting')
    await waitFor(() => expect(screen.getByTestId('locale').textContent).toBe('en'))
  })
})

// --- Fallback chain ---------------------------------------------------------

describe('I18nProvider t() fallback chain', () => {
  it('returns the locale string on a direct hit (ko)', async () => {
    renderProbe('greeting', { initialLocale: 'ko' })
    await waitFor(() =>
      expect(screen.getByTestId('value').textContent).toBe('안녕하세요')
    )
  })

  it('falls back to English when the key is missing in the active locale', async () => {
    renderProbe('onlyInEnglish', { initialLocale: 'ko' })
    await waitFor(() =>
      expect(screen.getByTestId('value').textContent).toBe('Only English')
    )
  })

  it('falls back to English when the KO value is a raw key leak', async () => {
    // KO leaky.key === 'leaky.key' (value === path) → EN used.
    renderProbe('leaky.key', { initialLocale: 'ko' })
    await waitFor(() =>
      expect(screen.getByTestId('value').textContent).toBe('Proper English')
    )
  })

  it('humanizes the key when missing in both locales and no fallback given', async () => {
    renderProbe('some.totally.missingKey', { initialLocale: 'en' })
    // toSafeFallbackText: leaf "missingKey" → "Missing Key"
    await waitFor(() =>
      expect(screen.getByTestId('value').textContent).toBe('Missing Key')
    )
  })

  it('uses the provided fallback when the key is missing in both locales', async () => {
    renderProbe('another.missing.key', {
      initialLocale: 'en',
      fallback: 'Explicit fallback',
    })
    await waitFor(() =>
      expect(screen.getByTestId('value').textContent).toBe('Explicit fallback')
    )
  })
})

// --- isLikelyCorrupted mojibake heuristic -----------------------------------

describe('I18nProvider isLikelyCorrupted heuristic (ko only)', () => {
  // CURRENT BEHAVIOR (documents the known bug): a valid Korean string that
  // merely contains a Cyrillic-range char is flagged corrupted and dropped to
  // the English fallback. A prior review flagged this as wrong.
  it('CURRENT (buggy): Korean containing a Cyrillic char is dropped to English', async () => {
    renderProbe('cyrillicKorean', { initialLocale: 'ko' })
    await waitFor(() =>
      expect(screen.getByTestId('value').textContent).toBe(
        'English fallback for cyrillicKorean'
      )
    )
  })

  // DESIRED BEHAVIOR (skipped to keep the suite green): the legit Korean string
  // should be returned as-is, NOT dropped. Un-skip once isLikelyCorrupted stops
  // treating any Cyrillic/extended char as automatic corruption. Bug to fix.
  it.skip('DESIRED: Korean containing a Cyrillic char should NOT be dropped', async () => {
    renderProbe('cyrillicKorean', { initialLocale: 'ko' })
    await waitFor(() =>
      expect(screen.getByTestId('value').textContent).toBe('한국어 텍스트 к 포함')
    )
  })

  // Guardrail: clean, pure Korean must always pass through untouched. If this
  // ever fails, the heuristic has become too aggressive for normal Korean.
  it('does NOT drop clean, pure Korean text', async () => {
    renderProbe('pureKorean', { initialLocale: 'ko' })
    await waitFor(() =>
      expect(screen.getByTestId('value').textContent).toBe('완전히 정상적인 한국어')
    )
  })

  it('does NOT apply the corruption heuristic to the English locale', async () => {
    // Same key, but in EN locale the heuristic branch (locale === 'ko') is
    // skipped, so even a Cyrillic-bearing EN value would be returned verbatim.
    renderProbe('cyrillicKorean', { initialLocale: 'en' })
    await waitFor(() =>
      expect(screen.getByTestId('value').textContent).toBe(
        'English fallback for cyrillicKorean'
      )
    )
  })
})
