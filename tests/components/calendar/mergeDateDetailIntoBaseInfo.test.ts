import { describe, it, expect } from 'vitest'
import { mergeDateDetailIntoBaseInfo } from '@/components/calendar/CalendarActionPlanView.helpers'
import type { ImportantDate } from '@/components/calendar/types'
import type { DateDetailResponse } from '@/components/calendar/useDateDetail'

const baseInfo: ImportantDate = {
  date: '2026-04-13',
  grade: 0,
  score: 90,
  categories: ['career', 'general'],
  title: '편인 흐름의 날 · 커리어 추진력이 살아나는 날',
  description: '커리어 결단의 무게를 가져갈 만한 날입니다.',
  summary: '본명에 화개가 활성화돼…',
  bestTimes: ['09:00-10:00'],
  sajuFactors: ['이번 달은 일간 甲(목) 위에 월간 壬(수)가 편인으로 들어와 학습 시간이 두드러집니다.'],
  astroFactors: ['사주↔점성 교차 일치도 100% — 두 축이 같은 방향'],
  recommendations: ['핵심 업무 1건 처리'],
  warnings: [],
  ganzhi: '',
}

const detail: DateDetailResponse = {
  date: '2026-04-13',
  grade: 3,
  score: 33,
  categories: ['career'],
  ganzhi: '丁丑',
  transitSunSign: 'Aries',
  crossVerified: false,
  crossAgreementPercent: 34,
  confidence: 75,
  sajuFactorKeys: ['stemGwansal', 'branchChung', 'shinsal_yeokma'],
  astroFactorKeys: ['retrogradeJupiter', 'moonPhaseWaningCrescent'],
  recommendationKeys: ['careful', 'postpone'],
  warningKeys: ['tension'],
  gongmangStatus: { isEmpty: true, emptyBranches: ['戌', '亥'], affectedAreas: [] },
  shinsalActive: [{ name: '화개', type: 'lucky', affectedArea: '학문/예술' }],
  energyFlow: {
    strength: 'strong',
    dominantElement: '금',
    tonggeunCount: 0,
    tuechulCount: 3,
  },
  bestHours: [
    { hour: 5, siGan: '卯', quality: 'excellent' },
    { hour: 6, siGan: '卯', quality: 'excellent' },
    { hour: 14, siGan: '未', quality: 'neutral' },
  ],
}

describe('mergeDateDetailIntoBaseInfo', () => {
  it('returns baseInfo unchanged when detail is null', () => {
    const result = mergeDateDetailIntoBaseInfo(baseInfo, null, true)
    expect(result).toBe(baseInfo)
  })

  it('returns null when baseInfo is null', () => {
    const result = mergeDateDetailIntoBaseInfo(null, detail, true)
    expect(result).toBeNull()
  })

  it('replaces ganzhi with detail.ganzhi (real daily pillar)', () => {
    const result = mergeDateDetailIntoBaseInfo(baseInfo, detail, true)
    expect(result?.ganzhi).toBe('丁丑')
  })

  it('appends translated saju factor keys to existing factors', () => {
    const result = mergeDateDetailIntoBaseInfo(baseInfo, detail, true)
    // Original counselor sentence preserved
    expect(result?.sajuFactors[0]).toContain('편인')
    // 풀 엔진 키들이 한글로 번역되어 뒤에 합류 (translation dict 확인용 — 적어도 추가가 일어남)
    expect(result!.sajuFactors.length).toBeGreaterThan(baseInfo.sajuFactors.length)
  })

  it('promotes excellent best hours into bestTimes (Korean format)', () => {
    const result = mergeDateDetailIntoBaseInfo(baseInfo, detail, true)
    expect(result?.bestTimes).toContain('05:00-06:00 (최상)')
    expect(result?.bestTimes).toContain('06:00-07:00 (최상)')
    // neutral 시간대는 추가되지 않음
    expect(result?.bestTimes?.some((s) => s.startsWith('14:'))).toBe(false)
  })

  it('surfaces shinsal active as a saju factor line', () => {
    const result = mergeDateDetailIntoBaseInfo(baseInfo, detail, true)
    const joined = result!.sajuFactors.join(' ')
    expect(joined).toContain('화개')
    expect(joined).toContain('학문/예술')
  })

  it('surfaces gongmang day notice', () => {
    const result = mergeDateDetailIntoBaseInfo(baseInfo, detail, true)
    const joined = result!.sajuFactors.join(' ')
    expect(joined).toContain('공망')
    expect(joined).toContain('戌')
  })

  it('surfaces energy flow line', () => {
    const result = mergeDateDetailIntoBaseInfo(baseInfo, detail, true)
    const joined = result!.sajuFactors.join(' ')
    expect(joined).toContain('에너지 흐름')
    expect(joined).toContain('strong')
  })

  it('caps factor list length to 6', () => {
    const result = mergeDateDetailIntoBaseInfo(baseInfo, detail, true)
    expect(result!.sajuFactors.length).toBeLessThanOrEqual(6)
    expect(result!.astroFactors.length).toBeLessThanOrEqual(6)
    expect(result!.bestTimes!.length).toBeLessThanOrEqual(6)
  })

  it('emits English copy when isKo=false', () => {
    const result = mergeDateDetailIntoBaseInfo(baseInfo, detail, false)
    const sajuJoin = result!.sajuFactors.join(' ')
    expect(sajuJoin).toContain('Void day')
    expect(sajuJoin).toContain("energy is strong")
    expect(result?.bestTimes).toContain('05:00-06:00 (excellent)')
  })

  it('does not duplicate existing factors (idempotent merge)', () => {
    const detailWithDup: DateDetailResponse = {
      ...detail,
      sajuFactorKeys: detail.sajuFactorKeys, // re-translation will produce same KO strings
    }
    const first = mergeDateDetailIntoBaseInfo(baseInfo, detailWithDup, true)
    const second = mergeDateDetailIntoBaseInfo(first, detailWithDup, true)
    expect(second!.sajuFactors.length).toBe(first!.sajuFactors.length)
  })
})
