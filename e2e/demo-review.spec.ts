import { expect, test } from '@playwright/test'

const demoToken = process.env.DEMO_REVIEW_TOKEN || process.env.DEMO_TOKEN || 'demo-test-token'

test.describe('Demo review', () => {
  test('review page denies access without token', async ({ page }) => {
    const response = await page.goto('/demo/review', { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBe(404)
  })

  test('review page renders with token', async ({ page }) => {
    const response = await page.goto(`/demo/review?token=${encodeURIComponent(demoToken)}`, {
      waitUntil: 'domcontentloaded',
    })
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { name: 'Demo Review' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Submit feedback' })).toBeVisible()
  })

  test('feedback API accepts token-protected POST', async ({ request }) => {
    const createRes = await request.post(
      `/api/demo/feedback?token=${encodeURIComponent(demoToken)}`,
      {
        data: {
          category: 'bug',
          severity: 'med',
          message: 'E2E demo feedback smoke',
          pageUrl: '/demo/review',
          locale: 'en',
          debugJson: { source: 'playwright' },
        },
      }
    )
    expect(createRes.status()).toBe(201)
    const created = (await createRes.json()) as { item?: { id?: string } }
    expect(created.item?.id).toBeTruthy()

    const listRes = await request.get(`/api/demo/feedback?token=${encodeURIComponent(demoToken)}`)
    expect(listRes.status()).toBe(200)
    const listData = (await listRes.json()) as { items?: Array<{ id: string }> }
    expect(Array.isArray(listData.items)).toBe(true)
    expect(listData.items?.some((item) => item.id === created.item?.id)).toBe(true)
  })
})
