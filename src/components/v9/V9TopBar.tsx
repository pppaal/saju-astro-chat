/**
 * 안쪽 화면(인생 흐름 · 캘린더) 상단 바 — 뒤로 · 제목 · 사람 칩('1997.3.21 · Seoul' + 일간
 * 원판). 뒤로는 backHref 링크(기본 '/'), onBack 을 주면 버튼(클라이언트 트리 안에서만).
 * 사람 칩을 누르면 출생 정보 편집(onWho)으로 — 없으면 정적 칩. 서버·클라이언트 공용.
 */

import Link from 'next/link'
import ElementTile from './ElementTile'
import { CHROME, pick, type ElementKey, type Lang } from './v9Copy'
import s from './V9TopBar.module.css'

interface V9TopBarProps {
  title: string
  locale: Lang
  backHref?: string
  onBack?: () => void
  /** 사람 칩 — stamp 는 formatBirthStamp(info, locale, { time: false }). */
  who?: { stamp: string; dayMaster?: { stem: string; element: ElementKey } } | null
  /** 칩을 누르면(출생 정보 편집). 없으면 정적 칩. */
  onWho?: () => void
  whoLabel?: string
  className?: string
}

function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  )
}

export default function V9TopBar({
  title,
  locale,
  backHref = '/',
  onBack,
  who,
  onWho,
  whoLabel,
  className,
}: V9TopBarProps) {
  const backLabel = pick(CHROME.back, locale)
  const chip = who ? (
    <>
      <span className={s.dt}>{who.stamp}</span>
      {who.dayMaster ? (
        <ElementTile
          char={who.dayMaster.stem}
          element={who.dayMaster.element}
          size="xs"
          keyRing
          className={s.dm}
        />
      ) : null}
    </>
  ) : null
  return (
    <header className={[s.top, className].filter(Boolean).join(' ')} data-v9-topbar="">
      {onBack ? (
        <button type="button" className={s.back} onClick={onBack} aria-label={backLabel}>
          <BackIcon />
        </button>
      ) : (
        <Link href={backHref} className={s.back} aria-label={backLabel}>
          <BackIcon />
        </Link>
      )}
      {/* 페이지 제목(h1)은 본문 히어로가 갖는다 — 바의 제목은 위치 표시. */}
      <span className={s.title}>{title}</span>
      {chip ? (
        onWho ? (
          <button
            type="button"
            className={s.who}
            onClick={onWho}
            aria-label={whoLabel ?? who?.stamp}
          >
            {chip}
          </button>
        ) : (
          <span className={s.who} data-who="">
            {chip}
          </span>
        )
      ) : null}
    </header>
  )
}
