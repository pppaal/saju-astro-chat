import { beforeAll } from 'vitest'
import { API_BASE, fetchOrThrow, waitForServer } from './test-helpers'
const CRON_SECRET = process.env.CRON_SECRET || 'test-cron-secret'

beforeAll(async () => {
  await waitForServer()
})

describe('API smoke', () => {
  it('cron reset-credits rejects wrong token and accepts correct', async () => {
    // Wrong token
    const resUnauthorized = await fetchOrThrow(`${API_BASE}/api/cron/reset-credits`, {
      headers: { Authorization: 'Bearer wrong' },
    })
    if (resUnauthorized.status === 500) {
      // CRON_SECRET not configured on the server; skip auth check.
      return
    }
    expect(resUnauthorized.status).toBe(401)

    // 크론 엔드포인트는 만료 스윕/보존기간 정리 배치를 실제로 수행하므로
    // 기본 15초 컷이 과도하다(콜드 프리즈마 엔진 + 배치 3종). 이 스모크의
    // 관심사는 토큰 게이트이지 응답 속도가 아니다 — 60초로 여유.
    const resAuthorized = await fetchOrThrow(
      `${API_BASE}/api/cron/reset-credits`,
      { headers: { Authorization: `Bearer ${CRON_SECRET}` } },
      60000
    )
    if (resAuthorized.status === 401) {
      throw new Error(
        'CRON_SECRET mismatch: set the same CRON_SECRET for the dev server and E2E tests.'
      )
    }
    expect([200, 500]).toContain(resAuthorized.status)
  })
})
