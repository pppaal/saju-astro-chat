'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import { logger } from '@/lib/logger'
import { clearClientCacheAndSignOut } from '@/lib/auth/clearClientCache'
import styles from './CounselorSidebar.module.css'
import HexDPLogo from '@/components/branding/HexDPLogo'

type SessionItem = {
  id: string
  title?: string | null
  preview?: string | null
  updatedAt?: string | null
  /** API 가 같이 내려주는 세션 meta — destiny: { profile: { name } } /
   *  compat: { persons: [{name}, {name}], ... }. 사이드바 부제 한 줄에 인물
   *  이름을 띄워서 과거 채팅이 누구 정보로 본 거였는지 한눈에 보이게. */
  meta?: {
    profile?: { name?: string | null } | null
    persons?: Array<{ name?: string | null }> | null
  } | null
}

/** 한 채팅 row 의 부제 — destiny: 'Jun' / compat: 'Jun ↔ Yuna'. compat 는
 *  meta.persons 가 없으면 (구버전 데이터) 부제 생략. destiny 는 저장된
 *  profile.name 우선, 없으면 현재 프로필 이름(fallbackName)으로 폴백해서
 *  meta 가 비어 있던 옛 세션도 이름이 한 줄 뜨게 한다. */
function getSessionSubtitle(
  item: SessionItem,
  serviceType: ServiceType,
  fallbackName?: string | null
): string | null {
  const meta = item.meta
  if (serviceType === 'compat') {
    const a = meta?.persons?.[0]?.name?.trim()
    const b = meta?.persons?.[1]?.name?.trim()
    if (a && b) return `${a} ↔ ${b}`
    if (a || b) return (a || b) as string
    return null
  }
  const name = meta?.profile?.name?.trim()
  return name || fallbackName?.trim() || null
}

type ServiceType = 'destiny' | 'compat'

interface CounselorSidebarProps {
  open: boolean
  onClose: () => void
  onNewChat: () => void
  /**
   * Which counselor's chats to list. Default 'destiny' keeps the
   * existing destiny-counselor sidebar behavior identical. Pass
   * 'compat' from the compatibility counselor page to scope the list
   * (and the row-click URL) to its own past chats.
   */
  serviceType?: ServiceType
  /** Where each past-chat row navigates. Defaults to the destiny path. */
  sessionHrefBase?: string
  /**
   * When true the drawer stays permanently visible on desktop widths
   * (≥1024px) and only collapses to a drawer on mobile. The compat page
   * uses this — destiny already has its own always-visible historyRail
   * inside <Chat> and would double up.
   */
  desktopStatic?: boolean
  /** When true, sessions are bucketed Today / Previous 7 Days / Older. */
  enableGrouping?: boolean
  /** Switch to the stone-50 / white palette used on counselor result pages. */
  lightTheme?: boolean
  /** Extra footer content (tarot / chart triggers) rendered above the auth button. */
  footerSlot?: React.ReactNode
  /**
   * destiny 전용 — 세션 meta 에 저장된 profile.name 이 없을 때(meta 가 추가되기
   * 전에 만들어진 옛 세션) 부제에 띄울 현재 프로필 이름. compat 은 무시.
   */
  fallbackName?: string | null
  /**
   * Called when a rename/delete request fails so the parent can surface a
   * toast / notice in the user's locale instead of the old blocking
   * `window.alert()` (jarring on mobile, untranslated, freezes the page).
   * `status` is the HTTP status code if the response came back, or
   * undefined for network errors — parent uses 401 to show a sign-in hint.
   * If the callback is omitted the failure is silently logged (the sidebar
   * still rolls back its own optimistic state for rename; for delete the
   * row is only removed after success, so nothing to roll back).
   */
  onActionError?: (info: { kind: 'rename' | 'delete'; status?: number }) => void
}

const SWIPE_REVEAL_PX = 60 // user must drag this far to lock the swipe-open state
const SWIPE_RESET_PX = 30 // drag back this far to snap closed

export default function CounselorSidebar({
  open,
  onClose,
  onNewChat,
  serviceType = 'destiny',
  sessionHrefBase,
  desktopStatic = false,
  enableGrouping = false,
  lightTheme = false,
  footerSlot,
  onActionError,
  fallbackName,
}: CounselorSidebarProps) {
  const { t } = useI18n()
  const { data: session, status } = useSession()
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [swipedId, setSwipedId] = useState<string | null>(null)
  const swipeStartXRef = useRef<number | null>(null)
  const swipeRowIdRef = useRef<string | null>(null)

  const hrefBase =
    sessionHrefBase ??
    (serviceType === 'compat' ? '/compatibility/counselor' : '/destiny-counselor')

  // Reset transient row state every time the drawer reopens. Without this,
  // a row left in swipe / rename mode from a previous open stays mid-swipe
  // — the title slides 72px off-screen and the user sees only the action
  // icons, which looks like "past chats are gone" even though the data is
  // there. 별도 effect 로 분리 — 데이터 fetch 는 mount 1 회만 하면서
  // transient UI 리셋은 매 open 마다 보장.
  useEffect(() => {
    if (!open) return
    setSwipedId(null)
    setRenamingId(null)
    setRenameValue('')
  }, [open])

  useEffect(() => {
    // 인증된 시점부터 즉시 fetch — open / desktopStatic 무관. 이전엔 open
    // 이 true 가 되는 시점(=햄버거 클릭 직후)에 처음 시작했는데, 모바일에서
    // 클릭 → 빈 화면 → 500ms~2s 후 list 가 갑자기 떠 사용자에게 "버퍼링"
    // 으로 보였다. 페이지 mount 직후부터 백그라운드로 받아두면 첫 클릭 시
    // 이미 데이터 준비 완료 → 즉시 노출. 사이드바를 한 번도 안 열어도 응답
    // 자체가 작아서(메타데이터만, 30 row cap) 낭비 미미.
    if (status !== 'authenticated') return
    let cancelled = false
    setLoadingList(true)
    fetch(`/api/counselor/session/list?limit=30&type=${serviceType}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data?.sessions)
          ? (data.sessions as SessionItem[])
          : Array.isArray(data)
            ? (data as SessionItem[])
            : []
        setSessions(list)
      })
      .catch((e) => logger.warn('[CounselorSidebar] session list failed', { e }))
      .finally(() => {
        if (!cancelled) setLoadingList(false)
      })
    return () => {
      cancelled = true
    }
    // open / desktopStatic 은 의도적으로 deps 에서 빠짐 — 매번 여닫을 때마다
    // 재 fetch 하면 (a) 불필요한 네트워크 trip, (b) loading 상태로 깜빡임.
    // mount 1 회만 받고 새 채팅 저장 등의 갱신은 별도 경로로 처리. 두 변수
    // 모두 effect body 안에서 안 읽으므로 exhaustive-deps 규칙도 만족.
  }, [status, serviceType])

  // History grouping — Today / Previous 7 Days / Older. Only used when
  // enableGrouping is on (compat counselor page). The flat list path
  // (default) keeps the destiny drawer's existing rendering intact.
  const groupedSessions = useMemo(() => {
    if (!enableGrouping) return null
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const sevenDaysAgo = startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000
    const today: SessionItem[] = []
    const week: SessionItem[] = []
    const older: SessionItem[] = []
    for (const s of sessions) {
      const ts = s.updatedAt ? new Date(s.updatedAt).getTime() : 0
      if (ts >= startOfToday.getTime()) today.push(s)
      else if (ts >= sevenDaysAgo) week.push(s)
      else older.push(s)
    }
    return { today, week, older }
  }, [sessions, enableGrouping])

  const closeSwipe = useCallback(() => setSwipedId(null), [])

  // ---- Delete ----
  const handleDelete = useCallback(
    async (id: string) => {
      const ok = window.confirm(t('destinyMap.counselor.confirmDelete', 'Delete this chat?'))
      if (!ok) return
      let status: number | undefined
      try {
        const res = await fetch(`/api/counselor/session/list?sessionId=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        })
        status = res.status
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setSessions((prev) => prev.filter((s) => s.id !== id))
        setSwipedId(null)
      } catch (e) {
        // No optimistic row removal yet — the list is only mutated after
        // the request succeeds. So nothing to roll back here; we just hand
        // off to the parent so it can surface a localized toast (replaces
        // the old `window.alert()` which was jarring on mobile and
        // untranslated).
        logger.warn('[CounselorSidebar] delete failed', { id, status, e })
        onActionError?.({ kind: 'delete', status })
      }
    },
    [t, onActionError]
  )

  // ---- Rename ----
  const startRename = useCallback((s: SessionItem) => {
    setRenamingId(s.id)
    setRenameValue(s.title || '')
    setSwipedId(null)
  }, [])

  const cancelRename = useCallback(() => {
    setRenamingId(null)
    setRenameValue('')
  }, [])

  const commitRename = useCallback(async () => {
    const id = renamingId
    if (!id) return
    const next = renameValue.trim()
    if (!next) {
      cancelRename()
      return
    }
    let status: number | undefined
    try {
      const res = await fetch('/api/counselor/session/list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id, title: next }),
      })
      status = res.status
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, title: next } : s)))
      cancelRename()
    } catch (e) {
      // The local `sessions` array is only updated after the request
      // succeeds, so there's no optimistic row title to roll back here.
      // Close the rename input (commit-or-cancel UX — keeping the input
      // open with the failed text would be confusing) and hand the
      // failure to the parent so it can surface a localized toast.
      logger.warn('[CounselorSidebar] rename failed', { id, status, e })
      cancelRename()
      onActionError?.({ kind: 'rename', status })
    }
  }, [renamingId, renameValue, cancelRename, onActionError])

  // ---- Mobile swipe-to-reveal ----
  const onTouchStart = (e: React.TouchEvent, id: string) => {
    swipeStartXRef.current = e.touches[0].clientX
    swipeRowIdRef.current = id
  }

  const onTouchMove = (e: React.TouchEvent, id: string) => {
    if (swipeStartXRef.current === null || swipeRowIdRef.current !== id) return
    const dx = e.touches[0].clientX - swipeStartXRef.current
    if (dx < -SWIPE_REVEAL_PX && swipedId !== id) {
      setSwipedId(id)
    } else if (dx > SWIPE_RESET_PX && swipedId === id) {
      setSwipedId(null)
    }
  }

  const onTouchEnd = () => {
    swipeStartXRef.current = null
    swipeRowIdRef.current = null
  }

  const renderSessionRow = (s: SessionItem) => {
    const isSwiped = swipedId === s.id
    const isRenaming = renamingId === s.id
    const displayName =
      (s.title && s.title.trim()) ||
      (s.preview && s.preview.trim()) ||
      t('destinyMap.counselor.untitledChat', 'Untitled chat')
    return (
      <li
        key={s.id}
        className={styles.sessionRow}
        onTouchStart={(e) => onTouchStart(e, s.id)}
        onTouchMove={(e) => onTouchMove(e, s.id)}
        onTouchEnd={onTouchEnd}
      >
        <div className={styles.swipeActions} aria-hidden={!isSwiped}>
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => startRename(s)}
            aria-label={t('destinyMap.counselor.rename', 'Rename')}
            title={t('destinyMap.counselor.rename', 'Rename')}
          >
            ✎
          </button>
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
            onClick={() => handleDelete(s.id)}
            aria-label={t('destinyMap.counselor.delete', 'Delete')}
            title={t('destinyMap.counselor.delete', 'Delete')}
          >
            🗑
          </button>
        </div>

        {isRenaming ? (
          <div className={styles.sessionItem}>
            <input
              autoFocus
              className={styles.renameInput}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void commitRename()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  cancelRename()
                }
              }}
              onBlur={() => void commitRename()}
              maxLength={80}
              placeholder={displayName}
            />
          </div>
        ) : (
          <Link
            href={`${hrefBase}?session=${s.id}`}
            className={`${styles.sessionItem} ${isSwiped ? styles.sessionItemSwiped : ''}`}
            onClick={(e) => {
              if (isSwiped) {
                e.preventDefault()
                closeSwipe()
                return
              }
              onClose()
            }}
          >
            <span className={styles.sessionTitle}>{displayName}</span>
            {(() => {
              const subtitle = getSessionSubtitle(s, serviceType, fallbackName)
              if (!subtitle) return null
              return <span className={styles.sessionSubtitle}>{subtitle}</span>
            })()}
            {s.updatedAt && !enableGrouping && (
              <span className={styles.sessionDate}>
                {new Date(s.updatedAt).toLocaleDateString()}
              </span>
            )}
          </Link>
        )}

        {/* 항상 보이던 ✎/🗑 아이콘은 제거 — Rename/Delete 는 채팅 안 우상단의
            ⋮ 메뉴로 이동했음. .swipeActions (모바일 좌측 스와이프 시 노출)는
            제스처 단축으로 유지. */}
      </li>
    )
  }

  const scrimClass = [
    styles.scrim,
    open ? styles.scrimOpen : '',
    desktopStatic ? styles.scrimDesktopHidden : '',
  ]
    .filter(Boolean)
    .join(' ')

  const drawerClass = [
    styles.drawer,
    open ? styles.drawerOpen : '',
    desktopStatic ? styles.drawerStaticDesktop : '',
    lightTheme ? styles.lightTheme : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      <div className={scrimClass} onClick={onClose} aria-hidden={!open} />
      <aside
        className={drawerClass}
        aria-hidden={!open && !desktopStatic}
        aria-label={t('destinyMap.counselor.menu', 'Menu')}
      >
        <div className={styles.header}>
          <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close">
            ×
          </button>
          <span className={styles.brandMark} aria-hidden="true">
            <HexDPLogo size={24} />
          </span>
          <span className={styles.brand}>DestinyPal</span>
          <Link
            href="/"
            className={styles.headerHome}
            onClick={onClose}
            aria-label={t('common.home', 'Home')}
            title={t('common.home', 'Home')}
          >
            <span aria-hidden="true">🏠</span>
          </Link>
        </div>

        <div className={styles.section}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => {
              onNewChat()
              onClose()
            }}
          >
            <span className={styles.actionIcon}>＋</span>
            <span>{t('destinyMap.counselor.newChat', 'New chat')}</span>
          </button>
        </div>

        <div className={styles.divider} />

        <div className={`${styles.section} ${styles.historySection}`}>
          <div className={styles.sectionLabel}>
            {t('destinyMap.counselor.pastChats', 'Past chats')}
          </div>
          {status !== 'authenticated' ? (
            <p className={styles.empty}>
              {t('destinyMap.counselor.signInToSee', 'Sign in to see past chats.')}
            </p>
          ) : loadingList && sessions.length === 0 ? (
            // 스켈레톤 — 빈 텍스트 "불러오는 중..." 대신 4 row ghost.
            // 사용자 시각에선 list 자체의 형태가 즉시 잡혀, 실제 채워질 때
            // 깜빡임 대신 자연스러운 fade-in 으로 인식된다.
            <ul className={styles.sessionList} aria-busy="true" aria-live="polite">
              {[0, 1, 2, 3].map((i) => (
                <li
                  key={`sk-${i}`}
                  className={`${styles.sessionRow} ${styles.skeletonRow}`}
                  aria-hidden="true"
                >
                  <span className={styles.skeletonLine} />
                  <span className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
                </li>
              ))}
            </ul>
          ) : sessions.length === 0 ? (
            <p className={styles.empty}>
              {t('destinyMap.counselor.noPastChats', '아직 저장된 채팅이 없어요.')}
            </p>
          ) : enableGrouping && groupedSessions ? (
            <>
              {(['today', 'week', 'older'] as const).map((bucket) => {
                const items = groupedSessions[bucket]
                if (items.length === 0) return null
                const groupLabel =
                  bucket === 'today'
                    ? t('destinyMap.counselor.today', 'Today')
                    : bucket === 'week'
                      ? t('destinyMap.counselor.previous7Days', 'Previous 7 Days')
                      : t('destinyMap.counselor.older', 'Older')
                return (
                  <div key={bucket} className={styles.sessionGroup}>
                    <div className={styles.sessionGroupLabel}>{groupLabel}</div>
                    <ul className={styles.sessionList}>{items.map(renderSessionRow)}</ul>
                  </div>
                )
              })}
            </>
          ) : (
            <ul className={styles.sessionList}>{sessions.map(renderSessionRow)}</ul>
          )}
        </div>

        {footerSlot && (
          <>
            <div className={styles.divider} />
            <div className={styles.footerSlot}>{footerSlot}</div>
          </>
        )}

        <div className={styles.footer}>
          {status === 'authenticated' ? (
            <button
              type="button"
              className={styles.authBtn}
              onClick={() => void clearClientCacheAndSignOut(() => signOut({ callbackUrl: '/' }))}
            >
              <span className={styles.actionIcon}>↩</span>
              <span>
                {t('common.signOut', 'Sign out')}
                {session?.user?.email ? ` · ${session.user.email}` : ''}
              </span>
            </button>
          ) : (
            <button
              type="button"
              className={styles.authBtn}
              onClick={() => signIn(undefined, { callbackUrl: window.location.href })}
            >
              <span className={styles.actionIcon}>→</span>
              <span>{t('common.signIn', 'Sign in')}</span>
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
