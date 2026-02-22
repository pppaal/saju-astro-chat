/**
 * History Data Hook
 *
 * Manages loading and filtering of user history data
 */

import { useState, useEffect } from 'react'
import { logger } from '@/lib/logger'
import type { DailyHistory } from '../lib'

export interface UseHistoryDataReturn {
  history: DailyHistory[]
  loading: boolean
  selectedService: string | null
  setSelectedService: (service: string | null) => void
  showAllRecords: boolean
  setShowAllRecords: (show: boolean) => void
}

export function useHistoryData(authenticated: boolean): UseHistoryDataReturn {
  const [history, setHistory] = useState<DailyHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedService, setSelectedService] = useState<string | null>(null)
  const [showAllRecords, setShowAllRecords] = useState(false)

  useEffect(() => {
    const unwrap = <T>(payload: unknown): T | null => {
      if (!payload || typeof payload !== 'object') return null
      const raw = payload as { data?: unknown }
      const candidate = raw.data !== undefined ? raw.data : payload
      return candidate as T
    }

    const loadHistory = async () => {
      if (!authenticated) {
        return
      }
      try {
        const res = await fetch('/api/me/history', { cache: 'no-store' })
        if (res.ok) {
          const raw = await res.json()
          const data = unwrap<{ history?: DailyHistory[] }>(raw)
          setHistory(data?.history || [])
        }
      } catch (e) {
        logger.error('Failed to load history:', e)
      } finally {
        setLoading(false)
      }
    }
    loadHistory()
  }, [authenticated])

  return {
    history,
    loading,
    selectedService,
    setSelectedService,
    showAllRecords,
    setShowAllRecords,
  }
}
