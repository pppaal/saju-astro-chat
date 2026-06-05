'use client'

import React, { Suspense, useEffect, useCallback, useMemo, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import { buildSignInUrl } from '@/lib/auth/signInUrl'
import { useTarotGame, useTarotInterpretation } from './hooks'
import { smoothScrollTo } from './utils'
import { PageContent } from './components/PageContent'
import BrandSplash from '@/components/branding/BrandSplash'
import { CosmicBackdrop } from '@/components/ui/CosmicBackdrop'
import { useCreditModal } from '@/contexts/CreditModalContext'

export default function TarotReadingPageWrapper() {
  return (
    <Suspense fallback={<BrandSplash />}>
      <TarotReadingPage />
    </Suspense>
  )
}

function TarotReadingPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { status } = useSession()
  const { translate, language } = useI18n()
  const { showDepleted, showGuestLimit } = useCreditModal()
  const [creditNotice, setCreditNotice] = useState<string | null>(null)

  const categoryName = params?.categoryName as string | undefined
  const spreadId = params?.spreadId as string | undefined
  const search = searchParams?.toString()
  const basePath = categoryName && spreadId ? `/tarot/${categoryName}/${spreadId}` : '/tarot'
  const callbackUrl = search ? `${basePath}?${search}` : basePath
  const signInUrl = buildSignInUrl(callbackUrl)
  const isGuestUser = status === 'unauthenticated'

  // Local state
  const detailedSectionRef = useRef<HTMLDivElement | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [interpretationFailed, setInterpretationFailed] = useState(false)
  const requestedInterpretationKeyRef = useRef<string | null>(null)
  const isInterpretationFetchingRef = useRef(false)
  // 진행 중인 interpret-stream 요청의 abort 컨트롤러 — 재시도 시 이전 요청을
  // 끊어 두 스트림이 동시에 도는 레이스를 막는다.
  const interpretAbortRef = useRef<AbortController | null>(null)

  // Custom hooks
  const gameHook = useTarotGame()
  const interpretationHook = useTarotInterpretation({
    categoryName,
    spreadId,
    userTopic: gameHook.userTopic,
    questionAnalysis: gameHook.questionAnalysis,
    selectedDeckStyle: gameHook.selectedDeckStyle,
    personalizationOptions: gameHook.personalizationOptions,
  })
  const readingResult = gameHook.readingResult
  const interpretationFallback = gameHook.interpretation?.fallback
  const setInterpretation = gameHook.setInterpretation
  const fetchInterpretation = interpretationHook.fetchInterpretation
  const recoverLastInterpretation = interpretationHook.recoverLastInterpretation

  const readingSignature = useMemo(() => {
    if (!readingResult) {
      return ''
    }
    const spreadKey = readingResult.spread?.id || spreadId || 'spread'
    const cardsKey = readingResult.drawnCards
      .map((dc) => `${dc.card.id}:${dc.isReversed ? 'r' : 'u'}`)
      .join('|')
    return `${spreadKey}:${cardsKey}`
  }, [readingResult, spreadId])

  // 항상 최신 readingSignature 를 가리키는 ref — 비동기 복원이 끝났을 때
  // "지금 화면의 리딩" 과 같은지 비교하기 위함(아래 복원 effect 참조).
  const readingSignatureRef = useRef(readingSignature)
  readingSignatureRef.current = readingSignature

  // 새로고침 시 크레딧이 또 차감되던 회귀 — 같은 리딩에 대해선 해석 결과를
  // sessionStorage 에 캐시해 두고 우선 그걸 본다. 캐시 hit 이면 API 호출 자체를
  // 건너뛰어 토큰 차감이 없고, miss 면 정상 호출하되 idempotencyKey 헤더로
  // 서버 측 2차 dedup 까지 동시에 끼운다.
  //
  // 캐시 키에 categoryName 을 포함시켜 카테고리가 늘어도 동일 spreadId 끼리
  // 충돌 없게 한다. 또 인라인 타로 모달이 같은 cards/spread 로 리딩해도
  // 모달은 sessionStorage 에 쓰지 않으므로 메인 페이지 캐시와 분리.
  const cacheKeyFor = useCallback(
    (sig: string) => `tarot:interp:${categoryName ?? 'unknown'}:${sig}:${language}`,
    [language, categoryName]
  )

  // Fetch interpretation once per reading result (prevents re-fetch loop/rewrite)
  useEffect(() => {
    if (!readingSignature) {
      requestedInterpretationKeyRef.current = null
      isInterpretationFetchingRef.current = false
      return
    }

    if (!readingResult || !interpretationFallback) {
      return
    }

    if (
      requestedInterpretationKeyRef.current === readingSignature ||
      isInterpretationFetchingRef.current
    ) {
      return
    }

    // sessionStorage 캐시 hit — 네트워크 호출 없이 즉시 적용.
    if (typeof window !== 'undefined') {
      try {
        const cached = window.sessionStorage.getItem(cacheKeyFor(readingSignature))
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed && typeof parsed === 'object' && parsed.overall_message) {
            requestedInterpretationKeyRef.current = readingSignature
            setInterpretation(parsed)
            setInterpretationFailed(false)
            return
          }
        }
      } catch {
        // 캐시 손상 — 무시하고 정상 fetch.
      }
    }

    requestedInterpretationKeyRef.current = readingSignature
    isInterpretationFetchingRef.current = true
    let cancelled = false

    // 혹시 남아있는 이전 요청을 끊고 새 컨트롤러로 교체.
    interpretAbortRef.current?.abort()
    const abortController = new AbortController()
    interpretAbortRef.current = abortController

    fetchInterpretation(readingResult, {
      idempotencyKey: readingSignature,
      signal: abortController.signal,
      // 스트리밍 도중 overall 텍스트 누적분을 받아 즉시 UI 반영 (fallback=true 로 유지).
      onProgress: (snapshot) => {
        if (cancelled) return
        setInterpretation(snapshot)
      },
      // 크레딧 / 게스트 한도 — 전역 모달 + 인라인 메시지로 사용자에게 명확히 알림.
      onCreditError: (kind) => {
        if (cancelled) return
        if (kind === 'insufficient_credits') {
          showDepleted()
        } else {
          // 비로그인 무료 체험 한도 — 로그인 유도 모달 + 인라인 안내(모달 닫아도 남게).
          showGuestLimit()
          const isKo = (language || 'ko') === 'ko'
          setCreditNotice(
            isKo
              ? '무료 체험 한도에 도달했어요. 로그인하면 가입 보너스 5 크레딧으로 계속 이용할 수 있어요.'
              : 'Free trial limit reached. Sign in to claim your 5-credit signup bonus and continue.'
          )
        }
      },
    })
      .then((result) => {
        if (cancelled) return
        if (result) {
          setInterpretation(result)
        }
        // LLM 이 완전 실패해 정적 fallback 으로 떨어진 경우 → 사용자에게 재시도 옵션 제공.
        // overall_message 가 비어있으면 fallback 값과 무관하게 실패로 본다.
        // 직전엔 fallback:false + 빈 overall(스트림이 카드만 주고 overall 을 못
        // 끝낸 부분-에러 경로 등) 이면 실패 감지를 통과해, ResultsStage 의 저장·
        // 후속·재시도 버튼이 모두 overall_message 게이트에 막혀 사라지고 에러도
        // 안 뜨는 *멈춘 화면* 이 됐다. 빈 overall 을 실패로 잡아 재시도를 띄운다.
        const failedToLLM =
          !result ||
          !result.overall_message?.trim() ||
          result.interpretation_source === 'local_personalized_fallback' ||
          result.interpretation_source === 'emergency_fallback' ||
          (result.fallback === true &&
            (!result.overall_message || result.overall_message.length < 40))
        setInterpretationFailed(failedToLLM)

        // 성공적인 LLM 결과만 캐시 — fallback/실패는 다음에 다시 시도하도록 저장 X.
        if (result && !failedToLLM && typeof window !== 'undefined') {
          try {
            window.sessionStorage.setItem(cacheKeyFor(readingSignature), JSON.stringify(result))
          } catch {
            // quota exceeded 등은 무시.
          }
        }
      })
      .catch(() => {
        if (cancelled) return
        setInterpretationFailed(true)
      })
      .finally(() => {
        if (!cancelled) {
          isInterpretationFetchingRef.current = false
        }
      })

    return () => {
      cancelled = true
    }
  }, [
    readingSignature,
    readingResult,
    interpretationFallback,
    setInterpretation,
    fetchInterpretation,
    cacheKeyFor,
    language,
    showDepleted,
    showGuestLimit,
  ])

  // 끊긴 해석 복원 — 해석이 실패/끊김으로 끝난 상태에서 사용자가 다른 앱에서
  // 돌아오면(visibilitychange), 서버가 끝까지 생성해 turnId 로 캐시에 저장한
  // 완성 리딩을 result 엔드포인트로 폴링해 갈아끼운다 (counselor 식 복원).
  // 성공 시 캐시에도 저장해 새로고침에도 유지. 로그인 사용자만 가능.
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (!interpretationFailed) return
    const onVis = () => {
      if (document.visibilityState !== 'visible') return
      // 복원 폴링은 최대 ~60s 걸릴 수 있다. 그 사이 사용자가 "다시 섞기"/리셋
      // 으로 다른 카드를 뽑으면, 복원된 *옛* 리딩을 *새* 카드 위에 덮어쓰는
      // 회귀가 난다. 폴링 시작 시점의 signature 를 캡처해 두고, 적용 직전에
      // 현재 signature 와 다르면 버린다.
      const sigAtStart = readingSignatureRef.current
      void recoverLastInterpretation().then((recovered) => {
        if (!recovered) return
        if (readingSignatureRef.current !== sigAtStart) return
        setInterpretation(recovered)
        setInterpretationFailed(false)
        if (typeof window !== 'undefined' && readingSignature) {
          try {
            window.sessionStorage.setItem(cacheKeyFor(readingSignature), JSON.stringify(recovered))
          } catch {
            // quota exceeded 등은 무시.
          }
        }
      })
    }
    // 이미 보이는 상태면(탭 안 떠났는데 그냥 실패) 즉시 한 번 시도.
    if (document.visibilityState === 'visible') onVis()
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [
    interpretationFailed,
    recoverLastInterpretation,
    setInterpretation,
    readingSignature,
    cacheKeyFor,
  ])

  // Card reveal with auto-scroll
  const handleCardReveal = useCallback(
    (index: number) => {
      gameHook.handleCardReveal(index)
      // Auto-scroll after last card
      if (
        index === (gameHook.readingResult?.drawnCards.length || 0) - 1 &&
        detailedSectionRef.current
      ) {
        setTimeout(() => {
          smoothScrollTo(detailedSectionRef.current!, 1200)
        }, 800)
      }
    },
    [gameHook, detailedSectionRef]
  )

  // 동기 더블클릭 가드는 ref 로 — isSaving 은 state 라 같은 tick 의 두 번째
  // 클릭이 stale false 를 읽어 가드를 통과, /api/tarot/save 가 2 번 POST 되던
  // 문제. ref 는 즉시 반영되어 두 번째 호출을 막는다.
  const isSavingRef = useRef(false)
  const handleSaveReading = useCallback(async () => {
    if (isSavingRef.current || interpretationHook.isSaved) return
    isSavingRef.current = true
    setIsSaving(true)
    try {
      await interpretationHook.handleSaveReading(
        gameHook.readingResult,
        gameHook.spreadInfo,
        gameHook.interpretation
      )
    } finally {
      isSavingRef.current = false
      setIsSaving(false)
    }
  }, [interpretationHook, gameHook])

  // 자동 저장 — interpretation 이 도착하면 (그리고 로그인 상태면) 사용자가
  // 버튼 안 눌러도 1회 POST. 그 다음 클래리파이어 / followup 채팅은
  // FollowupChat 안의 PATCH 로 같은 row 에 갱신. 운명·궁합 상담사 채팅이
  // 이미 자동 저장이라 타로만 수동이던 일관성 격차 제거.
  //
  // readingSignature → 저장 시도 횟수. 직전 구현은 ref 에 signature 하나만
  // 박아 "한 번 시도하면 성공·실패 무관 영구 차단" 이었는데, 모바일에서 첫
  // POST 가 일시 네트워크 오류로 실패하면 그 리딩이 영영 저장 안 되고 (수동
  // 저장 버튼도 없어) 조용히 누락되던 회귀의 원인. 성공하면 isSaved=true 로
  // 아래 가드가 멈추고, 실패하면 isSaving 토글로 effect 가 재실행되며 최대
  // 3 회까지 재시도 — 영구 오류(검증/500)에서의 무한 루프는 cap 으로 차단.
  const saveAttemptsRef = useRef<Map<string, number>>(new Map())
  React.useEffect(() => {
    if (status !== 'authenticated') return
    if (interpretationHook.isSaved || isSaving) return
    if (!gameHook.interpretation || !gameHook.readingResult || !gameHook.spreadInfo) return
    // interpretation 이 LLM 정상 결과인지 (fallback 아닌지) 한 번 더 확인 —
    // 정적 fallback 까지 자동 저장하면 사용자가 의도하지 않은 빈 리딩이
    // 히스토리에 쌓일 위험.
    if (gameHook.interpretation.fallback === true) return
    if (!readingSignature) return
    const attempts = saveAttemptsRef.current.get(readingSignature) ?? 0
    if (attempts >= 3) return
    saveAttemptsRef.current.set(readingSignature, attempts + 1)
    void handleSaveReading()
  }, [
    status,
    interpretationHook.isSaved,
    isSaving,
    gameHook.interpretation,
    gameHook.readingResult,
    gameHook.spreadInfo,
    handleSaveReading,
    readingSignature,
  ])

  const handleReset = () => router.push('/tarot')

  // 재시도: ref 를 비워서 useEffect 가 다시 fetchInterpretation 트리거.
  // 캐시는 fallback/실패는 저장 안 했지만, 사용자가 의도적으로 retry 한
  // 이상 혹시 모를 잔여 캐시도 함께 지워서 항상 새 호출이 가도록 한다.
  const handleRetryInterpretation = useCallback(() => {
    if (!gameHook.readingResult) return
    // 진행 중일 수 있는 이전 요청을 먼저 끊어 두 스트림 동시 실행을 방지.
    interpretAbortRef.current?.abort()
    interpretAbortRef.current = null
    setInterpretationFailed(false)
    requestedInterpretationKeyRef.current = null
    isInterpretationFetchingRef.current = false
    if (typeof window !== 'undefined' && readingSignature) {
      try {
        window.sessionStorage.removeItem(cacheKeyFor(readingSignature))
      } catch {
        // ignore
      }
    }
    // basicInterpretation(fallback=true) 로 되돌려 useEffect 조건 만족시킴.
    setInterpretation({
      overall_message: '',
      card_insights: gameHook.readingResult.drawnCards.map((dc, i) => ({
        position: gameHook.readingResult!.spread.positions[i]?.title || `Card ${i + 1}`,
        card_name: dc.card.name,
        is_reversed: dc.isReversed,
        interpretation: '',
      })),
      guidance: '',
      affirmation: '',
      fallback: true,
    })
  }, [gameHook.readingResult, setInterpretation, readingSignature, cacheKeyFor])

  // Session loading state
  if (status === 'loading') {
    return <BrandSplash />
  }
  return (
    <div className="relative min-h-screen">
      {/* 공용 cosmic gradient backdrop — 메인/타로 entry/타로 history 와 같은
          톤. 카드 stage 인터랙션은 안 건드리고 배경 레이어만 추가. */}
      <CosmicBackdrop />
      <div className="relative z-10">
        {creditNotice && (
          <div
            role="status"
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 50,
              padding: '10px 16px',
              background: '#fdfbf6',
              borderBottom: '1px solid #ece4d4',
              color: '#57534e',
              fontSize: 13,
              textAlign: 'center',
            }}
          >
            {creditNotice}
          </div>
        )}
        <PageContent
          {...gameHook}
          {...interpretationHook}
          detailedSectionRef={detailedSectionRef}
          isSaving={isSaving}
          isGuestUser={isGuestUser}
          signInUrl={signInUrl}
          handleCardReveal={handleCardReveal}
          handleSaveReading={handleSaveReading}
          handleReset={handleReset}
          interpretationFailed={interpretationFailed}
          handleRetryInterpretation={handleRetryInterpretation}
          language={language}
          translate={translate}
        />
      </div>
    </div>
  )
}
