// src/lib/destiny-matrix/ai-report/aiBackend.ts
// AI 백엔드 호출 함수들

import { getBackendUrl } from '@/lib/backend-url';
import type { AIPremiumReport } from './reportTypes';

// 기본 타임아웃: 2분
const DEFAULT_TIMEOUT = 120000;

interface AIBackendResponse<T> {
  sections: T;
  model: string;
  tokensUsed?: number;
}

// ===========================
// 기본 AI 백엔드 호출
// ===========================

export async function callAIBackend(
  prompt: string,
  lang: 'ko' | 'en'
): Promise<AIBackendResponse<AIPremiumReport['sections']>> {
  return callAIBackendGeneric<AIPremiumReport['sections']>(prompt, lang);
}

// ===========================
// 제네릭 AI 백엔드 호출
// ===========================

export async function callAIBackendGeneric<T>(
  prompt: string,
  lang: 'ko' | 'en'
): Promise<AIBackendResponse<T>> {
  const backendUrl = getBackendUrl();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const apiToken = process.env.ADMIN_API_TOKEN;
  if (apiToken) {
    headers['X-API-KEY'] = apiToken;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const response = await fetch(`${backendUrl}/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt,
        mode: 'premium_report',
        locale: lang,
        max_tokens: 4000,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`AI Backend error: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data?.data?.response || data?.response || '';

    let sections: T;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        sections = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch {
      // 기본 폴백 구조
      sections = {} as T;
    }

    return {
      sections,
      model: data?.data?.model || 'gpt-4o',
      tokensUsed: data?.data?.usage?.total_tokens,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ===========================
// 폴백 섹션 생성
// ===========================

export function createFallbackSections(lang: 'ko' | 'en'): AIPremiumReport['sections'] {
  return {
    introduction: '',
    personalityDeep: '',
    careerPath: '',
    relationshipDynamics: '',
    wealthPotential: '',
    healthGuidance: '',
    lifeMission: '',
    timingAdvice: '',
    actionPlan: '',
    conclusion: lang === 'ko' ? '행운을 빕니다!' : 'Wishing you the best!',
  };
}
