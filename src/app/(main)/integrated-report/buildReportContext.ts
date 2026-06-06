// src/app/(main)/integrated-report/buildReportContext.ts
//
// 통합 리포트 *전용* 본명 컨텍스트 빌더.
// buildNatalContext (calendar-engine 의 fat wrapper) 대신 page 가 자기
// 필요한 분석만 직접 호출. 운명상담사·궁합 facts 패턴 ("raw → facts →
// consumer 가 자기 분석 호출") 을 통합 리포트에도 적용한 시작점.
//
// 안 받는 것 (통합 리포트 UI 표시 0 이라 dead):
//   - Profection / 7 Arabic Lots / Zodiacal Releasing / Almuten Figuris
//   - dignity 5-tier (adapter 가 단순 dignityOf 재계산 중)
//
// 받는 것 (adapter 가 실제로 그리는 것):
//   - sajuFacts._raw 의 pillars/dayMaster/fiveElements/daeWoon
//   - sajuFacts.yongsin / geokguk / strength / relations
//   - 사주 추가 분석: performAnalyses (격국/용신/통근/득령/형충/십신),
//     annotateShinsal (신살), getTwelveStagesForPillars (12운성),
//     dayJijanggan (일주 지장간)
//   - astroFacts._chart (행성 + 하우스 + ASC/MC)
//   - 점성 추가 분석: extraPoints (Chiron/Lilith), sect (낮/밤),
//     findNatalAspects (major+minor)
//
// NatalContext shape 호환 — adapter (natalToReportData / buildCrossRows) 가
// 같은 shape 받음. zodiacalReleasing/dignities/lots/almutenFiguris 는 빈
// 값 채워 type 만족.

import { collectSajuFacts } from '@/lib/destiny/sajuFacts'
import { collectAstroFacts } from '@/lib/destiny/astroFacts'
import { performAnalyses } from '@/app/api/saju/services/analyses'
import { annotateShinsal, getTwelveStagesForPillars } from '@/lib/saju/shinsal'
import { calculateChiron, calculateLilith } from '@/lib/astrology/foundation/extraPoints'
import { findNatalAspects } from '@/lib/astrology/foundation/aspects'
import { natalToJD } from '@/lib/astrology/foundation/shared'
import { JIJANGGAN } from '@/lib/saju/constants'
import { logger } from '@/lib/logger'
import type {
  NatalContext,
  NatalDayJijanggan,
} from '@/lib/calendar-engine/context/types'
import type { FiveElement, SajuPillarsInput } from '@/lib/saju/types'
import type { AspectHit, PlanetBase } from '@/lib/astrology/foundation/types'

export interface ReportContextInput {
  birthDate: string // 'YYYY-MM-DD' (solar)
  birthTime: string // 'HH:MM'
  gender: 'male' | 'female'
  latitude: number
  longitude: number
  timeZone: string
}

export async function buildReportContext(input: ReportContextInput): Promise<NatalContext> {
  // ─── raw 정제 ─────────────────────────────────────────────────────────
  const sajuFacts = collectSajuFacts({
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    gender: input.gender,
    timezone: input.timeZone,
    longitude: input.longitude,
  })
  const astroFacts = await collectAstroFacts({
    birthDate: input.birthDate,
    birthTime: input.birthTime,
    latitude: input.latitude,
    longitude: input.longitude,
    timezone: input.timeZone,
    // 통합 리포트는 hellenistic 5개 (Profection/Lots/ZR/Almuten/5-tier
    // dignity) 화면 표시 0 → 안 받음 (계산 비용 절약).
    // extraPoints / sect / natalAspects 는 아래에서 직접 호출.
    includeHellenistic: false,
  })
  if (!astroFacts) {
    throw new Error('buildReportContext: collectAstroFacts returned null')
  }
  const raw = sajuFacts._raw
  const pillars = raw.pillars
  const chart = astroFacts._chart

  // ─── 사주 분석 (page 가 자기 책임으로 호출) ──────────────────────────
  const pillarsInput: SajuPillarsInput = {
    year: { stem: pillars.year.heavenlyStem.name, branch: pillars.year.earthlyBranch.name },
    month: { stem: pillars.month.heavenlyStem.name, branch: pillars.month.earthlyBranch.name },
    day: { stem: pillars.day.heavenlyStem.name, branch: pillars.day.earthlyBranch.name },
    time: { stem: pillars.time.heavenlyStem.name, branch: pillars.time.earthlyBranch.name },
  }
  const pillarsWithHour = {
    year: pillarsInput.year,
    month: pillarsInput.month,
    day: pillarsInput.day,
    hour: pillarsInput.time,
  }
  const simplePillarsWithHour = { ...pillarsInput, hour: pillarsInput.time }
  const analyses = performAnalyses(
    simplePillarsWithHour,
    pillarsWithHour,
    pillars.day.heavenlyStem.name,
    pillars.month.earthlyBranch.name,
  )
  const shinsalAnnot = annotateShinsal(pillars)
  const twelveStages = getTwelveStagesForPillars(pillars)

  // 일주(日柱) 지지의 지장간 3층 — adapter 의 mapPillar 가 사용.
  const dayBranchName = pillars.day.earthlyBranch.name
  const dayJj = JIJANGGAN[dayBranchName] ?? {}
  const dayJijanggan: NatalDayJijanggan = {
    jeonggi: dayJj['정기'] ?? '',
    junggi: dayJj['중기'] || undefined,
    yeogi: dayJj['여기'] || undefined,
  }

  // 대운 list — calendar-engine 의 buildNatalContext 와 동일 변환.
  // d.age 는 만 나이 — 출생연도 + age = 해당 도달 연도.
  const [Y, M, D] = input.birthDate.split('-').map(Number)
  const [h, mi] = input.birthTime.split(':').map(Number)
  const daeunList = (raw.daeWoon?.list ?? []).map((d) => ({
    startAge: d.age,
    startYear: Y + d.age,
    stem: d.heavenlyStem,
    branch: d.earthlyBranch,
  }))

  // 사주 강약 라벨 변환 (사주 SSOT 의 한글 등급 → calendar-engine 의 영문 라벨).
  const mapStrength = (s: string): 'strong' | 'medium' | 'weak' => {
    if (s === '극신강' || s === '신강') return 'strong'
    if (s === '극신약' || s === '신약') return 'weak'
    return 'medium'
  }

  // ─── 점성 분석 (page 가 자기 책임으로 호출) ──────────────────────────
  // 섹트 — Sun 이 7~12궁 (지평선 위) → day, 아니면 night.
  const sun = chart.planets.find((p) => p.name === 'Sun')
  const sect: 'day' | 'night' = sun && sun.house >= 7 ? 'day' : 'night'

  // Chiron + Lilith — adapter.ts:116 이 그림 (extraPoints 필드). 실패 시 무시.
  let extraPoints: PlanetBase[] | undefined
  try {
    const utJd = natalToJD({
      year: Y,
      month: M,
      date: D,
      hour: h,
      minute: mi,
      latitude: input.latitude,
      longitude: input.longitude,
      timeZone: input.timeZone,
    })
    const houseCusps = chart.houses.map((hc) => hc.cusp)
    extraPoints = [calculateChiron(utJd, houseCusps), calculateLilith(utJd, houseCusps)]
  } catch (err) {
    logger.warn('[buildReportContext] extraPoints calc failed', {
      err: err instanceof Error ? err.message : String(err),
    })
    extraPoints = undefined
  }

  // 본명 aspects (major + minor, +3° natal-orb). adapter.ts:123 사용.
  let natalAspects: AspectHit[]
  try {
    natalAspects = findNatalAspects(chart, { includeMinor: true })
  } catch (err) {
    logger.warn('[buildReportContext] findNatalAspects failed', {
      err: err instanceof Error ? err.message : String(err),
    })
    natalAspects = []
  }

  // ─── ctx 구성 (NatalContext shape 호환) ──────────────────────────────
  return {
    input: {
      year: Y,
      month: M,
      date: D,
      hour: h,
      minute: mi,
      latitude: input.latitude,
      longitude: input.longitude,
      timeZone: input.timeZone,
    },
    saju: {
      pillars,
      dayMaster: pillars.day.heavenlyStem,
      yongsin: {
        primary: sajuFacts.yongsin?.primaryYongsin as FiveElement,
        secondary: sajuFacts.yongsin?.secondaryYongsin as FiveElement | undefined,
        avoid: [sajuFacts.yongsin?.kibsin, sajuFacts.yongsin?.gusin].filter(
          Boolean,
        ) as FiveElement[],
      },
      geokguk: sajuFacts.geokguk ?? undefined,
      strength: mapStrength(sajuFacts.strength),
      natalShinsal: shinsalAnnot.hits as never,
      natalRelations: sajuFacts.relations as never,
      daeun: daeunList,
      fiveElements: raw.fiveElements,
      analyses,
      dayJijanggan,
      // adapter.ts 가 stages 룩업 (`saju.twelveStages`) — page 가 직접 더하던
      // 옛 패턴을 ctx 안으로 흡수. NatalContext type 에는 없지만 caller 가
      // 사용하므로 안전한 추가 필드로 둠.
      twelveStages,
    } as unknown as NatalContext['saju'],
    astro: {
      chart,
      extraPoints,
      sect,
      location: {
        latitude: input.latitude,
        longitude: input.longitude,
        timeZone: input.timeZone,
      },
      natalAspects,
      // 통합 리포트가 안 쓰는 hellenistic 5개 — 빈 값 채워 NatalContext
      // type 만족. adapter 코드 손대지 않고 같은 shape 유지.
      zodiacalReleasing: { spirit: null, fortune: null },
      dignities: [],
      lots: [],
      almutenFiguris: null,
    },
  }
}
