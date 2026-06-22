'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { LangKey } from '../chat-i18n'
import type { DestinySources } from '../chat-types'
import styles from './DataSourceToggles.module.css'

interface DataSourceTogglesProps {
  sources: DestinySources
  onChange: (next: DestinySources) => void
  lang: LangKey
  disabled?: boolean
  /** 주변 배경 톤. 'light'(상담사 흰 배경) / 'dark'(메인 코스믹 배경). 기본 light. */
  theme?: 'light' | 'dark'
  /** 체크박스 옆 "사주·점성이란?" 안내 버튼을 띄울지. 메인에서만 켠다. 기본 false. */
  showInfo?: boolean
}

const LABELS: Record<LangKey, { saju: string; astro: string; group: string }> = {
  ko: { saju: '사주', astro: '점성', group: '상담에 사용할 데이터' },
  en: { saju: 'Saju', astro: 'Astrology', group: 'Data used for this reading' },
}

// "사주·점성이란?" 팝업 카드 본문 — 사주가 뭔지, 점성이 뭔지, 둘을 함께 보면
// 무엇이 좋은지 한눈에. ko/en 같이 둬서 드리프트 방지.
const INFO: Record<
  LangKey,
  {
    trigger: string
    title: string
    close: string
    saju: { title: string; body: string }
    astro: { title: string; body: string }
    both: { title: string; body: string }
    tip: string
  }
> = {
  ko: {
    trigger: '사주·점성이란?',
    title: '사주와 점성, 무엇이 다를까요?',
    close: '닫기',
    saju: {
      title: '사주 (四柱·동양 명리)',
      body: '태어난 연·월·일·시를 기둥 삼아 타고난 기질과 강점, 그리고 시기별 운의 흐름(대운·세운)을 읽습니다. "나는 어떤 사람이고, 언제 흐름이 바뀌는가"에 강합니다.',
    },
    astro: {
      title: '점성술 (서양 점성)',
      body: '태어난 순간 하늘의 행성 배치로 성향과 관계, 그리고 지금 들어오는 시기(트랜짓)를 읽습니다. 마음의 결과 관계의 역학을 섬세하게 비춥니다.',
    },
    both: {
      title: '둘을 함께 보면',
      body: '동양과 서양, 두 관점이 서로를 보완하고 교차 검증합니다. 한쪽만으로는 놓치기 쉬운 부분을 메워, 더 입체적이고 균형 잡힌 해석을 받을 수 있어요.',
    },
    tip: '체크를 켜고 끄면 이번 상담에 어떤 관점을 쓸지 직접 고를 수 있어요. 둘 다 켜두는 걸 추천해요.',
  },
  en: {
    trigger: 'What are Saju & Astrology?',
    title: 'Saju vs. Astrology — what’s the difference?',
    close: 'Close',
    saju: {
      title: 'Saju (Eastern four pillars)',
      body: 'Reads your innate temperament and strengths — and how your fortune shifts over time (great/yearly luck) — from the year, month, day, and hour of your birth. Strong at “who am I, and when does the tide turn?”',
    },
    astro: {
      title: 'Astrology (Western)',
      body: 'Reads your tendencies, relationships, and the timing now flowing in (transits) from the positions of the planets at the moment you were born. Sensitive to the texture of the heart and relational dynamics.',
    },
    both: {
      title: 'Why read both together',
      body: 'East and West complement and cross-check each other. Together they fill the gaps either one alone would miss, giving you a fuller, more balanced reading.',
    },
    tip: 'Toggle the checkboxes to choose which lens this reading uses. We recommend keeping both on.',
  },
}

/**
 * 운명상담사 입력창 위에 끼는 데이터 소스 체크박스 — 이번 답변에 사주/점성 중
 * 무엇을 넣을지 고른다. 둘 다 끄면 빈 컨텍스트라 의미가 없으므로, 마지막 하나는
 * 끄지 못하게 막는다(서버도 둘 다 false 면 둘 다로 폴백하지만 UI 에서 먼저 차단).
 *
 * showInfo 가 켜지면 체크박스 옆에 작은 "사주·점성이란?" 버튼이 붙고, 누르면
 * 로그인 모달처럼 가운데에 설명 카드가 떠오른다(메인에서만 사용).
 */
export const DataSourceToggles = React.memo(function DataSourceToggles({
  sources,
  onChange,
  lang,
  disabled = false,
  theme = 'light',
  showInfo = false,
}: DataSourceTogglesProps) {
  const L = LABELS[lang] ?? LABELS.en
  const [infoOpen, setInfoOpen] = useState(false)
  const toggle = (key: keyof DestinySources) => {
    const next = { ...sources, [key]: !sources[key] }
    // 최소 하나는 항상 켜둔다 — 마지막 체크를 끄려 하면 무시.
    if (!next.saju && !next.astro) return
    onChange(next)
  }
  return (
    <div className={styles.toggles} data-theme={theme} role="group" aria-label={L.group}>
      <label className={styles.toggle} data-active={sources.saju || undefined}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={sources.saju}
          disabled={disabled}
          onChange={() => toggle('saju')}
        />
        <span>{L.saju}</span>
      </label>
      <label className={styles.toggle} data-active={sources.astro || undefined}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={sources.astro}
          disabled={disabled}
          onChange={() => toggle('astro')}
        />
        <span>{L.astro}</span>
      </label>
      {showInfo ? (
        <>
          <button
            type="button"
            className={styles.infoButton}
            onClick={() => setInfoOpen(true)}
            aria-haspopup="dialog"
          >
            <span className={styles.infoIcon} aria-hidden="true">
              i
            </span>
            <span className={styles.infoLabel}>{INFO[lang]?.trigger ?? INFO.en.trigger}</span>
          </button>
          <DataSourceInfoModal lang={lang} open={infoOpen} onClose={() => setInfoOpen(false)} />
        </>
      ) : null}
    </div>
  )
})

/**
 * "사주·점성이란?" 설명 카드. 로그인 모달과 같은 패턴(createPortal + 블러
 * 백드롭 + 가운데 흰 카드)으로 띄워 "튀어나오는" 느낌을 준다. ESC/백드롭/X 닫기.
 */
function DataSourceInfoModal({
  lang,
  open,
  onClose,
}: {
  lang: LangKey
  open: boolean
  onClose: () => void
}) {
  const I = INFO[lang] ?? INFO.en
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // 떠 있는 동안 배경 스크롤 잠금.
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  // ESC 로 닫기.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !mounted) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={I.title}
      onClick={onClose}
      className={styles.infoBackdrop}
    >
      <div onClick={(e) => e.stopPropagation()} className={styles.infoCard}>
        <button type="button" onClick={onClose} aria-label={I.close} className={styles.infoClose}>
          <svg
            viewBox="0 0 24 24"
            width={20}
            height={20}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>

        <h2 className={styles.infoTitle}>{I.title}</h2>

        <div className={styles.infoSection} data-tone="saju">
          <p className={styles.infoSectionTitle}>
            <span aria-hidden="true">🔮</span> {I.saju.title}
          </p>
          <p className={styles.infoSectionBody}>{I.saju.body}</p>
        </div>

        <div className={styles.infoSection} data-tone="astro">
          <p className={styles.infoSectionTitle}>
            <span aria-hidden="true">✨</span> {I.astro.title}
          </p>
          <p className={styles.infoSectionBody}>{I.astro.body}</p>
        </div>

        <div className={styles.infoSection} data-tone="both">
          <p className={styles.infoSectionTitle}>
            <span aria-hidden="true">🤝</span> {I.both.title}
          </p>
          <p className={styles.infoSectionBody}>{I.both.body}</p>
        </div>

        <p className={styles.infoTip}>{I.tip}</p>
      </div>
    </div>,
    document.body
  )
}
