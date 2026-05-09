/**
 * 시나리오 시뮬레이터 — "특정 시점에 X를 한다면?" 가상 condition으로 forecast.
 *
 * 만세력 전문가는 "올해 좋은가요?" 같은 broad 질문에만 답하지만
 * 우리는 사주 시기 + 점성 트랜짓 + 도메인 매트릭스를 합쳐 specific
 * action × specific time 페어에 deterministic 점수·forecast를 냅니다.
 *
 * 입력:  birth data (사주 + 점성) + scenario (action type + target date)
 * 출력:  feasibility score 0-100 + level + signals + narration
 *        + (점수 낮으면) 더 나은 대안 시점 제안
 */

import { calculateSajuData } from '@/lib/Saju/saju'
import { calculateDailyPillar } from '@/lib/timing/ultra-precision-daily'

// ─────────────────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────────────────

export type ScenarioAction =
  | 'careerChange'    // 이직·전직
  | 'startBusiness'   // 사업 시작
  | 'marriage'        // 결혼
  | 'meetSomeone'     // 새 인연
  | 'relocation'      // 이사
  | 'travel'          // 장기 여행·해외
  | 'invest'          // 큰 투자
  | 'majorPurchase'   // 큰 지출 (집·차)
  | 'startStudy'      // 학업·자격 시작
  | 'healthRestart'   // 건강 리셋 (수술·치료·다이어트)

export type ScenarioInput = {
  birthDate: string   // 'YYYY-MM-DD'
  birthTime: string   // 'HH:MM'
  gender: 'male' | 'female'
  action: ScenarioAction
  targetDate: string  // 'YYYY-MM-DD'
  /** 대안 시점들 (점수 비교용, 선택) */
  alternatives?: string[]
}

export type ScenarioSignal = {
  source: 'saju' | 'astro' | 'cross'
  text: string
  delta: number  // -20 ~ +20, score에 미치는 기여
}

export type ScenarioForecast = {
  scenario: { action: ScenarioAction; actionLabel: string; targetDate: string }
  score: number          // 0-100, 100이 가장 유리
  level: '강력 추천' | '진행 가능' | '검토 후 진행' | '주의' | '비추천'
  confidence: number     // 0-100, 신호 일관도
  signals: ScenarioSignal[]
  narration: string      // 3-4문장 카운슬러 톤
  bestAlternative?: { date: string; score: number; reason: string }
}

// ─────────────────────────────────────────────────────────
// 시나리오 메타
// ─────────────────────────────────────────────────────────

const ACTION_META: Record<
  ScenarioAction,
  {
    label: string
    domain: 'career' | 'love' | 'wealth' | 'health' | 'move'
    favorableSibsin: string[]    // 이 십신이 강하면 +
    unfavorableSibsin: string[]  // 이 십신이 강하면 -
    favorableShinsal: string[]   // 활성이면 +
    unfavorableShinsal: string[] // 활성이면 -
    favorableElements: string[]  // 대운/세운 element가 이거면 +
    minScore: number             // 권고 임계
  }
> = {
  careerChange: {
    label: '이직·전직', domain: 'career',
    favorableSibsin: ['정관', '편관', '정재'],
    unfavorableSibsin: ['겁재', '비견'],
    favorableShinsal: ['역마', '천을귀인', '암록'],
    unfavorableShinsal: ['공망', '망신'],
    favorableElements: ['목', '화'],
    minScore: 55,
  },
  startBusiness: {
    label: '사업 시작', domain: 'career',
    favorableSibsin: ['편재', '식신', '상관'],
    unfavorableSibsin: ['편관'],
    favorableShinsal: ['역마', '천을귀인', '문창'],
    unfavorableShinsal: ['공망', '백호'],
    favorableElements: ['화', '목'],
    minScore: 60,
  },
  marriage: {
    label: '결혼', domain: 'love',
    favorableSibsin: ['정재', '정관', '식신'],
    unfavorableSibsin: ['겁재', '편관', '비견'],
    favorableShinsal: ['천을귀인', '월덕귀인', '도화'],
    unfavorableShinsal: ['공망', '백호', '괴강'],
    favorableElements: ['토', '금'],
    minScore: 65,
  },
  meetSomeone: {
    label: '새 인연', domain: 'love',
    favorableSibsin: ['정재', '편재', '식신'],
    unfavorableSibsin: ['편관'],
    favorableShinsal: ['도화', '천을귀인', '홍염살'],
    unfavorableShinsal: ['고신', '망신'],
    favorableElements: ['화', '토'],
    minScore: 50,
  },
  relocation: {
    label: '이사', domain: 'move',
    favorableSibsin: ['정재', '편재'],
    unfavorableSibsin: [],
    favorableShinsal: ['역마', '지살', '천을귀인'],
    unfavorableShinsal: ['공망', '천라지망'],
    favorableElements: ['목', '수'],
    minScore: 55,
  },
  travel: {
    label: '장기 여행·해외', domain: 'move',
    favorableSibsin: ['편재', '식신'],
    unfavorableSibsin: ['편관'],
    favorableShinsal: ['역마', '문곡', '천을귀인'],
    unfavorableShinsal: ['공망', '삼재'],
    favorableElements: ['목', '수'],
    minScore: 50,
  },
  invest: {
    label: '큰 투자', domain: 'wealth',
    favorableSibsin: ['편재', '정재', '식신'],
    unfavorableSibsin: ['겁재', '편관'],
    favorableShinsal: ['천을귀인', '암록', '문곡'],
    unfavorableShinsal: ['공망', '망신', '백호'],
    favorableElements: ['금', '화'],
    minScore: 65,
  },
  majorPurchase: {
    label: '큰 지출 (집·차)', domain: 'wealth',
    favorableSibsin: ['정재', '정인'],
    unfavorableSibsin: ['겁재'],
    favorableShinsal: ['천을귀인', '월덕귀인'],
    unfavorableShinsal: ['공망', '망신'],
    favorableElements: ['금', '토'],
    minScore: 60,
  },
  startStudy: {
    label: '학업·자격 시작', domain: 'career',
    favorableSibsin: ['정인', '편인', '식신'],
    unfavorableSibsin: ['겁재'],
    favorableShinsal: ['문창', '문곡', '천을귀인', '학당귀인'],
    unfavorableShinsal: ['공망'],
    favorableElements: ['수', '목'],
    minScore: 55,
  },
  healthRestart: {
    label: '건강 리셋', domain: 'health',
    favorableSibsin: ['정인', '식신'],
    unfavorableSibsin: ['편관', '상관'],
    favorableShinsal: ['천을귀인', '천덕귀인', '월덕귀인'],
    unfavorableShinsal: ['백호', '괴강', '망신'],
    favorableElements: ['수', '토'],
    minScore: 50,
  },
}

const STEM_KO_EL: Record<string, string> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}

// ─────────────────────────────────────────────────────────
// 점수 계산
// ─────────────────────────────────────────────────────────

function scoreScenario(
  input: ScenarioInput,
  baseSaju: ReturnType<typeof calculateSajuData>
): ScenarioForecast {
  const meta = ACTION_META[input.action]
  const targetDateObj = new Date(input.targetDate)
  const targetYear = targetDateObj.getFullYear()
  const targetMonth = targetDateObj.getMonth() + 1

  const signals: ScenarioSignal[] = []
  let score = 50 // 기본
  let supportSignals = 0
  let resistSignals = 0

  // 1) 십신 분포 평가
  const sibsinDist: Record<string, number> = {}
  for (const pl of [baseSaju.pillars.year, baseSaju.pillars.month, baseSaju.pillars.day, baseSaju.pillars.time]) {
    for (const s of [pl.heavenlyStem.sibsin, pl.earthlyBranch.sibsin]) {
      if (s && typeof s === 'string') sibsinDist[s] = (sibsinDist[s] || 0) + 1
    }
  }
  for (const sib of meta.favorableSibsin) {
    const cnt = sibsinDist[sib] || 0
    if (cnt > 0) {
      const delta = Math.min(cnt * 4, 12)
      signals.push({ source: 'saju', text: `본명에 ${sib}${igaScenario(sib)} ${cnt}개 활성 (${meta.label} 적합)`, delta })
      score += delta
      supportSignals++
    }
  }
  for (const sib of meta.unfavorableSibsin) {
    const cnt = sibsinDist[sib] || 0
    if (cnt > 0) {
      const delta = -Math.min(cnt * 3, 10)
      signals.push({ source: 'saju', text: `본명에 ${sib}${igaScenario(sib)} ${cnt}개 (${meta.label}엔 부담 신호)`, delta })
      score += delta
      resistSignals++
    }
  }

  // 2) 대운 element 평가
  const cur = baseSaju.daeWoon.current
  if (cur) {
    const daeunEl = STEM_KO_EL[cur.heavenlyStem]
    if (meta.favorableElements.includes(daeunEl)) {
      signals.push({ source: 'saju', text: `현재 대운 ${cur.heavenlyStem}${cur.earthlyBranch}(${daeunEl}) — ${meta.label}에 우호 흐름`, delta: 8 })
      score += 8
      supportSignals++
    } else {
      signals.push({ source: 'saju', text: `현재 대운 ${cur.heavenlyStem}${cur.earthlyBranch}(${daeunEl}) — 중립 (전형 권장 원소 아님)`, delta: 0 })
    }
  }

  // 3) 세운 element 평가
  const annualRow = baseSaju.unse?.annual?.find((a) => a.year === targetYear)
  if (annualRow?.heavenlyStem) {
    const seunEl = STEM_KO_EL[annualRow.heavenlyStem]
    if (meta.favorableElements.includes(seunEl) || meta.favorableElements.includes(annualRow.element || '')) {
      signals.push({ source: 'saju', text: `${targetYear}년 세운 ${annualRow.ganji}(${annualRow.element}) — 환경이 받쳐주는 해`, delta: 10 })
      score += 10
      supportSignals++
    } else {
      signals.push({ source: 'saju', text: `${targetYear}년 세운 ${annualRow.ganji}(${annualRow.element}) — 중립 또는 전환 시기`, delta: -2 })
      score -= 2
    }
  }

  // 4) 월운 element 평가 (target month)
  const monthlyRow = baseSaju.unse?.monthly?.find((m) => m.year === targetYear && m.month === targetMonth)
  if (monthlyRow?.element) {
    if (meta.favorableElements.includes(monthlyRow.element)) {
      signals.push({ source: 'saju', text: `${targetYear}/${targetMonth} 월운 ${monthlyRow.ganji}(${monthlyRow.element}) — 월 단위 흐름 우호`, delta: 6 })
      score += 6
      supportSignals++
    } else {
      signals.push({ source: 'saju', text: `${targetYear}/${targetMonth} 월운 ${monthlyRow.ganji}(${monthlyRow.element}) — 월 단위 흐름 약함`, delta: -3 })
      score -= 3
    }
  }

  // 5) 일진 (target date 일주) — 본명과의 충/합 검사
  const dailyPillar = calculateDailyPillar(targetDateObj)
  if (dailyPillar) {
    const natalDayStem = baseSaju.pillars.day.heavenlyStem.name
    const natalDayBranch = baseSaju.pillars.day.earthlyBranch.name
    const STEM_CHUNG = new Set(['甲-庚', '庚-甲', '乙-辛', '辛-乙', '丙-壬', '壬-丙', '丁-癸', '癸-丁'])
    const BRANCH_CHUNG: Record<string, string> = {
      子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅',
      卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
    }
    if (STEM_CHUNG.has(`${natalDayStem}-${dailyPillar.stem}`)) {
      signals.push({ source: 'saju', text: `${input.targetDate} 일진 ${dailyPillar.stem}${dailyPillar.branch} — 본명 일간과 천간충, 결정 강제 trigger`, delta: -8 })
      score -= 8
      resistSignals++
    }
    if (BRANCH_CHUNG[natalDayBranch] === dailyPillar.branch) {
      signals.push({ source: 'saju', text: `${input.targetDate} 일진 ${dailyPillar.stem}${dailyPillar.branch} — 본명 일지와 지지충, 환경·이동 변동`, delta: -5 })
      score -= 5
      resistSignals++
    }
    const STEM_HAP: Record<string, string> = {
      甲: '己', 乙: '庚', 丙: '辛', 丁: '壬', 戊: '癸',
      己: '甲', 庚: '乙', 辛: '丙', 壬: '丁', 癸: '戊',
    }
    if (STEM_HAP[natalDayStem] === dailyPillar.stem) {
      signals.push({ source: 'saju', text: `${input.targetDate} 일진 ${dailyPillar.stem}${dailyPillar.branch} — 본명과 천간합, 협의·동의 잘 떨어짐`, delta: 7 })
      score += 7
      supportSignals++
    }
  }

  // 6) 점성 측 (간단 — 액션 도메인의 활성 트랜짓 추정)
  // simplification: 만 30대 후반 = 토성 angular 영향, 60대는 jupiter return 등
  const age = targetYear - new Date(input.birthDate).getFullYear()
  if (age >= 28 && age <= 30 && (input.action === 'careerChange' || input.action === 'marriage')) {
    signals.push({ source: 'astro', text: '토성 회귀(첫번째) 시기 — 사회적 책임 재정렬', delta: 5 })
    score += 5
  }
  if (age >= 36 && age <= 44 && input.action !== 'marriage') {
    signals.push({ source: 'astro', text: '명왕성 트랜짓 활성 — 깊은 변혁기, 큰 결정에 무게', delta: 4 })
    score += 4
  }

  // 7) cross signal — 사주↔점성 정합 추정 (simplified)
  if (supportSignals >= 3 && resistSignals === 0) {
    signals.push({ source: 'cross', text: `사주·점성 모두 ${meta.label} 방향으로 정합 (강한 정합)`, delta: 5 })
    score += 5
  } else if (resistSignals >= 2 && supportSignals === 0) {
    signals.push({ source: 'cross', text: `사주·점성 모두 ${meta.label}에 부정 (강한 보류 신호)`, delta: -5 })
    score -= 5
  } else if (supportSignals >= 1 && resistSignals >= 1) {
    signals.push({ source: 'cross', text: `사주·점성 신호 엇갈림 — 한 번 더 검증 권장`, delta: -2 })
    score -= 2
  }

  score = Math.max(0, Math.min(100, score))

  // level 분류
  let level: ScenarioForecast['level']
  if (score >= 80) level = '강력 추천'
  else if (score >= meta.minScore + 10) level = '진행 가능'
  else if (score >= meta.minScore) level = '검토 후 진행'
  else if (score >= 35) level = '주의'
  else level = '비추천'

  // confidence — supportSignals + resistSignals 일관도
  const totalSignals = supportSignals + resistSignals
  const confidence = totalSignals === 0
    ? 30
    : Math.round((Math.max(supportSignals, resistSignals) / totalSignals) * 100)

  // narration
  const narration = composeNarration(meta, score, level, signals, input.targetDate)

  return {
    scenario: { action: input.action, actionLabel: meta.label, targetDate: input.targetDate },
    score,
    level,
    confidence,
    signals,
    narration,
  }
}

// 한국어 조사 자동 선택 (을/를)
function eulReul(word: string): '을' | '를' {
  if (!word) return '을'
  const last = word.charCodeAt(word.length - 1)
  if (last < 0xac00 || last > 0xd7a3) return '을'
  return (last - 0xac00) % 28 !== 0 ? '을' : '를'
}
// 이/가
function igaScenario(word: string): '이' | '가' {
  if (!word) return '이'
  const last = word.charCodeAt(word.length - 1)
  if (last < 0xac00 || last > 0xd7a3) return '이'
  return (last - 0xac00) % 28 !== 0 ? '이' : '가'
}

function composeNarration(
  meta: typeof ACTION_META[ScenarioAction],
  score: number,
  level: ScenarioForecast['level'],
  signals: ScenarioSignal[],
  targetDate: string
): string {
  const supports = signals.filter((s) => s.delta > 0).slice(0, 2)
  const resists = signals.filter((s) => s.delta < 0).slice(0, 2)
  const lines: string[] = []
  const labelEul = `${meta.label}${eulReul(meta.label)}`

  lines.push(`${targetDate} 시점에 ${labelEul} 하면 신호 종합 점수는 ${score}/100, 등급은 "${level}"이에요.`)

  if (supports.length > 0) {
    lines.push(`받쳐주는 신호: ${supports.map((s) => s.text).join(' / ')}.`)
  }
  if (resists.length > 0) {
    lines.push(`주의 신호: ${resists.map((s) => s.text).join(' / ')}.`)
  }

  // level별 마무리 조언
  const closing: Record<ScenarioForecast['level'], string> = {
    '강력 추천': `여러 신호가 같은 방향이라 이 시점은 ${meta.label}에 가장 유리한 구간이에요. 결정 후 실행까지 같은 분기에 묶어도 괜찮아요.`,
    '진행 가능': `핵심 신호가 우호적이라 ${labelEul} 진행해도 무리 없는 시점이에요. 다만 작은 검증 1단계만 잡으세요.`,
    '검토 후 진행': `유리한 신호와 주의 신호가 섞여 있어요. 결정 전 반대 근거 1개 확인하고, 1주 보류 후 재검토하시는 편이 좋아요.`,
    '주의': `이 시점은 ${meta.label}에 부담 신호가 많아요. 가능하면 1-3개월 미루고 다른 시점을 찾는 편이 안전해요.`,
    '비추천': `${labelEul} 이 시점에 하면 손실·갈등 신호가 우세해요. 이 결정은 다음 사이클까지 보류하는 편을 권해요.`,
  }
  lines.push(closing[level])

  return lines.join(' ')
}

// ─────────────────────────────────────────────────────────
// 메인 entry
// ─────────────────────────────────────────────────────────

export function simulateScenario(input: ScenarioInput): ScenarioForecast {
  const baseSaju = calculateSajuData(input.birthDate, input.birthTime, input.gender, 'solar', 'Asia/Seoul')
  return scoreScenario(input, baseSaju)
}

/**
 * 여러 시점 비교 — 같은 action을 다른 시점에 적용해 점수 ranking.
 */
export function compareScenarios(input: ScenarioInput): {
  primary: ScenarioForecast
  alternatives: ScenarioForecast[]
  bestPick: ScenarioForecast
} {
  const baseSaju = calculateSajuData(input.birthDate, input.birthTime, input.gender, 'solar', 'Asia/Seoul')
  const primary = scoreScenario(input, baseSaju)
  const alternatives = (input.alternatives || []).map((d) =>
    scoreScenario({ ...input, targetDate: d }, baseSaju)
  )
  const all = [primary, ...alternatives]
  const bestPick = all.reduce((best, cur) => (cur.score > best.score ? cur : best), all[0])
  return { primary, alternatives, bestPick }
}
