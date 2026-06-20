/**
 * 멱등(idempotency) owner-key 스코프 일관성 가드.
 *
 * 과금 중복 차감 방지용 멱등 키의 *소유자 스코프* 가 라우트마다 제각각이면
 * (한 곳은 userId, 다른 곳은 IP) 드리프트가 생긴다. 실제로 tarot/followup 이
 * 한때 IP 스코프라, 같은 IP 의 서로 다른 로그인 사용자가 서로의 차감을 replay
 * 로 건너뛰거나(교차 무료), NAT 뒤 사용자들이 충돌하는 버그가 있었다.
 *
 * 규약(이 가드가 강제):
 *  - 로그인 필수 과금 라우트(counselor/realtime, compatibility/counselor,
 *    tarot/followup)의 멱등 owner-key 는 `user:${userId}` — userId 스코프.
 *  - 게스트 허용 과금 라우트(tarot draw/interpret)는 공용 helper
 *    drawNonceOwnerKey(req, userId) 로 통일 (userId 있으면 userId, 없으면 ip:).
 *
 * grep-style 가드 — 누가 무심코 IP 스코프나 헤더 raw 키로 되돌리면 catch.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const read = (p: string) => readFileSync(join(process.cwd(), 'src', p), 'utf-8')

describe('멱등 owner-key 스코프 일관성', () => {
  it('counselor/realtime — keyFor 의 owner-key 가 user:${userId}', () => {
    const route = read('app/api/counselor/realtime/route.ts')
    expect(route).toMatch(/keyFor\(\s*req,\s*`user:\$\{userId\}`/)
  })

  it('compatibility/counselor — owner-key 가 user:${context.userId} (IP 아님)', () => {
    const route = read('app/api/compatibility/counselor/route.ts')
    expect(route).toMatch(/keyFor\([\s\S]{0,40}`user:\$\{context\.userId\}`/)
    // 멱등 스코프가 IP 로 회귀하지 않았는지(과거 드리프트 방어).
    expect(route).not.toMatch(/keyFor\([\s\S]{0,80}x-forwarded-for/)
  })

  it('tarot/followup — owner-key 가 user:${context.userId} (한때 IP 스코프였던 회귀 방어)', () => {
    const route = read('app/api/tarot/followup/route.ts')
    expect(route).toMatch(/const ownerKey = `user:\$\{context\.userId\}`/)
    expect(route).toMatch(/keyFor\(\s*req,\s*ownerKey/)
  })

  it('tarot draw/interpret — 공용 drawNonceOwnerKey 로 통일', () => {
    const interpret = read('app/api/tarot/interpret-stream/route.ts')
    const draw = read('app/api/tarot/route.ts')
    expect(interpret).toMatch(/drawNonceOwnerKey\(req,\s*context\.userId\)/)
    expect(draw).toMatch(/drawNonceOwnerKey\(req,\s*creditResult\.userId\)/)
  })

  it('drawNonceOwnerKey helper — userId 우선, 없을 때만 ip: 폴백 (게스트 허용 경로)', () => {
    const idem = read('lib/api/idempotency.ts')
    // userId 가 있으면 그대로 반환(로그인 사용자 스코프), 없으면 ip: 접두.
    expect(idem).toMatch(/export function drawNonceOwnerKey/)
    expect(idem).toMatch(/if \(userId\) return userId/)
    expect(idem).toMatch(/return `ip:\$\{ip\}`/)
  })
})
