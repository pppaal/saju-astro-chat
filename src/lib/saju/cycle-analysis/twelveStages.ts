/**
 * 12운성 cycle 분석 — cycle (대운/세운/월운/일진) 천간이 일간 기준으로
 * 어느 12운성 단계에 머무는지 + 의미/강도 해석.
 *
 * 정통: cycle 천간 자체의 12운성을 "cycle 지지" 위에서 본다.
 *      장생/임관/왕지 = 천간 강세 (운이 힘 받음)
 *      쇠/병/사/묘/절 = 천간 약세 (운이 힘 잃음)
 *      태/양/목욕/관대 = 변동기/성장기
 */
import { getTwelveStage } from '../shinsal'

export type TwelveStage =
  | '장생' | '목욕' | '관대' | '임관' | '왕지'
  | '쇠'   | '병'   | '사'   | '묘'   | '절'
  | '태'   | '양'

/** 단계별 강도 (-2 ~ +2). 점수 보조 + narrative tone 결정용. */
export const STAGE_STRENGTH: Record<TwelveStage, number> = {
  장생: 1.5,
  목욕: 0,
  관대: 1,
  임관: 2,
  왕지: 2,
  쇠: -0.5,
  병: -1,
  사: -1.5,
  묘: -1,
  절: -2,
  태: 0,
  양: 0.5,
}

/** 단계별 정통 키워드 (간결한 narrative seed) */
export const STAGE_KEYWORDS: Record<TwelveStage, { ko: string[]; tone: 'rise' | 'peak' | 'decline' | 'rest' | 'transition' }> = {
  장생: { ko: ['새로운 시작', '잠재력 발현', '활력'], tone: 'rise' },
  목욕: { ko: ['감정 변동', '도화 기운', '시행착오'], tone: 'transition' },
  관대: { ko: ['독립', '자리 잡기', '의욕'], tone: 'rise' },
  임관: { ko: ['전성기 진입', '실력 발휘', '안정 권력'], tone: 'peak' },
  왕지: { ko: ['절정', '주도권', '강한 자기 주장'], tone: 'peak' },
  쇠: { ko: ['열기 식음', '신중', '내실 다지기'], tone: 'decline' },
  병: { ko: ['지침', '회의감', '재정비 필요'], tone: 'decline' },
  사: { ko: ['의욕 저하', '마무리', '깊은 침잠'], tone: 'decline' },
  묘: { ko: ['수렴', '정리', '저장'], tone: 'rest' },
  절: { ko: ['단절', '리셋', '바닥'], tone: 'rest' },
  태: { ko: ['잉태', '준비', '눈에 안 띄는 변화'], tone: 'transition' },
  양: { ko: ['양육', '서서히 형성', '미숙'], tone: 'transition' },
}

export interface NatalPillarStage {
  pillar: 'year' | 'month' | 'day' | 'time'
  branch: string
  /** cycle 천간이 이 본명 지지에서 가지는 12운성 */
  stage: TwelveStage
  /** 강도 */
  strength: number
}

export interface TwelveStageAnalysis {
  /** cycle 천간이 cycle 지지에서 가지는 12운성 */
  cycleStage: TwelveStage
  /** 본명 일주 천간이 cycle 지지에서 가지는 12운성 (일간 자체에 미치는 영향) */
  dayMasterStage: TwelveStage
  /** cycle 천간 강도 (-2 ~ +2) */
  cycleStrength: number
  /** 일간 강도 변화 (-2 ~ +2) */
  dayMasterStrength: number
  /** 키워드 (cycle 천간 기준) */
  keywords: string[]
  /** 단계 흐름 톤 */
  tone: 'rise' | 'peak' | 'decline' | 'rest' | 'transition'
  /** 한 줄 요약 */
  summary: string
  /** 본명 4기둥 각 지지에서 cycle 천간이 가지는 단계 (활동 영역 영향) */
  natalPillarStages?: NatalPillarStage[]
  /** 가장 강한 본명 단계 (절정·임관 등) */
  natalPeak?: NatalPillarStage
}

interface NatalPillarsForStages {
  year: { branch: string }
  month: { branch: string }
  day: { branch: string }
  time: { branch: string }
}

/**
 * cycle 천간 + cycle 지지 + 본명 일간 (+ 옵션: 본명 4기둥 지지) → 12운성 분석
 *
 * 본명 4기둥 지지를 같이 주면 cycle 천간이 각 영역(年조상/月직업/日자기/時자녀)에서
 * 어느 단계에 도달하는지도 함께 산출 — narrative 에서 "직장에서 임관, 가정에서 사" 같은
 * 입체적 묘사 가능.
 */
export function analyzeTwelveStages(
  cycleStem: string,
  cycleBranch: string,
  dayMaster: string,
  natal?: NatalPillarsForStages,
): TwelveStageAnalysis {
  // cycle 천간 자신의 12운성 (cycle 지지 기준)
  const cycleStage = getTwelveStage(cycleStem, cycleBranch) as TwelveStage
  // 일간이 cycle 지지에서 어느 단계에 놓이는지 (일간 강도 변화)
  const dayMasterStage = getTwelveStage(dayMaster, cycleBranch) as TwelveStage

  const cycleStrength = STAGE_STRENGTH[cycleStage] ?? 0
  const dayMasterStrength = STAGE_STRENGTH[dayMasterStage] ?? 0

  const meta = STAGE_KEYWORDS[cycleStage] ?? { ko: [], tone: 'transition' as const }

  const summary = buildSummary(cycleStage, dayMasterStage, cycleStrength, dayMasterStrength)

  // 본명 4기둥 각 지지에서 cycle 천간이 가지는 단계
  let natalPillarStages: NatalPillarStage[] | undefined
  let natalPeak: NatalPillarStage | undefined
  if (natal) {
    natalPillarStages = (['year', 'month', 'day', 'time'] as const).map((pillar) => {
      const branch = natal[pillar].branch
      const stage = getTwelveStage(cycleStem, branch) as TwelveStage
      return {
        pillar,
        branch,
        stage,
        strength: STAGE_STRENGTH[stage] ?? 0,
      }
    })
    natalPeak = [...natalPillarStages].sort((a, b) => b.strength - a.strength)[0]
  }

  return {
    cycleStage,
    dayMasterStage,
    cycleStrength,
    dayMasterStrength,
    keywords: meta.ko,
    tone: meta.tone,
    summary,
    natalPillarStages,
    natalPeak,
  }
}

function buildSummary(
  cycleStage: TwelveStage,
  dayMasterStage: TwelveStage,
  cycleStrength: number,
  dayMasterStrength: number,
): string {
  // cycle 천간 + 일간 양쪽 단계 조합으로 한 줄 만든다.
  const cyclePhase = phraseFor(cycleStrength, '운')
  const dayPhase = phraseFor(dayMasterStrength, '본인')

  return `cycle 천간 ${cycleStage}(${cyclePhase}), 일간 ${dayMasterStage}(${dayPhase})`
}

function phraseFor(strength: number, who: string): string {
  if (strength >= 1.5) return `${who} 절정`
  if (strength >= 1) return `${who} 강세`
  if (strength >= 0.5) return `${who} 상승`
  if (strength <= -1.5) return `${who} 침체`
  if (strength <= -1) return `${who} 약세`
  if (strength <= -0.5) return `${who} 하강`
  return `${who} 중간`
}
