'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import { logger } from '@/lib/logger'
import { apiFetch } from '@/lib/api'
import { clearClientCacheAndSignOut } from '@/lib/auth/clearClientCache'
import styles from './CounselorSidebar.module.css'
import HexDPLogo from '@/components/branding/HexDPLogo'
import PromptModal from '@/components/ui/PromptModal'

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
  /**
   * 현재 활성(보고 있는) 세션 id/title. 새 채팅을 시작하거나 첫 메시지를 보내면
   * 서버 저장(2초 디바운스)보다 먼저 이 값으로 목록 맨 위에 낙관적으로 노출해,
   * "새 채팅이 사이드바에 바로 안 뜨던" 문제를 없앤다. 서버 list 와 같은 id 체계
   * (counselorChatSession)라 다음 refetch 때 자연스럽게 합쳐진다.
   */
  activeSessionId?: string | null
  activeSessionTitle?: string | null
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
  activeSessionId,
  activeSessionTitle,
}: CounselorSidebarProps) {
  const { t } = useI18n()
  const { data: session, status } = useSession()
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [swipedId, setSwipedId] = useState<string | null>(null)
  // 삭제 확인 모달 상태 — window.confirm 대체. 인앱 웹뷰(카카오 등)에서
  // native confirm 이 막혀 삭제 자체가 안 되던 회귀 + 페이지 헤더의 ⋮ 메뉴와
  // 동일한 PromptModal UX 로 통일.
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
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

  // 세션 목록 조회 — mount/auth 직후 1회 + 사이드바를 열 때마다 다시 불러와
  // 새로 생긴 채팅·제목 변경·삭제가 반영되게 한다. reqId 로 마지막 응답만
  // 반영해 경쟁(race) 방지. 기존 목록은 비우지 않고 성공 시 교체 → 재오픈 시
  // 깜빡임 없음(스켈레톤은 목록이 빈 첫 로드에서만 노출).
  const reqIdRef = useRef(0)
  const loadSessions = useCallback(() => {
    if (status !== 'authenticated') return
    const reqId = ++reqIdRef.current
    setLoadingList(true)
    apiFetch(`/api/counselor/session/list?limit=30&type=${serviceType}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (reqId !== reqIdRef.current) return
        const list = Array.isArray(data?.sessions)
          ? (data.sessions as SessionItem[])
          : Array.isArray(data)
            ? (data as SessionItem[])
            : []
        setSessions(list)
      })
      .catch((e) => logger.warn('[CounselorSidebar] session list failed', { e }))
      .finally(() => {
        if (reqId === reqIdRef.current) setLoadingList(false)
      })
  }, [status, serviceType])

  // mount/auth 직후 백그라운드 prefetch — 첫 클릭 시 이미 준비 완료.
  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  // 사이드바를 열 때마다 갱신 — 직전에 만든 새 채팅/제목 변경이 바로 보이게.
  useEffect(() => {
    if (open) loadSessions()
  }, [open, loadSessions])

  // 활성 세션을 목록에 낙관적으로 합친다 — 새 채팅/첫 메시지가 서버 저장보다
  // 먼저 사이드바 맨 위에 뜨게. 이미 있으면 제목만 갱신, 없으면 맨 위에 추가.
  const displaySessions = useMemo<SessionItem[]>(() => {
    if (!activeSessionId) return sessions
    const idx = sessions.findIndex((s) => s.id === activeSessionId)
    if (idx >= 0) {
      if (activeSessionTitle && sessions[idx].title !== activeSessionTitle) {
        const copy = [...sessions]
        copy[idx] = { ...copy[idx], title: activeSessionTitle }
        return copy
      }
      return sessions
    }
    return [
      { id: activeSessionId, title: activeSessionTitle ?? null, updatedAt: new Date().toISOString() },
      ...sessions,
    ]
  }, [sessions, activeSessionId, activeSessionTitle])

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
    for (const s of displaySessions) {
      const ts = s.updatedAt ? new Date(s.updatedAt).getTime() : 0
      if (ts >= startOfToday.getTime()) today.push(s)
      else if (ts >= sevenDaysAgo) week.push(s)
      else older.push(s)
    }
    return { today, week, older }
  }, [displaySessions, enableGrouping])

  const closeSwipe = useCallback(() => setSwipedId(null), [])

  // ---- Delete ----
  // 1단계: 스와이프 삭제 버튼/⋮ 메뉴에서 호출 — 바로 삭제하지 않고 확인 모달만 띄움.
  // 2단계: 모달의 onConfirm 이 performDelete(id) 호출 → 실제 DELETE.
  // 이전엔 window.confirm 을 직접 띄웠는데, 인앱 웹뷰(카카오톡 등)에서
  // native 대화상자가 막혀 삭제가 안 되던 회귀가 있었다 — PromptModal 로 통일.
  const handleDelete = useCallback((id: string) => {
    setPendingDeleteId(id)
  }, [])

  const performDelete = useCallback(
    async (id: string) => {
      let status: number | undefined
      try {
        const res = await apiFetch(`/api/counselor/session/list?sessionId=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        })
        status = res.status
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setSessions((prev) => prev.filter((s) => s.id !== id))
        setSwipedId(null)
      } catch (e) {
        // No optimistic row removal yet — the list is only mutated after
        // the request succeeds. So nothing to roll back here; we just hand
        // off to the parent so it can surface a localized toast.
        logger.warn('[CounselorSidebar] delete failed', { id, status, e })
        onActionError?.({ kind: 'delete', status })
      }
    },
    [onActionError]
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
      const res = await apiFetch('/api/counselor/session/list', {
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
          ) : loadingList && displaySessions.length === 0 ? (
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
          ) : displaySessions.length === 0 ? (
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
            <ul className={styles.sessionList}>{displaySessions.map(renderSessionRow)}</ul>
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

      {/* 삭제 확인 모달 — window.confirm 대체. 인앱 웹뷰(카카오톡 등)에서
          native 대화상자가 막혀 삭제가 안 되던 회귀 차단 + 페이지 헤더 ⋮ 메뉴
          의 PromptModal 과 동일 UX. */}
      <PromptModal
        mode="confirm"
        open={pendingDeleteId !== null}
        title={t('destinyMap.counselor.confirmDeleteTitle', 'Delete chat')}
        message={t(
          'destinyMap.counselor.confirmDelete',
          'Delete this chat? Cannot be undone.'
        )}
        confirmLabel={t('common.delete', 'Delete')}
        cancelLabel={t('common.cancel', 'Cancel')}
        danger
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => {
          const id = pendingDeleteId
          setPendingDeleteId(null)
          if (id) void performDelete(id)
        }}
      />
    </>
  )
}
