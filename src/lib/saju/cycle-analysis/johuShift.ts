/**
 * 조후 변화 (Johu Shift) — cycle 천간/지지가 본명의 寒暖燥濕 균형을
 * 정상화시키는지(improving), 악화시키는지(worsening), 무관한지.
 *
 * 정통 조후용신:
 *   추운 명조 (亥子丑 월) + 庚辛壬癸 일간 → 火 필요
 *   더운 명조 (巳午未 월) + 丙丁 일간     → 水 필요
 *   건조 + 火土 과다                    → 水 필요
 *   습한 + 水金 과다                    → 火 필요
 *
 * 오행 → 한난조습 매핑:
 *   火 (丙丁/巳午):     暖·燥
 *   水 (壬癸/亥子):     寒·濕
 *   木 (甲乙/寅卯):     약暖·약濕 (봄)
 *   金 (庚辛/申酉):     寒·燥 (가을)
 *   土:
 *     辰: 暖·濕 (봄 끝)
 *     未: 暖·燥 (여름 끝)
 *     戌: 寒·燥 (가을 끝)
 *     丑: 寒·濕 (겨울 끝)
 *
 * cycle 이 들어오면 그 climate 가 본명 조후용신 방향과 일치하면 안정,
 * 반대편이면 악화.
 */

export type Temperature = 'cold' | 'cool' | 'neutral' | 'warm' | 'hot'
export type Humidity = 'dry' | 'neutral' | 'humid'

export interface Climate {
  temperature: Temperature
  humidity: Humidity
}

const STEM_ELEMENT: Record<string, '목' | '화' | '토' | '금' | '수'> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}

const BRANCH_CLIMATE: Record<string, Climate> = {
  寅: { temperature: 'warm', humidity: 'humid' },   // 봄
  卯: { temperature: 'warm', humidity: 'humid' },
  辰: { temperature: 'warm', humidity: 'humid' },
  巳: { temperature: 'hot', humidity: 'dry' },       // 여름
  午: { temperature: 'hot', humidity: 'dry' },
  未: { temperature: 'hot', humidity: 'dry' },
  申: { temperature: 'cool', humidity: 'dry' },      // 가을
  酉: { temperature: 'cool', humidity: 'dry' },
  戌: { temperature: 'cool', humidity: 'dry' },
  亥: { temperature: 'cold', humidity: 'humid' },    // 겨울
  子: { temperature: 'cold', humidity: 'humid' },
  丑: { temperature: 'cold', humidity: 'humid' },
}

const ELEMENT_CLIMATE: Record<string, Climate> = {
  화: { temperature: 'hot', humidity: 'dry' },
  수: { temperature: 'cold', humidity: 'humid' },
  목: { temperature: 'warm', humidity: 'humid' },
  금: { temperature: 'cool', humidity: 'dry' },
  토: { temperature: 'neutral', humidity: 'neutral' },
}

const TEMP_SCALE: Record<Temperature, number> = { cold: -2, cool: -1, neutral: 0, warm: 1, hot: 2 }
const HUMID_SCALE: Record<Humidity, number> = { dry: -1, neutral: 0, humid: 1 }

/** 조후용신 element → 보충해야 할 방향 (양수 = 더 따뜻하게 / 더 습하게 필요) */
function targetDirection(yongsinElement: string): { temp: number; humid: number } {
  const cl = ELEMENT_CLIMATE[yongsinElement]
  if (!cl) return { temp: 0, humid: 0 }
  return { temp: TEMP_SCALE[cl.temperature], humid: HUMID_SCALE[cl.humidity] }
}

/** cycle climate 강도 = (stem 50%) + (branch 50%) */
function cycleClimate(cycleStem: string, cycleBranch: string): { temp: number; humid: number } {
  const stemEl = STEM_ELEMENT[cycleStem]
  const stemCl = stemEl ? ELEMENT_CLIMATE[stemEl] : undefined
  const branchCl = BRANCH_CLIMATE[cycleBranch]
  const tempStem = stemCl ? TEMP_SCALE[stemCl.temperature] : 0
  const humidStem = stemCl ? HUMID_SCALE[stemCl.humidity] : 0
  const tempBranch = branchCl ? TEMP_SCALE[branchCl.temperature] : 0
  const humidBranch = branchCl ? HUMID_SCALE[branchCl.humidity] : 0
  return {
    temp: (tempStem + tempBranch * 1.5) / 2.5,
    humid: (humidStem + humidBranch * 1.5) / 2.5,
  }
}

export type JohuShiftType = 'improving' | 'worsening' | 'mixed' | 'neutral'

export interface JohuShiftAnalysis {
  /** 조후용신 (정통 한자 오행: 목/화/토/금/수) */
  yongsin: string
  /** 보충 필요 방향 */
  targetDirection: { temp: number; humid: number }
  /** cycle 의 실제 climate (stem+branch 합산) */
  cycleClimate: { temp: number; humid: number }
  /** 변화 유형 */
  shift: JohuShiftType
  /** 강도 (0-3) */
  intensity: number
  /** 한 줄 요약 */
  summary: string
}

interface JohuShiftInput {
  cycleStem: string
  cycleBranch: string
  /** 조후용신 (예: '화', '수') — 본명 분석에서 받음 */
  johuYongsin?: string
}

export function analyzeJohuShift(input: JohuShiftInput): JohuShiftAnalysis {
  const yongsin = input.johuYongsin || ''
  if (!yongsin || !ELEMENT_CLIMATE[yongsin]) {
    return {
      yongsin,
      targetDirection: { temp: 0, humid: 0 },
      cycleClimate: { temp: 0, humid: 0 },
      shift: 'neutral',
      intensity: 0,
      summary: '조후용신 미정의',
    }
  }

  const target = targetDirection(yongsin)
  const cyc = cycleClimate(input.cycleStem, input.cycleBranch)

  // dot-product 방향: 양수면 cycle 이 target 방향과 같음 (improving), 음수면 반대 (worsening)
  const tempAlign = target.temp !== 0 ? Math.sign(target.temp) * cyc.temp : 0
  const humidAlign = target.humid !== 0 ? Math.sign(target.humid) * cyc.humid : 0
  const total = tempAlign + humidAlign

  let shift: JohuShiftType
  let intensity: number
  if (Math.abs(total) < 0.3) {
    shift = 'neutral'
    intensity = 0
  } else if (total > 0 && (tempAlign >= 0 && humidAlign >= 0)) {
    shift = 'improving'
    intensity = Math.min(3, Math.round(Math.abs(total)))
  } else if (total < 0 && (tempAlign <= 0 && humidAlign <= 0)) {
    shift = 'worsening'
    intensity = Math.min(3, Math.round(Math.abs(total)))
  } else {
    shift = 'mixed'
    intensity = 1
  }

  return {
    yongsin,
    targetDirection: target,
    cycleClimate: cyc,
    shift,
    intensity,
    summary: buildSummary(yongsin, shift, intensity, cyc, target),
  }
}

function buildSummary(
  yongsin: string,
  shift: JohuShiftType,
  intensity: number,
  cyc: { temp: number; humid: number },
  target: { temp: number; humid: number },
): string {
  const labels: Record<JohuShiftType, string> = {
    improving: '조후 안정',
    worsening: '조후 악화',
    mixed: '한난조습 혼재',
    neutral: '조후 무관',
  }
  if (shift === 'neutral') return `조후용신 ${yongsin}: ${labels[shift]}`
  const cycDesc = describeClimate(cyc)
  const need = describeNeed(target)
  return `조후용신 ${yongsin} (${need}) ↔ cycle ${cycDesc} → ${labels[shift]} (강도 ${intensity})`
}

function describeClimate(c: { temp: number; humid: number }): string {
  const t = c.temp >= 0.5 ? '더움' : c.temp <= -0.5 ? '추움' : '온건'
  const h = c.humid >= 0.5 ? '습' : c.humid <= -0.5 ? '건' : '중'
  return `${t}·${h}`
}

function describeNeed(t: { temp: number; humid: number }): string {
  const tNeed = t.temp >= 0.5 ? '온기 필요' : t.temp <= -0.5 ? '냉기 필요' : ''
  const hNeed = t.humid >= 0.5 ? '습기 필요' : t.humid <= -0.5 ? '건조 필요' : ''
  return [tNeed, hNeed].filter(Boolean).join(' + ') || '균형'
}
