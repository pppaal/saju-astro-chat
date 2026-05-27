'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../DestinyMatch.module.css'
import { ShareButton } from '@/components/share/ShareButton'
import { generateDestinyMatchCard } from '@/components/share/cards/DestinyMatchCard'
import { logger } from '@/lib/logger'
import { MatchOracleView } from '../components/MatchOracleView'

type MatchedPartner = {
  profileId: string
  userId: string
  displayName: string
  bio: string | null
  occupation: string | null
  photos: string[]
  city: string | null
  interests: string[]
  verified: boolean
  age: number | null
  lastActiveAt: string
}

type Match = {
  connectionId: string
  matchedAt: string
  isSuperLikeMatch: boolean
  compatibilityScore: number | null
  chatStarted: boolean
  lastInteractionAt: string
  partner: MatchedPartner
}

export default function DestinyMatchesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const redirectedRef = useRef(false)

  const [loading, setLoading] = useState(true)
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [oracleMatch, setOracleMatch] = useState<Match | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    if (status === 'unauthenticated' && !redirectedRef.current) {
      redirectedRef.current = true
      router.push('/auth/signin?callbackUrl=/destiny-match/matches')
      return
    }
    if (status !== 'authenticated') {
      return
    }
    redirectedRef.current = false

    const loadMatches = async () => {
      try {
        const res = await fetch('/api/destiny-match/matches')
        const data = await res.json()

        if (res.ok) {
          setMatches(data.matches || [])
        } else {
          setError(data.error || '매치 목록 조회 실패')
        }
      } catch (e) {
        logger.error('Load matches error:', { error: e })
        setError('매치 목록 조회 중 오류가 발생했습니다')
      } finally {
        setLoading(false)
      }
    }

    loadMatches()
  }, [session, status, router])

  const handleUnmatch = async (connectionId: string) => {
    if (!confirm('정말 매치를 해제하시겠어요?')) {
      return
    }

    try {
      const res = await fetch('/api/destiny-match/matches', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId }),
      })

      if (res.ok) {
        setMatches((prev) => prev.filter((m) => m.connectionId !== connectionId))
        setSelectedMatch(null)
      }
    } catch (e) {
      logger.error('Unmatch error:', { error: e })
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return '오늘'
    }
    if (diffDays === 1) {
      return '어제'
    }
    if (diffDays < 7) {
      return `${diffDays}일 전`
    }
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  if (status === 'loading' || loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <p>매치 목록을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <Link href="/destiny-match" className={styles.backButton}>
            {'< Back'}
          </Link>
          <h1 className={styles.title}>
            <span className={styles.titleIcon}>💕</span>
            My Matches
          </h1>
          <div />
        </header>

        {error && <div className={styles.errorMessage}>{error}</div>}

        {matches.length === 0 ? (
          <div className={styles.emptyMatches}>
            <div className={styles.emptyIcon}>💫</div>
            <h2>아직 매치가 없어요</h2>
            <p>스와이프해서 운명의 인연을 찾아보세요!</p>
            <Link href="/destiny-match" className={styles.resetButton}>
              인연 찾으러 가기
            </Link>
          </div>
        ) : (
          <>
            {/* Share Button */}
            <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
              <ShareButton
                generateCard={() => {
                  const topMatch = matches.sort(
                    (a, b) => (b.compatibilityScore || 0) - (a.compatibilityScore || 0)
                  )[0]

                  return generateDestinyMatchCard(
                    {
                      userName: session?.user?.name || 'You',
                      matchCount: matches.length,
                      topMatchName: topMatch?.partner.displayName,
                      topMatchScore: topMatch?.compatibilityScore || undefined,
                    },
                    'og'
                  )
                }}
                filename="destiny-match-result.png"
                shareTitle="My Destiny Match Results"
                shareText={`I found ${matches.length} match${matches.length > 1 ? 'es' : ''} on Destiny Match! Find your destiny at destinypal.me/destiny-match`}
                label="🌟 공유하기"
              />
            </div>
            <div className={styles.matchesList}>
              {matches.map((match) => (
                <div key={match.connectionId} className={styles.matchCard}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}
                    onClick={() => setSelectedMatch(match)}
                  >
                    <div className={styles.matchPhoto}>
                      {match.partner.photos?.[0] ? (
                        <Image
                          src={match.partner.photos[0]}
                          alt={match.partner.displayName}
                          width={56}
                          height={56}
                          className={styles.photoImage}
                        />
                      ) : (
                        <span>👤</span>
                      )}
                    </div>
                    <div className={styles.matchInfo}>
                      <h3 className={styles.matchName}>
                        {match.partner.displayName}
                        {match.partner.age && `, ${match.partner.age}`}
                        {match.isSuperLikeMatch && (
                          <span className={styles.superLikeBadge}>⭐</span>
                        )}
                      </h3>
                      {match.partner.occupation && (
                        <p className={styles.matchOccupation}>{match.partner.occupation}</p>
                      )}
                      <p className={styles.matchDate}>
                        {match.chatStarted ? '대화 중' : '매치됨'}:{' '}
                        {formatDate(match.lastInteractionAt || match.matchedAt)}
                      </p>
                    </div>
                    {match.compatibilityScore && (
                      <div className={styles.matchScore}>{match.compatibilityScore}%</div>
                    )}
                  </div>
                  <Link
                    href={`/destiny-match/chat/${match.connectionId}`}
                    className={styles.chatButton}
                    onClick={(e) => e.stopPropagation()}
                  >
                    💬
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Match Detail Modal */}
      {selectedMatch && (
        <div className={styles.modal} onClick={() => setSelectedMatch(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setSelectedMatch(null)}>
              ✕
            </button>

            <div className={styles.modalPhotos}>
              {(selectedMatch.partner.photos || []).length > 0 ? (
                (selectedMatch.partner.photos as string[]).map((photo, idx) => (
                  <div key={idx} className={styles.modalPhoto}>
                    <Image
                      src={photo}
                      alt={`${selectedMatch.partner.displayName} ${idx + 1}`}
                      width={160}
                      height={160}
                      className={styles.photoImage}
                    />
                  </div>
                ))
              ) : (
                <div className={styles.modalPhoto}>
                  <span className={styles.photoPlaceholder}>👤</span>
                </div>
              )}
            </div>

            <div className={styles.modalInfo}>
              <h2 className={styles.modalName}>
                {selectedMatch.partner.displayName}
                {selectedMatch.partner.age && `, ${selectedMatch.partner.age}`}
                {selectedMatch.partner.verified && <span className={styles.verified}>✓</span>}
                {selectedMatch.isSuperLikeMatch && (
                  <span className={styles.superLikeBadge}>⭐ Super Like</span>
                )}
              </h2>
              {selectedMatch.partner.occupation && (
                <p className={styles.modalOccupation}>{selectedMatch.partner.occupation}</p>
              )}

              <div className={styles.modalStats}>
                {selectedMatch.compatibilityScore && (
                  <div className={styles.modalStat}>
                    <span className={styles.statLabel}>궁합</span>
                    <span className={styles.statValue}>{selectedMatch.compatibilityScore}%</span>
                  </div>
                )}
                <div className={styles.modalStat}>
                  <span className={styles.statLabel}>매치 날짜</span>
                  <span className={styles.statValue}>{formatDate(selectedMatch.matchedAt)}</span>
                </div>
              </div>

              {selectedMatch.partner.bio && (
                <div className={styles.modalSection}>
                  <h3>About</h3>
                  <p className={styles.modalBio}>{selectedMatch.partner.bio}</p>
                </div>
              )}

              {selectedMatch.partner.interests && selectedMatch.partner.interests.length > 0 && (
                <div className={styles.modalSection}>
                  <h3>Interests</h3>
                  <div className={styles.modalInterests}>
                    {(selectedMatch.partner.interests as string[]).map((interest) => (
                      <span key={interest} className={styles.modalInterestTag}>
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.modalActions}>
                <Link
                  href={`/destiny-match/chat/${selectedMatch.connectionId}`}
                  className={`${styles.modalButton} ${styles.modalLikeButton}`}
                  style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
                >
                  💬 메시지 보내기
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setOracleMatch(selectedMatch)
                    setSelectedMatch(null)
                  }}
                  className={`${styles.modalButton} ${styles.modalLikeButton}`}
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #8b5cf6)' }}
                >
                  🔮 오라클: 카드 + 택일
                </button>
                <Link
                  href={`/tarot/couple?connectionId=${selectedMatch.connectionId}`}
                  className={`${styles.modalButton} ${styles.modalLikeButton}`}
                  style={{ background: 'linear-gradient(135deg, #ff6b9d, #c44dff)' }}
                >
                  💕 커플 타로
                </Link>
                <Link
                  href={`/compatibility?partnerId=${selectedMatch.partner.userId}`}
                  className={`${styles.modalButton} ${styles.modalLikeButton}`}
                >
                  💫 상세 궁합 보기
                </Link>
                <button
                  onClick={() => handleUnmatch(selectedMatch.connectionId)}
                  className={`${styles.modalButton} ${styles.modalPassButton}`}
                >
                  매치 해제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Oracle Modal (tarot + 택일) */}
      {oracleMatch && (
        <div className={styles.modal} onClick={() => setOracleMatch(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className={styles.modalClose}
              onClick={() => setOracleMatch(null)}
              aria-label="닫기"
            >
              ✕
            </button>
            <div style={{ padding: '1rem' }}>
              <h2 className={styles.modalName}>
                🔮 {oracleMatch.partner.displayName}님과의 운명
              </h2>
              <MatchOracleView
                connectionId={oracleMatch.connectionId}
                styles={styles}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
