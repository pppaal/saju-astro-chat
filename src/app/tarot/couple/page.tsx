'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './couple-tarot.module.css'
import { logger } from '@/lib/logger'

type Match = {
  connectionId: string
  matchedAt: string
  compatibilityScore: number | null
  partner: {
    profileId: string
    userId: string
    displayName: string
    photos: string[]
  }
}

type CoupleReading = {
  id: string
  spreadTitle: string
  question: string
  createdAt: string
  isMyReading: boolean
  isPaidByMe: boolean
  partner: {
    id: string
    name: string | null
    image: string | null
  } | null
}

const COUPLE_SPREADS = [
  { id: 'couple-3', name: '커플 3카드', cards: 3, icon: '💕' },
  { id: 'relationship-5', name: '관계 5카드', cards: 5, icon: '💞' },
  { id: 'love-celtic', name: '연애 심층 7장 리딩', cards: 7, icon: '🌹' },
]

export default function CoupleTarotPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const redirectedRef = useRef(false)

  const [loading, setLoading] = useState(true)
  const [matches, setMatches] = useState<Match[]>([])
  const [readings, setReadings] = useState<CoupleReading[]>([])
  const [selectedPartner, setSelectedPartner] = useState<Match | null>(null)
  const [selectedSpread, setSelectedSpread] = useState<string>('couple-3')
  const [question, setQuestion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // 크레딧 비용 — 8장 이상 스프레드는 2크레딧 (interpret-stream 의
  // LARGE_SPREAD_THRESHOLD 와 일치), 그 외 1크레딧.
  const selectedSpreadCards =
    COUPLE_SPREADS.find((s) => s.id === selectedSpread)?.cards ?? 0
  const creditCost = selectedSpreadCards >= 8 ? 2 : 1

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    if (status === 'unauthenticated' && !redirectedRef.current) {
      redirectedRef.current = true
      router.push('/auth/signin?callbackUrl=/tarot/couple')
      return
    }
    if (status !== 'authenticated') {
      return
    }
    redirectedRef.current = false

    const loadData = async () => {
      try {
        // 매치 목록과 커플 타로 기록 동시 로드
        const [matchesRes, readingsRes] = await Promise.all([
          fetch('/api/destiny-match/matches'),
          fetch('/api/tarot/couple-reading'),
        ])

        if (matchesRes.ok) {
          const matchData = await matchesRes.json()
          setMatches(matchData.matches || [])
        }

        if (readingsRes.ok) {
          const readingData = await readingsRes.json()
          setReadings(readingData.readings || [])
        }
      } catch (e) {
        logger.error('Load data error:', { error: e })
        setError('데이터를 불러오는 중 오류가 발생했습니다')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [session, status, router])

  const handleStartReading = async () => {
    if (!selectedPartner) {
      setError('파트너를 선택해주세요')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // 타로 리딩 페이지로 이동 (커플 모드)
      const params = new URLSearchParams({
        mode: 'couple',
        connectionId: selectedPartner.connectionId,
        partnerId: selectedPartner.partner.userId,
        partnerName: selectedPartner.partner.displayName,
        spreadId: selectedSpread,
        question: question || '우리의 관계는 어떨까요?',
      })

      router.push(`/tarot/love/${selectedSpread}?${params.toString()}`)
    } catch (e) {
      logger.error('Start reading error:', { error: e })
      setError('리딩을 시작하는 중 오류가 발생했습니다')
      setSubmitting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (status === 'loading' || loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <p>로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/tarot" className={styles.backButton}>
            {'< 타로'}
          </Link>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>💕</span>
            커플 타로
          </h1>
          <div />
        </header>

        {error && <div className={styles.errorMessage}>{error}</div>}

        {matches.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>💫</div>
            <h2>매칭된 파트너가 없어요</h2>
            <p>먼저 Destiny Match에서 인연을 찾아보세요!</p>
            <Link
              href="/destiny-match"
              className={styles.startButton}
              style={{ display: 'inline-block', marginTop: '1rem', textDecoration: 'none' }}
            >
              인연 찾으러 가기
            </Link>
          </div>
        ) : (
          <>
            {/* 파트너 선택 */}
            <section className={styles.partnerSection}>
              <h2 className={styles.sectionTitle}>
                <span>💑</span> 함께 볼 파트너 선택
              </h2>
              <div className={styles.partnerList}>
                {matches.map((match) => (
                  <div
                    key={match.connectionId}
                    className={`${styles.partnerCard} ${selectedPartner?.connectionId === match.connectionId ? styles.selected : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedPartner(match)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedPartner(match)
                      }
                    }}
                    aria-label={`Select ${match.partner.displayName} for couple tarot reading`}
                  >
                    <div className={styles.partnerPhoto}>
                      {match.partner.photos?.[0] ? (
                        <Image
                          src={match.partner.photos[0]}
                          alt={match.partner.displayName}
                          width={50}
                          height={50}
                        />
                      ) : (
                        '👤'
                      )}
                    </div>
                    <div className={styles.partnerInfo}>
                      <p className={styles.partnerName}>{match.partner.displayName}</p>
                      <p className={styles.partnerMeta}>매칭: {formatDate(match.matchedAt)}</p>
                    </div>
                    {match.compatibilityScore && (
                      <div className={styles.compatScore}>{match.compatibilityScore}%</div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* 스프레드 선택 */}
            <section className={styles.spreadSection}>
              <h2 className={styles.sectionTitle}>
                <span>🎴</span> 스프레드 선택
              </h2>
              <div className={styles.spreadList}>
                {COUPLE_SPREADS.map((spread) => (
                  <div
                    key={spread.id}
                    className={`${styles.spreadCard} ${selectedSpread === spread.id ? styles.selected : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedSpread(spread.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedSpread(spread.id)
                      }
                    }}
                    aria-label={spread.name}
                  >
                    <div className={styles.spreadIcon}>{spread.icon}</div>
                    <p className={styles.spreadName}>{spread.name}</p>
                    <p className={styles.spreadCards}>{spread.cards}장</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 질문 입력 */}
            <section className={styles.questionSection}>
              <h2 className={styles.sectionTitle}>
                <span>💭</span> 궁금한 점 (선택)
              </h2>
              <label
                htmlFor="couple-question-input"
                style={{
                  position: 'absolute',
                  width: '1px',
                  height: '1px',
                  padding: 0,
                  margin: '-1px',
                  overflow: 'hidden',
                  clip: 'rect(0, 0, 0, 0)',
                  whiteSpace: 'nowrap',
                  border: 0,
                }}
              >
                커플 타로 질문 입력
              </label>
              <textarea
                id="couple-question-input"
                className={styles.questionInput}
                placeholder="예: 우리의 관계는 어디로 향하고 있을까요? 서로에게 어떤 의미일까요?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={500}
                aria-label="커플 타로 질문 입력"
              />
            </section>

            {/* 시작 버튼 */}
            <section className={styles.startSection}>
              <button
                className={styles.startButton}
                onClick={handleStartReading}
                disabled={!selectedPartner || submitting}
              >
                {submitting ? '준비 중...' : '커플 타로 시작하기'}
              </button>
              <p className={styles.creditInfo}>
                {creditCost} 크레딧 사용 · <span>파트너도 결과를 볼 수 있어요</span>
              </p>
            </section>
          </>
        )}

        {/* 이전 커플 타로 기록 */}
        {readings.length > 0 && (
          <section className={styles.historySection}>
            <h2 className={styles.sectionTitle}>
              <span>📜</span> 이전 커플 타로
            </h2>
            <div className={styles.historyList}>
              {readings.map((reading) => (
                <Link
                  key={reading.id}
                  href={`/tarot/couple/${reading.id}`}
                  className={styles.historyCard}
                >
                  <div className={styles.historyIcon}>🎴</div>
                  <div className={styles.historyInfo}>
                    <p className={styles.historyTitle}>{reading.spreadTitle}</p>
                    <p className={styles.historyMeta}>
                      {reading.partner?.name || '파트너'} · {formatDate(reading.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`${styles.historyBadge} ${reading.isPaidByMe ? styles.paid : styles.shared}`}
                  >
                    {reading.isPaidByMe ? '내가 결제' : '공유받음'}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
