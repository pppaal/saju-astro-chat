'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { signIn, signOut, useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import { logger } from '@/lib/logger'
import styles from './CounselorSidebar.module.css'

type SessionItem = {
  id: string
  theme?: string | null
  title?: string | null
  preview?: string | null
  updatedAt?: string | null
}

interface CounselorSidebarProps {
  open: boolean
  onClose: () => void
  onNewChat: () => void
}

export default function CounselorSidebar({ open, onClose, onNewChat }: CounselorSidebarProps) {
  const { t } = useI18n()
  const { data: session, status } = useSession()
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loadingList, setLoadingList] = useState(false)

  useEffect(() => {
    if (!open || status !== 'authenticated') return
    let cancelled = false
    setLoadingList(true)
    fetch('/api/counselor/session/list?limit=30')
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
  }, [open, status])

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
              {sessions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/destiny-counselor/chat?session=${s.id}`}
                    className={styles.sessionItem}
                    onClick={onClose}
                  >
                    <span className={styles.sessionTitle}>
                      {s.title || s.preview || s.theme || s.id.slice(0, 8)}
                    </span>
                    {s.updatedAt && (
                      <span className={styles.sessionDate}>
                        {new Date(s.updatedAt).toLocaleDateString()}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
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
