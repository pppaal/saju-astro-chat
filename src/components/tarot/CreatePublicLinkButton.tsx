'use client'

/**
 * CreatePublicLinkButton — 저장된 리딩을 공개 링크(/r/[token])로 만든다.
 * 클릭 → POST /api/tarot/share → 공개 URL 발급 + 클립보드 복사 + (가능하면)
 * Web Share. 이미지 공유(ShareTarotButton)와 달리 *링크 미리보기(OG)* 로
 * 퍼지는 채널 — 카톡/엑스에서 썸네일과 함께 퍼져 클릭 유입을 만든다.
 *
 * readingId 가 있을 때(로그인 + 저장 완료)만 노출된다 — 게스트/미저장 X.
 */

import { useCallback, useState } from 'react'
import { Link2, Check, Loader2, Share2 } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { copyToClipboard } from '@/lib/utils/clipboard'
import { tarotLogger } from '@/lib/logger'

interface Props {
  readingId: string
  language: string
}

export function CreatePublicLinkButton({ readingId, language }: Props) {
  const isKo = language === 'ko'
  const [loading, setLoading] = useState(false)
  const [publicUrl, setPublicUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await apiFetch('/api/tarot/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readingId }),
      })
      const json = (await res.json().catch(() => null)) as {
        data?: { shareUrl?: string }
        shareUrl?: string
      } | null
      const url = json?.data?.shareUrl || json?.shareUrl
      if (!res.ok || !url) {
        setError(
          isKo
            ? '공개 링크를 만들지 못했어요. 잠시 후 다시 시도해 주세요.'
            : 'Could not create the public link. Please try again.'
        )
        return
      }
      setPublicUrl(url)
      const ok = await copyToClipboard(url)
      if (ok) {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1800)
      }
    } catch (err) {
      tarotLogger.error('[CreatePublicLink] failed', err instanceof Error ? err : undefined)
      setError(isKo ? '네트워크 오류가 발생했어요.' : 'A network error occurred.')
    } finally {
      setLoading(false)
    }
  }, [readingId, isKo])

  const nativeShare = useCallback(async () => {
    if (!publicUrl) return
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: isKo ? 'DestinyPal 타로 리딩' : 'My DestinyPal Tarot Reading',
          url: publicUrl,
        })
        return
      } catch {
        /* 취소/미지원 — 복사로 폴백 */
      }
    }
    const ok = await copyToClipboard(publicUrl)
    if (ok) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }
  }, [publicUrl, isKo])

  if (publicUrl) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs max-w-full"
          style={{ background: 'rgba(212,181,114,0.1)', border: '1px solid rgba(212,181,114,0.3)' }}
        >
          <Link2 className="w-3.5 h-3.5 shrink-0" style={{ color: '#e8cc8a' }} />
          <span className="truncate" style={{ color: '#e8cc8a', maxWidth: 220 }}>
            {publicUrl.replace(/^https?:\/\//, '')}
          </span>
          <button
            type="button"
            onClick={() => void nativeShare()}
            className="ml-1 inline-flex items-center gap-1 px-2 py-1 rounded-full"
            style={{ background: '#e8cc8a', color: '#1a1305' }}
          >
            {copied ? <Check className="w-3 h-3" /> : <Share2 className="w-3 h-3" />}
            {copied ? (isKo ? '복사됨' : 'Copied') : isKo ? '공유' : 'Share'}
          </button>
        </div>
        <span className="text-[11px]" style={{ color: '#9aa3b8' }}>
          {isKo
            ? '링크를 받은 친구가 가입하면 둘 다 무료 크레딧을 받아요.'
            : 'When a friend signs up via your link, you both get free credits.'}
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => void create()}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: 'rgba(212,181,114,0.14)',
          border: '1px solid rgba(212,181,114,0.4)',
          color: '#e8cc8a',
        }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
        {loading
          ? isKo
            ? '링크 만드는 중…'
            : 'Creating link…'
          : isKo
            ? '공개 링크로 공유'
            : 'Share as public link'}
      </button>
      {error && <span className="text-[11px] text-rose-300/80 text-center max-w-xs">{error}</span>}
    </div>
  )
}
