// src/app/api/tarot/analyze-question/route.ts
// GPT-4o-mini를 사용해서 사용자 질문을 분석하고 적절한 스프레드 추천 (비용 효율적)

import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createTarotGuard } from '@/lib/api/middleware'
import { tarotThemes } from '@/lib/Tarot/tarot-spreads-data'
import { logger } from '@/lib/logger'
import { PATTERN_MAPPINGS, getExamInterviewMapping } from './pattern-mappings'
import { HTTP_STATUS } from '@/lib/constants/http'
import { tarotAnalyzeQuestionSchema as AnalyzeQuestionSchema } from '@/lib/api/zodValidation'

// ============================================================
// Types
// ============================================================
interface ParsedResult {
  themeId: string
  spreadId: string
  reason: string
  userFriendlyExplanation: string
}

interface SpreadOption {
  id: string
  themeId: string
  title: string
  titleKo: string
  description: string
  cardCount: number
}

// ============================================================
// OpenAI API 호출 헬퍼
// ============================================================
async function callOpenAI(messages: { role: string; content: string }[], maxTokens = 400) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // 질문 분류는 단순 작업이므로 mini 사용 (96% 저렴)
      messages,
      max_tokens: maxTokens,
      temperature: 0.3, // 복잡한 뉘앙스 파악을 위해 약간 높임
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${error}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ''
}

// 스프레드 정보를 GPT에게 전달할 형식으로 변환
function getSpreadOptions(): SpreadOption[] {
  const options: SpreadOption[] = []

  for (const theme of tarotThemes) {
    for (const spread of theme.spreads) {
      options.push({
        id: spread.id,
        themeId: theme.id,
        title: spread.title,
        titleKo: spread.titleKo || spread.title,
        description: spread.descriptionKo || spread.description,
        cardCount: spread.cardCount,
      })
    }
  }

  return options
}

// 위험한 질문 체크
const dangerousKeywords = [
  '자살',
  '죽고 싶',
  '죽을래',
  '살기 싫',
  '끝내고 싶',
  '죽어버릴',
  '자해',
  '목숨',
  '생을 마감',
  '세상 떠나',
  'suicide',
  'kill myself',
  'end my life',
  'want to die',
]

function checkDangerous(question: string): boolean {
  const normalized = question.toLowerCase()
  return dangerousKeywords.some((kw) => normalized.includes(kw.toLowerCase()))
}

// ============================================================
// GPT System Prompt
// ============================================================
function buildSystemPrompt(spreadListForPrompt: string): string {
  return `You are an expert tarot reader with 10 years of experience. Analyze user questions precisely and recommend the most suitable tarot spread.

## 🎯 Core Principles
Understand the **intent** behind questions regardless of how they're phrased:

### Korean Questions:
- ✅ No spacing: "오늘운동갈까" = "오늘 운동 갈까?"
- ✅ Spelling errors: "해도되요" = "해도 돼요"
- ✅ Chosung only: "ㅇㄷㅇㄷㄱㄹㄲ" = "오늘 운동 갈까"
- ✅ Slang/casual: "개한테뽀뽀할까" = yes/no question
- ✅ Ignore punctuation: "할까???" = "할까"

### English Questions:
- ✅ Spelling errors: "shoud I go" = "should I go"
- ✅ Casual abbreviations: "gonna", "wanna", "dunno"
- ✅ Slang and informal language: "r u into me" = "are you into me"
- ✅ Text speak: "luv", "ur", "2day"
- ✅ Complex nuances: "I'm torn between..." = comparison question
- ✅ Implicit questions: "thinking about quitting my job" = job change question

**CRITICAL**: Focus on **MEANING**, not form. Understand complex emotional nuances, indirect expressions, and cultural context.

## ⭐⭐⭐ Priority 1: Yes/No Decision Questions ⭐⭐⭐

If the question contains **ANY** of these patterns, it's **ALWAYS** decisions-crossroads/yes-no-why:

### Korean patterns:
- "~할까", "~갈까", "~볼까", "~살까", "~먹을까", "~마실까", "~만날까", "~시작할까", "~보낼까", "~보여줄까"
- "~해야 할까", "~하면 될까", "~해도 될까", "~해볼까", "~가볼까"
- "~할지", "~갈지", "~할까요", "~갈까요", "~할까여"
- "~하는 게 좋을까", "~해야 하나", "~할까 말까", "~하면 안 될까"

### English patterns:
- "Should I...", "Shall I...", "Can I...", "May I..."
- "Is it good to...", "Is it okay to...", "Would it be wise to..."
- "Should I go...", "Should I buy...", "Should I text...", "Should I try..."
- "Thinking about [verb+ing]..." (implies decision)
- "Wondering if I should..."
- "Debating whether to..."
- "Not sure if I should..."

### Examples (ALWAYS yes-no-why):
- Korean: "오늘 운동갈까?", "이옷살까?", "술마실까?", "그사람한테 연락할까?", "개한테 뽀뽀할까?", "라면먹을까?", "오늘 머리염색할까?"
- English: "Should I go to the gym today?", "Should I buy this dress?", "Should I text them?", "Thinking about quitting my job", "Not sure if I should reach out"

## Priority 2: A vs B Comparison (decisions-crossroads/two-paths)
- Korean: "A vs B", "A냐 B냐", "A 아니면 B", "A할까 B할까", "A랑 B중에"
- English: "A or B", "A vs B", "Should I choose A or B", "between A and B", "torn between", "can't decide between"
- ⚠️ Note: Even with "할까/should I", if TWO clear options exist → two-paths!

## Priority 3: Timing Questions (decisions-crossroads/timing-window)
- Korean: "언제", "몇 월에", "시기가", "타이밍"
- English: "when", "timing", "what time", "when should", "best time to", "right moment for"
- ⚠️ Note: "언제 할까?" / "When should I?" = timing-window (NOT yes-no-why)

## Priority 4: Crush Feelings (love-relationships/crush-feelings)
- Korean: "그 사람 마음", "날 어떻게 생각", "좋아해", "관심 있", "호감", "나 좋아하나"
- English: "do they like me", "what do they think of me", "are they into me", "do they have feelings for", "interested in me", "attracted to me"
- ⚠️ Note: "좋아할까?"/"will they like me?" = yes-no-why, "좋아해?"/"do they like me?" = crush-feelings

## Priority 5: Reconciliation (love-relationships/reconciliation)
- Korean: "다시 만날 수 있을까", "재회", "돌아올까", "연락 올까", "헤어진", "복합"
- English: "get back together", "reconcile", "come back", "will they return", "after breakup", "ex relationship", "win them back"

## Priority 6: Finding Partner (love-relationships/finding-a-partner)
- Korean: "인연 언제", "좋은 사람 만날까", "소개팅", "짝", "배필"
- English: "when will I find love", "meet someone", "find a partner", "soulmate", "dating prospects", "love life"

## Priority 7: Job Change (career-work/job-change)
- Korean: "이직", "퇴사", "회사 옮", "직장 바꿀"
- English: "job change", "career transition", "switching jobs", "leaving my job", "new position", "quitting", "resign"
- ⚠️ Note: "이직할까?"/"should I change jobs?" = yes-no-why (if simple decision)

## Priority 8: Interview/Exam (career-work/interview-result, career-work/exam-pass)
- Interview (Korean): "면접 결과", "면접 붙을까", "면접 합격"
- Interview (English): "interview outcome", "will I pass the interview", "job interview result", "interview success"
- Exam (Korean): "시험 붙을까", "합격할까", "자격증 딸까"
- Exam (English): "exam result", "will I pass", "test outcome", "certification exam"

## Priority 9: Today's Fortune (daily-reading/day-card)
- Korean: "오늘 운세", "오늘 어때", "오늘 하루", "오늘의 운"
- English: "today's fortune", "how's my day", "what's today like", "daily reading", "card for today"
- ⚠️ Note: "오늘 ~할까?"/"should I do X today?" = yes-no-why!

## Priority 10: General Flow (general-insight/past-present-future)
- Korean: 구체적인 결정이 없는 상황 파악, 전반적인 흐름, 앞으로의 방향
- English: Overall situation assessment, general flow, future direction, "what's ahead", "what to expect", "where am I heading"

## 스프레드 목록
${spreadListForPrompt}

## 응답 형식 (JSON만)
{
  "themeId": "테마 ID",
  "spreadId": "스프레드 ID",
  "reason": "선택 이유",
  "userFriendlyExplanation": "사용자에게 보여줄 설명"
}

## ⚠️ Final Checklist (MANDATORY!)

1. **Korean Questions**: Check for "할까/갈까/볼까/살까/먹을까/마실까" patterns
   → YES = decisions-crossroads/yes-no-why!
   → EXCEPT: "A할까 B할까?" (two clear options) = two-paths
   → EXCEPT: "언제 할까?" (timing) = timing-window

2. **English Questions**: Check for "should I/shall I/can I/may I/thinking about [verb+ing]"
   → YES = decisions-crossroads/yes-no-why!
   → EXCEPT: "should I choose A or B" (two options) = two-paths
   → EXCEPT: "when should I" (timing) = timing-window

3. **Nuanced/Complex Questions**:
   - Analyze emotional undertones (worried, hopeful, desperate, curious)
   - Detect implicit questions: "I'm thinking about X" = "Should I do X?"
   - Understand cultural context and metaphors
   - Handle indirect expressions: "torn between..." = comparison question

4. **Errors & Casual Language**:
   - Ignore spelling errors, slang, text speak
   - Korean examples: "개한테뽀뽀할까" = "개한테 뽀뽀할까?" = yes-no-why
   - English examples: "shud i txt them" = "should I text them" = yes-no-why

5. **Multi-layered Questions**:
   - Primary intent takes priority
   - Example: "I miss my ex and thinking about texting" = yes-no-why (decision), NOT reconciliation (secondary theme)

## 🧠 Nuance Detection Examples

**Complex Korean:**
- "요즘 직장이 힘든데 그만둘 생각이 들어" → job-change (implicit decision, emotional context)
- "걔 나한테 관심 있는 것 같긴 한데 확신이 안 서" → crush-feelings (uncertainty about feelings)

**Complex English:**
- "My job has been draining lately and I'm considering leaving" → job-change (implicit decision with emotional context)
- "They've been texting me more but idk if it means something" → crush-feelings (uncertainty, text speak)
- "Torn between staying in my comfort zone and taking a risk" → two-paths (implicit A vs B)
- "Feel like the universe is pushing me to make a move but scared" → yes-no-why (implicit decision with emotional layer)`
}

// ============================================================
// Pattern Matching Corrections (Data-Driven)
// ============================================================
function applyPatternCorrections(
  question: string,
  parsed: ParsedResult,
  language: string
): ParsedResult {
  // 1. 면접/시험 질문 특수 처리 (분기 로직 필요)
  const examMapping = getExamInterviewMapping(question, language)
  if (examMapping && parsed.spreadId !== examMapping.spreadId) {
    logger.info(
      `[analyze-question] Correcting: "${question}" → ${examMapping.spreadId} (was: ${parsed.spreadId})`
    )
    return examMapping
  }

  // 2. PATTERN_MAPPINGS 테이블 순회 (priority 순으로 정렬됨)
  for (const mapping of PATTERN_MAPPINGS) {
    if (mapping.check(question) && parsed.spreadId !== mapping.targetSpread) {
      logger.info(
        `[analyze-question] Correcting: "${question}" → ${mapping.targetSpread} (was: ${parsed.spreadId})`
      )
      return {
        themeId: mapping.themeId,
        spreadId: mapping.targetSpread,
        reason: mapping.reason,
        userFriendlyExplanation: language === 'ko' ? mapping.koExplanation : mapping.enExplanation,
      }
    }
  }

  return parsed
}

// ============================================================
// Main POST Handler
// ============================================================
export const POST = withApiMiddleware(
  async (request: NextRequest) => {
    try {
      // Validate request body with Zod
      const body = await request.json()
      const validation = AnalyzeQuestionSchema.safeParse(body)

      if (!validation.success) {
        const errors = validation.error.issues
          .map((e) => `${e.path.join('.')}: ${e.message}`)
          .join(', ')
        logger.warn('[tarot/analyze-question] Validation failed', {
          errors: validation.error.issues,
        })
        return NextResponse.json(
          { error: 'Validation failed', details: errors },
          { status: HTTP_STATUS.BAD_REQUEST }
        )
      }

      const { question, language } = validation.data
      const trimmedQuestion = question.trim()

      // 위험한 질문 체크
      if (checkDangerous(trimmedQuestion)) {
        return NextResponse.json({
          isDangerous: true,
          message:
            language === 'ko'
              ? '힘든 시간을 보내고 계신 것 같아요. 전문가의 도움을 받으시길 권해드려요. 자살예방상담전화: 1393 (24시간)'
              : 'I sense you might be going through a difficult time. Please reach out to a professional who can help. Crisis helpline: 1393 (Korea) or your local emergency services.',
        })
      }

      // 스프레드 옵션 목록
      const spreadOptions = getSpreadOptions()
      const spreadListForPrompt = spreadOptions
        .map((s) => `- ${s.themeId}/${s.id}: ${s.titleKo} (${s.cardCount}장) - ${s.description}`)
        .join('\n')

      // GPT-4o-mini로 분석
      const systemPrompt = buildSystemPrompt(spreadListForPrompt)

      let responseText = ''
      try {
        responseText = await callOpenAI([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `사용자 질문: "${trimmedQuestion}"` },
        ])
      } catch (error) {
        logger.warn('[analyze-question] OpenAI unavailable, using fallback routing', error)
      }

      const fallbackParsed: ParsedResult = {
        themeId: 'general-insight',
        spreadId: 'past-present-future',
        reason: '일반적인 운세 확인',
        userFriendlyExplanation:
          language === 'ko'
            ? '전반적인 흐름을 볼 수 있는 스프레드를 준비했어요'
            : "I've prepared a spread to see the overall flow",
      }

      let parsed: ParsedResult
      try {
        parsed = responseText ? JSON.parse(responseText) : fallbackParsed
      } catch {
        parsed = fallbackParsed
      }

      // GPT 결과를 패턴 매칭으로 보정
      parsed = applyPatternCorrections(trimmedQuestion, parsed, language)

      // 선택된 스프레드 정보 찾기
      const selectedSpread = spreadOptions.find(
        (s) => s.themeId === parsed.themeId && s.id === parsed.spreadId
      )

      if (!selectedSpread) {
        return NextResponse.json({
          isDangerous: false,
          themeId: 'general-insight',
          spreadId: 'past-present-future',
          spreadTitle: '과거, 현재, 미래',
          cardCount: 3,
          reason: '일반적인 운세 확인',
          userFriendlyExplanation:
            language === 'ko'
              ? '전반적인 흐름을 볼 수 있는 스프레드를 준비했어요'
              : "I've prepared a spread to see the overall flow",
          path: `/tarot/general-insight/past-present-future?question=${encodeURIComponent(trimmedQuestion)}`,
        })
      }

      const res = NextResponse.json({
        isDangerous: false,
        themeId: parsed.themeId,
        spreadId: parsed.spreadId,
        spreadTitle: selectedSpread.titleKo,
        cardCount: selectedSpread.cardCount,
        reason: parsed.reason,
        userFriendlyExplanation: parsed.userFriendlyExplanation,
        path: `/tarot/${parsed.themeId}/${parsed.spreadId}?question=${encodeURIComponent(trimmedQuestion)}`,
      })
      return res
    } catch (error) {
      logger.error('Error analyzing question:', error)
      return NextResponse.json(
        { error: 'Failed to analyze question' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
  },
  createTarotGuard({
    route: '/api/tarot/analyze-question',
    limit: 10,
    windowSeconds: 60,
  })
)
