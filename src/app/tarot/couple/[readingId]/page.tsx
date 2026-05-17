'use client'

import { useState, useEffect, useRef, use } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../couple-tarot.module.css'
import { logger } from '@/lib/logger'

type CardInsight = {
  position: string
  card_name: string
  is_reversed: boolean
  interpretation: string
}

type CoupleReading = {
  id: string
  question: string
  theme: string | null
  spreadId: string
  spreadTitle: string
  cards: Array<{
    name: string
    nameKo?: string
    isReversed: boolean
    position: string
    positionKo?: string
  }>
  overallMessage: string | null
  cardInsights: CardInsight[] | null
  guidance: string | null
  affirmation: string | null
  createdAt: string
  isMyReading: boolean
  isPaidByMe: boolean
  creator: {
    id: string
    name: string | null
    image: string | null
  }
  partner: {
    id: string
    name: string | null
    image: string | null
  } | null
  connection: {
    id: string
    compatibilityScore: number | null
    isSuperLikeMatch: boolean
    createdAt: string
  } | null
}

export default function CoupleReadingDetailPage({
  params,
}: {
  params: Promise<{ readingId: string }>
}) {
  const { readingId } = use(params)
  const { data: session, status } = useSession()
  const router = useRouter()
  const redirectedRef = useRef(false)

  const [loading, setLoading] = useState(true)
  const [reading, setReading] = useState<CoupleReading | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    if (status === 'unauthenticated' && !redirectedRef.current) {
      redirectedRef.current = true
      router.push(`/auth/signin?callbackUrl=/tarot/couple/${readingId}`)
      return
    }
    if (status !== 'authenticated') {
      return
    }
    redirectedRef.current = false

    const loadReading = async () => {
      try {
        const res = await fetch(`/api/tarot/couple-reading/${readingId}`)
        const data = await res.json()

        if (res.ok) {
          setReading(data.reading)
        } else {
          setError(data.error || '리딩을 불러올 수 없습니다')
        }
      } catch (e) {
        logger.error('Load reading error:', { error: e })
        setError('리딩을 불러오는 중 오류가 발생했습니다')
      } finally {
        setLoading(false)
      }
    }

    loadReading()
  }, [session, status, router, readingId])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (status === 'loading' || loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <p>리딩을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error || !reading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorMessage}>{error || '리딩을 찾을 수 없습니다'}</div>
          <Link href="/tarot/couple" className={styles.backButton}>
            돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/tarot/couple" className={styles.backButton}>
            {'< 커플 타로'}
          </Link>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>💕</span>
            {reading.spreadTitle}
          </h1>
          <div />
        </header>

        {/* 커플 정보 */}
        <section className={styles.partnerSection}>
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem' }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                className={styles.partnerPhoto}
                style={{ width: '70px', height: '70px', margin: '0 auto 0.5rem' }}
              >
                {reading.creator.image ? (
                  <Image
                    src={reading.creator.image}
                    alt={reading.creator.name || ''}
                    width={70}
                    height={70}
                  />
                ) : (
                  '👤'
                )}
              </div>
              <p style={{ margin: 0, fontWeight: 600 }}>
                {reading.creator.name || '나'}
                {reading.isMyReading && ' (나)'}
              </p>
            </div>

            <div style={{ fontSize: '2rem' }}>💕</div>

            <div style={{ textAlign: 'center' }}>
              <div
                className={styles.partnerPhoto}
                style={{ width: '70px', height: '70px', margin: '0 auto 0.5rem' }}
              >
                {reading.partner?.image ? (
                  <Image
                    src={reading.partner.image}
                    alt={reading.partner.name || ''}
                    width={70}
                    height={70}
                  />
                ) : (
                  '👤'
                )}
              </div>
              <p style={{ margin: 0, fontWeight: 600 }}>
                {reading.partner?.name || '파트너'}
                {!reading.isMyReading && ' (나)'}
              </p>
            </div>
          </div>

          {reading.connection?.compatibilityScore && (
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <span
                className={styles.compatScore}
                style={{ fontSize: '1.2rem', padding: '0.5rem 1.5rem' }}
              >
                궁합 {reading.connection.compatibilityScore}%
              </span>
            </div>
          )}
        </section>

        {/* 질문 */}
        {reading.question && (
          <section className={styles.questionSection}>
            <h2 className={styles.sectionTitle}>
              <span>💭</span> 질문
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '1.1rem', margin: 0 }}>
              {reading.question}
            </p>
          </section>
        )}

        {/* 뽑은 카드 */}
        <section className={styles.spreadSection}>
          <h2 className={styles.sectionTitle}>
            <span>🎴</span> 뽑은 카드
          </h2>
          <div className={styles.spreadList}>
            {(
              reading.cards as Array<{
                name: string
                nameKo?: string
                isReversed: boolean
                position: string
                positionKo?: string
              }>
            ).map((card, idx) => (
              <div key={idx} className={styles.spreadCard} style={{ cursor: 'default' }}>
                <div className={styles.spreadIcon}>{card.isReversed ? '🔮' : '✨'}</div>
                <p className={styles.spreadName}>
                  {card.nameKo || card.name}
                  {card.isReversed && ' (역방향)'}
                </p>
                <p className={styles.spreadCards}>{card.positionKo || card.position}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 전체 메시지 */}
        {reading.overallMessage && (
          <section className={styles.partnerSection}>
            <h2 className={styles.sectionTitle}>
              <span>🌟</span> 전체 메시지
            </h2>
            <div
              style={{
                color: 'rgba(255,255,255,0.9)',
                lineHeight: 1.8,
                whiteSpace: 'pre-wrap',
                fontSize: '1.2rem',
              }}
            >
              {reading.overallMessage}
            </div>
          </section>
        )}

        {/* 카드별 해석 */}
        {reading.cardInsights && reading.cardInsights.length > 0 && (
          <section className={styles.historySection}>
            <h2 className={styles.sectionTitle}>
              <span>📖</span> 카드별 해석
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {(reading.cardInsights as CardInsight[]).map((insight, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    padding: '1.5rem',
                  }}
                >
                  <h3
                    style={{
                      color: '#63d2ff',
                      margin: '0 0 1rem 0',
                      fontSize: '1.25rem',
                    }}
                  >
                    {insight.position}: {insight.card_name}
                    {insight.is_reversed && ' (역방향)'}
                  </h3>
                  <p
                    style={{
                      color: 'rgba(255,255,255,0.85)',
                      lineHeight: 1.8,
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      fontSize: '1.15rem',
                    }}
                  >
                    {insight.interpretation}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 조언 */}
        {reading.guidance && (
          <section className={styles.questionSection}>
            <h2 className={styles.sectionTitle}>
              <span>💫</span> 조언
            </h2>
            <p
              style={{
                color: 'rgba(255,255,255,0.9)',
                lineHeight: 1.8,
                margin: 0,
                whiteSpace: 'pre-wrap',
                fontSize: '1.2rem',
              }}
            >
              {reading.guidance}
            </p>
          </section>
        )}

        {/* 확언 */}
        {reading.affirmation && (
          <div
            style={{
              textAlign: 'center',
              padding: '2rem',
              background: 'linear-gradient(135deg, rgba(196,77,255,0.2), rgba(99,210,255,0.2))',
              borderRadius: '16px',
              marginBottom: '2rem',
            }}
          >
            <p
              style={{
                fontSize: '1.3rem',
                fontStyle: 'italic',
                color: '#fff',
                margin: 0,
              }}
            >
              &quot;{reading.affirmation}&quot;
            </p>
          </div>
        )}

        {/* 메타 정보 */}
        <div
          style={{
            textAlign: 'center',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.9rem',
            marginBottom: '2rem',
          }}
        >
          {formatDate(reading.createdAt)} · {reading.isPaidByMe ? '내가 결제' : '파트너가 결제'}
        </div>

        {/* 새 리딩 버튼 */}
        <div style={{ textAlign: 'center' }}>
          <Link
            href="/tarot/couple"
            className={styles.startButton}
            style={{ display: 'inline-block', textDecoration: 'none' }}
          >
            새로운 커플 타로 보기
          </Link>
        </div>
      </div>
    </div>
  )
}
