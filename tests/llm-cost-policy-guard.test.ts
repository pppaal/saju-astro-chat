// tests/llm-cost-policy-guard.test.ts
//
// 가드(=훅): LLM 비용 결정(모델 선택)을 라우트마다 흩뿌리는 "두더지 잡기"
// 패턴의 재발을 소스 레벨로 막는다.
//
// 근본 원인: 예전엔 각 라우트가 `model: PREMIUM_CLAUDE_MODEL` 을 직접 박았다.
// 새 기능이 생길 때마다 비싼 모델(Sonnet)을 실수로/무의식적으로 고를 수 있었고,
// 비용이 새면 라우트를 하나씩 땜질해야 했다.
//
// 해결: 모델·출력 cap·이어쓰기 횟수는 src/lib/config/llm-policy.ts (SSOT)가
// 정하고, 라우트는 `feature` 라벨만 넘긴다. 이 가드는 그 규칙이 깨지지 않게
// 강제한다 — 어떤 라우트가 다시 모델을 직접 고르면 CI 가 잡는다.
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { resolveLlmPolicy, LLM_POLICY } from '@/lib/config/llm-policy'

const API_ROOT = resolve(process.cwd(), 'src/app/api')

/** src/app/api 아래 모든 route.ts 경로를 재귀 수집. */
function findRouteFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...findRouteFiles(full))
    else if (entry.name === 'route.ts') out.push(full)
  }
  return out
}

describe('LLM 비용 정책 가드(=훅) — 모델 선택 분산 재발 방지', () => {
  it('어떤 API 라우트도 PREMIUM_CLAUDE_MODEL 을 직접 쓰지 않는다 (feature 라벨 경유)', () => {
    const offenders: string[] = []
    for (const file of findRouteFiles(API_ROOT)) {
      const src = readFileSync(file, 'utf8')
      // 모델을 직접 import/선택하는 패턴. 메트릭 태그용으로 정책에서 해석한
      // 모델명(resolveLlmPolicy(...).model)을 쓰는 건 허용 — 그건 분산이 아니다.
      if (/\bPREMIUM_CLAUDE_MODEL\b/.test(src)) {
        offenders.push(file.replace(process.cwd() + '/', ''))
      }
    }
    expect(
      offenders,
      `라우트가 모델을 직접 고르고 있다. model 대신 feature 라벨을 넘기고 ` +
        `모델은 src/lib/config/llm-policy.ts 에서 정하라:\n  ${offenders.join('\n  ')}`
    ).toEqual([])
  })

  it('정책 표는 현재 동작을 보존한다 (premium 기능 = Sonnet, 기본 = Haiku)', () => {
    const HAIKU = 'claude-haiku-4-5-20251001'
    const SONNET = 'claude-sonnet-4-5-20250929'
    // 기본(미등록 feature) 은 항상 싼 모델.
    expect(resolveLlmPolicy().model).toBe(HAIKU)
    expect(resolveLlmPolicy('default').model).toBe(HAIKU)
    // premium 기능들은 Sonnet — 마이그레이션 전 라우트들이 박아두던 값과 동일.
    expect(resolveLlmPolicy('tarot.interpret').model).toBe(SONNET)
    expect(resolveLlmPolicy('compatibility.counselor').model).toBe(SONNET)
    expect(resolveLlmPolicy('counselor.realtime').model).toBe(SONNET)
    // 무료 데일리 타로는 싼 모델 유지.
    expect(resolveLlmPolicy('tarot.daily').model).toBe(HAIKU)
  })

  it('모든 정책의 출력 cap·이어쓰기 한도는 양수/유한 (비용 폭주 방지선)', () => {
    for (const [feature, policy] of Object.entries(LLM_POLICY)) {
      expect(policy.maxOutputTokens, `${feature}.maxOutputTokens`).toBeGreaterThan(0)
      expect(policy.maxContinuations, `${feature}.maxContinuations`).toBeGreaterThanOrEqual(0)
      expect(policy.maxTotalOutputChars, `${feature}.maxTotalOutputChars`).toBeGreaterThan(0)
    }
  })
})
