'use client'

/**
 * ShareImageModal — useShareCardImage 의 미리보기 모달.
 * 캡처한 PNG 를 보여 주고 [링크로 공유](선택) · [이미지 공유](Web Share 지원 시) ·
 * [이미지 저장] 을 고르게 한다. 호출부가 phase === 'preview' 일 때만 마운트한다.
 * 바깥(막)을 누르거나 Esc 로 닫힌다.
 */

import { useEffect } from 'react'
import { Check, Download, Link2, Loader2, Share2, X } from 'lucide-react'
import type { ShareLinkPhase } from '@/lib/share/useShareLink'
import styles from './ShareImageModal.module.css'

export interface ShareImageModalLink {
  phase: ShareLinkPhase
  error: string | null
  onShare: () => void
}

export interface ShareImageModalProps {
  isKo: boolean
  /** useShareCardImage().previewUrl */
  previewUrl: string
  onClose: () => void
  onNativeShare: () => void
  onDownload: () => void
  /** useShareCardImage().canNativeShare — 없으면 [이미지 공유] 를 숨기고 저장을 주 버튼으로. */
  canNativeShare: boolean
  /** 모달 안 [링크로 공유] — useShareLink 의 phase/error/share. 없으면 숨김. */
  link?: ShareImageModalLink
  /** 미리보기 비율 — 기본 '1 / 1'. */
  aspectRatio?: string
  /** 아래 안내 한 줄(선택) — 기본은 인스타·카톡 안내. */
  hint?: string
}

function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ')
}

export function ShareImageModal({
  isKo,
  previewUrl,
  onClose,
  onNativeShare,
  onDownload,
  canNativeShare,
  link,
  aspectRatio = '1 / 1',
  hint,
}: ShareImageModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const linkPhase = link?.phase ?? 'idle'

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={isKo ? '공유 카드 미리보기' : 'Share card preview'}
      onClick={onClose}
    >
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label={isKo ? '닫기' : 'Close'}
        >
          <X className={styles.icon} aria-hidden="true" />
        </button>

        {/* eslint-disable-next-line @next/next/no-img-element -- object URL 미리보기 */}
        <img
          src={previewUrl}
          alt={isKo ? '공유 카드 미리보기' : 'Share card preview'}
          className={styles.preview}
          style={{ aspectRatio }}
        />

        {link ? (
          <>
            <button
              type="button"
              className={cx(styles.btn, styles.primary, styles.linkBtn)}
              onClick={link.onShare}
              disabled={linkPhase === 'creating'}
            >
              {linkPhase === 'creating' ? (
                <Loader2 className={cx(styles.icon, styles.spin)} aria-hidden="true" />
              ) : linkPhase === 'copied' ? (
                <Check className={styles.icon} aria-hidden="true" />
              ) : (
                <Link2 className={styles.icon} aria-hidden="true" />
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
            {link.error ? (
              <p className={styles.error} role="status">
                {link.error}
              </p>
            ) : null}
          </>
        ) : null}

        <div className={styles.actions}>
          {canNativeShare ? (
            <button
              type="button"
              className={cx(styles.btn, styles.primary)}
              onClick={onNativeShare}
            >
              <Share2 className={styles.icon} aria-hidden="true" />
              {isKo ? '이미지 공유' : 'Share image'}
            </button>
          ) : null}
          <button
            type="button"
            className={cx(styles.btn, canNativeShare ? styles.secondary : styles.primary)}
            onClick={onDownload}
          >
            <Download className={styles.icon} aria-hidden="true" />
            {isKo ? '이미지 저장' : 'Save image'}
          </button>
        </div>
        <p className={styles.hint}>
          {hint ??
            (isKo
              ? '저장한 이미지를 인스타그램 스토리·피드나 카카오톡에 올려보세요.'
              : 'Post the saved image to Instagram or share it on any app.')}
        </p>
      </div>
    </div>
  )
}
