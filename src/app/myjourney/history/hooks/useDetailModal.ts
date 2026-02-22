/**
 * Detail Modal Hook
 *
 * Manages loading detailed content for service records
 */

import { useState, useCallback } from 'react'
import { logger } from '@/lib/logger'
import type {
  ServiceRecord,
  IChingContent,
  DestinyMapContent,
  CalendarContent,
  TarotContent,
  NumerologyContent,
  ICPContent,
  PersonalityCompatibilityContent,
  DestinyMatrixContent,
} from '../lib'

export interface UseDetailModalReturn {
  selectedRecord: ServiceRecord | null
  detailLoading: boolean
  ichingDetail: IChingContent | null
  destinyMapDetail: DestinyMapContent | null
  calendarDetail: CalendarContent | null
  tarotDetail: TarotContent | null
  numerologyDetail: NumerologyContent | null
  icpDetail: ICPContent | null
  compatibilityDetail: PersonalityCompatibilityContent | null
  matrixDetail: DestinyMatrixContent | null
  loadReadingDetail: (record: ServiceRecord) => Promise<void>
  closeDetail: () => void
}

function unwrapResponse<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
    return (payload as { data: T }).data
  }
  return payload as T
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

export function useDetailModal(): UseDetailModalReturn {
  const [selectedRecord, setSelectedRecord] = useState<ServiceRecord | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [ichingDetail, setIchingDetail] = useState<IChingContent | null>(null)
  const [destinyMapDetail, setDestinyMapDetail] = useState<DestinyMapContent | null>(null)
  const [calendarDetail, setCalendarDetail] = useState<CalendarContent | null>(null)
  const [tarotDetail, setTarotDetail] = useState<TarotContent | null>(null)
  const [numerologyDetail, setNumerologyDetail] = useState<NumerologyContent | null>(null)
  const [icpDetail, setIcpDetail] = useState<ICPContent | null>(null)
  const [compatibilityDetail, setCompatibilityDetail] =
    useState<PersonalityCompatibilityContent | null>(null)
  const [matrixDetail, setMatrixDetail] = useState<DestinyMatrixContent | null>(null)

  const loadReadingDetail = useCallback(async (record: ServiceRecord) => {
    setSelectedRecord(record)
    setDetailLoading(true)
    setIchingDetail(null)
    setDestinyMapDetail(null)
    setCalendarDetail(null)
    setTarotDetail(null)
    setNumerologyDetail(null)
    setIcpDetail(null)
    setCompatibilityDetail(null)
    setMatrixDetail(null)

    try {
      if (record.service === 'iching' && record.type === 'reading') {
        const res = await fetch(`/api/readings/${record.id}`)
        if (res.ok) {
          const payload = unwrapResponse<{ reading?: { content?: string } }>(await res.json())
          if (payload.reading?.content) {
            const parsed = JSON.parse(payload.reading.content) as IChingContent
            setIchingDetail(parsed)
          }
        }
      } else if (record.service === 'destiny-map' && record.type === 'consultation') {
        const res = await fetch(`/api/consultation/${record.id}`)
        if (res.ok) {
          const payload = unwrapResponse<Record<string, unknown>>(await res.json())
          if (payload.data && typeof payload.data === 'object') {
            setDestinyMapDetail(payload.data as DestinyMapContent)
          } else if (payload.consultation && typeof payload.consultation === 'object') {
            setDestinyMapDetail(payload.consultation as DestinyMapContent)
          } else {
            setDestinyMapDetail({
              id: record.id,
              theme: record.theme || 'focus_overall',
              summary: record.summary || 'Destiny Map analysis',
              fullReport: undefined,
              createdAt: record.date,
            })
          }
        } else {
          setDestinyMapDetail({
            id: record.id,
            theme: record.theme || 'focus_overall',
            summary: record.summary || 'Destiny Map analysis',
            fullReport: undefined,
            createdAt: record.date,
          })
        }
      } else if (record.service === 'destiny-calendar' && record.type === 'calendar') {
        const res = await fetch(`/api/calendar/save/${record.id}`)
        if (res.ok) {
          const payload = unwrapResponse<{ savedDate?: Record<string, unknown> }>(await res.json())
          if (payload.savedDate) {
            setCalendarDetail({
              ...(payload.savedDate as CalendarContent),
              categories: toStringArray(payload.savedDate.categories),
              bestTimes: toStringArray(payload.savedDate.bestTimes),
              sajuFactors: toStringArray(payload.savedDate.sajuFactors),
              astroFactors: toStringArray(payload.savedDate.astroFactors),
              recommendations: toStringArray(payload.savedDate.recommendations),
              warnings: toStringArray(payload.savedDate.warnings),
            } as CalendarContent)
          }
        }
      } else if (
        record.service === 'tarot' &&
        (record.type === 'reading' || record.type === 'tarot-reading')
      ) {
        const res = await fetch(`/api/tarot/save/${record.id}`)
        if (res.ok) {
          const payload = unwrapResponse<{ reading?: Record<string, unknown> }>(await res.json())
          const reading = asRecord(payload.reading)
          if (Object.keys(reading).length > 0) {
            setTarotDetail({
              categoryId: String(reading.theme || ''),
              spreadId: String(reading.spreadId || ''),
              spreadTitle: String(reading.spreadTitle || 'Tarot Reading'),
              cards: Array.isArray(reading.cards) ? reading.cards : [],
              userQuestion: typeof reading.question === 'string' ? reading.question : undefined,
              overallMessage:
                typeof reading.overallMessage === 'string' ? reading.overallMessage : undefined,
              cardInsights: Array.isArray(reading.cardInsights) ? reading.cardInsights : undefined,
              guidance: typeof reading.guidance === 'string' ? reading.guidance : undefined,
              affirmation:
                typeof reading.affirmation === 'string' ? reading.affirmation : undefined,
            })
          }
        } else {
          const fallbackRes = await fetch(`/api/readings/${record.id}`)
          if (fallbackRes.ok) {
            const payload = unwrapResponse<{ reading?: { content?: string } }>(
              await fallbackRes.json()
            )
            if (payload.reading?.content) {
              const parsed = JSON.parse(payload.reading.content) as TarotContent
              setTarotDetail(parsed)
            }
          }
        }
      } else if (record.service === 'numerology' && record.type === 'numerology') {
        const res = await fetch(`/api/readings/${record.id}`)
        if (res.ok) {
          const payload = unwrapResponse<{ reading?: { content?: string } }>(await res.json())
          if (payload.reading?.content) {
            const parsed = JSON.parse(payload.reading.content) as NumerologyContent
            setNumerologyDetail(parsed)
          }
        }
      } else if (record.service === 'personality-icp' && record.type === 'icp-result') {
        const res = await fetch(`/api/personality/icp/save?id=${record.id}`)
        if (res.ok) {
          const payload = unwrapResponse<{ result?: ICPContent }>(await res.json())
          if (payload.result) {
            setIcpDetail(payload.result)
          }
        }
      } else if (
        record.service === 'personality-compatibility' &&
        record.type === 'compatibility-result'
      ) {
        const res = await fetch(`/api/personality/compatibility/save?id=${record.id}`)
        if (res.ok) {
          const payload = unwrapResponse<{ result?: PersonalityCompatibilityContent }>(
            await res.json()
          )
          if (payload.result) {
            setCompatibilityDetail(payload.result)
          }
        }
      } else if (record.service === 'destiny-matrix' && record.type === 'destiny-matrix-report') {
        const res = await fetch(`/api/destiny-matrix/save?id=${record.id}`)
        if (res.ok) {
          const payload = unwrapResponse<{ result?: DestinyMatrixContent }>(await res.json())
          if (payload.result) {
            setMatrixDetail(payload.result)
          }
        }
      }
    } catch (e) {
      logger.error('Failed to load reading detail:', e)
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const closeDetail = useCallback(() => {
    setSelectedRecord(null)
    setIchingDetail(null)
    setDestinyMapDetail(null)
    setCalendarDetail(null)
    setTarotDetail(null)
    setNumerologyDetail(null)
    setIcpDetail(null)
    setCompatibilityDetail(null)
    setMatrixDetail(null)
  }, [])

  return {
    selectedRecord,
    detailLoading,
    ichingDetail,
    destinyMapDetail,
    calendarDetail,
    tarotDetail,
    numerologyDetail,
    icpDetail,
    compatibilityDetail,
    matrixDetail,
    loadReadingDetail,
    closeDetail,
  }
}
