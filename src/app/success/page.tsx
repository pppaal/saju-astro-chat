'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import BackButton from '@/components/ui/BackButton'
import { SUPPORT_EMAIL } from '@/lib/config/contact'
import { CREDIT_PACKS, type CreditPackType } from '@/lib/config/pricing'
import styles from './success.module.css'

// 팩별 지급 크레딧 수는 pricing.ts(SSOT)에서 도출한다. 예전엔 이 파일에 로컬
// 복제본을 두었는데 SSOT 와 어긋나(standard 40 vs 30, plus 100 vs 70 등) webhook
// 이 실제로 지급한 양과 polling 기대치가 영원히 불일치 → 정상 결제에도 "처리 중"
// 무한 정체 + 틀린 "+N 크레딧" 표기가 발생했다.
function packCredits(pack: string | null): number | null {
  if (pack && pack in CREDIT_PACKS) {
    return CREDIT_PACKS[pack as CreditPackType].credits
  }
  return null
}

// Webhook 처리 polling — Stripe → 우리 서버 webhook → DB UserCredits 업데이트
// 까지 보통 1~5초. 결제 직후 redirect 가 webhook 보다 빠르면 success 페이지가
// 크레딧 0 인 상태로 잠깐 보였다. 이전엔 update() 1 회만 부르고 끝나서 사용자가
// "결제했는데 안 들어옴" 으로 보고. 이제 1.5s × 15 회 = 약 22.5s polling 으로
// 도착 시점에 +N 크레딧 시각화 + 다른 탭/위젯에 credit-update 이벤트 broadcast.
const POLL_INTERVAL_MS = 1500
const POLL_MAX_ATTEMPTS = 15

type PollPhase = 'waiting' | 'arrived' | 'timeout'

// 주문번호 표시용 — Stripe session id (cs_live_...) 그대로 노출하면 길고
// 내부 식별자 느낌이라, 끝 12자만 대문자로 잘라서 사용자가 CS 문의 시 우리
// 측에서 검색 가능한 정도로 단축.
function formatOrderRef(sessionId: string): string {
  const tail = sessionId.slice(-12).toUpperCase()
  return tail.match(/.{1,4}/g)?.join('-') ?? tail
}

function SuccessContent() {
  const { t, locale } = useI18n()
  const { data: session, status, update } = useSession()
  const searchParams = useSearchParams()
  const sessionId = searchParams?.get('session_id') ?? null
  const pack = searchParams?.get('pack') ?? null
  const expectedCredits = packCredits(pack)
  const isKo = locale === 'ko'
  const [returnUrl, setReturnUrl] = useState<string | null>(null)
  const [sessionRefreshed, setSessionRefreshed] = useState(false)
  const [pollPhase, setPollPhase] = useState<PollPhase>('waiting')
  // 도착 직후 화면에 보여줄 잔액 (선택사항 — null 이면 그냥 "도착" 상태만)
  const [arrivedTotal, setArrivedTotal] = useState<number | null>(null)
  const pollStartedRef = useRef(false)

  // Stripe 결제 후 돌아왔을 때 세션 새로고침 (한 번)
  useEffect(() => {
    if (status === 'loading') return
    if (sessionRefreshed) return
    update()
      .then(() => setSessionRefreshed(true))
      .catch(() => setSessionRefreshed(true))
  }, [status, sessionRefreshed, update])

  // localStorage 에서 returnUrl 가져오기
  useEffect(() => {
    const savedReturnUrl = localStorage.getItem('checkout_return_url')
    if (savedReturnUrl) {
      setReturnUrl(savedReturnUrl)
      localStorage.removeItem('checkout_return_url')
    }
  }, [])

  // 크레딧 polling — webhook 처리될 때까지 대기.
  useEffect(() => {
    if (status !== 'authenticated') return
    if (!sessionId) return
    if (pollStartedRef.current) return
    pollStartedRef.current = true

    let cancelled = false
    let baseline: number | null = null
    let attempt = 0
    let timer: ReturnType<typeof setTimeout> | null = null

    const readRemaining = (json: unknown): number | null => {
      // /api/me/credits 가 withApiMiddleware 봉투(data.credits) 또는 직접 형태
      // (credits) 둘 다 응답할 수 있어 양쪽 다 시도.
      const obj = (json ?? {}) as Record<string, unknown>
      const inner = (obj.data ?? obj) as Record<string, unknown>
      const credits = inner.credits as Record<string, unknown> | undefined
      const remaining = credits?.remaining
      return typeof remaining === 'number' ? remaining : null
    }

    const finish = (remaining: number) => {
      setArrivedTotal(remaining)
      setPollPhase('arrived')
      // 헤더의 CreditBadge 등 다른 위젯도 즉시 갱신.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('credit-update'))
      }
    }

    const poll = async () => {
      if (cancelled) return
      try {
        const res = await fetch('/api/me/credits', { cache: 'no-store' })
        if (res.ok) {
          const json = await res.json().catch(() => null)
          const remaining = readRemaining(json)
          if (typeof remaining === 'number') {
            if (baseline === null) {
              // 첫 fetch — baseline 설정. 첫 fetch 가 이미 expectedCredits
              // 이상이면 webhook 이 이미 처리된 것 → 즉시 도착 처리.
              baseline = remaining
              if (expectedCredits && remaining >= expectedCredits) {
                finish(remaining)
                return
              }
            } else {
              const reachedExpected = expectedCredits
                ? remaining >= baseline + expectedCredits
                : remaining > baseline
              if (reachedExpected) {
                finish(remaining)
                return
              }
            }
          }
        }
      } catch {
        /* network blip — keep trying */
      }

      attempt += 1
      if (attempt >= POLL_MAX_ATTEMPTS) {
        if (!cancelled) setPollPhase('timeout')
        return
      }
      if (!cancelled) {
        timer = setTimeout(poll, POLL_INTERVAL_MS)
      }
    }

    void poll()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [status, sessionId, expectedCredits])

  // 크레딧 부족 모달에서 결제로 넘어온 경우만 "리딩으로 돌아가기" 버튼을
  // 띄운다. 홈/요금제에서 그냥 결제한 경우는 돌아갈 곳이 없어 버튼이 노이즈.
  const showReturnButton = Boolean(returnUrl)
  // 팩 이름은 i18n, 크레딧 수는 SSOT(expectedCredits)에서 합성한다. i18n 라벨에
  // 숫자를 박아두면 가격표(pricing.ts)와 어긋나 "스탠다드(20 크레딧)" 옆에 실제
  // 잔액 30 이 보이는 모순이 생긴다 — 라벨엔 이름만, 숫자는 SSOT 에서.
  const packName = pack ? t(`success.packs.${pack}`) : null
  const packLabel =
    packName && expectedCredits != null
      ? isKo
        ? `${packName} (${expectedCredits} 크레딧)`
        : `${packName} (${expectedCredits} credits)`
      : packName

  // 영수증이 어디로 가는지 — 사용자에게 확신을 주려고 한 줄 노출. 이메일이
  // 비어 있는 (희귀) 케이스는 줄 자체를 숨겨서 빈칸 "_로 발송돼요" 같은
  // 깨진 카피가 안 나오게 한다.
  const receiptEmail = session?.user?.email?.trim() || null

  // timeout 분기에서 띄울 고객센터 문의 mailto. orderRef 가 있으면 제목/본문에
  // 자동으로 박아넣어 사용자가 우리 측에서 조회 가능한 ref 를 손으로 옮겨
  // 적지 않게 한다. SUPPORT_EMAIL 는 NEXT_PUBLIC_SUPPORT_EMAIL 환경변수
  // override 가능 (src/lib/config/contact.ts).
  const supportMailto = (() => {
    const ref = sessionId ? formatOrderRef(sessionId) : null
    const subject = isKo
      ? `결제 확인 요청${ref ? ` - ${ref}` : ''}`
      : `Payment confirmation request${ref ? ` - ${ref}` : ''}`
    const body = isKo
      ? `주문번호: ${ref ?? '(없음)'}\n\n[문제 설명을 적어주세요]`
      : `Order ref: ${ref ?? '(none)'}\n\n[Please describe the issue]`
    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  })()

  // 상태별 안내 줄 — title 자리에 들어감
  const statusMessage = (() => {
    if (pollPhase === 'arrived') {
      if (expectedCredits) {
        return isKo
          ? `+${expectedCredits} 크레딧이 들어왔어요!`
          : `+${expectedCredits} credits added!`
      }
      return t('success.title')
    }
    if (pollPhase === 'timeout') {
      return isKo ? '결제 확인 중이에요' : 'Confirming your payment'
    }
    return isKo ? '결제 처리 중이에요…' : 'Processing your payment…'
  })()

  // 잔액 표시 (도착 시점)
  const balanceLine =
    pollPhase === 'arrived' && typeof arrivedTotal === 'number'
      ? isKo
        ? `현재 잔액: ${arrivedTotal} 크레딧`
        : `Current balance: ${arrivedTotal} credits`
      : null

  // Timeout 안내 (보통 1분 안엔 들어오니, 사용자가 영원히 안 들어오는 줄 알지
  // 않도록 안심시키는 카피)
  const timeoutHint =
    pollPhase === 'timeout'
      ? isKo
        ? '영수증 이메일이 도착했다면 1분 안에 반영돼요. 안 보이면 새로고침 또는 고객센터로 알려주세요.'
        : 'If you received the receipt email, credits usually appear within 1 minute. Refresh or contact support if not.'
      : null

  return (
    <div className={styles.page}>
      <BackButton />
      <div className={styles.container}>
        <div className={styles.iconWrapper}>
          {/* polling 중엔 spinner, 도착하면 체크. timeout 도 체크 (결제 자체는
              성공) — 다만 잔액 줄 대신 안내 hint 표시. */}
          {pollPhase === 'waiting' ? (
            <div className={styles.successIcon} aria-label={isKo ? '처리 중' : 'Processing'}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" opacity="0.25" />
                <path
                  d="M22 12a10 10 0 0 1-10 10"
                  strokeLinecap="round"
                  style={{
                    transformOrigin: '50% 50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
              </svg>
              <style jsx>{`
                @keyframes spin {
                  from {
                    transform: rotate(0deg);
                  }
                  to {
                    transform: rotate(360deg);
                  }
                }
              `}</style>
            </div>
          ) : (
            <div className={styles.successIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>

        <h1 className={styles.title}>{statusMessage}</h1>
        <p className={styles.message}>{t('success.message')}</p>

        {packLabel && (
          <p className={styles.message}>
            {t('success.packLabel')}: <strong>{packLabel}</strong>
          </p>
        )}
        {balanceLine && <p className={styles.message}>{balanceLine}</p>}
        {timeoutHint && <p className={styles.message}>{timeoutHint}</p>}

        {sessionId && (
          <p className={styles.sessionInfo}>
            {t('success.orderRef')}: {formatOrderRef(sessionId)}
          </p>
        )}

        {/* 영수증 발송 안내 — session.user.email 이 있을 때만 노출. 사용자가
            "어디로 영수증 가는지" 즉시 확인할 수 있게 (FIX 2 / M4). */}
        {receiptEmail && (
          <p className={styles.message}>
            {isKo
              ? `영수증이 ${receiptEmail} 로 발송돼요`
              : `Receipt will be sent to ${receiptEmail}`}
          </p>
        )}

        <div className={styles.actions}>
          {/* Timeout 시점에 "고객센터 문의" 버튼을 가장 위에 노출 (FIX 3 / H3).
              timeoutHint 메시지만으론 사용자가 다음 액션을 모름 — 영원히 안
              들어오는 줄 알고 이탈할 수 있다. mailto 에 orderRef 자동으로
              prefill 해서 1-탭으로 문의 가능. */}
          {pollPhase === 'timeout' && (
            <a href={supportMailto} className={styles.primaryButton}>
              {isKo ? '고객센터 문의' : 'Contact support'}
            </a>
          )}
          {returnUrl && (
            <Link
              href={returnUrl}
              className={pollPhase === 'timeout' ? styles.secondaryButton : styles.primaryButton}
            >
              {t('success.startReading')}
            </Link>
          )}
          <Link
            href="/"
            className={
              pollPhase === 'timeout' || showReturnButton
                ? styles.secondaryButton
                : styles.primaryButton
            }
          >
            {t('success.goHome')}
          </Link>
        </div>

        <p className={styles.note}>{t('success.emailNote')}</p>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  )
}
