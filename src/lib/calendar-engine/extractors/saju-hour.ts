import { STEMS, BRANCHES, TIME_STEM_LOOKUP } from '@/lib/saju/constants'
import { computeDayStem } from './saju-shinsal'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'
import type { FiveElement, SibsinKind, YinYang } from '@/lib/saju/types'
import { HOUR_BRANCH_NARRATIVE, pickHourNarrative } from '../data/hourBranchNarrative'
import { getSibsinFromStemInfo as getSibsin } from './shared/sibsin'

/**
 * 사주 시주(時柱) 추출기 — 24시간 변별력 확보.
 *
 * 매일 12 시진(2시간 단위)별로 시주 간지를 계산하고, 본명 일간 기준 십신·
 * 용신 부합 여부로 폴라리티 결정. 매일 ~12개 신호 → 24h chart의
 * BEST/WORST 시간 변별력 핵심 데이터.
 *
 * 활성 윈도우: 그 시진 2시간.
 *
 * 너무 많은 신호 생성 방지를 위해 polarity 0 (중립)은 emit 안 함.
 */

const HOUR_BRANCH_RANGES: Array<{ idx: number; start: number; end: number }> = [
  { idx: 0,  start: 23 * 60,    end: 24 * 60 + 60 },   // 자시 23~01 (wraps)
  { idx: 1,  start: 1 * 60,     end: 3 * 60 },          // 축시
  { idx: 2,  start: 3 * 60,     end: 5 * 60 },          // 인시
  { idx: 3,  start: 5 * 60,     end: 7 * 60 },          // 묘시
  { idx: 4,  start: 7 * 60,     end: 9 * 60 },          // 진시
  { idx: 5,  start: 9 * 60,     end: 11 * 60 },         // 사시
  { idx: 6,  start: 11 * 60,    end: 13 * 60 },         // 오시
  { idx: 7,  start: 13 * 60,    end: 15 * 60 },         // 미시
  { idx: 8,  start: 15 * 60,    end: 17 * 60 },         // 신시
  { idx: 9,  start: 17 * 60,    end: 19 * 60 },         // 유시
  { idx: 10, start: 19 * 60,    end: 21 * 60 },         // 술시
  { idx: 11, start: 21 * 60,    end: 23 * 60 },         // 해시
]

const sajuHourExtractor: SignalExtractor = {
  source: 'saju',
  kind: ['pillar-sibsin'] as never,
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const dayMaster = pillarToStemInfo(natal.saju.pillars.day.heavenlyStem.name)
    if (!dayMaster) return []
    const yongsin = natal.saju.yongsin

    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const date = new Date(t)
      const dayStemName = computeDayStem(date)
      if (!dayStemName) continue

      const firstHourStemName = TIME_STEM_LOOKUP[dayStemName]
      if (!firstHourStemName) continue
      const firstHourStemIdx = STEMS.findIndex((s) => s.name === firstHourStemName)

      const dayIso = date.toISOString().slice(0, 10)

      // 12 시진별 신호 생성
      for (const range of HOUR_BRANCH_RANGES) {
        const branchIdx = range.idx
        const stemIdx = (firstHourStemIdx + branchIdx) % 10
        const stem = STEMS[stemIdx]
        const branch = BRANCHES[branchIdx]
        if (!stem || !branch) continue

        const sibsin = getSibsin(dayMaster, stem as StemInfo)
        if (!sibsin) continue

        const polarity = polarityFromYongsin(stem.element as FiveElement, yongsin)
        if (polarity === 0) continue   // 중립 — 노이즈 방지

        // 시진 시간 윈도우 (KST 기준 단순화 — UTC로 변환은 생략)
        // 자시는 wrap: 23~24 또는 0~1
        const startHour = branchIdx === 0 ? 23 : (branchIdx * 2 - 1)
        const endHour = branchIdx === 0 ? 1 : (branchIdx * 2 + 1)
        const startIso = branchIdx === 0
          ? `${dayIso}T23:00:00.000Z`
          : `${dayIso}T${String(startHour).padStart(2, '0')}:00:00.000Z`
        const endIso = branchIdx === 0
          ? `${nextDayIso(date)}T01:00:00.000Z`
          : `${dayIso}T${String(endHour).padStart(2, '0')}:00:00.000Z`
        const peakHour = branchIdx === 0 ? 0 : branchIdx * 2
        const peakIso = `${dayIso}T${String(peakHour).padStart(2, '0')}:00:00.000Z`

        // 12 시진 narrative DB에서 baseline + polarity 매칭 텍스트 가져오기.
        // polarity 부호에 따라 baseline/positive/caution 분기.
        // BRANCHES.name은 한자(子, 丑, 寅...)인데 HOUR_BRANCH_NARRATIVE
        // 키는 한글(자, 축, 인...)이라 직접 매칭 안 됨 — 한자→한글 변환.
        const HANJA_TO_HANGUL: Record<string, string> = {
          '子': '자', '丑': '축', '寅': '인', '卯': '묘',
          '辰': '진', '巳': '사', '午': '오', '未': '미',
          '申': '신', '酉': '유', '戌': '술', '亥': '해',
        }
        const branchKo = (HANJA_TO_HANGUL[branch.name] ?? branch.name) as keyof typeof HOUR_BRANCH_NARRATIVE
        const branchNarrative = HOUR_BRANCH_NARRATIVE[branchKo]
        const headline = branchNarrative
          ? pickHourNarrative(branchKo, polarity, 'ko')
          : undefined
        const windowLabel = branchNarrative?.windowKo

        signals.push({
          id: `saju.hour.${dayIso}.${branch.name}.${stem.name}`,
          source: 'saju',
          kind: 'pillar-sibsin',
          name: `${stem.name}${branch.name} (${sibsin}) 시진`,
          themes: [],
          polarity,
          layer: 'hourly',
          active: { start: startIso, peak: peakIso, end: endIso },
          weight: 0.4,    // 시진은 짧고 미세 영향
          evidence: {
            module: 'saju-hour',
            sibsin,
            element: stem.element as FiveElement,
            pillars: [`${stem.name}${branch.name}`],
            detail: {
              hourBranch: branch.name,
              hourStem: stem.name,
              startHour,
              endHour,
              natalDayMaster: dayMaster.name,
              yongsin: yongsin.primary,
              // 12 시진 narrative DB에서 polarity 매칭 텍스트 + 윈도우 라벨
              windowLabel,
              narrative: headline,
            },
          },
        })
      }
    }

    return signals
  },
}

function nextDayIso(d: Date): string {
  return new Date(d.getTime() + 86_400_000).toISOString().slice(0, 10)
}

interface StemInfo { name: string; element: FiveElement; yin_yang: YinYang }

function pillarToStemInfo(stemName: string): StemInfo | null {
  const found = STEMS.find((s) => s.name === stemName)
  return found ? (found as StemInfo) : null
}


function polarityFromYongsin(
  element: FiveElement,
  yongsin: { primary: FiveElement; secondary?: FiveElement; avoid: FiveElement[] },
): Polarity {
  if (element === yongsin.primary) return 2
  if (element === yongsin.secondary) return 1
  if (yongsin.avoid.includes(element)) return -2
  return 0
}

export default sajuHourExtractor
