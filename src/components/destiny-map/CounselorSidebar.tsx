'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
}

const SWIPE_REVEAL_PX = 60 // user must drag this far to lock the swipe-open state
const SWIPE_RESET_PX = 30 // drag back this far to snap closed

export default function CounselorSidebar({
  open,
  onClose,
  onNewChat,
  serviceType = 'destiny',
  sessionHrefBase,
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
    if (!open || status !== 'authenticated') return
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
  }, [open, status, serviceType])

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

  return (
    <>
      <div
        className={`${styles.scrim} ${open ? styles.scrimOpen : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={`${styles.drawer} ${open ? styles.drawerOpen : ''}`}
        aria-hidden={!open}
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

        <div className={styles.section}>
          <div className={styles.sectionLabel}>
            {t('destinyMap.counselor.pastChats', 'Past chats')}
          </div>
          {status !== 'authenticated' ? (
            <p className={styles.empty}>
              {t('destinyMap.counselor.signInToSee', 'Sign in to see past chats.')}
            </p>
          ) : loadingList ? (
            <p className={styles.empty}>...</p>
          ) : sessions.length === 0 ? (
            <p className={styles.empty}>
              {t('destinyMap.counselor.noPastChats', 'No saved chats yet.')}
            </p>
          ) : (
            <ul className={styles.sessionList}>
              {sessions.map((s) => {
                const isSwiped = swipedId === s.id
                const isRenaming = renamingId === s.id
                const displayName = s.title || s.preview || s.id.slice(0, 8)
                return (
                  <li
                    key={s.id}
                    className={styles.sessionRow}
                    onTouchStart={(e) => onTouchStart(e, s.id)}
                    onTouchMove={(e) => onTouchMove(e, s.id)}
                    onTouchEnd={onTouchEnd}
                  >
                    {/* Reveal layer (under the row, shown after swipe) */}
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
                            // first tap closes the swipe instead of navigating
                            e.preventDefault()
                            closeSwipe()
                            return
                          }
                          onClose()
                        }}
                      >
                        <span className={styles.sessionTitle}>{displayName}</span>
                        {s.updatedAt && (
                          <span className={styles.sessionDate}>
                            {new Date(s.updatedAt).toLocaleDateString()}
                          </span>
                        )}
                      </Link>
                    )}

                    {/* Desktop hover actions (kebab cluster, top-right) */}
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
              })}
            </ul>
          )}
        </div>

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
