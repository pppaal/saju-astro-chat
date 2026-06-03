'use client'

import React from 'react'
import styles from './AppHeader.module.css'

type Layout = 'home' | 'counselor'
type Theme = 'cosmic' | 'dark' | 'light'

interface AppHeaderProps {
  /**
   * 'home' — 3-element flex(좌 햄버거 / 가운데 로고 / 우 슬롯), 입력박스와 정렬
   *          되도록 max-width:860px 컨테이너로 가운데 정렬.
   * 'counselor' — 2-column grid(좌 그룹: 햄버거+제목+선택적 chip / 우 슬롯).
   */
  layout: Layout
  /**
   * 'cosmic' — 홈 입자 배경 위 투명 헤더.
   * 'dark'   — 운명 카운슬러(어두운 cosmic surface + backdrop blur).
   * 'light'  — 궁합 카운슬러(흰 surface) / 홈 premium-white 상태.
   */
  theme: Theme
  /** 햄버거(메뉴) 버튼 클릭. */
  onMenuClick: () => void
  /** 햄버거 aria-label. 미지정 시 'Menu'. */
  menuLabel?: string
  /** home 전용 — 가운데 로고/워드마크 (예: "DestinyPal"). */
  centerSlot?: React.ReactNode
  /** counselor 전용 — h1 제목. 문자열 또는 JSX. */
  title?: React.ReactNode
  /** counselor 전용 — 제목 옆 인라인 chip (예: 운명 카운슬러의 "Me ✎"). */
  titleChip?: React.ReactNode
  /** 우측 슬롯 — ⋮ 채팅 메뉴 + CreditBadge, 또는 EN/KO 토글 등. */
  rightSlot?: React.ReactNode
  /** View Transitions 모핑용 (예: 'app-topbar'). */
  viewTransitionName?: string
  /** position:sticky + top:0 — 키보드가 올라와도 헤더가 화면 위에 고정.
   *  궁합 카운슬러에서 사용. */
  sticky?: boolean
}

const layoutClass: Record<Layout, string> = {
  home: styles.layoutHome,
  counselor: styles.layoutCounselor,
}
const themeClass: Record<Theme, string> = {
  cosmic: styles.themeCosmic,
  dark: styles.themeDark,
  light: styles.themeLight,
}

export function AppHeader({
  layout,
  theme,
  onMenuClick,
  menuLabel = 'Menu',
  centerSlot,
  title,
  titleChip,
  rightSlot,
  viewTransitionName,
  sticky = false,
}: AppHeaderProps) {
  const className = [
    styles.header,
    layoutClass[layout],
    themeClass[theme],
    sticky ? styles.sticky : '',
  ]
    .filter(Boolean)
    .join(' ')
  const style = viewTransitionName ? { viewTransitionName } : undefined

  const menuButton = (
    <AppHeaderIconButton onClick={onMenuClick} label={menuLabel}>
      <span aria-hidden="true">{'☰'}</span>
    </AppHeaderIconButton>
  )

  if (layout === 'home') {
    return (
      <div className={className} style={style}>
        {menuButton}
        {centerSlot ? <span className={styles.centerSlot}>{centerSlot}</span> : <span />}
        <span>{rightSlot}</span>
      </div>
    )
  }

  return (
    <header className={className} style={style}>
      <div className={styles.left}>
        {menuButton}
        {title ? <h1 className={styles.title}>{title}</h1> : null}
        {titleChip}
      </div>
      <div className={styles.right}>{rightSlot}</div>
    </header>
  )
}

/**
 * 헤더 내부 아이콘 버튼 (햄버거/⋮/EN 토글 등). 부모 AppHeader 의 variant 가
 * CSS 변수로 색을 주입하므로, 어디에 쓰이든 자동으로 같은 톤이 적용된다.
 *
 * 이 컴포넌트는 AppHeader 의 rightSlot 안에서 쓰는 것을 가정 — 위·아래 정렬과
 * shape(30×30) 가 헤더 내부와 동일해야 chat 메뉴 ⋮ / locale 토글 같은 곳에서
 * 햄버거 버튼과 시각적으로 정확히 일치한다.
 */
export const AppHeaderIconButton = React.forwardRef<
  HTMLButtonElement,
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
    label: string
    /** 텍스트 글리프(예: "EN") 면 살짝 작게 — boolean. */
    isText?: boolean
  }
>(function AppHeaderIconButton({ label, isText = false, className, children, ...rest }, ref) {
  const cls = [styles.iconButton, isText ? styles.iconButtonText : '', className || '']
    .filter(Boolean)
    .join(' ')
  return (
    <button ref={ref} type="button" aria-label={label} title={label} className={cls} {...rest}>
      {children}
    </button>
  )
})
