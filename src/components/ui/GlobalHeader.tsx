'use client'

import { Suspense, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useI18n } from '@/i18n/I18nProvider'
import { normalizePath, shouldShowGlobalHeader } from '@/lib/routing/chromeRoutes'
import { AppHeader, AppHeaderIconButton } from './AppHeader'
import { MenuDrawerPanel } from './MenuDrawerPanel'

// 비-메인/비-상담사/비-타로 페이지(블로그·정책·FAQ·요금제 등)의 상단 헤더.
// 메인/타로/운명상담사/궁합과 동일한 공용 AppHeader 컴포넌트를 사용해서
// 햄버거(왼쪽) + 워드마크(가운데) + EN/KO 토글(오른쪽)이 모든 페이지에서
// 같은 X 좌표에 위치하도록 통일한다. 드로어 내용은 MenuDrawerPanel 이
// 위임받아 처리(타로 경로일 땐 자동으로 "타로 리딩 기록" 항목 추가).

function GlobalHeaderContent() {
  const { locale, setLocale } = useI18n()
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const isKo = locale === 'ko'
  const nextLocaleLabel = isKo ? 'EN' : 'KO'
  const localeAriaLabel = isKo ? 'Switch to English' : '한국어로 전환'

  // 자기 상단 네비를 가진 페이지(홈·인생 흐름·캘린더 v9 화면, 타로·상담사, 관리자)
  // 에서는 글로벌 헤더를 숨긴다 — 두 헤더가 겹쳐 보이는 사고 방지. 경로 목록과
  // /ko 프리픽스 처리는 lib/routing/chromeRoutes 한곳에서 관리한다.
  if (!shouldShowGlobalHeader(pathname)) {
    return null
  }

  // 라이트 페이지 위에 떴을 땐 ink 톤(흰 배경) 으로, 다크 cosmic 페이지에선
  // cosmic 변형(투명 배경). AppHeader 의 theme 토큰으로 직접 전달.
  const path = normalizePath(pathname)
  const LIGHT_PAGE_PREFIXES = ['/profile', '/compatibility', '/policy', '/contact']
  const isLightPage = LIGHT_PAGE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))
  const theme: 'cosmic' | 'light' = isLightPage ? 'light' : 'cosmic'
  const drawerVariant: 'dark' | 'light' = isLightPage ? 'light' : 'dark'

  return (
    <>
      {/* fixed 컨테이너로 viewport 상단에 고정. AppHeader 자체는 layout:home 으로
          max-w 860 가운데 정렬 → 메인 페이지 햄버거와 정확히 같은 X 좌표. */}
      <div
        className="fixed top-0 inset-x-0 z-[var(--z-sticky-header)]"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
        role="banner"
      >
        <AppHeader
          layout="home"
          theme={theme}
          onMenuClick={() => setDrawerOpen(true)}
          menuLabel={isKo ? '메뉴 열기' : 'Open menu'}
          centerSlot="DestinyPal"
          rightSlot={
            // 접근성 이름 = 보이는 글자(KO/EN) + 숨긴 설명(HomeNav 와 같은 규칙) — 음성 제어로 'KO' 를
            // 불러도 눌리고(WCAG 2.5.3), 설명은 바꿀 언어로 읽히게 lang 을 단다(3.1.2, QA R-CA-6).
            <AppHeaderIconButton onClick={() => setLocale(isKo ? 'en' : 'ko')} isText>
              {nextLocaleLabel}
              <span className="sr-only" lang={isKo ? 'en' : 'ko'}>
                {' '}
                {localeAriaLabel}
              </span>
            </AppHeaderIconButton>
          }
        />
      </div>

      <MenuDrawerPanel
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        locale={locale === 'ko' ? 'ko' : 'en'}
        variant={drawerVariant}
      />
    </>
  )
}

// Suspense fallback — 헤더 영역의 reserved 공간만 표시(레이아웃 점프 방지).
function GlobalHeaderSkeleton() {
  return (
    <div
      className="fixed top-0 inset-x-0 z-[var(--z-sticky-header)] h-12"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
      role="banner"
      aria-busy="true"
      aria-label="Loading header"
    />
  )
}

export default function GlobalHeader() {
  return (
    <Suspense fallback={<GlobalHeaderSkeleton />}>
      <GlobalHeaderContent />
    </Suspense>
  )
}
