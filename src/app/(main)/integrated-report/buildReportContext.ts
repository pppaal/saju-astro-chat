// src/app/(main)/integrated-report/buildReportContext.ts
//
// 통합 리포트 *전용* 본명 컨텍스트 빌더 — Phase A (2026-06-06):
// 정통 점성 깊이 (Almuten / Arabic Lots / dignity 5-tier / Chiron·Lilith /
// aspects major+minor) 까지 facts 에서 받아 ctx 에 채움.
//
// 받는 것:
//   - sajuFacts._raw — pillars/dayMaster/fiveElements/daeWoon
//   - sajuFacts.yongsin / geokguk / strength / relations
//   - 사주 추가 분석 (page 직접 호출):
//       performAnalyses (격국/용신/통근/득령/형충/십신)
//       annotateShinsal (신살)
//       getTwelveStagesForPillars (12운성)
//       dayJijanggan (일주 지장간)
//   - astroFacts._chart (행성 + 하우스 + ASC/MC)
//   - astroFacts.hellenistic — 정통 점성 정적 분석 일체:
//       sect / extraPoints (Chiron/Lilith) / natalAspects (major+minor) /
//       dignities (5-tier per planet) / lots (7 Arabic Lots) /
//       zodiacalReleasing (Spirit/Fortune L1) / almutenFiguris
//
// 시간 흐름은 안 받음 — Profection / Transit / SR / LR / Progression /
// 형충회합 시간 cross. 그건 운명상담사 LLM / 캘린더 영역.
//
// NatalContext shape 호환 — adapter (natalToReportData / buildCrossRows) 가
// 같은 shape 받음.

import { collectSajuFacts } from '@/lib/destiny/sajuFacts'
import { collectAstroFacts } from '@/lib/destiny/astroFacts'
import { performAnalyses } from '@/app/api/saju/services/analyses'
import { annotateShinsal, getTwelveStagesForPillars } from '@/lib/saju/shinsal'
import { JIJANGGAN } from '@/lib/saju/constants'
import type {
  NatalContext,
  NatalDayJijanggan,
} from '@/lib/calendar-engine/context/types'
import type { FiveElement, SajuPillarsInput } from '@/lib/saju/types'

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
    // Phase A: 정통 점성 정적 분석 일체 받기 (Almuten/Lots/dignity 5-tier/
    // Chiron·Lilith/aspects major+minor/sect). facts 가 다 만들어 줘서
    // page 가 직접 호출할 필요 없음. 시간 흐름(Profection/Transit/SR/LR/
    // Progression) 은 facts 가 안 만듦 — 통합 리포트도 안 받음.
    includeHellenistic: true,
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

  // ─── 점성 분석 — astroFacts.hellenistic 가 다 만들어줌 ──────────────
  // includeHellenistic:true 로 collectAstroFacts 호출했으므로 정통 점성 정적
  // 분석 일체 (sect / extraPoints (Chiron·Lilith) / natalAspects major+minor
  // / dignities 5-tier / lots 7 Arabic / zodiacalReleasing / almutenFiguris)
  // 가 facts.hellenistic 안에 들어있음. page 가 직접 호출할 필요 없음.
  const hellenistic = astroFacts.hellenistic
  if (!hellenistic) {
    throw new Error('buildReportContext: astroFacts.hellenistic 없음 (includeHellenistic 옵션 확인)')
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
      extraPoints: hellenistic.extraPoints,
      sect: hellenistic.sect,
      location: {
        latitude: input.latitude,
        longitude: input.longitude,
        timeZone: input.timeZone,
      },
      natalAspects: hellenistic.natalAspects,
      zodiacalReleasing: hellenistic.zodiacalReleasing,
      dignities: hellenistic.dignities,
      lots: hellenistic.lots,
      almutenFiguris: hellenistic.almutenFiguris,
    },
  }
}
