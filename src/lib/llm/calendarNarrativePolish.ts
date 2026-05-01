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
  bestSlots?: Array<{ hour: string; reason: string }>
  cautionSlots?: Array<{ hour: string; reason: string }>
  matrixCore?: {
    phase?: string
    focus?: string
    risk?: string
  }
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
1) 오늘 하루 첫 인상 — 사주 일진 + 점성 트랜짓이 만나는 첫 단락
2) 좋은 시간대 처방 — best 슬롯이 의미하는 것
3) 조심할 시간대 처방 — caution 슬롯의 본질
4) 한 줄 핵심 — 오늘 가장 중요한 한 가지 행동 (구체적)

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
1) First impression of today — where saju iljin meets astro transits
2) Best time guidance — what the favorable slots really mean
3) Caution time guidance — the essence of risky slots
4) One key action — the single most important specific action for today

# Rules
- 4-6 sentences per paragraph
- Use technical idioms naturally (sibsin types / transits / houses / aspects)
- Vary sentence structures — no template repetition`

function buildUserPrompt(input: CalendarDayPolishInput): string {
  const { date, locale, natal, timing, astro, bestSlots, cautionSlots, matrixCore } = input
  const isKo = locale === 'ko'

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

  const bestLine =
    bestSlots && bestSlots.length > 0
      ? isKo
        ? `좋은 시간대: ${bestSlots
            .slice(0, 3)
            .map((s) => `${s.hour}(${s.reason})`)
            .join(', ')}`
        : `Best slots: ${bestSlots
            .slice(0, 3)
            .map((s) => `${s.hour}(${s.reason})`)
            .join(', ')}`
      : ''
  const cautionLine =
    cautionSlots && cautionSlots.length > 0
      ? isKo
        ? `조심할 시간대: ${cautionSlots
            .slice(0, 3)
            .map((s) => `${s.hour}(${s.reason})`)
            .join(', ')}`
        : `Caution slots: ${cautionSlots
            .slice(0, 3)
            .map((s) => `${s.hour}(${s.reason})`)
            .join(', ')}`
      : ''

  const matrixLine = matrixCore
    ? isKo
      ? `오늘 매트릭스: phase=${matrixCore.phase ?? '-'} / focus=${matrixCore.focus ?? '-'} / risk=${matrixCore.risk ?? '-'}`
      : `Matrix: phase=${matrixCore.phase ?? '-'} / focus=${matrixCore.focus ?? '-'} / risk=${matrixCore.risk ?? '-'}`
    : ''

  const lines = [
    isKo ? `# 오늘 (${date}) 데이터` : `# Today (${date}) data`,
    natalLine,
    timingLine,
    astroLine,
    bestLine,
    cautionLine,
    matrixLine,
    '',
    isKo
      ? `위 데이터로 오늘 하루 운세를 4-5 단락 자연스러운 전문가 산문으로 풀어주세요. 사주와 점성이 한 단락 안에서 만나게 하고, 마지막 단락은 "오늘 가장 중요한 한 가지 행동"으로 마무리하세요.`
      : `Write 4-5 paragraphs of natural expert prose for today using the above data. Saju and astrology must meet in the same paragraph, and the last paragraph must end with "the single most important action for today".`,
  ].filter(Boolean)

  return lines.join('\n')
}

/**
 * Day-level expert polish. ANTHROPIC_API_KEY 없으면 skeleton 그대로 반환.
 */
export async function polishCalendarDayNarrationKo(
  input: CalendarDayPolishInput,
  fallbackSkeleton: string
): Promise<string> {
  if (!isClaudeAvailable()) {
    return fallbackSkeleton
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
      logger.warn('[calendar-day-polish] short Claude output, using skeleton', {
        len: text.length,
      })
      return fallbackSkeleton
    }
    return text
  } catch (err) {
    logger.warn('[calendar-day-polish] Claude failed, using skeleton', {
      error: err instanceof Error ? err.message : String(err),
    })
    return fallbackSkeleton
  }
}
