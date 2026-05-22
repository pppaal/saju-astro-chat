'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import { logger } from '@/lib/logger'
import styles from './CounselorSidebar.module.css'

type SessionItem = {
  id: string
  title?: string | null
  preview?: string | null
  updatedAt?: string | null
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
    (serviceType === 'compat' ? '/compatibility/counselor' : '/destiny-map/counselor')

  useEffect(() => {
    // When desktopStatic is on, the sidebar is permanently visible on
    // desktop so we fetch regardless of the drawer "open" flag — that
    // flag still controls the mobile slide-in but desktop users would
    // otherwise see an empty list until the first hamburger click.
    if ((!open && !desktopStatic) || status !== 'authenticated') return
    // Reset transient row state every time the drawer reopens. Without
    // this, a row left in swipe / rename mode from a previous open
    // stays mid-swipe — the title slides 72px off-screen and the user
    // sees only the action icons, which looks like "past chats are
    // gone" even though the data is there.
    setSwipedId(null)
    setRenamingId(null)
    setRenameValue('')
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
  }, [open, status, serviceType, desktopStatic])

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
      try {
        const res = await fetch(`/api/counselor/session/list?sessionId=${encodeURIComponent(id)}`, {
          method: 'DELETE',
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        setSessions((prev) => prev.filter((s) => s.id !== id))
        setSwipedId(null)
      } catch (e) {
        logger.warn('[CounselorSidebar] delete failed', { id, e })
        window.alert(t('destinyMap.counselor.deleteFailed', 'Could not delete. Try again.'))
      }
    },
    [t]
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
    try {
      const res = await fetch('/api/counselor/session/list', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: id, title: next }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, title: next } : s))
      )
      cancelRename()
    } catch (e) {
      logger.warn('[CounselorSidebar] rename failed', { id, e })
      window.alert(t('destinyMap.counselor.renameFailed', 'Could not rename. Try again.'))
    }
  }, [renamingId, renameValue, cancelRename, t])

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
            {s.updatedAt && !enableGrouping && (
              <span className={styles.sessionDate}>
                {new Date(s.updatedAt).toLocaleDateString()}
              </span>
            )}
          </Link>
        )}

        {!isRenaming && !isSwiped && (
          <div className={styles.sessionActions}>
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
        )}
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
      <div
        className={scrimClass}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={drawerClass}
        aria-hidden={!open && !desktopStatic}
        aria-label={t('destinyMap.counselor.menu', 'Menu')}
      >
        <div className={styles.header}>
          <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close">
            ×
          </button>
          <span className={styles.brand}>DestinyPal</span>
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
          <Link href="/" className={styles.actionBtn} onClick={onClose}>
            <span className={styles.actionIcon}>🏠</span>
            <span>{t('common.home', 'Home')}</span>
          </Link>
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
          ) : loadingList ? (
            <p className={styles.empty}>
              {t('destinyMap.counselor.loadingChats', '불러오는 중...')}
            </p>
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
                    <ul className={styles.sessionList}>
                      {items.map(renderSessionRow)}
                    </ul>
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
              onClick={() => signOut({ callbackUrl: '/' })}
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
