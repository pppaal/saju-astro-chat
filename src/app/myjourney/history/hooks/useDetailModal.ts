/**
 * Detail Modal Hook
 *
 * Manages loading detailed content for service records
 */

import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';
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
} from '../lib';

export interface UseDetailModalReturn {
  selectedRecord: ServiceRecord | null;
  detailLoading: boolean;
  ichingDetail: IChingContent | null;
  destinyMapDetail: DestinyMapContent | null;
  calendarDetail: CalendarContent | null;
  tarotDetail: TarotContent | null;
  numerologyDetail: NumerologyContent | null;
  icpDetail: ICPContent | null;
  compatibilityDetail: PersonalityCompatibilityContent | null;
  matrixDetail: DestinyMatrixContent | null;
  loadReadingDetail: (record: ServiceRecord) => Promise<void>;
  closeDetail: () => void;
}

export function useDetailModal(): UseDetailModalReturn {
  const [selectedRecord, setSelectedRecord] = useState<ServiceRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [ichingDetail, setIchingDetail] = useState<IChingContent | null>(null);
  const [destinyMapDetail, setDestinyMapDetail] = useState<DestinyMapContent | null>(null);
  const [calendarDetail, setCalendarDetail] = useState<CalendarContent | null>(null);
  const [tarotDetail, setTarotDetail] = useState<TarotContent | null>(null);
  const [numerologyDetail, setNumerologyDetail] = useState<NumerologyContent | null>(null);
  const [icpDetail, setIcpDetail] = useState<ICPContent | null>(null);
  const [compatibilityDetail, setCompatibilityDetail] = useState<PersonalityCompatibilityContent | null>(null);
  const [matrixDetail, setMatrixDetail] = useState<DestinyMatrixContent | null>(null);

  const loadReadingDetail = useCallback(async (record: ServiceRecord) => {
    setSelectedRecord(record);
    setDetailLoading(true);
    setIchingDetail(null);
    setDestinyMapDetail(null);
    setCalendarDetail(null);
    setTarotDetail(null);
    setNumerologyDetail(null);
    setIcpDetail(null);
    setCompatibilityDetail(null);
    setMatrixDetail(null);

    try {
      if (record.service === 'iching' && record.type === 'reading') {
        const res = await fetch(`/api/readings/${record.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.reading?.content) {
            const parsed = JSON.parse(data.reading.content) as IChingContent;
            setIchingDetail(parsed);
          }
        }
      } else if (record.service === 'destiny-map' && record.type === 'consultation') {
        const res = await fetch(`/api/consultation/${record.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.data) {
            setDestinyMapDetail(data.data as DestinyMapContent);
          } else {
            setDestinyMapDetail({
              id: record.id,
              theme: record.theme || 'focus_overall',
              summary: record.summary || 'Destiny Map 분석',
              fullReport: undefined,
              createdAt: record.date,
            });
          }
        } else {
          setDestinyMapDetail({
            id: record.id,
            theme: record.theme || 'focus_overall',
            summary: record.summary || 'Destiny Map 분석',
            fullReport: undefined,
            createdAt: record.date,
          });
        }
      } else if (record.service === 'destiny-calendar' && record.type === 'calendar') {
        const res = await fetch(`/api/calendar/save/${record.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.savedDate) {
            setCalendarDetail({
              ...data.savedDate,
              categories: data.savedDate.categories || [],
              bestTimes: data.savedDate.bestTimes || [],
              sajuFactors: data.savedDate.sajuFactors || [],
              astroFactors: data.savedDate.astroFactors || [],
              recommendations: data.savedDate.recommendations || [],
              warnings: data.savedDate.warnings || [],
            } as CalendarContent);
          }
        }
      } else if (record.service === 'tarot' && (record.type === 'reading' || record.type === 'tarot-reading')) {
        const res = await fetch(`/api/tarot/save/${record.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.reading) {
            setTarotDetail({
              categoryId: data.reading.theme || '',
              spreadId: data.reading.spreadId || '',
              spreadTitle: data.reading.spreadTitle || '타로 리딩',
              cards: data.reading.cards || [],
              userQuestion: data.reading.question,
              overallMessage: data.reading.overallMessage,
              cardInsights: data.reading.cardInsights,
              guidance: data.reading.guidance,
              affirmation: data.reading.affirmation,
            });
          }
        } else {
          const fallbackRes = await fetch(`/api/readings/${record.id}`);
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            if (data.reading?.content) {
              const parsed = JSON.parse(data.reading.content) as TarotContent;
              setTarotDetail(parsed);
            }
          }
        }
      } else if (record.service === 'numerology' && record.type === 'numerology') {
        const res = await fetch(`/api/readings/${record.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.reading?.content) {
            const parsed = JSON.parse(data.reading.content) as NumerologyContent;
            setNumerologyDetail(parsed);
          }
        }
      } else if (record.service === 'personality-icp' && record.type === 'icp-result') {
        const res = await fetch(`/api/personality/icp/save?id=${record.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.result) {
            setIcpDetail(data.result as ICPContent);
          }
        }
      } else if (record.service === 'personality-compatibility' && record.type === 'compatibility-result') {
        const res = await fetch(`/api/personality/compatibility/save?id=${record.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.result) {
            setCompatibilityDetail(data.result as PersonalityCompatibilityContent);
          }
        }
      } else if (record.service === 'destiny-matrix' && record.type === 'destiny-matrix-report') {
        const res = await fetch(`/api/destiny-matrix/save?id=${record.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.result) {
            setMatrixDetail(data.result as DestinyMatrixContent);
          }
        }
      }
    } catch (e) {
      logger.error('Failed to load reading detail:', e);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setSelectedRecord(null);
    setIchingDetail(null);
    setDestinyMapDetail(null);
    setCalendarDetail(null);
    setTarotDetail(null);
    setNumerologyDetail(null);
    setIcpDetail(null);
    setCompatibilityDetail(null);
    setMatrixDetail(null);
  }, []);

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
  };
}
