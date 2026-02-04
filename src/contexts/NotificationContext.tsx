'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
  useCallback,
  useMemo,
} from 'react'
import { useSession } from 'next-auth/react'
import { useToast } from '@/components/ui/Toast'
import { logger } from '@/lib/logger'

export type NotificationType = 'like' | 'comment' | 'reply' | 'mention' | 'system'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  link?: string
  avatar?: string
  read: boolean
  createdAt: number
}

// Split into two contexts to prevent unnecessary re-renders:
// - UnreadCountContext: lightweight, changes rarely (only when read status changes)
// - NotificationDataContext: full data, only consumed by components that list notifications

interface NotificationActionsType {
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  deleteNotification: (id: string) => void
  clearAll: () => void
}

const UnreadCountContext = createContext<number>(0)
const NotificationDataContext = createContext<Notification[]>([])
const NotificationActionsContext = createContext<NotificationActionsType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { data: _session } = useSession()
  const toast = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [eventSource, setEventSource] = useState<EventSource | null>(null)

  // Load notifications from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('notifications')
    if (stored) {
      try {
        setNotifications(JSON.parse(stored))
      } catch (e) {
        logger.error('[NotificationContext] Failed to load notifications', e)
      }
    }
  }, [])

  // Save to localStorage whenever notifications change (debounced)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    saveTimerRef.current = setTimeout(() => {
      localStorage.setItem('notifications', JSON.stringify(notifications))
    }, 1000)
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [notifications])

  // Cleanup SSE on unmount (SSE feature disabled - can be re-enabled later)
  useEffect(() => {
    if (eventSource) {
      eventSource.close()
      setEventSource(null)
    }
  }, [eventSource])

  const addNotification = useCallback(
    (notif: Omit<Notification, 'id' | 'read' | 'createdAt'>) => {
      const newNotification: Notification = {
        ...notif,
        id: Math.random().toString(36).substring(2, 11),
        read: false,
        createdAt: Date.now(),
      }

      setNotifications((prev) => [newNotification, ...prev].slice(0, 50)) // Keep last 50

      // Show toast for new notifications
      toast.info(notif.title, 5000)

      // Request permission and show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notif.title, {
          body: notif.message,
          icon: '/icon.png',
          badge: '/badge.png',
        })
      }
    },
    [toast]
  )

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications])

  const actions = useMemo<NotificationActionsType>(
    () => ({
      addNotification,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAll,
    }),
    [addNotification, markAsRead, markAllAsRead, deleteNotification, clearAll]
  )

  return (
    <NotificationActionsContext.Provider value={actions}>
      <UnreadCountContext.Provider value={unreadCount}>
        <NotificationDataContext.Provider value={notifications}>
          {children}
        </NotificationDataContext.Provider>
      </UnreadCountContext.Provider>
    </NotificationActionsContext.Provider>
  )
}

/** Lightweight hook - only re-renders when unread count changes */
export function useUnreadCount() {
  return useContext(UnreadCountContext)
}

/** Full notifications data - only use in components that list notifications */
export function useNotificationData() {
  return useContext(NotificationDataContext)
}

/** Actions only - stable references, never causes re-renders */
export function useNotificationActions() {
  const context = useContext(NotificationActionsContext)
  if (!context) {
    throw new Error('useNotificationActions must be used within NotificationProvider')
  }
  return context
}

/** Combined hook for backward compatibility */
export function useNotifications() {
  const notifications = useNotificationData()
  const unreadCount = useUnreadCount()
  const actions = useNotificationActions()
  return { notifications, unreadCount, ...actions }
}

// Helper to request notification permission
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    logger.warn('[NotificationContext] This browser does not support notifications')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  return false
}
