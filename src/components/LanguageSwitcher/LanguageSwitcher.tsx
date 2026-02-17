'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { SUPPORTED_LOCALES, useI18n } from '@/i18n/I18nProvider'

const LANGUAGE_LABELS: Record<string, { label: string; flag: string }> = {
  en: { label: 'English', flag: '\u{1F1FA}\u{1F1F8}' },
  ko: { label: '한국어', flag: '\u{1F1F0}\u{1F1F7}' },
}

export default function LanguageSwitcher() {
  const { locale, setLocale, dir, t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])

  const localeCount = SUPPORTED_LOCALES.length

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setFocusedIndex(-1)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      const currentIndex = SUPPORTED_LOCALES.indexOf(locale)
      setFocusedIndex(currentIndex >= 0 ? currentIndex : 0)
    }
  }, [isOpen, locale])

  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && optionRefs.current[focusedIndex]) {
      optionRefs.current[focusedIndex]?.focus()
    }
  }, [isOpen, focusedIndex])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault()
          setIsOpen(true)
        }
        return
      }

      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          setIsOpen(false)
          setFocusedIndex(-1)
          triggerRef.current?.focus()
          break
        case 'ArrowDown':
          e.preventDefault()
          setFocusedIndex((prev) => (prev + 1) % localeCount)
          break
        case 'ArrowUp':
          e.preventDefault()
          setFocusedIndex((prev) => (prev - 1 + localeCount) % localeCount)
          break
        case 'Home':
          e.preventDefault()
          setFocusedIndex(0)
          break
        case 'End':
          e.preventDefault()
          setFocusedIndex(localeCount - 1)
          break
        case 'Enter':
        case ' ':
          if (focusedIndex >= 0) {
            e.preventDefault()
            setLocale(SUPPORTED_LOCALES[focusedIndex])
            setIsOpen(false)
            setFocusedIndex(-1)
            triggerRef.current?.focus()
          }
          break
        case 'Tab':
          setIsOpen(false)
          setFocusedIndex(-1)
          break
      }
    },
    [isOpen, focusedIndex, localeCount, setLocale]
  )

  const currentLang = LANGUAGE_LABELS[locale] || { label: locale.toUpperCase(), flag: '\u{1F310}' }

  return (
    <div ref={dropdownRef} className="relative" dir={dir} onKeyDown={handleKeyDown}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Language"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        title={t('common.selectLanguage')}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl backdrop-blur-md
          text-sm font-medium text-blue-50 cursor-pointer outline-none
          transition-all duration-200 ease-out min-w-[140px] justify-center whitespace-nowrap
          ${
            isOpen
              ? 'bg-gradient-to-br from-cyan-400/20 to-blue-400/20 border border-cyan-400/40 shadow-[0_4px_20px_rgba(99,210,255,0.15)]'
              : 'bg-white/[0.08] border border-white/15 shadow-[0_2px_8px_rgba(0,0,0,0.15)] hover:bg-white/[0.12] hover:border-white/25 hover:-translate-y-0.5'
          }
          focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900`}
      >
        <span className="text-base" aria-hidden="true">
          {currentLang.flag}
        </span>
        <span>{currentLang.label}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={`opacity-70 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
          aria-hidden="true"
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Available languages"
          className="absolute top-[calc(100%+8px)] right-0 min-w-[180px] max-h-80 overflow-y-auto
            bg-gradient-to-b from-slate-900/[0.98] to-slate-950/[0.98]
            backdrop-blur-xl border border-cyan-400/20 rounded-2xl p-2 z-[1000]
            shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(255,255,255,0.05)]
            animate-[dropdownFadeIn_0.2s_ease-out]"
        >
          <style>{`
            @keyframes dropdownFadeIn {
              from { opacity: 0; transform: translateY(-8px) scale(0.96); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
          {SUPPORTED_LOCALES.map((loc, index) => {
            const lang = LANGUAGE_LABELS[loc] || { label: loc.toUpperCase(), flag: '\u{1F310}' }
            const isSelected = loc === locale
            const isFocused = index === focusedIndex
            return (
              <button
                key={loc}
                ref={(el) => {
                  optionRefs.current[index] = el
                }}
                role="option"
                aria-selected={isSelected}
                tabIndex={isFocused ? 0 : -1}
                onClick={() => {
                  setLocale(loc)
                  setIsOpen(false)
                  setFocusedIndex(-1)
                  triggerRef.current?.focus()
                }}
                className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg
                  border-none text-sm text-left cursor-pointer transition-all duration-150
                  ${
                    isSelected
                      ? 'bg-gradient-to-br from-cyan-400/15 to-blue-400/15 text-cyan-400 font-semibold'
                      : 'bg-transparent text-blue-50 font-normal hover:bg-white/[0.08]'
                  }
                  ${isFocused ? 'ring-2 ring-cyan-400 ring-inset' : ''}
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400`}
              >
                <span className="text-lg" aria-hidden="true">
                  {lang.flag}
                </span>
                <span className="flex-1">{lang.label}</span>
                {isSelected && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path
                      d="M13.5 4.5L6 12L2.5 8.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
