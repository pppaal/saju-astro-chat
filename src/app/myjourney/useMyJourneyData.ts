'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { signOut } from 'next-auth/react'
import { logger } from '@/lib/logger'
import type { Profile, Fortune, DailyHistory, Credits } from './types'

import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import type { ReadonlyURLSearchParams } from 'next/navigation'

interface UseMyJourneyDataParams {
  session: { user?: { name?: string | null; email?: string | null; image?: string | null } } | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  router: AppRouterInstance
  searchParams: ReadonlyURLSearchParams | null
  signInUrl: string
}

export function useMyJourneyData({
  session,
  status,
  router,
  searchParams,
  signInUrl,
}: UseMyJourneyDataParams) {
  const [profile, setProfile] = useState<Profile>({})
  const [fortune, setFortune] = useState<Fortune | null>(null)
  const [fortuneLoading, setFortuneLoading] = useState(false)
  const [recentHistory, setRecentHistory] = useState<DailyHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({})
  const [credits, setCredits] = useState<Credits | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)

  // Inline editing states
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editedProfile, setEditedProfile] = useState<Profile>({})
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // --- Callbacks ---

  const loadInitialData = useCallback(async () => {
    if (status !== 'authenticated') {
      setInitialLoading(false)
      return
    }

    try {
      const [profileRes, creditsRes] = await Promise.all([
        fetch('/api/me/profile', { cache: 'no-store' }),
        fetch('/api/me/credits', { cache: 'no-store' }),
      ])

      if (profileRes.ok) {
        const { user } = await profileRes.json()
        if (user) {
          setProfile(user)
        }
      }

      if (creditsRes.ok) {
        const data = await creditsRes.json()
        setCredits({
          remaining: data.credits?.remaining ?? 0,
          total: data.credits?.monthly ?? 0,
          plan: data.plan || 'free',
        })
      }
    } catch (e) {
      logger.error('Failed to load initial data:', e)
    } finally {
      setInitialLoading(false)
    }
  }, [status])

  const loadHistory = useCallback(async () => {
    if (status !== 'authenticated') {
      return
    }
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/me/history', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setRecentHistory((data.history || []).slice(0, 2))
      }
    } catch (e) {
      logger.error('Failed to load history:', e)
    } finally {
      setHistoryLoading(false)
    }
  }, [status])

  const loadFortune = useCallback(async () => {
    if (!profile.birthDate || fortune) {
      return
    }
    setFortuneLoading(true)
    try {
      const res = await fetch('/api/daily-fortune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          birthDate: profile.birthDate,
          birthTime: profile.birthTime,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setFortune(data.fortune)
      } else {
        logger.error('Failed to load fortune: status', res.status)
        setFortune(null)
      }
    } catch (e) {
      logger.error('Failed to load fortune:', e)
      setFortune(null)
    } finally {
      setFortuneLoading(false)
    }
  }, [profile.birthDate, profile.birthTime, fortune])

  const goBack = useCallback(() => {
    if (typeof window === 'undefined') {
      return
    }
    const state = history.state || {}
    if (state.__fromAuth || window.history.length <= 1) {
      router.replace('/')
    } else {
      router.back()
    }
  }, [router])

  const handleLogout = useCallback(() => signOut({ callbackUrl: '/myjourney' }), [])

  const handleCreditsClick = useCallback(() => router.push('/pricing'), [router])

  const toggleDayExpanded = useCallback((date: string) => {
    setExpandedDays((prev) => ({ ...prev, [date]: !prev[date] }))
  }, [])

  // Profile reload handler
  const [isReloadingProfile, setIsReloadingProfile] = useState(false)
  const handleReloadProfile = useCallback(async () => {
    setIsReloadingProfile(true)
    try {
      const [profileRes, creditsRes] = await Promise.all([
        fetch('/api/me/profile', { cache: 'no-store' }),
        fetch('/api/me/credits', { cache: 'no-store' }),
      ])
      if (profileRes.ok) {
        const { user } = await profileRes.json()
        if (user) {
          setProfile(user)
        }
      }
      if (creditsRes.ok) {
        const data = await creditsRes.json()
        setCredits({
          remaining: data.credits?.remaining ?? 0,
          total: data.credits?.monthly ?? 0,
          plan: data.plan || 'free',
        })
      }
      setFortune(null)
    } catch (e) {
      logger.error('Failed to reload profile:', e)
    } finally {
      setIsReloadingProfile(false)
    }
  }, [])

  // Profile editing handlers
  const handleEditProfile = useCallback(() => {
    setEditedProfile({ ...profile })
    setIsEditingProfile(true)
  }, [profile])

  const handleCancelEdit = useCallback(() => {
    setIsEditingProfile(false)
    setEditedProfile({})
  }, [])

  const handleSaveProfile = useCallback(async () => {
    setIsSavingProfile(true)
    try {
      const res = await fetch('/api/me/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedProfile),
      })

      if (res.ok) {
        const { user } = await res.json()
        setProfile(user)
        setIsEditingProfile(false)
        setEditedProfile({})
        // Reload fortune with new data
        setFortune(null)
      } else {
        logger.error('Failed to save profile')
      }
    } catch (e) {
      logger.error('Failed to save profile:', e)
    } finally {
      setIsSavingProfile(false)
    }
  }, [editedProfile])

  // --- Effects ---

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  useEffect(() => {
    loadFortune()
  }, [loadFortune])

  // Auth redirect handling
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const fromQuery = searchParams?.get('from')
    const looksLikeAuthReferrer =
      document.referrer.includes('/api/auth') ||
      document.referrer.includes('accounts.google.com') ||
      document.referrer.includes('kauth.kakao.com')
    const cameFromAuth = fromQuery === 'oauth' || looksLikeAuthReferrer
    const state = history.state || {}
    if (!state.__entered) {
      history.replaceState({ ...state, __entered: true, __fromAuth: cameFromAuth }, '')
    }
  }, [searchParams])

  // Status tracking
  const prevStatus = useRef(status)
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    if (prevStatus.current !== status && status === 'authenticated') {
      const state = history.state || {}
      history.replaceState({ ...state, __fromAuth: true, __entered: true }, '')
    }
    prevStatus.current = status
  }, [status])

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace(signInUrl)
    }
  }, [status, router, signInUrl])

  return {
    // State
    profile,
    fortune,
    fortuneLoading,
    recentHistory,
    historyLoading,
    expandedDays,
    credits,
    initialLoading,
    isEditingProfile,
    editedProfile,
    setEditedProfile,
    isSavingProfile,
    isReloadingProfile,

    // Callbacks
    goBack,
    handleLogout,
    handleCreditsClick,
    toggleDayExpanded,
    handleEditProfile,
    handleCancelEdit,
    handleSaveProfile,
    handleReloadProfile,
  }
}
