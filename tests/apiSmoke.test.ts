import { describe, expect, it, afterEach } from 'vitest'
import { GET as cronGet } from '../src/app/api/cron/notifications/route'
import { GET as metricsGet } from '../src/app/api/metrics/route'

const restoreEnv = (key: string, value: string | undefined) => {
  if (value === undefined) {
    delete process.env[key]
  } else {
    process.env[key] = value
  }
}

describe('API smoke checks', () => {
  const originalCronSecret = process.env.CRON_SECRET
  const originalMetricsToken = process.env.METRICS_TOKEN

  afterEach(() => {
    restoreEnv('CRON_SECRET', originalCronSecret)
    restoreEnv('METRICS_TOKEN', originalMetricsToken)
  })

  it('cron notifications fails fast when secret is missing', async () => {
    delete process.env.CRON_SECRET
    const res = await cronGet(new Request('http://test/api/cron/notifications'))
    expect(res.status).toBe(500)
  })

  it('cron notifications rejects invalid bearer token', async () => {
    process.env.CRON_SECRET = 'secret123'
    const res = await cronGet(
      new Request('http://test/api/cron/notifications', {
        headers: { Authorization: 'Bearer wrong' },
      })
    )
    expect(res.status).toBe(401)
  })

  it('metrics route enforces bearer token', async () => {
    process.env.METRICS_TOKEN = 'metrics-token'
    const unauthorized = await metricsGet(new Request('http://test/api/metrics'))
    expect(unauthorized.status).toBe(401)

    const authorized = await metricsGet(
      new Request('http://test/api/metrics', {
        headers: { Authorization: 'Bearer metrics-token' },
      })
    )
    expect(authorized.status).toBe(200)
  })
})
