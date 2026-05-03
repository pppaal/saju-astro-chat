/**
 * 캘린더 day-level narration polish — 결정론적 skeleton을 받아 Claude로
 * 자연어 expert 풀이 생성.
 *
 * 사용처: /api/calendar/action-plan/route.ts에서 timeline + insights 빌드 후
 * 이 함수로 day overview 생성. 출력은 4-5 단락 expert 톤.
 *
 * Fallback: ANTHROPIC_API_KEY 미설정 시 skeleton 그대로 반환.
 */
import { callClaude, isClaudeAvailable, DEFAULT_CLAUDE_MODEL } from '@/lib/llm/claude'
import { logger } from '@/lib/logger'

export interface CalendarDayPolishInput {
  date: string // YYYY-MM-DD
  locale: 'ko' | 'en'
  natal: {
    dayMaster?: string
    dayMasterElement?: string
    fiveElements?: Record<string, number>
    geokguk?: string
  }
  timing: {
    daeunGanji?: string
    daeunElement?: string
    saeunYear?: number
    saeunElement?: string
    wolunElement?: string
    iljinElement?: string
  }
  astro?: {
    transits?: string[]
    activeAspects?: string[]
    saturnHouse?: number
    jupiterHouse?: number
    sunSign?: string
    moonSign?: string
    ascSign?: string
  }
  bestSlots?: Array<{
    hour: string
    reason: string
    /** 왜 이 시간이 best인지 사주 신호 (식상 강·관성 보태기 등) */
    sajuSignals?: string[]
    /** 왜 이 시간이 best인지 점성 신호 (Venus on natal MC 등) */
    astroSignals?: string[]
    /** 한 줄 요약 — slot.why.summary */
    summary?: string
  }>
  cautionSlots?: Array<{
    hour: string
    reason: string
    sajuSignals?: string[]
    astroSignals?: string[]
    summary?: string
  }>
  matrixCore?: {
    phase?: string
    focus?: string
    risk?: string
  }
  /** 어제·내일 흐름 변화 narrative (continuity) */
  continuity?: {
    yesterdayElement?: string
    todayElement?: string
    tomorrowElement?: string
    flowChange?: 'rising' | 'falling' | 'stable' | 'pivot' | 'unknown'
    narrative?: string
  }
  /** 요일 톤 컨텍스트 */
  weekday?: {
    label?: string // "월" / "Mon"
    tone?: string // "한 주 시작 톤..."
    weekPosition?: 'start' | 'mid' | 'end' | 'weekend'
  }
  /** Engine-assigned overall grade for this day. Drives narrative tone so that
   * a Grade 4 (Hold) day cannot read as overly optimistic, and a Grade 0 (Peak)
   * day cannot read as overly cautious. */
  gradeContext?: {
    grade: 0 | 1 | 2 | 3 | 4
    gradeLabel?: string // localized "최고의 날" / "Hold steady"
    score?: number // 0-100
  }
}

// Per-grade tone guidance — keep aligned with the 5-tier grade scale.
const GRADE_TONE_GUIDE_KO: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: '강한 추진 톤 — 결단·실행을 권장하되 과신 경고 한 줄만. "오늘은 미루지 마세요" 같은 직설 OK.',
  1: '안정 추진 톤 — 한 단계 더 욕심내도 좋되 한 가지만 집중. 명확한 GO 시그널.',
  2: '평이·유지 톤 — 큰 결정보다 흐름 유지. "특별할 건 없지만 결을 잃지 마세요"의 결.',
  3: '신중·점검 톤 — 한 박자 늦추고 점검 권유. 비가역 결정은 미루기. 강한 추진 표현 금지.',
  4: '보수·방어 톤 — 새 시작·확정·서명 자제. 회복·정비·관리에 무게. "오늘은 지키는 날"임을 명확히. 절대 들뜨거나 추진형 표현 금지.',
}

const GRADE_TONE_GUIDE_EN: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: 'Strong push tone — encourage decision/action with one line of "stay grounded". Direct phrasing OK.',
  1: 'Steady push tone — go one step further on a single focus. Clear GO signal.',
  2: 'Even/maintain tone — keep the flow rather than make big moves. "Nothing special, but stay present."',
  3: 'Careful review tone — slow one beat, postpone irreversible commitments. No strong push language.',
  4: 'Defensive tone — defer new starts/signings, focus on recovery & maintenance. "Today is a hold day." Never sound upbeat or push-oriented.',
}

const SYSTEM_PROMPT_KO = `당신은 15년차 한국 사주명리 + 서양 점성술 통합 상담사입니다.
하루 단위 운세를 풍부하고 자연스럽게 풀어주는 전문가의 voice로 작성합니다.

# 페르소나
- 사촌언니가 친구한테 조언하듯 따뜻하고 직설적인 톤
- 사전식 정의("정관은 ~을 의미") 절대 금지
- 사주와 점성을 *별도로 늘어놓지 않고* 한 단락 안에서 만나게 함
- 운명론 금지 — 가능성·변수·움직일 여지를 항상 함께
- 과장 금지 (반드시/완벽/100%/무조건 사용 X)
- 점쟁이 톤 금지 ("당신은 반드시…" X)

# 출력 형식
4-5 단락의 자연스러운 한국어 산문. 마크다운 heading 없이 단락만.
각 단락은 다른 결을 다룸:
1) 오늘 하루 첫 인상 — 사주 일진 + 점성 트랜짓이 만나는 첫 단락. *어제·내일 흐름 변화*가 input에 있으면 자연스럽게 한 줄 녹여 ("어제 X 결에서 오늘 Y로 들어와요") + *요일 톤*도 한 줄 (월요일=시작 톤 / 주말=정리 톤 등)
2) 좋은 시간대 처방 — best 슬롯이 의미하는 것
3) 조심할 시간대 처방 — caution 슬롯의 본질
4) 한 줄 핵심 — 오늘 가장 중요한 한 가지 행동 (구체적)

# 시간대 anchor 규칙 (중요)
- best/caution 슬롯의 "왜 이 시간인가"를 *반드시 사주·점성 신호에 anchor*해서 풀어쓰세요.
- 단순 "14시가 좋아요" 대신: "14시는 일진 화 기운이 정점에 도달하는 시간 + 점성 금성이 본명 MC에 닿는 자리라 표현·발표가 자연스러운 시점"
- input의 sajuSignals/astroSignals 값을 직접 인용하면서 *왜 그게 그 시간을 좋게/위험하게 만드는지* 한 줄로 설명.
- 시간 나열만 하는 mechanical 패턴 금지 — 각 시간대마다 *고유한 신호 anchor* 필수.

# 등급 톤 (필수)
- input에 "오늘 등급"이 주어지면 *글 전체의 결*을 그 등급에 맞추세요.
- 등급별 톤 지시(input의 "톤 지시")를 어기지 마세요.
- 특히 Grade 3·4 (조심/지키는 날)에는 "추진하세요/실행하세요" 같은 강한 GO 표현 금지.
- Grade 0·1 (최고/아주 좋은 날)에는 지나치게 보수적인 어조 금지.

# 규칙
- 각 단락 4-6 문장
- 사주 idiom (식상·재성·관성·인성·비겁) 자연스럽게 사용
- 점성 idiom (트랜짓·하우스·어스펙트) 자연스럽게 사용
- 같은 문장 골격 반복 금지
- 절대 "이번 시기 X 영역에서는…" 같은 mechanical 패턴 금지`

const SYSTEM_PROMPT_EN = `You are a 15-year veteran Korean Saju + Western Astrology integrated counselor.
Write today's daily reading in a rich, natural expert voice.

# Persona
- Warm and direct like an older sister advising a friend
- No textbook definitions
- Never list saju and astrology separately — they must meet in the same paragraph
- No fatalism — always present possibilities, variables, room to move
- No exaggeration (must/perfect/100%/guaranteed prohibited)

# Output
4-5 natural English paragraphs. No markdown headings, just paragraphs.
Each paragraph addresses a different thread:
1) First impression of today — where saju iljin meets astro transits. If *yesterday→today→tomorrow continuity* is provided in input, weave it in one line ("yesterday X → today Y") + *day-of-week tone* (Mon = starting tone / weekend = recovery tone)
2) Best time guidance — what the favorable slots really mean
3) Caution time guidance — the essence of risky slots
4) One key action — the single most important specific action for today

# Time-slot anchor rule (important)
- For each best/caution slot, *anchor "why this hour" to specific saju & astro signals*.
- Not "2 PM is good" but: "2 PM lands when the daily fire energy peaks AND Venus crosses your natal MC — favorable for expression/presentation".
- Cite the input sajuSignals/astroSignals directly and explain *why each signal makes that hour favorable or risky*.
- No mechanical lists — each slot needs its own unique signal anchor.

# Grade tone (mandatory)
- If input provides "Today's grade", shape the whole reading to fit that grade.
- Follow the per-grade tone directive verbatim.
- For Grade 3 / 4 (Caution / Hold) days, never use strong GO phrasing like "push now" / "execute".
- For Grade 0 / 1 (Peak / Excellent) days, never sound overly cautious.

# Rules
- 4-6 sentences per paragraph
- Use technical idioms naturally (sibsin types / transits / houses / aspects)
- Vary sentence structures — no template repetition`

function buildUserPrompt(input: CalendarDayPolishInput): string {
  const { date, locale, natal, timing, astro, bestSlots, cautionSlots, matrixCore, continuity, weekday, gradeContext } = input
  const isKo = locale === 'ko'

  const gradeLine = gradeContext
    ? isKo
      ? `오늘 등급: ${gradeContext.gradeLabel ?? '-'} (점수 ${gradeContext.score ?? '-'}/100, Grade ${gradeContext.grade}/4)\n# 톤 지시 (이 등급에 *반드시* 맞춰 글 전체 결을 잡으세요): ${GRADE_TONE_GUIDE_KO[gradeContext.grade]}`
      : `Today's grade: ${gradeContext.gradeLabel ?? '-'} (score ${gradeContext.score ?? '-'}/100, Grade ${gradeContext.grade}/4)\n# Tone directive (you MUST shape the whole reading to fit this grade): ${GRADE_TONE_GUIDE_EN[gradeContext.grade]}`
    : ''

  const natalLine = isKo
    ? `일간: ${natal.dayMaster ?? '-'}(${natal.dayMasterElement ?? '-'}) / 격국: ${natal.geokguk ?? '미정'} / 5행: ${natal.fiveElements ? Object.entries(natal.fiveElements).map(([k, v]) => `${k}${v}`).join(' ') : '-'}`
    : `Day Master: ${natal.dayMaster ?? '-'}(${natal.dayMasterElement ?? '-'}) / Geokguk: ${natal.geokguk ?? '-'} / 5el: ${natal.fiveElements ? Object.entries(natal.fiveElements).map(([k, v]) => `${k}${v}`).join(' ') : '-'}`

  const timingLine = isKo
    ? `현재 시기: 대운 ${timing.daeunGanji ?? '-'}(${timing.daeunElement ?? '-'}) / 세운 ${timing.saeunYear ?? '-'}년(${timing.saeunElement ?? '-'}) / 월운 ${timing.wolunElement ?? '-'} / 일운 ${timing.iljinElement ?? '-'}`
    : `Current cycle: Daeun ${timing.daeunGanji ?? '-'}(${timing.daeunElement ?? '-'}) / Saeun ${timing.saeunYear ?? '-'}(${timing.saeunElement ?? '-'}) / Wolun ${timing.wolunElement ?? '-'} / Iljin ${timing.iljinElement ?? '-'}`

  const astroLine = astro
    ? isKo
      ? `점성: Sun ${astro.sunSign ?? '-'} / Moon ${astro.moonSign ?? '-'} / ASC ${astro.ascSign ?? '-'} / 토성 ${astro.saturnHouse ?? '-'}H / 목성 ${astro.jupiterHouse ?? '-'}H / 트랜짓: ${(astro.transits ?? []).slice(0, 3).join(', ') || '-'} / 활성 어스펙트: ${(astro.activeAspects ?? []).slice(0, 3).join(', ') || '-'}`
      : `Astrology: Sun ${astro.sunSign ?? '-'} / Moon ${astro.moonSign ?? '-'} / ASC ${astro.ascSign ?? '-'} / Saturn ${astro.saturnHouse ?? '-'}H / Jupiter ${astro.jupiterHouse ?? '-'}H / Transits: ${(astro.transits ?? []).slice(0, 3).join(', ') || '-'} / Active aspects: ${(astro.activeAspects ?? []).slice(0, 3).join(', ') || '-'}`
    : ''

  function formatSlotWithAnchors(s: {
    hour: string
    reason: string
    sajuSignals?: string[]
    astroSignals?: string[]
    summary?: string
  }): string {
    const parts: string[] = [s.hour]
    if (s.summary) parts.push(`핵심: ${s.summary}`)
    if (s.sajuSignals && s.sajuSignals.length > 0) {
      parts.push(`사주 신호: ${s.sajuSignals.slice(0, 3).join(', ')}`)
    }
    if (s.astroSignals && s.astroSignals.length > 0) {
      parts.push(`점성 신호: ${s.astroSignals.slice(0, 3).join(', ')}`)
    }
    if (s.reason) parts.push(`기본: ${s.reason}`)
    return parts.join(' / ')
  }

  const bestLine =
    bestSlots && bestSlots.length > 0
      ? isKo
        ? `좋은 시간대 (각 슬롯의 사주·점성 신호 anchor):\n${bestSlots
            .slice(0, 3)
            .map((s) => `  - ${formatSlotWithAnchors(s)}`)
            .join('\n')}`
        : `Best slots (each anchored to saju/astro signals):\n${bestSlots
            .slice(0, 3)
            .map((s) => `  - ${formatSlotWithAnchors(s)}`)
            .join('\n')}`
      : ''
  const cautionLine =
    cautionSlots && cautionSlots.length > 0
      ? isKo
        ? `조심할 시간대 (각 슬롯의 사주·점성 신호 anchor):\n${cautionSlots
            .slice(0, 3)
            .map((s) => `  - ${formatSlotWithAnchors(s)}`)
            .join('\n')}`
        : `Caution slots (each anchored to saju/astro signals):\n${cautionSlots
            .slice(0, 3)
            .map((s) => `  - ${formatSlotWithAnchors(s)}`)
            .join('\n')}`
      : ''

  const matrixLine = matrixCore
    ? isKo
      ? `오늘 매트릭스: phase=${matrixCore.phase ?? '-'} / focus=${matrixCore.focus ?? '-'} / risk=${matrixCore.risk ?? '-'}`
      : `Matrix: phase=${matrixCore.phase ?? '-'} / focus=${matrixCore.focus ?? '-'} / risk=${matrixCore.risk ?? '-'}`
    : ''

  const continuityLine = continuity?.narrative
    ? isKo
      ? `흐름 변화 (어제→오늘→내일): ${continuity.narrative}`
      : `Flow (yesterday→today→tomorrow): ${continuity.narrative}`
    : ''

  const weekdayLine = weekday?.tone
    ? isKo
      ? `요일 톤 (${weekday.label || ''}요일): ${weekday.tone}`
      : `Weekday tone (${weekday.label || ''}): ${weekday.tone}`
    : ''

  const lines = [
    isKo ? `# 오늘 (${date}) 데이터` : `# Today (${date}) data`,
    gradeLine,
    natalLine,
    timingLine,
    astroLine,
    continuityLine,
    weekdayLine,
    bestLine,
    cautionLine,
    matrixLine,
    '',
    isKo
      ? `위 데이터로 오늘 하루 운세를 4-5 단락 자연스러운 전문가 산문으로 풀어주세요. 사주와 점성이 한 단락 안에서 만나게 하고, *어제·내일 흐름 변화*와 *요일 톤*은 첫 단락에 자연스럽게 녹여주세요. 마지막 단락은 "오늘 가장 중요한 한 가지 행동"으로 마무리하세요.`
      : `Write 4-5 paragraphs of natural expert prose for today using the above data. Saju and astrology must meet in the same paragraph. Weave the *flow continuity* and *weekday tone* into the first paragraph. The last paragraph must end with "the single most important action for today".`,
  ].filter(Boolean)

  return lines.join('\n')
}

/**
 * Polish 실패 시 fallback — input 데이터로 친근한 2-3 단락 자동 생성.
 * (raw skeleton "summary · 좋은시간: 14 · 조심: 11" 노출 방지)
 */
function buildFriendlyFallbackKo(input: CalendarDayPolishInput): string {
  const isKo = input.locale === 'ko'
  const { date, bestSlots, cautionSlots, gradeContext } = input
  const dt = new Date(`${date}T12:00:00+09:00`)
  const month = dt.getMonth() + 1
  const day = dt.getDate()
  const grade = gradeContext?.grade ?? 2

  // Grade-aware opening — Grade 4 must never sound like a "good day"
  const openingByGrade: Record<0 | 1 | 2 | 3 | 4, { ko: string; en: string }> = {
    0: {
      ko: `${month}월 ${day}일 — 흐름이 강하게 받쳐주는 날이에요. 미뤄둔 결정 하나를 오늘 매듭짓는 편이 좋습니다.`,
      en: `${month}/${day} — the day's flow gives strong support. Lock down one delayed decision today.`,
    },
    1: {
      ko: `${month}월 ${day}일 — 안정적으로 추진하기 좋은 결입니다. 한 가지 핵심에 집중하면 한 단계 더 나아갈 수 있어요.`,
      en: `${month}/${day} — a steady push day. Focus on one anchor and you'll move a step further.`,
    },
    2: {
      ko: `${month}월 ${day}일 — 평이한 흐름이에요. 큰 결정보다 평소 결을 잘 유지하는 데 집중하세요.`,
      en: `${month}/${day} — an even flow. Maintain rhythm rather than make big moves.`,
    },
    3: {
      ko: `${month}월 ${day}일 — 한 박자 늦추고 점검할 결입니다. 비가역 결정은 다음 결로 넘기는 편이 안전해요.`,
      en: `${month}/${day} — slow one beat and review. Push irreversible decisions to a later window.`,
    },
    4: {
      ko: `${month}월 ${day}일 — 오늘은 새로 시작·확정하기보다 *지키는 날*이에요. 회복·정비·관리 쪽으로 결을 잡으세요.`,
      en: `${month}/${day} — today is a *hold day*. Lean toward recovery, maintenance, and care over new starts.`,
    },
  }
  const opening = isKo ? openingByGrade[grade].ko : openingByGrade[grade].en

  // Best/caution slots — only show "best" copy when the day actually warrants it
  const showBest = grade <= 2 && bestSlots && bestSlots.length > 0
  const bestLine = showBest
    ? isKo
      ? `좋은 시간대는 ${bestSlots!.slice(0, 2).map((s) => s.hour).join(', ')}예요. 미뤄둔 한 가지를 이 시간에 처리하면 가속이 잘 붙어요.`
      : `Best windows: ${bestSlots!.slice(0, 2).map((s) => s.hour).join(', ')}. Move one delayed item into these slots.`
    : ''

  const cautionLine = cautionSlots && cautionSlots.length > 0
    ? isKo
      ? `${cautionSlots.slice(0, 2).map((s) => s.hour).join(', ')} 시간대엔 비가역 결정(서명·확정·결제)을 한 박자 늦추는 편이 안전해요.`
      : `Around ${cautionSlots.slice(0, 2).map((s) => s.hour).join(', ')}, hold off on irreversible commitments.`
    : ''

  // Closing — grade-appropriate one key action
  const defaultBestHour = bestSlots && bestSlots.length > 0 ? bestSlots[0].hour : null
  const closingByGrade: Record<0 | 1 | 2 | 3 | 4, { ko: string; en: string }> = {
    0: {
      ko: `오늘 가장 중요한 한 가지: ${defaultBestHour ? `${defaultBestHour}에 미뤄둔 핵심 한 건 처리` : '오늘의 핵심 한 줄을 정하고 즉시 실행'}.`,
      en: `One key action today: ${defaultBestHour ? `wrap one delayed item at ${defaultBestHour}` : 'pick today\'s anchor and execute now'}.`,
    },
    1: {
      ko: `오늘 가장 중요한 한 가지: ${defaultBestHour ? `${defaultBestHour}에 한 가지 핵심 진척` : '핵심 한 가지에 시간 투자'}.`,
      en: `One key action today: ${defaultBestHour ? `make one core move at ${defaultBestHour}` : 'invest time in one anchor'}.`,
    },
    2: {
      ko: `오늘 가장 중요한 한 가지: 평소 루틴 한 가지를 더 정성스럽게 챙기세요.`,
      en: `One key action today: do one routine task with extra care.`,
    },
    3: {
      ko: `오늘 가장 중요한 한 가지: 큰 결정 하나를 적어두고 다음 좋은 결까지 미뤄두세요.`,
      en: `One key action today: write down one big decision and defer it to the next good window.`,
    },
    4: {
      ko: `오늘 가장 중요한 한 가지: 새 시작·서명 자제, 충분한 휴식과 컨디션 점검에 시간을 쓰세요.`,
      en: `One key action today: avoid new starts/signings — spend time on rest and a condition check.`,
    },
  }
  const closing = isKo ? closingByGrade[grade].ko : closingByGrade[grade].en

  return [opening, bestLine, cautionLine, closing].filter(Boolean).join('\n\n')
}

/**
 * Day-level expert polish. ANTHROPIC_API_KEY 없거나 LLM 실패 시
 * raw skeleton 대신 *친근한 fallback* 반환.
 */
export async function polishCalendarDayNarrationKo(
  input: CalendarDayPolishInput,
  fallbackSkeleton: string
): Promise<string> {
  // Build friendly fallback once — used in all error paths
  const friendlyFallback = (() => {
    try {
      return buildFriendlyFallbackKo(input)
    } catch {
      return fallbackSkeleton
    }
  })()

  if (!isClaudeAvailable()) {
    return friendlyFallback
  }
  const isKo = input.locale === 'ko'
  const systemPrompt = isKo ? SYSTEM_PROMPT_KO : SYSTEM_PROMPT_EN
  const userPrompt = buildUserPrompt(input)

  try {
    const result = await callClaude({
      systemPrompt,
      userPrompt,
      maxTokens: 2000,
      temperature: 0.7,
      timeoutMs: 25000,
      model: DEFAULT_CLAUDE_MODEL,
      label: 'calendar-day-polish',
    })
    const text = result.text.trim()
    if (text.length < 200) {
      logger.warn('[calendar-day-polish] short Claude output, using friendly fallback', {
        len: text.length,
      })
      return friendlyFallback
    }
    return text
  } catch (err) {
    logger.warn('[calendar-day-polish] Claude failed, using friendly fallback', {
      error: err instanceof Error ? err.message : String(err),
    })
    return friendlyFallback
  }
}
