'use client'

import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import ScrollToTop from '@/components/ui/ScrollToTop'
import styles from './policyDocument.module.css'

export type PolicySection = {
  id: string
  title: string
  titleKo: string
  body: string
  bodyKo: string
  /** Render as a collapsible details/summary for sensitive legal passages. */
  strict?: boolean
}

export type PolicyQuickSummary = {
  en: string[]
  ko: string[]
}

type Props = {
  /** i18n key for the page title (e.g., 'policy.terms.title') */
  titleKey: string
  titleFallbackEn: string
  titleFallbackKo: string
  /** i18n key for the effective-date label */
  effectiveKey?: string
  /** ISO date shown next to the effective-date label */
  effectiveDate: string
  /** i18n key for the footer label */
  footerKey?: string
  /** Email shown in the meta row */
  contactEmail: string
  /** Optional eyebrow above the title — defaults to 'DESTINYPAL · LEGAL' */
  eyebrow?: string
  /** Sections to render */
  sections: PolicySection[]
  /** Optional callout above the sections (e.g., refund quick summary) */
  quickSummary?: PolicyQuickSummary
  /** Optional localized title for the quick-summary callout */
  quickSummaryTitle?: { en: string; ko: string }
}

function useScrollSpy(ids: string[]): string {
  const [active, setActive] = useState(ids[0] ?? '')

  useEffect(() => {
    if (typeof window === 'undefined' || ids.length === 0) return

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null)

    if (elements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) {
          setActive(visible[0].target.id)
        }
      },
      {
        rootMargin: '-96px 0px -60% 0px',
        threshold: [0, 1],
      },
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [ids])

  return active
}

function useReadingProgress(): number {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let raf = 0
    const update = () => {
      const doc = document.documentElement
      const scrollTop = window.scrollY || doc.scrollTop
      const max = doc.scrollHeight - window.innerHeight
      const pct = max > 0 ? Math.min(1, Math.max(0, scrollTop / max)) : 0
      setProgress(pct)
      raf = 0
    }

    const onScroll = () => {
      if (raf === 0) raf = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', update)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return progress
}

export default function PolicyDocument({
  titleKey,
  titleFallbackEn,
  titleFallbackKo,
  effectiveKey,
  effectiveDate,
  footerKey,
  contactEmail,
  eyebrow = 'DESTINYPAL · LEGAL',
  sections,
  quickSummary,
  quickSummaryTitle,
}: Props) {
  const { t, locale } = useI18n()
  const isKo = locale === 'ko'
  const mobileTocRef = useRef<HTMLDetailsElement>(null)

  const ids = sections.map((s) => s.id)
  const activeId = useScrollSpy(ids)
  const progress = useReadingProgress()

  const handleTocClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault()
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      history.replaceState(null, '', `#${id}`)
      if (mobileTocRef.current?.open) {
        mobileTocRef.current.open = false
      }
    }
  }

  const summaryTitle = isKo
    ? quickSummaryTitle?.ko ?? '빠른 요약'
    : quickSummaryTitle?.en ?? 'Quick summary'

  const summaryLines = quickSummary ? (isKo ? quickSummary.ko : quickSummary.en) : null

  return (
    <div className={styles.container}>
      <div className={styles.progressBar} aria-hidden="true">
        <div className={styles.progressFill} style={{ transform: `scaleX(${progress})` }} />
      </div>

      <div className={styles.layout}>
        <aside className={styles.toc} aria-label={isKo ? '목차' : 'Table of contents'}>
          <p className={styles.tocHeading}>{isKo ? '목차' : 'Contents'}</p>
          <ul className={styles.tocList}>
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  onClick={(e) => handleTocClick(e, s.id)}
                  className={`${styles.tocItem} ${
                    activeId === s.id ? styles.tocItemActive : ''
                  }`}
                >
                  {isKo ? s.titleKo : s.title}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <article className={styles.article}>
          <header className={styles.header}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1 className={styles.title}>
              {t(titleKey, isKo ? titleFallbackKo : titleFallbackEn)}
            </h1>
            <div className={styles.meta}>
              <span className={styles.metaItem}>
                <span className={styles.metaLabel}>
                  {effectiveKey
                    ? t(effectiveKey, isKo ? '시행일' : 'Effective date')
                    : isKo
                      ? '시행일'
                      : 'Effective date'}
                  :
                </span>
                {effectiveDate}
              </span>
              <span className={styles.metaItem}>
                <span className={styles.metaLabel}>{isKo ? '문의' : 'Contact'}:</span>
                {contactEmail}
              </span>
            </div>
          </header>

          <details className={styles.mobileToc} ref={mobileTocRef}>
            <summary className={styles.mobileTocSummary}>
              <span>{isKo ? '목차' : 'Contents'}</span>
              <span className={styles.mobileTocChevron} aria-hidden="true">
                ▾
              </span>
            </summary>
            <ul className={styles.mobileTocList}>
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    onClick={(e) => handleTocClick(e, s.id)}
                    className={styles.mobileTocItem}
                  >
                    {isKo ? s.titleKo : s.title}
                  </a>
                </li>
              ))}
            </ul>
          </details>

          {summaryLines && (
            <div className={styles.quickSummary}>
              <p className={styles.quickSummaryTitle}>{summaryTitle}</p>
              <ul className={styles.quickSummaryList}>
                {summaryLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.content}>
            {sections.map((s, i) => {
              const title = isKo ? s.titleKo : s.title
              const body = isKo ? s.bodyKo : s.body
              const numberLabel = `§ ${String(i + 1).padStart(2, '0')}`

              if (s.strict) {
                return (
                  <section key={s.id} id={s.id} className={styles.section}>
                    <p className={styles.sectionNumber}>{numberLabel}</p>
                    <details className={styles.strictDetails}>
                      <summary className={styles.strictSummary}>
                        <span className={styles.strictSummaryTitle}>{title}</span>
                        <span className={styles.strictHint}>
                          {isKo ? '자세히 보기' : 'Expand'}
                        </span>
                      </summary>
                      <pre className={styles.strictBody}>{body}</pre>
                    </details>
                  </section>
                )
              }

              return (
                <section key={s.id} id={s.id} className={styles.section}>
                  <p className={styles.sectionNumber}>{numberLabel}</p>
                  <h2 className={styles.sectionTitle}>{title}</h2>
                  <pre className={styles.sectionBody}>{body}</pre>
                </section>
              )
            })}
          </div>

          <footer className={styles.footer}>
            {footerKey
              ? t(footerKey, isKo ? '부칙' : 'Addendum')
              : isKo
                ? '부칙'
                : 'Addendum'}
            : {effectiveDate}
          </footer>
        </article>
      </div>

      <ScrollToTop label={isKo ? '맨 위로' : 'Top'} />
    </div>
  )
}
