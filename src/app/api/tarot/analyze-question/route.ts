// src/app/api/tarot/analyze-question/route.ts
// GPT-4o-mini를 사용해서 사용자 질문을 분석하고 적절한 스프레드 추천

import { NextRequest, NextResponse } from "next/server";
import { tarotThemes } from "@/lib/Tarot/tarot-spreads-data";
import {
  isYesNoQuestion,
  isCrushQuestion,
  isReconciliationQuestion,
  isExamInterviewQuestion,
  isJobChangeQuestion,
  isComparisonQuestion,
  isTimingQuestion,
  isFindingPartnerQuestion,
  isTodayFortuneQuestion,
  isWeeklyMonthlyQuestion,
  isMoneyFortuneQuestion,
  isHealthFortuneQuestion,
  isFamilyRelationQuestion,
  isBusinessQuestion,
  isGeneralFortuneQuestion,
  isStudyFortuneQuestion,
  isTravelQuestion,
  isWorkRelationQuestion,
  isLegalQuestion,
  isDrivingQuestion,
  isPetQuestion,
  isFriendRelationQuestion,
  isMarriageRelationQuestion,
  isBeautyFashionQuestion,
  isMovingRealEstateQuestion,
  isParentCareQuestion,
  isSleepRestQuestion,
  isOnlineShoppingQuestion,
  isRentalLeaseQuestion,
  isPhoneDeviceQuestion,
  isHairAppearanceQuestion,
  isGiftPresentQuestion,
  isDietWeightQuestion,
  isLanguageLearningQuestion,
  isDriverLicenseQuestion,
  isVolunteerCharityQuestion,
  isCoupleFightQuestion,
} from "@/lib/Tarot/questionClassifiers";

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
async function callOpenAI(messages: { role: string; content: string }[], maxTokens = 300) {
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
      temperature: 0.3,
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
  return `당신은 타로 전문가입니다. 사용자의 질문을 분석하고 가장 적합한 타로 스프레드를 추천해야 합니다.

## ⭐⭐⭐ 핵심 규칙: Yes/No 결정 질문 감지 ⭐⭐⭐

다음 패턴이 포함된 질문은 **무조건** decisions-crossroads/yes-no-why 선택:
- "~할까?", "~갈까?", "~볼까?", "~살까?", "~먹을까?", "~마실까?"
- "~해야 할까?", "~하면 될까?", "~해도 될까?", "~해볼까?"
- "~할지", "~갈지", "~할까요", "~갈까요"
- "~하는 게 좋을까?", "~해야 하나?", "~할까 말까"
- "Should I~?", "Is it good to~?"

### Yes/No 질문 예시 (모두 decisions-crossroads/yes-no-why):
- "오늘 운동 갈까?" → yes-no-why ✓
- "이 옷 살까?" → yes-no-why ✓
- "술 마실까?" → yes-no-why ✓
- "그 사람한테 연락할까?" → yes-no-why ✓

## 다른 스프레드 선택 기준

### 1. 두 가지 선택 비교 (decisions-crossroads/two-paths)
- "A vs B", "A냐 B냐", "A 아니면 B"

### 2. 타이밍 질문 (decisions-crossroads/timing-window)
- "언제~?", "몇 월에~?", "시기가~?"

### 3. 상대방 마음/감정 (love-relationships/crush-feelings)
- "그 사람 마음", "날 어떻게 생각해?", "좋아해?"

### 4. 재회/이별 (love-relationships/reconciliation)
- "다시 만날 수 있을까?", "재회", "돌아올까?"

### 5. 인연 찾기 (love-relationships/finding-a-partner)
- "인연 언제?", "좋은 사람 만날까?", "소개팅"

### 6. 이직/퇴사 (career-work/job-change)
- "이직해도 될까?", "회사 옮길까?", "퇴사"

### 7. 면접/시험 (career-work/interview-result, career-work/exam-pass)
- "면접 결과", "시험 붙을까?", "합격할까?"

### 8. 오늘 운세 (daily-reading/day-card)
- "오늘 운세", "오늘 어때?", "오늘 하루"
- ⚠️ "오늘 ~할까?"는 yes-no-why!

### 9. 일반 흐름 (general-insight/past-present-future)
- 구체적인 결정이 없는 상황 파악

## 스프레드 목록
${spreadListForPrompt}

## 응답 형식 (JSON만)
{
  "themeId": "테마 ID",
  "spreadId": "스프레드 ID",
  "reason": "선택 이유",
  "userFriendlyExplanation": "사용자에게 보여줄 설명"
}

## ⚠️ 최종 체크
질문에 "~할까?", "~갈까?", "~볼까?", "~살까?", "~먹을까?" 패턴이 있으면
→ 무조건 decisions-crossroads/yes-no-why 선택!`;
}

// ============================================================
// Pattern Matching Corrections
// ============================================================
function applyPatternCorrections(
  question: string,
  parsed: ParsedResult,
  language: string
): ParsedResult {
  // 1. Yes/No 질문 (최우선)
  if (isYesNoQuestion(question) && parsed.spreadId !== "yes-no-why") {
    console.log(`[analyze-question] Correcting: "${question}" → yes-no-why (was: ${parsed.spreadId})`);
    return {
      themeId: "decisions-crossroads",
      spreadId: "yes-no-why",
      reason: "결정이 필요한 질문",
      userFriendlyExplanation: language === "ko"
        ? "해야 할지 말아야 할지, 카드가 답해드릴게요! 🎴"
        : "Should you or shouldn't you? Let the cards answer! 🎴"
    };
  }

  // 2. A vs B 비교 질문
  if (isComparisonQuestion(question) && parsed.spreadId !== "two-paths") {
    console.log(`[analyze-question] Correcting: "${question}" → two-paths (was: ${parsed.spreadId})`);
    return {
      themeId: "decisions-crossroads",
      spreadId: "two-paths",
      reason: "두 가지 선택 비교",
      userFriendlyExplanation: language === "ko"
        ? "두 선택지를 비교해서 카드가 방향을 알려드릴게요! ⚖️"
        : "Let's compare both options with the cards! ⚖️"
    };
  }

  // 3. 타이밍/시기 질문
  if (isTimingQuestion(question) && parsed.spreadId !== "timing-window") {
    console.log(`[analyze-question] Correcting: "${question}" → timing-window (was: ${parsed.spreadId})`);
    return {
      themeId: "decisions-crossroads",
      spreadId: "timing-window",
      reason: "타이밍/시기 확인",
      userFriendlyExplanation: language === "ko"
        ? "언제가 좋을지 카드로 알아볼게요! ⏰"
        : "Let's find the right timing! ⏰"
    };
  }

  // 4. 재회/이별 질문
  if (isReconciliationQuestion(question) && parsed.spreadId !== "reconciliation") {
    console.log(`[analyze-question] Correcting: "${question}" → reconciliation (was: ${parsed.spreadId})`);
    return {
      themeId: "love-relationships",
      spreadId: "reconciliation",
      reason: "재회 가능성 확인",
      userFriendlyExplanation: language === "ko"
        ? "다시 만날 수 있을지 카드로 살펴볼게요! 💔➡️💕"
        : "Let's see the possibility of reconciliation! 💔➡️💕"
    };
  }

  // 5. 상대방 마음 질문
  if (isCrushQuestion(question) && parsed.spreadId !== "crush-feelings") {
    console.log(`[analyze-question] Correcting: "${question}" → crush-feelings (was: ${parsed.spreadId})`);
    return {
      themeId: "love-relationships",
      spreadId: "crush-feelings",
      reason: "상대방 마음 확인",
      userFriendlyExplanation: language === "ko"
        ? "그 사람의 마음을 카드로 살펴볼게요! 💕"
        : "Let's see what they really feel! 💕"
    };
  }

  // 6. 인연/소개팅 질문
  if (isFindingPartnerQuestion(question) && parsed.spreadId !== "finding-a-partner") {
    console.log(`[analyze-question] Correcting: "${question}" → finding-a-partner (was: ${parsed.spreadId})`);
    return {
      themeId: "love-relationships",
      spreadId: "finding-a-partner",
      reason: "인연 찾기",
      userFriendlyExplanation: language === "ko"
        ? "좋은 인연이 언제 올지 카드로 살펴볼게요! 💘"
        : "Let's see when love will come! 💘"
    };
  }

  // 7. 면접/시험 질문
  if (isExamInterviewQuestion(question)) {
    const isInterview = /면접/.test(question);
    const targetSpread = isInterview ? "interview-result" : "exam-pass";
    if (parsed.spreadId !== targetSpread) {
      console.log(`[analyze-question] Correcting: "${question}" → ${targetSpread} (was: ${parsed.spreadId})`);
      return {
        themeId: "career-work",
        spreadId: targetSpread,
        reason: isInterview ? "면접 결과 확인" : "시험 합격 확인",
        userFriendlyExplanation: language === "ko"
          ? (isInterview ? "면접 결과를 카드로 살펴볼게요! 💼" : "시험 합격 가능성을 카드로 살펴볼게요! 📝")
          : (isInterview ? "Let's see your interview outcome! 💼" : "Let's see your exam result! 📝")
      };
    }
  }

  // 8. 이직/퇴사 질문
  if (isJobChangeQuestion(question) && parsed.spreadId !== "job-change") {
    console.log(`[analyze-question] Correcting: "${question}" → job-change (was: ${parsed.spreadId})`);
    return {
      themeId: "career-work",
      spreadId: "job-change",
      reason: "이직/퇴사 상담",
      userFriendlyExplanation: language === "ko"
        ? "직장 변화의 흐름을 카드로 살펴볼게요! 💼"
        : "Let's explore your career transition! 💼"
    };
  }

  // 9. 오늘 운세 질문
  if (isTodayFortuneQuestion(question) && parsed.spreadId !== "day-card") {
    console.log(`[analyze-question] Correcting: "${question}" → day-card (was: ${parsed.spreadId})`);
    return {
      themeId: "daily-reading",
      spreadId: "day-card",
      reason: "오늘의 운세",
      userFriendlyExplanation: language === "ko"
        ? "오늘 하루를 위한 카드를 뽑아볼게요! ☀️"
        : "Let's draw a card for your day! ☀️"
    };
  }

  // 10. 주간/월간 운세 질문
  if (isWeeklyMonthlyQuestion(question) && parsed.spreadId !== "weekly-outlook") {
    console.log(`[analyze-question] Correcting: "${question}" → weekly-outlook (was: ${parsed.spreadId})`);
    return {
      themeId: "daily-reading",
      spreadId: "weekly-outlook",
      reason: "주간/월간 운세",
      userFriendlyExplanation: language === "ko"
        ? "이번 주/달의 흐름을 카드로 살펴볼게요! 📅"
        : "Let's see your week/month ahead! 📅"
    };
  }

  // 11-40: Additional category corrections
  const categoryMappings: Array<{
    check: (q: string) => boolean;
    targetSpread: string;
    themeId: string;
    reason: string;
    koExplanation: string;
    enExplanation: string;
  }> = [
    {
      check: isMoneyFortuneQuestion,
      targetSpread: "financial-outlook",
      themeId: "money-finance",
      reason: "금전/재물 운세",
      koExplanation: "금전과 재물의 흐름을 카드로 살펴볼게요! 💰",
      enExplanation: "Let's explore your financial fortune! 💰"
    },
    {
      check: isHealthFortuneQuestion,
      targetSpread: "health-wellness",
      themeId: "well-being-healing",
      reason: "건강 운세",
      koExplanation: "건강과 활력의 흐름을 카드로 살펴볼게요! 💪",
      enExplanation: "Let's explore your health and vitality! 💪"
    },
    {
      check: isFamilyRelationQuestion,
      targetSpread: "relationship-potential",
      themeId: "love-relationships",
      reason: "가족 관계 운세",
      koExplanation: "가족 관계의 흐름을 카드로 살펴볼게요! 👨‍👩‍👧",
      enExplanation: "Let's explore your family relationships! 👨‍👩‍👧"
    },
    {
      check: isBusinessQuestion,
      targetSpread: "financial-outlook",
      themeId: "money-finance",
      reason: "사업/창업 운세",
      koExplanation: "사업과 창업의 흐름을 카드로 살펴볼게요! 📈",
      enExplanation: "Let's explore your business fortune! 📈"
    },
    {
      check: isGeneralFortuneQuestion,
      targetSpread: "past-present-future",
      themeId: "general-insight",
      reason: "일반 운세",
      koExplanation: "전반적인 흐름을 카드로 살펴볼게요! ✨",
      enExplanation: "Let's see the overall flow! ✨"
    },
    {
      check: isStudyFortuneQuestion,
      targetSpread: "past-present-future",
      themeId: "general-insight",
      reason: "학업 운세",
      koExplanation: "학업과 공부의 흐름을 카드로 살펴볼게요! 📚",
      enExplanation: "Let's explore your academic fortune! 📚"
    },
    {
      check: isTravelQuestion,
      targetSpread: "past-present-future",
      themeId: "general-insight",
      reason: "여행 운세",
      koExplanation: "여행과 이동의 흐름을 카드로 살펴볼게요! ✈️",
      enExplanation: "Let's explore your travel fortune! ✈️"
    },
    {
      check: isWorkRelationQuestion,
      targetSpread: "relationship-potential",
      themeId: "love-relationships",
      reason: "직장 관계 운세",
      koExplanation: "직장 내 관계를 카드로 살펴볼게요! 👔",
      enExplanation: "Let's explore your workplace relationships! 👔"
    },
    {
      check: isLegalQuestion,
      targetSpread: "past-present-future",
      themeId: "general-insight",
      reason: "법적 문제 운세",
      koExplanation: "법적 상황의 흐름을 카드로 살펴볼게요! ⚖️",
      enExplanation: "Let's explore your legal situation! ⚖️"
    },
    {
      check: isDrivingQuestion,
      targetSpread: "past-present-future",
      themeId: "general-insight",
      reason: "운전/차량 운세",
      koExplanation: "운전과 차량 관련 흐름을 카드로 살펴볼게요! 🚗",
      enExplanation: "Let's explore your driving fortune! 🚗"
    },
    {
      check: isPetQuestion,
      targetSpread: "past-present-future",
      themeId: "general-insight",
      reason: "반려동물 운세",
      koExplanation: "반려동물과의 인연을 카드로 살펴볼게요! 🐾",
      enExplanation: "Let's explore your pet's fortune! 🐾"
    },
    {
      check: isFriendRelationQuestion,
      targetSpread: "relationship-potential",
      themeId: "love-relationships",
      reason: "친구 관계 운세",
      koExplanation: "친구 관계의 흐름을 카드로 살펴볼게요! 🤝",
      enExplanation: "Let's explore your friendships! 🤝"
    },
    {
      check: isMarriageRelationQuestion,
      targetSpread: "relationship-potential",
      themeId: "love-relationships",
      reason: "연애/결혼 운세",
      koExplanation: "연애와 결혼의 흐름을 카드로 살펴볼게요! 💍",
      enExplanation: "Let's explore your love and marriage! 💍"
    },
    {
      check: isBeautyFashionQuestion,
      targetSpread: "past-present-future",
      themeId: "general-insight",
      reason: "외모/패션 운세",
      koExplanation: "외모와 스타일의 방향을 카드로 살펴볼게요! 💄",
      enExplanation: "Let's explore your beauty and style! 💄"
    },
    {
      check: isMovingRealEstateQuestion,
      targetSpread: "past-present-future",
      themeId: "general-insight",
      reason: "이사/부동산 운세",
      koExplanation: "주거와 이사의 흐름을 카드로 살펴볼게요! 🏠",
      enExplanation: "Let's explore your moving fortune! 🏠"
    },
    {
      check: isParentCareQuestion,
      targetSpread: "relationship-potential",
      themeId: "love-relationships",
      reason: "부모님 관계 운세",
      koExplanation: "부모님과의 관계와 효도의 방향을 카드로 살펴볼게요 👨‍👩‍👧",
      enExplanation: "Let's explore your relationship with your parents 👨‍👩‍👧"
    },
    {
      check: isSleepRestQuestion,
      targetSpread: "inner-peace",
      themeId: "well-being-healing",
      reason: "수면/휴식 운세",
      koExplanation: "편안한 휴식과 수면의 방향을 카드로 살펴볼게요 😴",
      enExplanation: "Let's explore your path to restful sleep 😴"
    },
    {
      check: isOnlineShoppingQuestion,
      targetSpread: "financial-outlook",
      themeId: "money-finance",
      reason: "쇼핑/구매 운세",
      koExplanation: "쇼핑과 구매 결정의 흐름을 카드로 살펴볼게요 🛒",
      enExplanation: "Let's explore your shopping and purchase decisions 🛒"
    },
    {
      check: isRentalLeaseQuestion,
      targetSpread: "past-present-future",
      themeId: "general-insight",
      reason: "임대/주거 운세",
      koExplanation: "주거와 임대 관련 흐름을 카드로 살펴볼게요 🏠",
      enExplanation: "Let's explore your housing and rental situation 🏠"
    },
    {
      check: isPhoneDeviceQuestion,
      targetSpread: "financial-outlook",
      themeId: "money-finance",
      reason: "기기 구매 운세",
      koExplanation: "전자기기 구매와 교체 시기를 카드로 살펴볼게요 📱",
      enExplanation: "Let's explore the timing for your device purchase 📱"
    },
    {
      check: isHairAppearanceQuestion,
      targetSpread: "past-present-future",
      themeId: "general-insight",
      reason: "외모 변화 운세",
      koExplanation: "외모 변화와 이미지 전환을 카드로 살펴볼게요 💇",
      enExplanation: "Let's explore your appearance transformation 💇"
    },
    {
      check: isGiftPresentQuestion,
      targetSpread: "past-present-future",
      themeId: "general-insight",
      reason: "선물 운세",
      koExplanation: "선물 선택과 마음 전달을 카드로 살펴볼게요 🎁",
      enExplanation: "Let's explore the perfect gift choice 🎁"
    },
    {
      check: isDietWeightQuestion,
      targetSpread: "inner-peace",
      themeId: "well-being-healing",
      reason: "다이어트/체중관리 운세",
      koExplanation: "건강한 체중 관리와 다이어트 흐름을 카드로 살펴볼게요 💪",
      enExplanation: "Let's explore your weight management journey 💪"
    },
    {
      check: isLanguageLearningQuestion,
      targetSpread: "past-present-future",
      themeId: "general-insight",
      reason: "언어학습 운세",
      koExplanation: "외국어 학습과 실력 향상을 카드로 살펴볼게요 📚",
      enExplanation: "Let's explore your language learning path 📚"
    },
    {
      check: isDriverLicenseQuestion,
      targetSpread: "past-present-future",
      themeId: "general-insight",
      reason: "운전/차량 운세",
      koExplanation: "운전과 차량 관련 흐름을 카드로 살펴볼게요 🚗",
      enExplanation: "Let's explore your driving and vehicle decisions 🚗"
    },
    {
      check: isVolunteerCharityQuestion,
      targetSpread: "past-present-future",
      themeId: "general-insight",
      reason: "봉사/기부 운세",
      koExplanation: "나눔과 봉사 활동의 방향을 카드로 살펴볼게요 🤝",
      enExplanation: "Let's explore your path to giving back 🤝"
    },
    {
      check: isCoupleFightQuestion,
      targetSpread: "relationship-potential",
      themeId: "love-relationships",
      reason: "커플 화해 운세",
      koExplanation: "갈등 해결과 화해의 방향을 카드로 살펴볼게요 💕",
      enExplanation: "Let's explore how to reconcile and heal 💕"
    },
  ];

  for (const mapping of categoryMappings) {
    if (mapping.check(question) && parsed.spreadId !== mapping.targetSpread) {
      console.log(`[analyze-question] Correcting: "${question}" → ${mapping.targetSpread} (was: ${parsed.spreadId})`);
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
      console.warn("[analyze-question] OpenAI unavailable, using fallback routing", error);
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
    console.error("Error analyzing question:", error);
    return NextResponse.json(
      { error: "Failed to analyze question" },
      { status: 500 }
    );
  }
}
