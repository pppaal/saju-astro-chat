'use client'

// 공용 페이지 셸 — 메인/타로/운명상담사/궁합이 같은 껍데기를 공유해서 라우트
// 전환이 끊기지 않도록(Spotify/Linear 식). 페이지가 다를 때 바뀌는 건 액센트
// 레이어 + body 안 콘텐츠뿐. 셸이 책임지는 것:
//   - cosmic gradient backdrop (같은 톤 → root cross-fade 자연스러움)
//   - AppHeader (viewTransitionName="app-topbar" → 헤더가 페이지간 morph)
//   - MenuDrawerPanel (햄버거 드로어)
//   - 본문 컨테이너 (max-w 860px, safe-area, padding-top 헤더 오프셋)
// 셸이 책임지지 않는 것:
//   - 히어로/콘텐츠 — children 으로 받음
//   - 페이지별 액센트 (타로 골드 오브 등) — accentLayer 로 받음
//   - 입력창/모달 등 페이지 고유 UI — children 안에서 직접 렌더

import { useState, type ReactNode } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import { AppHeader, AppHeaderIconButton } from './AppHeader'
import { CosmicBackdrop } from './CosmicBackdrop'
import { MenuDrawerPanel } from './MenuDrawerPanel'

export interface AppShellProps {
  /**
   * 본문 콘텐츠. body container(max-w 860, flex col) 안에 그대로 렌더.
   * 히어로 / ChatInputArea / 페이지별 UI 를 자유롭게 배치.
   */
  children: ReactNode
  /**
   * 페이지별 액센트 레이어 — cosmic backdrop 위, 콘텐츠 아래에 깔림. 예: 타로
   * 골드 오브, 운명상담사의 특정 글로우. 미지정 시 cosmic backdrop 만 보임.
   * absolute 포지셔닝된 노드를 넘기되, 컨테이너가 inset-0/overflow-hidden/
   * pointer-events-none 을 이미 잡아주므로 안쪽은 자유.
   */
  accentLayer?: ReactNode
  /**
   * 헤더 가운데 슬롯 — 기본 'DestinyPal' 워드마크. JSX 도 가능.
   */
  headerCenterSlot?: ReactNode
  /**
   * 헤더 우측 슬롯 — 미지정 시 EN/KO 토글이 자동으로 들어감. 페이지에 추가
   * 컨트롤(예: CreditBadge)을 같이 넣고 싶을 땐 직접 구성해서 넘김.
   */
  headerRightSlot?: ReactNode
  /**
   * 셸 톤. 'cosmic' = 어두운 우주 배경(메인 로그아웃·타로). 'light' = 메인
   * premium-white 모드. 기본 'cosmic'.
   */
  theme?: 'cosmic' | 'light'
  /**
   * 본문 컨테이너 최대 폭. 기본 860px — 운명상담사 chatMain 폭과 픽셀 단위로
   * 통일. 이 폭이 같아야 메인↔상담사 입력창이 cross-fade 중 끊겨 보이지 않음.
   * 숫자(px) 또는 CSS 길이(string) 둘 다 허용.
   */
  bodyMaxWidth?: number | string
  /**
   * (선택) body container 의 className 을 전부 갈아끼울 때. 기본 className 이
   * 거의 모든 페이지에 맞지만, 패딩/정렬을 페이지 단위로 조정해야 할 땐 넘김.
   */
  bodyClassName?: string
}

/**
 * 메인/타로/운명상담사/궁합 — 같은 셸 + 다른 콘텐츠 패턴.
 *
 * @example
 *   <AppShell accentLayer={<TarotGoldOrb />}>
 *     <TarotHero />
 *     <ChatInputArea ... />
 *   </AppShell>
 */
export function AppShell({
  children,
  accentLayer,
  headerCenterSlot = 'DestinyPal',
  headerRightSlot,
  theme = 'cosmic',
  bodyMaxWidth = 860,
  bodyClassName,
}: AppShellProps) {
  const { locale, setLocale } = useI18n()
  const isKo = locale === 'ko'
  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawerLocale: 'en' | 'ko' = isKo ? 'ko' : 'en'

  // 우측 슬롯이 안 들어왔으면 EN/KO 토글이 기본값으로 깔린다(메인/타로와 동일).
  const resolvedRightSlot =
    headerRightSlot ?? (
      <AppHeaderIconButton
        onClick={() => setLocale(isKo ? 'en' : 'ko')}
        label={isKo ? 'Switch to English' : '한국어로 전환'}
        isText
      >
        {isKo ? 'EN' : 'KO'}
      </AppHeaderIconButton>
    )

  const maxWidthValue = typeof bodyMaxWidth === 'number' ? `${bodyMaxWidth}px` : bodyMaxWidth

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-x-hidden overflow-y-auto"
      style={{
        backgroundColor: theme === 'cosmic' ? '#07091a' : '#fafaf9',
        color: theme === 'cosmic' ? '#f8fafc' : '#1c1917',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
      }}
    >
      {/* Cosmic gradient backdrop — 같은 톤이 모든 페이지에 깔려야 라우트 전환
          시 root cross-fade 가 끊겨 보이지 않음. light 테마에선 생략.
          AppShell 외 페이지(타로 sub 등)도 같은 컴포넌트를 직접 import 해서
          동일한 backdrop 을 깐다 — 단일 source. */}
      {theme === 'cosmic' && <CosmicBackdrop />}

      {/* 페이지별 액센트 — cosmic backdrop 위에 얹힘. 클릭 통과(pointer-events:none)
          를 컨테이너에서 보장. accentLayer 안쪽 노드는 자기 포지션만 신경쓰면 됨. */}
      {accentLayer && (
        <div
          className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
          aria-hidden
        >
          {accentLayer}
        </div>
      )}

      <AppHeader
        layout="home"
        theme={theme}
        onMenuClick={() => setDrawerOpen(true)}
        menuLabel={isKo ? '메뉴 열기' : 'Open menu'}
        centerSlot={headerCenterSlot}
        rightSlot={resolvedRightSlot}
        viewTransitionName="app-topbar"
      />

      {/* 본문 컨테이너 — 운명상담사 chatMain 과 동일한 860px. 페이지가 직접
          폭/패딩을 다르게 잡고 싶으면 bodyClassName 으로 통째로 교체. */}
      <div
        className={
          bodyClassName ??
          'relative z-10 flex-1 flex flex-col w-full mx-auto px-5 pt-14 md:pt-20 pb-0 min-h-0 box-border'
        }
        style={{ maxWidth: maxWidthValue }}
      >
        {children}
      </div>

      <MenuDrawerPanel
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        locale={drawerLocale}
        variant={theme === 'cosmic' ? 'dark' : 'light'}
      />
    </div>
  )
}
