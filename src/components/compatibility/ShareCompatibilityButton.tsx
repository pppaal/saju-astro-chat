'use client'

/**
 * ShareCompatibilityButton — 무료 궁합 결과를 SNS(인스타/카톡)용 1:1 이미지로
 * 만들어 공유/저장하고, 공개 링크(/r/[token])도 함께 제공한다.
 *
 * 흐름(타로 ShareTarotButton 과 동일): 클릭 → 화면 밖 CompatShareCard 를 잠깐
 * 마운트 → html-to-image 로 PNG 캡처 → 미리보기 모달에서 [링크로 공유](서버에
 * verdict 토큰 저장 → OG 이미지 동적 생성) / [이미지 공유](Web Share file) /
 * [이미지 저장]. 이미지·링크 모두 게스트 가능(무로그인 바이럴 루프).
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import * as htmlToImage from 'html-to-image'
import { Share2, Download, Loader2, X, Link2, Check, MessageCircle } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { logger } from '@/lib/logger'
import { makeShareQr } from '@/lib/share/qr'
import { isKakaoConfigured, shareToKakao } from '@/lib/share/kakao'
import {
  CompatShareCard,
  COMPAT_SHARE_CARD_SIZE,
  type CompatShareCardData,
} from './CompatShareCard'
import type { CompatInviter } from '@/lib/tarot/shareLink'
import { trackFunnel } from '@/lib/metrics/trackFunnel'

export type CompatShareData = CompatShareCardData

export function ShareCompatibilityButton({
  data,
  inviter,
}: {
  data: CompatShareData
  /** 있으면(=공유자 출생정보) "친구가 나와의 궁합 보게 허용" 옵트인을 띄운다. */
  inviter?: CompatInviter
}) {
  const isKo = data.isKo
  // 기본 ON — 프리필(친구가 자기 생일만 넣으면 됨)이 바이럴 전환의 핵심이라 켜둔다.
  // 체크박스는 항상 보이고 문구에 "내 생년월일 포함"을 명시해 한 번에 끌 수 있다.
  const [allowInvite, setAllowInvite] = useState(true)
  const cardRef = useRef<HTMLDivElement>(null)
  // 'idle' | 'rendering'(캡처 중) | 'preview'(모달)
  const [phase, setPhase] = useState<'idle' | 'rendering' | 'preview'>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | undefined>(undefined)
  // 링크 공유: 'idle' | 'creating' | 'copied'
  const [linkPhase, setLinkPhase] = useState<'idle' | 'creating' | 'copied'>('idle')
  // 카톡 공유: 'idle' | 'creating'
  const [kakaoPhase, setKakaoPhase] = useState<'idle' | 'creating'>('idle')
  // 카톡 공유 가능 여부(키 설정 + 브라우저) — SSR 하이드레이션 불일치를 피해
  // 마운트 후에만 켠다.
  const [kakaoAvailable, setKakaoAvailable] = useState(false)
  useEffect(() => {
    setKakaoAvailable(isKakaoConfigured())
  }, [])
  // 더블클릭으로 토큰이 두 번 발급되지 않게 하는 동기 가드.
  const linkBusyRef = useRef(false)
  // 링크/카톡 공유가 같은 토큰을 재사용하도록 캐시(중복 발급 방지).
  const shareUrlRef = useRef<string | null>(null)

  // 공개 공유 링크 발급(서버에 verdict 토큰 저장). 실패 시 null. 한 번 발급하면
  // 캐시해 링크·카톡 버튼이 같은 토큰을 공유한다.
  const createShareUrl = useCallback(async (): Promise<string | null> => {
    if (shareUrlRef.current) return shareUrlRef.current
    try {
      const res = await apiFetch('/api/compatibility/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isKo,
          nameA: data.nameA,
          nameB: data.nameB,
          verdict: data.verdict,
          verdictTone: data.verdictTone,
          headline: data.headline || undefined,
          // 점수/등급을 링크에 실어 미리보기(OG/공개 페이지)에 큰 숫자 후크가 뜨게 한다.
          ...(typeof data.score === 'number' ? { score: data.score } : {}),
          ...(data.grade ? { grade: data.grade } : {}),
          // 옵트인 했을 때만 공유자 출생정보를 링크에 실어 2-player 프리필 활성화.
          ...(allowInvite && inviter ? { inviter } : {}),
        }),
      })
      const json = (await res.json().catch(() => null)) as { data?: { url?: string } } | null
      const url = json?.data?.url
      if (!res.ok || !url) {
        setError(isKo ? '링크를 만들지 못했어요.' : 'Could not create a link.')
        return null
      }
      shareUrlRef.current = url
      return url
    } catch (err) {
      logger.error('[ShareCompat] link create failed', err instanceof Error ? err : undefined)
      setError(isKo ? '네트워크 오류가 발생했어요.' : 'A network error occurred.')
      return null
    }
  }, [isKo, data, allowInvite, inviter])

  // 링크 공유 — 토큰 발급 후 Web Share(url) 또는 클립보드 복사로 폴백.
  const handleShareLink = useCallback(async () => {
    if (linkBusyRef.current) return
    linkBusyRef.current = true
    setError(null)
    setLinkPhase('creating')
    try {
      const url = await createShareUrl()
      if (!url) return
      // 계측 분리 — 링크 공유(가장 바이럴)를 이미지 저장과 따로 잰다. 어느 경로가
      // 실제 재유입을 만드는지 알아야 다음 최적화 방향이 잡힌다.
      trackFunnel('compat_free.share_link')
      const shareText = data.verdict || `${data.nameA} ♥ ${data.nameB}`
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({
            title: isKo ? 'DestinyPal 궁합' : 'DestinyPal Compatibility',
            text: shareText,
            url,
          })
          return
        } catch (err) {
          if ((err as Error & { name?: string })?.name === 'AbortError') return
          // 공유 취소가 아니면 클립보드 복사로 폴백.
        }
      }
      try {
        await navigator.clipboard.writeText(url)
        setLinkPhase('copied')
        setTimeout(() => setLinkPhase('idle'), 2000)
        return
      } catch {
        setError(isKo ? `링크: ${url}` : `Link: ${url}`)
      }
    } finally {
      linkBusyRef.current = false
      setLinkPhase((p) => (p === 'creating' ? 'idle' : p))
    }
  }, [createShareUrl, data, isKo])

  // 카톡으로 공유 — 토큰 발급 후 카카오 피드 카드 전송(제목/설명/OG 이미지/버튼).
  // 한국 바이럴의 핵심 채널. SDK 실패 시 클립보드 복사로 폴백해 흐름이 끊기지 않게 한다.
  const handleShareKakao = useCallback(async () => {
    if (linkBusyRef.current) return
    linkBusyRef.current = true
    setError(null)
    setKakaoPhase('creating')
    try {
      const url = await createShareUrl()
      if (!url) return
      trackFunnel('compat_free.share_kakao')
      const ok = await shareToKakao({
        title: isKo ? 'DestinyPal 궁합' : 'DestinyPal Compatibility',
        description: data.verdict || `${data.nameA} ♥ ${data.nameB}`,
        // 공개 OG 이미지(/r/{token}/opengraph-image) — 카톡 서버가 크롤 가능한 https.
        imageUrl: `${url}/opengraph-image`,
        link: url,
        buttonTitle: isKo ? '나도 궁합 보기' : 'Check your match',
      })
      if (!ok) {
        // SDK 미로드/미설정 등 — 클립보드 복사 폴백.
        try {
          await navigator.clipboard.writeText(url)
          setLinkPhase('copied')
          setTimeout(() => setLinkPhase('idle'), 2000)
        } catch {
          setError(isKo ? `링크: ${url}` : `Link: ${url}`)
        }
      }
    } finally {
      linkBusyRef.current = false
      setKakaoPhase('idle')
    }
  }, [createShareUrl, data, isKo])

  // object URL 누수 방지.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const capture = useCallback(async () => {
    const node = cardRef.current
    if (!node) return
    try {
      // QR(있으면) 을 먼저 디코드해 빈 칸 캡처 방지.
      if (qrDataUrl) {
        await new Promise<void>((res) => {
          const img = new Image()
          img.onload = () => res()
          img.onerror = () => res()
          img.src = qrDataUrl
        })
      }
      // 폰트/레이아웃 안정화를 위해 한 프레임 양보(외부 이미지 의존 없음).
      await new Promise((r) => requestAnimationFrame(() => r(null)))
      const out = await htmlToImage.toBlob(node, {
        width: COMPAT_SHARE_CARD_SIZE,
        height: COMPAT_SHARE_CARD_SIZE,
        pixelRatio: 1,
        cacheBust: true,
        backgroundColor: '#070a1a',
      })
      if (!out) throw new Error('toBlob returned null')
      const url = URL.createObjectURL(out)
      setBlob(out)
      setPreviewUrl(url)
      setPhase('preview')
    } catch (err) {
      logger.error('[ShareCompat] capture failed', err instanceof Error ? err : undefined)
      setError(
        isKo
          ? '이미지를 만들지 못했어요. 다시 시도해 주세요.'
          : 'Could not create the image. Please try again.'
      )
      setPhase('idle')
    }
  }, [isKo, qrDataUrl])

  // 'rendering' 단계에서 카드가 DOM 에 마운트된 뒤 캡처.
  useEffect(() => {
    if (phase !== 'rendering') return
    let cancelled = false
    void (async () => {
      await new Promise((r) => setTimeout(r, 30))
      if (!cancelled) await capture()
    })()
    return () => {
      cancelled = true
    }
  }, [phase, capture])

  const onClickShare = async () => {
    setError(null)
    trackFunnel('compat_free.share_clicked')
    // 캡처 전에 QR 을 먼저 만들어 카드에 실어 보낸다(무료 궁합 진입점으로 유입).
    setQrDataUrl(await makeShareQr('/compatibility/free?s=card'))
    setPhase('rendering')
  }

  const closeModal = () => {
    setPhase('idle')
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setBlob(null)
    setError(null)
    setLinkPhase('idle')
    linkBusyRef.current = false
  }

  const filename = `destinypal-compat-${data.nameA}-${data.nameB}.png`

  const handleNativeShare = async () => {
    if (!blob) return
    const file = new File([blob], filename, { type: 'image/png' })
    const shareData: ShareData = {
      files: [file],
      title: isKo ? 'DestinyPal 궁합 결과' : 'Our DestinyPal Compatibility',
      text: data.verdict || `${data.nameA} ♥ ${data.nameB}`,
    }
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share(shareData)
        trackFunnel('compat_free.share_image')
        return
      }
    } catch (err) {
      const name = (err as Error & { name?: string })?.name
      if (name === 'AbortError') return
      logger.error('[ShareCompat] native share failed', err instanceof Error ? err : undefined)
    }
    handleDownload()
  }

  const handleDownload = () => {
    if (!previewUrl) return
    trackFunnel('compat_free.share_image')
    const a = document.createElement('a')
    a.href = previewUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          onClick={onClickShare}
          disabled={phase === 'rendering'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 24px',
            borderRadius: 999,
            background: '#e8cc8a',
            color: '#1a1305',
            border: 'none',
            fontSize: 15,
            fontWeight: 700,
            cursor: phase === 'rendering' ? 'wait' : 'pointer',
          }}
        >
          {phase === 'rendering' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Share2 className="w-4 h-4" />
          )}
          {phase === 'rendering'
            ? isKo
              ? '미리보기 만드는 중…'
              : 'Preparing preview…'
            : isKo
              ? '결과 공유하기'
              : 'Share result'}
        </button>
        {error && phase !== 'preview' ? (
          <span style={{ fontSize: 12, color: '#fda4af', textAlign: 'center' }}>{error}</span>
        ) : null}
      </div>

      {/* 캡처용 화면 밖 카드 — rendering/preview 동안만 마운트. */}
      {phase !== 'idle' ? (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            top: 0,
            left: -99999,
            width: COMPAT_SHARE_CARD_SIZE,
            height: COMPAT_SHARE_CARD_SIZE,
            pointerEvents: 'none',
            opacity: 0,
            zIndex: -1,
          }}
        >
          <CompatShareCard ref={cardRef} data={{ ...data, qrDataUrl }} />
        </div>
      ) : null}

      {/* 미리보기 모달 */}
      {phase === 'preview' && previewUrl ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(7, 9, 26, 0.88)', backdropFilter: 'blur(6px)' }}
          onClick={closeModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm rounded-2xl border p-5"
            style={{
              background: 'rgba(17, 24, 39, 0.95)',
              borderColor: 'rgba(212,181,114,0.35)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            }}
          >
            <button
              type="button"
              onClick={closeModal}
              aria-label={isKo ? '닫기' : 'Close'}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-slate-700 transition-colors"
              style={{ background: 'rgba(30,41,59,0.9)', color: '#e2e8f0' }}
            >
              <X className="w-4 h-4" />
            </button>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={isKo ? '공유 카드 미리보기' : 'Share card preview'}
              className="w-full rounded-xl mb-4"
              style={{ aspectRatio: '1 / 1', objectFit: 'cover' }}
            />

            {/* 켜면 링크에 내 출생정보가 실려, 친구가 자기 생일만 넣고 바로
                "우리 궁합"을 본다(2-player 프리필). 기본 ON — 문구에 포함 사실을
                명시하고 체크박스로 언제든 끌 수 있다. */}
            {inviter ? (
              <label
                className="flex items-start gap-2 mb-3 text-xs cursor-pointer"
                style={{ color: '#b9a8e6' }}
              >
                <input
                  type="checkbox"
                  checked={allowInvite}
                  onChange={(e) => setAllowInvite(e.target.checked)}
                  className="mt-0.5 accent-[#e8cc8a]"
                />
                <span>
                  {isKo
                    ? '친구가 나와의 궁합을 바로 보게 하기 (내 생년월일이 링크에 포함돼요)'
                    : 'Let friends check their match with me (your birth date is included in the link)'}
                </span>
              </label>
            ) : null}

            {/* 카톡으로 공유 — 한국 바이럴의 핵심 채널. 받는 사람이 카톡에서
                바로 예쁜 카드 + "나도 궁합 보기" 버튼을 본다. 키가 설정된
                환경에서만 노출(미설정이면 링크/이미지 공유로 폴백). */}
            {kakaoAvailable ? (
              <button
                type="button"
                onClick={() => void handleShareKakao()}
                disabled={kakaoPhase === 'creating' || linkPhase === 'creating'}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed mb-2"
                style={{ background: '#FEE500', color: '#191600' }}
              >
                {kakaoPhase === 'creating' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MessageCircle className="w-4 h-4" />
                )}
                {kakaoPhase === 'creating'
                  ? isKo
                    ? '카톡 여는 중…'
                    : 'Opening Kakao…'
                  : isKo
                    ? '카카오톡으로 공유'
                    : 'Share on KakaoTalk'}
              </button>
            ) : null}

            {/* 링크로 공유 — 받는 사람이 한 번 탭하면 우리 사이트로(가장 바이럴). */}
            <button
              type="button"
              onClick={() => void handleShareLink()}
              disabled={linkPhase === 'creating'}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed mb-2"
              style={{ background: '#e8cc8a', color: '#1a1305' }}
            >
              {linkPhase === 'creating' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : linkPhase === 'copied' ? (
                <Check className="w-4 h-4" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              {linkPhase === 'creating'
                ? isKo
                  ? '링크 만드는 중…'
                  : 'Creating link…'
                : linkPhase === 'copied'
                  ? isKo
                    ? '링크 복사됨!'
                    : 'Link copied!'
                  : isKo
                    ? '링크로 공유'
                    : 'Share link'}
            </button>
            {error ? (
              <p className="mb-2 text-[11px] text-center text-rose-300/80">{error}</p>
            ) : null}

            <div className="flex gap-2">
              {canNativeShare ? (
                <button
                  type="button"
                  onClick={() => void handleNativeShare()}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{ background: '#e8cc8a', color: '#1a1305' }}
                >
                  <Share2 className="w-4 h-4" />
                  {isKo ? '이미지 공유' : 'Share image'}
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={{
                  background: canNativeShare ? 'rgba(212,181,114,0.14)' : '#e8cc8a',
                  border: '1px solid rgba(212,181,114,0.4)',
                  color: canNativeShare ? '#e8cc8a' : '#1a1305',
                }}
              >
                <Download className="w-4 h-4" />
                {isKo ? '이미지 저장' : 'Save image'}
              </button>
            </div>
            <p className="mt-3 text-[11px] text-center" style={{ color: '#9aa3b8' }}>
              {isKo
                ? '저장한 이미지를 인스타그램 스토리·피드나 카카오톡에 올려보세요.'
                : 'Post the saved image to Instagram or share it on any app.'}
            </p>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default ShareCompatibilityButton
