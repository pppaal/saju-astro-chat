// src/app/api/life-prediction/advisor-chat/route.ts
// AI 운세 상담사 채팅 API - 융 심리학 기반 상담
// v3.0: 백엔드 counseling_engine 완전 통합 (위기감지, RAG, RuleEngine)

import { NextRequest, NextResponse } from 'next/server';
import { initializeApiContext, createAuthenticatedGuard } from '@/lib/api/middleware';
import { apiClient } from '@/lib/api/ApiClient';
import { logger } from '@/lib/logger';

interface PredictionResult {
  startDate: string;
  endDate: string;
  score: number;
  grade: string;
  reasons: string[];
}

interface ChatContext {
  question: string;
  eventType: string;
  results: PredictionResult[];
  birthDate: string;
  gender: 'M' | 'F';
  sipsin?: string;
  daeun?: string;
  yongsin?: string[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  message: string;
  sessionId?: string;
  context: ChatContext;
  history: ChatMessage[];
  locale: 'ko' | 'en';
}

interface RagContextResponse {
  rag_context?: {
    sipsin?: string;
    timing?: string;
    query_result?: string;
    insights?: string[];
  };
}

interface CounselingResponse {
  status: string;
  response: string;
  session_id: string;
  phase: string;
  crisis_detected: boolean;
  severity: string;
  should_continue: boolean;
  jung_context: Record<string, unknown>;
}

interface TherapeuticQuestionsResponse {
  rag_questions?: string[];
  question?: string;
}

// ============================================================
// RAG 컨텍스트 (백엔드 없이도 기본 동작)
// ============================================================
async function fetchRagContext(
  sipsin?: string,
  eventType?: string,
  userMessage?: string
): Promise<{ context: string; insights: string[] }> {
  // 백엔드가 없어도 기본 지식으로 동작
  const fallbackContext = buildFallbackContext(sipsin, eventType);

  try {
    const response = await apiClient.post('/api/prediction/rag-context', {
      sipsin,
      event_type: eventType,
      query: userMessage,
    }, { timeout: 10000 });

    if (!response.ok) {
      return fallbackContext;
    }

    const ragContext = (response.data as RagContextResponse)?.rag_context || {};

    const parts: string[] = [];
    if (ragContext.sipsin) {parts.push(ragContext.sipsin);}
    if (ragContext.timing) {parts.push(ragContext.timing);}
    if (ragContext.query_result) {parts.push(ragContext.query_result);}

    return {
      context: parts.join('\n\n') || fallbackContext.context,
      insights: ragContext.insights || [],
    };
  } catch {
    // 백엔드 연결 실패 시 fallback 사용 (조용히 처리)
    return fallbackContext;
  }
}

// 백엔드 없을 때 기본 컨텍스트
function buildFallbackContext(sipsin?: string, eventType?: string): { context: string; insights: string[] } {
  const tips: string[] = [];

  if (eventType) {
    const eventTips: Record<string, string> = {
      '취업/이직': '직장운은 관성(官星)과 인성(印星)의 조화가 중요합니다.',
      '연애/결혼': '인연운은 재성(財星)과 관성(官星)의 흐름을 봅니다.',
      '재물/투자': '재물운은 식상생재(食傷生財)의 흐름이 핵심입니다.',
      '시험/학업': '학업운은 인성(印星)과 식신(食神)의 기운이 중요합니다.',
      '건강': '건강운은 일간의 강약과 오행 균형을 봅니다.',
      '이사/부동산': '부동산운은 인성과 재성의 관계가 핵심입니다.',
    };
    if (eventTips[eventType]) {tips.push(eventTips[eventType]);}
  }

  if (sipsin) {
    tips.push(`현재 ${sipsin}의 기운이 흐르고 있습니다.`);
  }

  return { context: tips.join(' '), insights: [] };
}

// ============================================================
// 융 심리학 기반 치료적 질문 가져오기
// ============================================================
async function fetchTherapeuticQuestions(
  theme: string,
  userMessage: string
): Promise<string[]> {
  try {
    const response = await apiClient.post('/api/counseling/therapeutic-questions', {
      theme,
      user_message: userMessage,
    }, { timeout: 5000 });

    if (!response.ok) {return [];}

    const data = response.data as TherapeuticQuestionsResponse;
    return data?.rag_questions || (data?.question ? [data.question] : []);
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Apply middleware: authentication + rate limiting + credit consumption
    const guardOptions = createAuthenticatedGuard({
      route: "life-prediction-advisor-chat",
      limit: 30,
      windowSeconds: 60,
      requireCredits: true,
      creditType: "followUp", // 인생 예측 상담은 followUp 타입 사용
      creditAmount: 1,
    });

    const { error } = await initializeApiContext(request, guardOptions);
    if (error) {return error;}

    const body: ChatRequest = await request.json();
    const { message, context, history, locale, sessionId } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    // ============================================================
    // v3.0: 백엔드 counseling engine 우선 사용
    // ============================================================
    try {
      const counselingResponse = await apiClient.post('/api/counseling/chat', {
        message,
        session_id: sessionId,
        saju: {
          dayMaster: {
            element: context.sipsin?.split(' ')[0] || '',
          },
          daeun: context.daeun,
        },
        // 타로/점성 데이터가 있다면 추가 가능
      }, { timeout: 15000 });

      if (counselingResponse.ok && (counselingResponse.data as CounselingResponse)?.status === 'success') {
        const counselingData = counselingResponse.data as CounselingResponse;
        // ✅ 백엔드 상담 엔진 사용 성공
        logger.info('[Advisor Chat] Using backend counseling engine');

        return NextResponse.json({
          success: true,
          reply: counselingData.response,
          sessionId: counselingData.session_id,
          phase: counselingData.phase,
          crisisDetected: counselingData.crisis_detected,
          severity: counselingData.severity,
          shouldContinue: counselingData.should_continue,
          jungContext: counselingData.jung_context,
          useBackendEngine: true, // 백엔드 엔진 사용 표시
        });
      }
    } catch (backendError) {
      logger.warn('[Advisor Chat] Backend counseling engine unavailable, falling back to GPT:', backendError);
      // Fallback continues below
    }

    // ============================================================
    // Fallback: 기존 GPT 방식 (백엔드 실패 시)
    // ============================================================
    logger.info('[Advisor Chat] Using fallback GPT mode');

    // RAG 컨텍스트 가져오기
    const { context: ragContext } = await fetchRagContext(
      context.sipsin,
      context.eventType,
      message
    );

    // 치료적 질문 가져오기
    const therapeuticQuestions = await fetchTherapeuticQuestions(
      context.eventType,
      message
    );

    // 예측 결과 상세 요약 생성
    const resultsSummary = context.results
      .slice(0, 5)
      .map((r, i) => {
        const startDate = new Date(r.startDate).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US');
        const endDate = new Date(r.endDate).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US');
        return `${i + 1}위: ${startDate} ~ ${endDate}
   등급: ${r.grade} (${r.score}점)
   이유: ${r.reasons.join(', ')}`;
      })
      .join('\n\n');

    // 현재 날짜 계산
    const now = new Date();
    const currentDateKo = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
    const currentDateEn = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // 시스템 프롬프트 - 간결하게 핵심만
    const userInfo = [
      `생년월일: ${context.birthDate}`,
      `성별: ${context.gender === 'M' ? '남성' : '여성'}`,
      `질문: "${context.question}"`,
      context.sipsin && `현재 운: ${context.sipsin}`,
      context.daeun && `대운: ${context.daeun}`,
    ].filter(Boolean).join(' | ');

    const systemPrompt = locale === 'ko'
      ? `운세 상담사. 오늘: ${currentDateKo}

[사용자] ${userInfo}

[길일 TOP5]
${resultsSummary}

${ragContext ? `[참고지식]\n${ragContext.slice(0, 800)}` : ''}

${therapeuticQuestions.length ? `[활용질문] ${therapeuticQuestions[0]}` : ''}

[규칙]
- 공감 먼저, 그 다음 조언
- 사주 용어는 쉽게 풀어서
- 구체적 시기 + 실천 방법 제시
- 3-5문장으로 간결하게`
      : `Fortune advisor. Today: ${currentDateEn}

[User] Birth: ${context.birthDate}, ${context.gender === 'M' ? 'Male' : 'Female'}, Q: "${context.question}"

[Best Dates]
${resultsSummary}

${ragContext ? `[Knowledge]\n${ragContext.slice(0, 800)}` : ''}

[Rules]
- Empathize first, then advise
- Explain terms simply
- Give specific timing + actionable steps
- Keep responses to 3-5 sentences`;

    // 대화 히스토리 구성
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(h => ({
        role: h.role,
        content: h.content,
      })),
      { role: 'user', content: message },
    ];

    // OpenAI API 호출
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.error('[Advisor Chat] OPENAI_API_KEY is not set');
      return NextResponse.json(
        { success: false, error: 'API key not configured' },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',  // 최고 성능 모델로 업그레이드
        messages,
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('[Advisor Chat] OpenAI error:', { status: response.status, errorBody });
      throw new Error(`OpenAI API error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      success: true,
      reply,
      // 디버깅용 정보
      ragUsed: !!ragContext,
      therapeuticQuestionsUsed: therapeuticQuestions.length > 0,
      useBackendEngine: false, // Fallback 사용
    });

  } catch (error) {
    logger.error('[Advisor Chat] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}
