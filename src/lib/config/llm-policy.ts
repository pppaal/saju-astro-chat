/**
 * LLM 비용 정책 — 단일 진실 공급원 (SSOT).
 *
 * 왜 이게 있나: 모델 선택·출력 cap·이어쓰기 횟수처럼 "돈이 나가는 결정"이
 * 라우트마다 흩어져 있으면, 새 기능이 생길 때마다 누군가 라우트에서 비싼
 * 모델(Sonnet)을 직접 박고 → 비용이 새고 → 하나씩 땜질("두더지 잡기")하는
 * 악순환이 된다. 그래서 그 결정을 전부 이 표 하나로 모은다.
 *
 * 규칙:
 *  - 라우트는 `model`/`maxTokens`/`maxContinuations` 를 직접 정하지 말고
 *    `feature` 라벨만 넘긴다 (예: feature: 'tarot.interpret').
 *  - `src/lib/llm/claude.ts` (와 continuation wrapper) 가 이 표를 읽어
 *    모델·출력 cap·이어쓰기 횟수를 강제한다.
 *  - 기본값은 **Haiku**. Sonnet 은 이 표에 명시적으로 등록해야만 쓸 수 있다
 *    → "실수로 비싼 모델" 이 구조적으로 불가능.
 *  - 비용을 조이고 싶으면 라우트가 아니라 *이 파일* 한 줄만 고친다.
 *
 * pricing.ts(크레딧 팩 SSOT)와 같은 패턴 — 비용 결정은 config 한 곳에 모은다.
 */

import type { ClaudeModel } from '@/lib/llm/claude'

const HAIKU: ClaudeModel = 'claude-haiku-4-5-20251001'
const SONNET: ClaudeModel = 'claude-sonnet-4-5-20250929'

/** 비용 정책을 적용할 기능 식별자. 새 LLM 라우트는 여기에 라벨을 추가한다. */
export type LlmFeature =
  | 'tarot.interpret'
  | 'tarot.followup'
  | 'tarot.daily'
  | 'compatibility.counselor'
  | 'counselor.realtime'
  | 'default'

export interface LlmPolicy {
  /** 사용할 Claude 모델. 기본은 Haiku, premium 은 명시적으로만. */
  model: ClaudeModel
  /** 단일 요청의 출력 토큰 상한 (요청값은 이 값으로 clamp 된다). */
  maxOutputTokens: number
  /** max_tokens 도달 시 자동 이어쓰기 최대 횟수. 0 = 이어쓰기 없음. */
  maxContinuations: number
  /** 이어쓰기 누적 출력 절대 cap (chars) — 비용 폭주 방지선. */
  maxTotalOutputChars: number
}

/**
 * 미등록 feature(혹은 feature 미지정) 의 기본 정책.
 * 싼 모델 + 넉넉하지만 유한한 cap → 새 호출처가 실수로 폭주하지 않는다.
 */
const DEFAULT_POLICY: LlmPolicy = {
  model: HAIKU,
  maxOutputTokens: 8000,
  maxContinuations: 2,
  maxTotalOutputChars: 24000,
}

/**
 * 기능별 비용 정책 표. 현재 동작을 그대로 인코딩(behavior-preserving)했으며,
 * 앞으로 모델/캡 조정은 *여기서* 한 줄로 한다.
 */
export const LLM_POLICY: Record<Exclude<LlmFeature, 'default'>, LlmPolicy> = {
  // 유료 타로 해석. 카드 수에 따라 1200+cards*500 (최대 6000) 토큰 요청.
  // 비용 절감: Sonnet→Haiku 다운그레이드 (운명 실시간 상담만 Sonnet 유지).
  // 품질 별로면 model 만 SONNET 으로 한 줄 롤백.
  'tarot.interpret': {
    model: HAIKU,
    maxOutputTokens: 6000,
    maxContinuations: 2,
    maxTotalOutputChars: 24000,
  },
  // 타로 후속 질문 — 단일 호출(이어쓰기 없음), 짧은 답. Haiku 로 다운그레이드.
  'tarot.followup': {
    model: HAIKU,
    maxOutputTokens: 700,
    maxContinuations: 0,
    maxTotalOutputChars: 8000,
  },
  // 무료 데일리 타로 — 이미 유저·날짜별 Redis 캐시. 싸게 유지.
  'tarot.daily': {
    model: HAIKU,
    maxOutputTokens: 2000,
    maxContinuations: 0,
    maxTotalOutputChars: 8000,
  },
  // 궁합 상담사 — 비용 절감으로 Haiku 다운그레이드. 품질 별로면 SONNET 으로 롤백.
  'compatibility.counselor': {
    model: HAIKU,
    maxOutputTokens: 5000,
    maxContinuations: 2,
    maxTotalOutputChars: 24000,
  },
  // 운명 실시간 상담사 — 사주+점성 통합 추론이 핵심인 간판 채널. Sonnet 유지.
  'counselor.realtime': {
    model: SONNET,
    maxOutputTokens: 2500,
    maxContinuations: 2,
    maxTotalOutputChars: 24000,
  },
}

/** feature 라벨 → 정책. 미등록/미지정이면 안전한 기본(Haiku) 정책. */
export function resolveLlmPolicy(feature?: LlmFeature): LlmPolicy {
  if (feature && feature !== 'default' && feature in LLM_POLICY) {
    return LLM_POLICY[feature as Exclude<LlmFeature, 'default'>]
  }
  return DEFAULT_POLICY
}
