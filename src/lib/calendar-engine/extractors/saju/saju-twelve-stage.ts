import { getTwelveStage } from '@/lib/saju/shinsal'
import { getSolarTermKST } from '@/lib/saju/constants'
import { getYearPillarForDate, getMonthPillarForDate } from '@/lib/saju/datePillars'
import { computeDayBranch } from './saju-shinsal'
import { iga } from '@/lib/i18n/koParticle'
import type {
  ActiveSignal,
  ExtractorContext,
  SignalExtractor,
  Polarity,
  SignalLayer,
} from '../../types'

/**
 * 12운성 (十二運星) 매트릭스 추출기.
 *
 * 정통 자평명리에서 12운성은 "한 사람의 에너지 상태 12단계 사이클" 이다.
 * 일간(日干) 기준으로 어떤 지지가 떴는지 보고 단계를 읽는다.
 *
 * 이 extractor 는 두 층의 신호를 emit 한다:
 *
 *  1) 일진 단일 12운성 (legacy) — 일진 지지 한 단계만 본다.
 *
 *  2) 본명-시기 매트릭스 (new, 정통 회복) — 본명 4기둥(년/월/일/시)의
 *     각 지지가 가진 12운성을, 시기 지지(대운/세운/월운/일진)의 12운성과
 *     쌍으로 매칭. "본명 일지 절(絕)" 인 사람이 "대운 장생" 으로 들어가면
 *     강한 회복 신호 — 정통 통변에서 가장 자주 쓰이는 페어 신호.
 *
 *  본명 4기둥의 12운성 정적 스냅샷은 별도 본명 신호로는 잡지 않는다
 *  (운명 정적 상태 — 시기 신호가 아님). 시기 지지와 만나야 의미가 생긴다.
 *
 * 활성 윈도우:
 *  - 일진 단일: 그 1일.
 *  - 대운 매트릭스: 그 대운(10년) 기간 전체. 4 본명 기둥에 대해 4 emit.
 *  - 세운 매트릭스: 그 세운(1년, 입춘 기준).
 *  - 월운 매트릭스: 그 1달.
 *  - 일진 매트릭스: 그 1일.
 */

/**
 * 12운성별 polarity. 정통 doctrine:
 *  - 강왕(强旺): 장생·관대·임관/건록·왕지/제왕   → +1 ~ +2
 *  - 사절(死絕): 사·묘·절                       → -1 ~ -2
 *  - 중성(中性): 양·태·목욕·쇠·병                → 0 ~ ±1
 */
const STAGE_POLARITY: Record<string, Polarity> = {
  장생: 2, // 새로운 시작·생기 — 강왕 최강
  목욕: -1, // 변화·불안정
  관대: 1, // 성장·자립
  임관: 2, // 성숙·실력 발휘  (= 건록)
  건록: 2,
  왕지: 2, // 절정             (= 제왕)
  제왕: 2,
  쇠: 0, // 안정에서 하강
  병: -1, // 약화
  사: -2, // 끝맺음
  묘: -1, // 수렴·매장
  절: -2, // 단절 — 사절 최강
  태: 1, // 새로 잉태
  양: 1, // 자라남
}

const STAGE_LABEL: Record<string, string> = {
  장생: '장생 — 새 출발',
  목욕: '목욕 — 변화·시행착오',
  관대: '관대 — 자립·성장',
  임관: '임관 — 실력 발휘',
  건록: '건록 — 실력 발휘',
  왕지: '왕지 — 절정',
  제왕: '제왕 — 절정',
  쇠: '쇠 — 안정 하강',
  병: '병 — 기운 약화',
  사: '사 — 끝맺음',
  묘: '묘 — 수렴',
  절: '절 — 단절',
  태: '태 — 잉태',
  양: '양 — 자라남',
}

/**
 * 12운성 단계별 흐름(flow) 한 줄 — 명사 라벨(STAGE_LABEL)과 달리 "지금 무엇이
 * 흐르는가" 를 풀어 쓴다. 단계 에너지를 그대로 묘사하므로 층 무관 사용 가능.
 */
const STAGE_FLOW: Record<string, { ko: string; en: string }> = {
  장생: { ko: '새로 시작하는 생기가 도는', en: 'fresh starting vitality stirs' },
  목욕: { ko: '흔들리며 시행착오로 다듬어지는', en: 'wobbling, refined through trial and error' },
  관대: { ko: '자립하며 한 단계 올라서는', en: 'standing on your own and stepping up' },
  임관: { ko: '실력이 무르익어 제대로 발휘되는', en: 'skill ripens and comes into full play' },
  건록: { ko: '실력이 무르익어 제대로 발휘되는', en: 'skill ripens and comes into full play' },
  왕지: { ko: '기운이 절정에 오르는', en: 'energy rises to its peak' },
  제왕: { ko: '기운이 절정에 오르는', en: 'energy rises to its peak' },
  쇠: { ko: '정점을 지나 천천히 가라앉는', en: 'past the peak, slowly settling' },
  병: { ko: '기운이 약해져 쉬어가야 하는', en: 'energy weakens — time to rest' },
  사: { ko: '한 매듭이 끝나고 마무리되는', en: 'a chapter ends and wraps up' },
  묘: { ko: '안으로 거두어 갈무리하는', en: 'drawing inward and storing away' },
  절: { ko: '인연이 끊기고 새 판을 기다리는', en: 'ties are cut, awaiting a new board' },
  태: { ko: '새로운 씨앗이 잉태되는', en: 'a new seed is conceived' },
  양: { ko: '조용히 자라나며 힘을 모으는', en: 'quietly growing and gathering strength' },
}

/** 일진 단일 12운성 → 흐름 한 줄. 미지 단계면 "". */
function stageFlowLine(stage: string, lang: 'ko' | 'en' = 'ko'): string {
  const f = STAGE_FLOW[stage]
  if (!f) return ''
  return lang === 'en' ? `a day when ${f.en}` : `${f.ko} 흐름이에요`
}

/**
 * 본명-시기 12운성 페어 → 전이(transition) 흐름 한 줄.
 * pairPolarity 와 같은 doctrine 분류(회복/쇠퇴/절정유지/정체)를 자연어로.
 */
function matrixFlowLine(
  natalStage: string,
  cyclicalStage: string,
  natalLabel: string,
  lang: 'ko' | 'en' = 'ko',
  natalLabelEn?: string
): string {
  const n = STAGE_POLARITY[natalStage] ?? 0
  const c = STAGE_POLARITY[cyclicalStage] ?? 0
  if (lang === 'en') {
    const nl = natalLabelEn ?? natalLabel
    if (n <= -1 && c >= 2) return `energy long suppressed at your ${nl} revives — a recovery flow`
    if (n >= 2 && c <= -1) return `past the peak at your ${nl} — time to draw strength back in`
    if (n >= 2 && c >= 2) return `the strong energy at your ${nl} keeps carrying on`
    if (n <= -1 && c <= -1) return `your ${nl} stays pressed down — easy to stall`
    const f = STAGE_FLOW[cyclicalStage]
    return f ? `your ${nl} flows into a phase where ${f.en}` : ''
  }
  const josa = iga(natalLabel)
  if (n <= -1 && c >= 2) return `${natalLabel}에 눌려 있던 기운이 다시 살아나는 회복의 흐름이에요`
  if (n >= 2 && c <= -1) return `${natalLabel}의 절정을 지나 힘을 거두어야 하는 흐름이에요`
  if (n >= 2 && c >= 2) return `${natalLabel}의 강한 기운이 계속 이어지는 흐름이에요`
  if (n <= -1 && c <= -1) return `${natalLabel}${josa} 눌려 정체되기 쉬운 흐름이에요`
  const f = STAGE_FLOW[cyclicalStage]
  return f ? `${natalLabel}${josa} ${f.ko} 시기로 흐르고 있어요` : ''
}

type NatalPosition = 'year' | 'month' | 'day' | 'time'

/**
 * 본명 4기둥 가중치 — 일지가 가장 중요, 월지가 다음, 년/시지는 보조.
 * 정통 통변: "일지는 배우자궁·자기궁", "월지는 격국·환경의 뿌리".
 */
const NATAL_POSITION_WEIGHT: Record<NatalPosition, number> = {
  day: 0.55,
  month: 0.45,
  year: 0.35,
  time: 0.35,
}

const NATAL_POSITION_LABEL: Record<NatalPosition, string> = {
  year: '본명 년지',
  month: '본명 월지',
  day: '본명 일지',
  time: '본명 시지',
}

const NATAL_POSITION_LABEL_EN: Record<NatalPosition, string> = {
  year: 'natal year branch',
  month: 'natal month branch',
  day: 'natal day branch',
  time: 'natal hour branch',
}

/**
 * 시기 지지(대운/세운/월운/일진)와 본명 지지 12운성 페어의 의미 폴라리티.
 *
 * 룰:
 *  - 본명 사절 → 시기 강왕: 강한 회복 신호 (+2)
 *  - 본명 강왕 → 시기 강왕: 절정 유지 (+1)
 *  - 본명 강왕 → 시기 사절: 절정 후 쇠퇴 (-2)
 *  - 본명 사절 → 시기 사절: 정체 (-1)
 *  - 그 외: 두 폴라리티 평균 부호로 결정.
 */
function pairPolarity(natalStage: string, cyclicalStage: string): Polarity {
  const n = STAGE_POLARITY[natalStage] ?? 0
  const c = STAGE_POLARITY[cyclicalStage] ?? 0
  // 사절 → 강왕 회복
  if (n <= -1 && c >= 2) return 2
  // 강왕 → 사절 쇠퇴
  if (n >= 2 && c <= -1) return -2
  // 강왕 → 강왕 절정 유지
  if (n >= 2 && c >= 2) return 1
  // 사절 → 사절 정체
  if (n <= -1 && c <= -1) return -1
  // 그 외 시기 단계의 부호를 따름 (시기가 현재 흐름)
  if (c >= 2) return 2
  if (c >= 1) return 1
  if (c <= -2) return -2
  if (c <= -1) return -1
  return 0
}

const sajuTwelveStageExtractor: SignalExtractor = {
  source: 'saju',
  kind: 'pillar-sibsin', // 별도 SignalKind 안 만들고 pillar-sibsin에 묶음
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range } = ctx
    const dayStemName = natal.saju.pillars.day.heavenlyStem.name
    if (!dayStemName) return []

    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    // 본명 4기둥 지지 + 그 12운성 (한 번만 계산)
    const natalBranches: Array<{ position: NatalPosition; branch: string; stage: string }> = []
    for (const pos of ['year', 'month', 'day', 'time'] as NatalPosition[]) {
      const pillar = natal.saju.pillars[pos]
      const branchName = pillar?.earthlyBranch?.name
      if (!branchName) continue
      const stage = getTwelveStage(dayStemName, branchName)
      natalBranches.push({ position: pos, branch: branchName, stage })
    }

    // ─── 1) 일진 단일 12운성 (legacy 신호) ───
    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const date = new Date(t)
      const targetBranch = computeDayBranch(date)
      if (!targetBranch) continue

      const stage = getTwelveStage(dayStemName, targetBranch)
      if (!stage) continue
      const polarity = STAGE_POLARITY[stage] ?? 0
      if (polarity === 0) continue // 쇠는 중립 → 신호로 안 띄움

      const dayIso = date.toISOString().slice(0, 10)
      signals.push({
        id: `saju.twelve-stage.${dayIso}.${stage}`,
        source: 'saju',
        kind: 'pillar-sibsin',
        name: STAGE_LABEL[stage] ?? `12운성 ${stage}`,
        korean: stageFlowLine(stage, 'ko') || STAGE_LABEL[stage],
        english: stageFlowLine(stage, 'en') || `12-stage ${stage}`,
        polarity,
        layer: 'daily',
        active: {
          start: `${dayIso}T00:00:00.000Z`,
          peak: `${dayIso}T12:00:00.000Z`,
          end: `${dayIso}T23:59:59.999Z`,
        },
        weight: 0.45, // 일진 12운성은 부드러운 신호
        evidence: {
          module: 'saju-twelve-stage',
          detail: {
            twelveStage: stage,
            dayStem: dayStemName,
            targetBranch,
          },
        },
      })
    }

    // ─── 2) 본명-시기 12운성 매트릭스 ───
    // 시기마다 본명 4기둥에 대해 4개 페어 신호 emit.

    // 2-1) 대운 매트릭스 (decadal)
    // 정통: 대운 10년 = 천간 5년 + 지지 5년 분리 (반복반운). 12운성은
    // 지지 5년에 영향이 크다. 단순화를 위해 지지 5년 페어를 후반에 둔다.
    const bMonth = natal.input.month - 1
    const bDate = natal.input.date
    for (const d of natal.saju.daeun) {
      const daeunStartMs = Date.UTC(d.startYear, bMonth, bDate)
      const daeunEndMs = Date.UTC(d.startYear + 10, bMonth, bDate) - 1
      // range 와 겹치는지
      if (daeunEndMs < start.getTime() || daeunStartMs > end.getTime()) continue

      // 대운 후반 5년(지지 5년) 페어
      const branchHalfStartMs = Date.UTC(d.startYear + 5, bMonth, bDate)
      const stageEmitInfo = {
        layer: 'decadal' as SignalLayer,
        active: {
          start: new Date(branchHalfStartMs).toISOString(),
          peak: new Date((branchHalfStartMs + daeunEndMs) / 2).toISOString(),
          end: new Date(daeunEndMs).toISOString(),
        },
        scopeWeight: 1.0,
        cyclicalLabel: `대운 ${d.stem}${d.branch} 지지`,
        cyclicalBranch: d.branch,
        idPrefix: `daeun.${d.startYear}.${d.branch}`,
      }
      emitMatrixSignals(signals, dayStemName, natalBranches, stageEmitInfo)
    }

    // 2-2) 세운 매트릭스 (yearly)
    const ipchun = (y: number): Date => getSolarTermKST(y, 2) ?? new Date(Date.UTC(y, 1, 4))
    const startYear = start.getUTCFullYear()
    const endYear = end.getUTCFullYear()
    for (let year = startYear - 1; year <= endYear; year++) {
      const yStartDate = ipchun(year)
      const yEndDate = new Date(ipchun(year + 1).getTime() - 1)
      if (yEndDate < start || yStartDate > end) continue
      const refDate = new Date(yStartDate.getTime() + 86_400_000)
      const yp = getYearPillarForDate(refDate)
      const stageEmitInfo = {
        layer: 'yearly' as SignalLayer,
        active: {
          start: yStartDate.toISOString(),
          peak: new Date((yStartDate.getTime() + yEndDate.getTime()) / 2).toISOString(),
          end: yEndDate.toISOString(),
        },
        scopeWeight: 0.85,
        cyclicalLabel: `세운 ${yp.stem}${yp.branch}`,
        cyclicalBranch: yp.branch,
        idPrefix: `seun.${year}.${yp.branch}`,
      }
      emitMatrixSignals(signals, dayStemName, natalBranches, stageEmitInfo)
    }

    // 2-3) 월운 매트릭스 (monthly)
    const monthCursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
    while (monthCursor <= end) {
      // 월주는 그 달 중순(15일) 기준 — 1일은 절입 직전이라 전월 절기달이 잡힌다.
      const midMonth = new Date(
        Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth(), 15)
      )
      const mp = getMonthPillarForDate(midMonth)
      const mStart = new Date(monthCursor).toISOString()
      const mEndMs = Date.UTC(
        monthCursor.getUTCFullYear(),
        monthCursor.getUTCMonth() + 1,
        0,
        23,
        59,
        59
      )
      const mPeak = new Date(
        Date.UTC(monthCursor.getUTCFullYear(), monthCursor.getUTCMonth(), 15)
      ).toISOString()
      const stageEmitInfo = {
        layer: 'monthly' as SignalLayer,
        active: {
          start: mStart,
          peak: mPeak,
          end: new Date(mEndMs).toISOString(),
        },
        scopeWeight: 0.7,
        cyclicalLabel: `월운 ${mp.stem}${mp.branch}`,
        cyclicalBranch: mp.branch,
        idPrefix: `wolun.${monthCursor.getUTCFullYear()}-${monthCursor.getUTCMonth() + 1}.${mp.branch}`,
      }
      emitMatrixSignals(signals, dayStemName, natalBranches, stageEmitInfo)
      monthCursor.setUTCMonth(monthCursor.getUTCMonth() + 1)
    }

    // 2-4) 일진 매트릭스 (daily) — 본명 일지가 가장 중요하므로 일진과
    //      본명 일지·월지의 페어만 emit. 365일 × 4기둥 = 1460개 폭발 방지.
    const dailyNatalScope = natalBranches.filter(
      (n) => n.position === 'day' || n.position === 'month'
    )
    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const date = new Date(t)
      const targetBranch = computeDayBranch(date)
      if (!targetBranch) continue
      const dayIso = date.toISOString().slice(0, 10)
      const stageEmitInfo = {
        layer: 'daily' as SignalLayer,
        active: {
          start: `${dayIso}T00:00:00.000Z`,
          peak: `${dayIso}T12:00:00.000Z`,
          end: `${dayIso}T23:59:59.999Z`,
        },
        scopeWeight: 0.55,
        cyclicalLabel: `일진 ${targetBranch}`,
        cyclicalBranch: targetBranch,
        idPrefix: `iljin.${dayIso}.${targetBranch}`,
      }
      emitMatrixSignals(signals, dayStemName, dailyNatalScope, stageEmitInfo)
    }

    return signals
  },
}

interface StageEmitInfo {
  layer: SignalLayer
  active: { start: string; peak: string; end: string }
  /** 시기 레이어 자체의 weight (대운 1.0 ~ 일진 0.55) — 매트릭스 가중치와 곱. */
  scopeWeight: number
  cyclicalLabel: string
  cyclicalBranch: string
  idPrefix: string
}

function emitMatrixSignals(
  signals: ActiveSignal[],
  dayStemName: string,
  natalScope: Array<{ position: NatalPosition; branch: string; stage: string }>,
  info: StageEmitInfo
): void {
  const cyclicalStage = getTwelveStage(dayStemName, info.cyclicalBranch)
  if (!cyclicalStage) return

  for (const np of natalScope) {
    const polarity = pairPolarity(np.stage, cyclicalStage)
    if (polarity === 0) continue // 평탄 페어는 무시

    // 매트릭스 weight = 본명 position 가중 × 시기 레이어 가중 × 페어 강도.
    // 페어 강도: |polarity| / 2 (0.5 ~ 1.0 범위).
    const pairIntensity = Math.min(Math.abs(polarity) / 2, 1.0)
    const matrixWeight = NATAL_POSITION_WEIGHT[np.position] * info.scopeWeight * pairIntensity
    // 한 신호당 최대 ~0.55 (본명 일지 0.55 × 대운 1.0 × 1.0 페어) 로 클램프.
    const weight = Math.min(matrixWeight, 0.55)

    const natalLabel = NATAL_POSITION_LABEL[np.position]
    const natalLabelEn = NATAL_POSITION_LABEL_EN[np.position]
    const displayName = `${natalLabel} ${np.stage} → ${info.cyclicalLabel} ${cyclicalStage}`
    signals.push({
      id: `saju.twelve-stage.matrix.${info.idPrefix}.${np.position}`,
      source: 'saju',
      kind: 'pillar-sibsin',
      name: displayName,
      korean: matrixFlowLine(np.stage, cyclicalStage, natalLabel, 'ko') || displayName,
      english:
        matrixFlowLine(np.stage, cyclicalStage, natalLabel, 'en', natalLabelEn) ||
        `${natalLabelEn} ${np.stage} → ${cyclicalStage}`,
      polarity,
      layer: info.layer,
      active: info.active,
      weight,
      evidence: {
        module: 'saju-twelve-stage',
        detail: {
          matrix: true,
          natalPosition: np.position,
          natalBranch: np.branch,
          natalStage: np.stage,
          cyclicalBranch: info.cyclicalBranch,
          cyclicalStage,
          pair: `${np.stage}→${cyclicalStage}`,
          dayStem: dayStemName,
        },
      },
    })
  }
}

export default sajuTwelveStageExtractor
