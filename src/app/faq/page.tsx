'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useI18n } from '@/i18n/I18nProvider'
import ScrollToTop from '@/components/ui/ScrollToTop'
import styles from './faq.module.css'
import { FAQ_ITEMS, type FaqCategory, type FaqItem } from './faqData'

/** 단색 라인 아이콘 — light editorial 톤. 컬러 이모지 대체. */
function SearchIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="21" y2="21" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.38 8.38 0 0 1-9 8.3 9 9 0 0 1-3.4-.6L3 20.5l1.3-4.1A8.4 8.4 0 0 1 3.5 11 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z" />
    </svg>
  )
}

// FAQ 목록은 faqData.ts(SSOT) — layout.tsx 의 FAQPage JSON-LD 도 같은 목록을 읽는다.
const faqs: readonly FaqItem[] = FAQ_ITEMS

type Category = 'all' | FaqCategory

function FaqAccordion({
  item,
  isOpen,
  onClick,
  isKo,
}: {
  item: FaqItem
  isOpen: boolean
  onClick: () => void
  isKo: boolean
}) {
  return (
    <div className={`${styles.accordion} ${isOpen ? styles.open : ''}`}>
      <button className={styles.accordionHeader} onClick={onClick} aria-expanded={isOpen}>
        <span className={styles.accordionQuestion}>{isKo ? item.qKo : item.q}</span>
        <span className={styles.accordionToggle}>
          <ChevronIcon />
        </span>
      </button>
      <div className={styles.accordionContent}>
        <div className={styles.accordionAnswer}>
          <p>{isKo ? item.aKo : item.a}</p>
        </div>
      </div>
    </div>
  )
}

export default function FaqPage() {
  const { locale } = useI18n()
  const isKo = locale === 'ko'
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<Category>('all')
  const [expandAll, setExpandAll] = useState(false)

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  const handleExpandAll = () => {
    setExpandAll(!expandAll)
    if (!expandAll) {
      setOpenIndex(null)
    }
  }

  // Category labels
  const categoryLabels: Record<Category, { en: string; ko: string }> = {
    all: { en: 'All', ko: '전체' },
    general: { en: 'General', ko: '일반' },
    services: { en: 'Services', ko: '서비스' },
    account: { en: 'Account', ko: '계정' },
    payment: { en: 'Payment', ko: '결제' },
    technical: { en: 'Technical', ko: '기술' },
  }

  // Filter FAQs based on search and category
  const filteredFaqs = useMemo(() => {
    let filtered = faqs

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((faq) => faq.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((faq) => {
        const question = isKo ? faq.qKo : faq.q
        const answer = isKo ? faq.aKo : faq.a
        return question.toLowerCase().includes(query) || answer.toLowerCase().includes(query)
      })
    }

    return filtered
  }, [searchQuery, selectedCategory, isKo])

  return (
    <main className={styles.container}>
      <div className={styles.inner}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>DestinyPal FAQ</p>
          <h1 className={styles.title}>{isKo ? '자주 묻는 질문' : 'Frequently Asked Questions'}</h1>
          <p className={styles.subtitle}>
            {isKo
              ? '궁금한 점이 있으시면 아래에서 찾아보세요'
              : 'Find answers to common questions below'}
          </p>
        </section>

        {/* Search Box */}
        <div className={styles.searchContainer}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>
              <SearchIcon />
            </span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder={isKo ? 'FAQ 검색...' : 'Search FAQ...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className={styles.searchClear}
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <div className={styles.categoryContainer}>
          <div className={styles.categoryButtons}>
            {(Object.keys(categoryLabels) as Category[]).map((category) => (
              <button
                key={category}
                className={`${styles.categoryButton} ${selectedCategory === category ? styles.active : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {isKo ? categoryLabels[category].ko : categoryLabels[category].en}
              </button>
            ))}
          </div>
          <button className={styles.expandAllButton} onClick={handleExpandAll}>
            {expandAll
              ? isKo
                ? '모두 접기'
                : 'Collapse All'
              : isKo
                ? '모두 펼치기'
                : 'Expand All'}
          </button>
        </div>

        {/* Results count */}
        {searchQuery && (
          <div className={styles.resultsCount}>
            {isKo
              ? `${filteredFaqs.length}개의 결과를 찾았습니다`
              : `Found ${filteredFaqs.length} result${filteredFaqs.length !== 1 ? 's' : ''}`}
          </div>
        )}

        <section className={styles.faqSection}>
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((item) => {
              const originalIndex = faqs.indexOf(item)
              return (
                <FaqAccordion
                  key={originalIndex}
                  item={item}
                  isOpen={expandAll || openIndex === originalIndex}
                  onClick={() => handleToggle(originalIndex)}
                  isKo={isKo}
                />
              )
            })
          ) : (
            <div className={styles.noResults}>
              <div className={styles.noResultsIcon}>
                <SearchIcon size={36} />
              </div>
              <p className={styles.noResultsText}>
                {isKo
                  ? '검색 결과가 없습니다. 다른 키워드를 시도해보세요.'
                  : 'No results found. Try different keywords.'}
              </p>
            </div>
          )}
        </section>

        <section className={styles.contactSection}>
          <div className={styles.contactCard}>
            <div className={styles.contactIcon}>
              <ChatIcon />
            </div>
            <h3 className={styles.contactTitle}>
              {isKo ? '더 궁금한 점이 있으신가요?' : 'Still have questions?'}
            </h3>
            <p className={styles.contactDesc}>
              {isKo
                ? '언제든지 문의해 주세요. 48시간 내 답변드립니다.'
                : 'Feel free to reach out. We respond within 48 hours.'}
            </p>
            <Link href="/contact" className={styles.contactButton}>
              {isKo ? '문의하기' : 'Contact Us'}
            </Link>
            <p className={styles.contactDesc} style={{ marginTop: 18, marginBottom: 0 }}>
              {isKo
                ? '리딩이 어떻게 계산되는지 궁금하신가요? '
                : 'Curious how a reading is actually computed? '}
              <Link href="/method" style={{ color: '#a07a3c', fontWeight: 600 }}>
                {isKo ? '계산 방식 보기 →' : 'How it works →'}
              </Link>
            </p>
          </div>
        </section>
      </div>

      <ScrollToTop label={isKo ? '맨 위로' : 'Top'} />
    </main>
  )
}
