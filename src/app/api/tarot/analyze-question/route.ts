// src/app/api/tarot/analyze-question/route.ts
// GPT-4o-mini를 사용해서 사용자 질문을 분석하고 적절한 스프레드 추천

import { NextRequest, NextResponse } from "next/server";
import { tarotThemes } from "@/lib/Tarot/tarot-spreads-data";
import { logger } from '@/lib/logger';
import { PATTERN_MAPPINGS, getExamInterviewMapping } from './pattern-mappings';

// ============================================================
// Types
// ============================================================
interface ParsedResult {
  themeId: string;
  spreadId: string;
  reason: string;
  userFriendlyExplanation: string;
}

interface SpreadOption {
  id: string;
  themeId: string;
  title: string;
  titleKo: string;
  description: string;
  cardCount: number;
}

// ============================================================
// OpenAI API 호출 헬퍼
// ============================================================
async function callOpenAI(messages: { role: string; content: string }[], maxTokens = 400) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: maxTokens,
      temperature: 0.2, // 더 일관된 결과를 위해 낮춤
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// 스프레드 정보를 GPT에게 전달할 형식으로 변환
function getSpreadOptions(): SpreadOption[] {
  const options: SpreadOption[] = [];

  for (const theme of tarotThemes) {
    for (const spread of theme.spreads) {
      options.push({
        id: spread.id,
        themeId: theme.id,
        title: spread.title,
        titleKo: spread.titleKo || spread.title,
        description: spread.descriptionKo || spread.description,
        cardCount: spread.cardCount,
      });
    }
  }

  return options;
}

// 위험한 질문 체크
const dangerousKeywords = [
  "자살", "죽고 싶", "죽을래", "살기 싫", "끝내고 싶", "죽어버릴",
  "자해", "목숨", "생을 마감", "세상 떠나",
  "suicide", "kill myself", "end my life", "want to die"
];

function checkDangerous(question: string): boolean {
  const normalized = question.toLowerCase();
  return dangerousKeywords.some(kw => normalized.includes(kw.toLowerCase()));
}

// ============================================================
// GPT System Prompt
// ============================================================
function buildSystemPrompt(spreadListForPrompt: string): string {
  return `당신은 10년 경력의 타로 전문가입니다. 사용자의 질문을 정확히 분석하고 가장 적합한 타로 스프레드를 추천해야 합니다.

## 🎯 핵심 원칙
사용자가 어떤 식으로 질문하든 질문의 **의도**를 정확히 파악하세요:
- ✅ 띄어쓰기 없음: "오늘운동갈까" = "오늘 운동 갈까?"
- ✅ 맞춤법 오류: "해도되요" = "해도 돼요"
- ✅ 초성만: "ㅇㄷㅇㄷㄱㄹㄲ" = "오늘 운동 갈까" (일반적인 패턴 추론)
- ✅ 비속어/장난: "개한테뽀뽀할까" = yes/no 질문
- ✅ 구두점 무시: "할까???" = "할까"

**중요**: 형태가 아닌 **의미**를 파악하세요!

## ⭐⭐⭐ 우선순위 1: Yes/No 결정 질문 ⭐⭐⭐

다음 패턴이 **하나라도** 포함된 질문은 **무조건** decisions-crossroads/yes-no-why 선택:
- "~할까", "~갈까", "~볼까", "~살까", "~먹을까", "~마실까", "~만날까", "~시작할까", "~보낼까", "~보여줄까"
- "~해야 할까", "~하면 될까", "~해도 될까", "~해볼까", "~가볼까"
- "~할지", "~갈지", "~할까요", "~갈까요", "~할까여"
- "~하는 게 좋을까", "~해야 하나", "~할까 말까", "~하면 안 될까"
- "Should I", "Is it good to", "Can I", "Shall I"

### Yes/No 질문 예시 (무조건 yes-no-why):
- "오늘 운동갈까?" → yes-no-why ✓
- "이옷살까?" → yes-no-why ✓
- "술마실까?" → yes-no-why ✓
- "그사람한테 연락할까?" → yes-no-why ✓
- "개한테 뽀뽀할까?" → yes-no-why ✓
- "라면먹을까?" → yes-no-why ✓
- "오늘 머리염색할까?" → yes-no-why ✓

## 우선순위 2: A vs B 비교 질문 (decisions-crossroads/two-paths)
- "A vs B", "A냐 B냐", "A 아니면 B", "A할까 B할까", "A랑 B중에"
- ⚠️ 주의: "할까"가 있어도 두 선택지가 명확하면 two-paths!

## 우선순위 3: 타이밍/시기 질문 (decisions-crossroads/timing-window)
- "언제", "몇 월에", "시기가", "타이밍", "when", "timing"
- ⚠️ 주의: "언제 할까?"는 timing-window! (yes-no-why 아님)

## 우선순위 4: 상대방 마음 질문 (love-relationships/crush-feelings)
- "그 사람 마음", "날 어떻게 생각", "좋아해", "관심 있", "호감", "나 좋아하나"
- ⚠️ "좋아할까?"는 yes-no-why, "좋아해?"는 crush-feelings

## 우선순위 5: 재회/이별 (love-relationships/reconciliation)
- "다시 만날 수 있을까", "재회", "돌아올까", "연락 올까", "헤어진", "복합"

## 우선순위 6: 인연 찾기 (love-relationships/finding-a-partner)
- "인연 언제", "좋은 사람 만날까", "소개팅", "짝", "배필"

## 우선순위 7: 이직/퇴사 (career-work/job-change)
- "이직", "퇴사", "회사 옮", "직장 바꿀"
- ⚠️ "이직할까?"는 yes-no-why

## 우선순위 8: 면접/시험 (career-work/interview-result, career-work/exam-pass)
- 면접: "면접 결과", "면접 붙을까", "면접 합격"
- 시험: "시험 붙을까", "합격할까", "자격증 딸까"

## 우선순위 9: 오늘 운세 (daily-reading/day-card)
- "오늘 운세", "오늘 어때", "오늘 하루", "오늘의 운"
- ⚠️ 주의: "오늘 ~할까?"는 yes-no-why!

## 우선순위 10: 일반 흐름 (general-insight/past-present-future)
- 구체적인 결정이 없는 상황 파악, 전반적인 흐름, 앞으로의 방향

## 스프레드 목록
${spreadListForPrompt}

## 응답 형식 (JSON만)
{
  "themeId": "테마 ID",
  "spreadId": "스프레드 ID",
  "reason": "선택 이유",
  "userFriendlyExplanation": "사용자에게 보여줄 설명"
}

## ⚠️ 최종 체크 (필수!)
1. 질문에 "할까/갈까/볼까/살까/먹을까/마실까" 패턴이 있는가?
   → YES면 무조건 decisions-crossroads/yes-no-why!
   → 단, "A할까 B할까?"처럼 두 선택지가 명확하면 two-paths
   → 단, "언제 할까?"는 timing-window

2. 비속어나 맞춤법 오류가 있어도 의도를 파악해서 선택
   예: "개한테뽀뽀할까" = "개한테 뽀뽀할까?" = yes-no-why

3. 띄어쓰기 없어도 패턴 인식
   예: "라면먹을까" = "라면 먹을까?" = yes-no-why`;
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
  const examMapping = getExamInterviewMapping(question, language);
  if (examMapping && parsed.spreadId !== examMapping.spreadId) {
    logger.info(`[analyze-question] Correcting: "${question}" → ${examMapping.spreadId} (was: ${parsed.spreadId})`);
    return examMapping;
  }

  // 2. PATTERN_MAPPINGS 테이블 순회 (priority 순으로 정렬됨)
  for (const mapping of PATTERN_MAPPINGS) {
    if (mapping.check(question) && parsed.spreadId !== mapping.targetSpread) {
      logger.info(`[analyze-question] Correcting: "${question}" → ${mapping.targetSpread} (was: ${parsed.spreadId})`);
      return {
        themeId: mapping.themeId,
        spreadId: mapping.targetSpread,
        reason: mapping.reason,
        userFriendlyExplanation: language === "ko" ? mapping.koExplanation : mapping.enExplanation
      };
    }
  }

  return parsed;
}

// ============================================================
// Main POST Handler
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, language = "ko" } = body;

    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 }
      );
    }

    const trimmedQuestion = question.trim().slice(0, 500);

    // 위험한 질문 체크
    if (checkDangerous(trimmedQuestion)) {
      return NextResponse.json({
        isDangerous: true,
        message: language === "ko"
          ? "힘든 시간을 보내고 계신 것 같아요. 전문가의 도움을 받으시길 권해드려요. 자살예방상담전화: 1393 (24시간)"
          : "I sense you might be going through a difficult time. Please reach out to a professional who can help. Crisis helpline: 1393 (Korea) or your local emergency services.",
      });
    }

    // 스프레드 옵션 목록
    const spreadOptions = getSpreadOptions();
    const spreadListForPrompt = spreadOptions.map(s =>
      `- ${s.themeId}/${s.id}: ${s.titleKo} (${s.cardCount}장) - ${s.description}`
    ).join("\n");

    // GPT-4o-mini로 분석
    const systemPrompt = buildSystemPrompt(spreadListForPrompt);

    let responseText = "";
    try {
      responseText = await callOpenAI([
        { role: "system", content: systemPrompt },
        { role: "user", content: `사용자 질문: "${trimmedQuestion}"` }
      ]);
    } catch (error) {
      logger.warn("[analyze-question] OpenAI unavailable, using fallback routing", error);
    }

    const fallbackParsed: ParsedResult = {
      themeId: "general-insight",
      spreadId: "past-present-future",
      reason: "일반적인 운세 확인",
      userFriendlyExplanation: language === "ko"
        ? "전반적인 흐름을 볼 수 있는 스프레드를 준비했어요"
        : "I've prepared a spread to see the overall flow"
    };

    let parsed: ParsedResult;
    try {
      parsed = responseText ? JSON.parse(responseText) : fallbackParsed;
    } catch {
      parsed = fallbackParsed;
    }

    // GPT 결과를 패턴 매칭으로 보정
    parsed = applyPatternCorrections(trimmedQuestion, parsed, language);

    // 선택된 스프레드 정보 찾기
    const selectedSpread = spreadOptions.find(
      s => s.themeId === parsed.themeId && s.id === parsed.spreadId
    );

    if (!selectedSpread) {
      return NextResponse.json({
        isDangerous: false,
        themeId: "general-insight",
        spreadId: "past-present-future",
        spreadTitle: "과거, 현재, 미래",
        cardCount: 3,
        reason: "일반적인 운세 확인",
        userFriendlyExplanation: language === "ko"
          ? "전반적인 흐름을 볼 수 있는 스프레드를 준비했어요"
          : "I've prepared a spread to see the overall flow",
        path: `/tarot/general-insight/past-present-future?question=${encodeURIComponent(trimmedQuestion)}`,
      });
    }

    return NextResponse.json({
      isDangerous: false,
      themeId: parsed.themeId,
      spreadId: parsed.spreadId,
      spreadTitle: selectedSpread.titleKo,
      cardCount: selectedSpread.cardCount,
      reason: parsed.reason,
      userFriendlyExplanation: parsed.userFriendlyExplanation,
      path: `/tarot/${parsed.themeId}/${parsed.spreadId}?question=${encodeURIComponent(trimmedQuestion)}`,
    });

  } catch (error) {
    logger.error("Error analyzing question:", error);
    return NextResponse.json(
      { error: "Failed to analyze question" },
      { status: 500 }
    );
  }
}
