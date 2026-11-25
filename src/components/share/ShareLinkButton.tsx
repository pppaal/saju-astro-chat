'use client'

/**
 * ShareLinkButton — 공개 링크 공유 버튼 하나(useShareLink + 버튼 UI).
 *
 * variant
 *  - 'pill' (기본): 지금 다크 화면의 골드 알약. tone 'gold' | 'brass', size 'md' | 'sm'.
 *  - 'line': v9 btn line(size 'sm' = 40px). 'row': v9 lrow(라벨 + 보조 줄 + 끝 화살표).
 *    line·row 는 V9Root 안에서만 쓴다(토큰).
 *
 * 문구(label·copiedLabel 등)는 호출부가 ko/en 을 골라 넘긴다.
 */

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Check, Link as LinkIcon, Loader2, Share2 } from 'lucide-react'
import { useShareLink, type UseShareLinkOptions } from '@/lib/share/useShareLink'
import styles from './ShareLinkButton.module.css'

export type ShareLinkButtonVariant = 'pill' | 'line' | 'row'

export interface ShareLinkButtonProps {
  /** 링크 발급·공유 설정 — useShareLink 옵션 그대로. */
  link: UseShareLinkOptions
  label: string
  copiedLabel: string
  /** 발급 중 라벨(선택). 없으면 라벨은 그대로 두고 아이콘만 스피너로. */
  creatingLabel?: string
  variant?: ShareLinkButtonVariant
  size?: 'md' | 'sm'
  /** pill 색 — 'gold'(기본) | 'brass'(추천 초대). */
  tone?: 'gold' | 'brass'
  /** pill·line 앞 아이콘. 기본 pill = Share2, line = Link. row 는 끝 화살표 고정. */
  icon?: LucideIcon
  /** row 의 보조 한 줄. */
  sub?: string
  /** 버튼 아래 안내 한 줄(pill) — 추천 보상 안내 등. */
  caption?: ReactNode
  /** 감싸개 div 에 덧붙일 클래스(배치용). */
  className?: string
}

function cx(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ')
}

/** v9 화살표(lrow) — 디자인 원본의 ARROW 글리프. */
function RowArrow() {
  return (
    <svg
      className={styles.rowIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

export function ShareLinkButton({
  link,
  label,
  copiedLabel,
  creatingLabel,
  variant = 'pill',
  size = 'md',
  tone = 'gold',
  icon,
  sub,
  caption,
  className,
}: ShareLinkButtonProps) {
  const { phase, error, share } = useShareLink(link)
  const creating = phase === 'creating'
  const text = phase === 'copied' ? copiedLabel : creating && creatingLabel ? creatingLabel : label
  const onClick = () => void share()

  if (variant === 'row') {
    return (
      <div className={cx(styles.block, className)}>
        <button
          type="button"
          className={styles.row}
          onClick={onClick}
          disabled={creating}
          aria-busy={creating || undefined}
        >
          <span className={styles.rowText}>
            <span className={styles.rowLabel}>{text}</span>
            {sub ? <span className={styles.rowSub}>{sub}</span> : null}
          </span>
          {creating ? (
            <Loader2 className={cx(styles.rowIcon, styles.spin)} aria-hidden="true" />
          ) : phase === 'copied' ? (
            <Check className={styles.rowIcon} aria-hidden="true" />
          ) : (
            <RowArrow />
          )}
        </button>
        {error ? (
          <span className={styles.v9Error} role="status">
            {error}
          </span>
        ) : null}
      </div>
    )
  }

  const Icon = icon ?? (variant === 'line' ? LinkIcon : Share2)
  const buttonClass =
    variant === 'line'
      ? cx(styles.line, size === 'sm' && styles.sm)
      : cx(styles.pill, tone === 'brass' ? styles.brass : styles.gold, size === 'sm' && styles.sm)

  return (
    <div
      className={cx(
        variant === 'line' ? styles.block : styles.stack,
        variant === 'pill' && size === 'sm' && styles.sm,
        className
      )}
    >
      <button
        type="button"
        className={buttonClass}
        onClick={onClick}
        disabled={creating}
        aria-busy={creating || undefined}
      >
        {creating ? (
          <Loader2 className={cx(styles.icon, styles.spin)} aria-hidden="true" />
        ) : phase === 'copied' ? (
          <Check className={styles.icon} aria-hidden="true" />
        ) : (
          <Icon className={styles.icon} aria-hidden="true" />
        )}
        {text}
      </button>
      {caption && variant === 'pill' ? <p className={styles.caption}>{caption}</p> : null}
      {error ? (
        <span className={variant === 'line' ? styles.v9Error : styles.error} role="status">
          {error}
        </span>
      ) : null}
    </div>
  )
}

export default ShareLinkButton
