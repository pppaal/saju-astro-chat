'use client'

/* ============================================================
   destinypal · Topbar — 상단 최소 크롬(메뉴 · 본명 한 줄 · 언어 토글).
   ────────────────────────────────────────────────────────────
   예전엔 브랜드 워드마크("destinypal") + 생년월일 + "1달의 흐름 MONTHLY ·
   30일" 티어명까지 넣어 두 줄로 감싸며 티어 자체 헤더(eyebrow "2026년 7월",
   후크)와 겹쳐 상단이 3겹이 됐다(감사: 사용자 불만). 정보는 티어 헤더와
   레일이 이미 다 말해주므로 topbar 는 기능 요소만 남긴다:
     · 햄버거 메뉴 (캘린더는 몰입형이라 글로벌 헤더가 숨음 — 자체 제공)
     · 본명 한 줄 ("다른 사람 보기"일 때 누구 차트인지 확인용 — 작게)
     · 언어 토글
   ============================================================ */

import { useState } from 'react'
import styles from '../styles/shell.module.css'
import { useI18n } from '@/i18n/I18nProvider'
import { MenuDrawerPanel } from '@/components/ui/MenuDrawerPanel'

export interface DestinypalTopbarProps {
  whoBirthLine: string
  place: string
  ilganHanja: string
}

export function DestinypalTopbar({ whoBirthLine, place, ilganHanja }: DestinypalTopbarProps) {
  const { locale, setLocale } = useI18n()
  const ko = locale === 'ko'
  const [drawerOpen, setDrawerOpen] = useState(false)
  return (
    <div className={styles.topbar}>
      <div className={styles.brand}>
        {/* 메뉴 — 캘린더는 몰입형이라 글로벌 헤더를 숨겨, 햄버거를 자체 제공한다. */}
        <button
          type="button"
          className={styles.menuBtn}
          onClick={() => setDrawerOpen(true)}
          aria-label={ko ? '메뉴 열기' : 'Open menu'}
        >
          <span />
          <span />
          <span />
        </button>
        <span className={styles.brandWho}>
          {whoBirthLine} · {place} · {ilganHanja}
        </span>
      </div>
      {/* 언어 토글 — 캘린더는 몰입형이라 글로벌 헤더를 숨겨, 토글을 자체 제공한다. */}
      <button
        type="button"
        className={styles.localeToggle}
        onClick={() => setLocale(ko ? 'en' : 'ko')}
        aria-label={ko ? 'Switch to English' : '한국어로 전환'}
      >
        {ko ? 'EN' : 'KO'}
      </button>
      {/* 한지 톤이라 light variant 드로어. */}
      <MenuDrawerPanel
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        locale={ko ? 'ko' : 'en'}
        variant="light"
      />
    </div>
  )
}
