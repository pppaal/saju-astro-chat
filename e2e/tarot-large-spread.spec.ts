import { test, expect, type Page } from '@playwright/test'

type SpreadConfig = {
  categoryId: string
  spreadId: string
  cardCount: number
  positions: string[]
}

const CELTIC_CROSS: SpreadConfig = {
  categoryId: 'general-insight',
  spreadId: 'celtic-cross',
  cardCount: 10,
  positions: [
    'The Present',
    'The Challenge',
    'The Past',
    'The Future',
    'Above (Conscious)',
    'Below (Subconscious)',
    'Advice',
    'External Influences',
    'Hopes and Fears',
    'The Outcome',
  ],
}

const WEEKLY_FORECAST: SpreadConfig = {
  categoryId: 'daily-reading',
  spreadId: 'weekly-forecast',
  cardCount: 7,
  positions: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
}

function buildMockDrawnCards(cardCount: number) {
  return Array.from({ length: cardCount }, (_, index) => ({
    card: {
      id: `mock-card-${index + 1}`,
      name: `Mock Card ${index + 1}`,
      nameKo: `모의 카드 ${index + 1}`,
      upright: {
        meaning: `Upright meaning ${index + 1}`,
        meaningKo: `정방향 의미 ${index + 1}`,
        keywords: [`up-${index + 1}`],
        keywordsKo: [`정-${index + 1}`],
      },
      reversed: {
        meaning: `Reversed meaning ${index + 1}`,
        meaningKo: `역방향 의미 ${index + 1}`,
        keywords: [`rev-${index + 1}`],
        keywordsKo: [`역-${index + 1}`],
      },
    },
    isReversed: index % 2 === 1,
  }))
}

async function setupMocks(
  page: Page,
  spread: SpreadConfig,
  interpretBodies: Array<Record<string, unknown>>
) {
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: { name: 'E2E User', email: 'e2e@example.com' },
        expires: '2099-01-01T00:00:00.000Z',
      }),
    })
  })

  await page.route('**/api/me/profile', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        user: {
          birthDate: '1990-02-01',
          birthTime: '09:00',
          birthCity: 'Seoul, KR',
        },
      }),
    })
  })

  await page.route('**/api/me/saju', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          hasSaju: true,
          saju: {
            dayMaster: '갑',
            dayMasterElement: '목',
            dayMasterYinYang: '양',
          },
        },
      }),
    })
  })

  await page.route('**/api/tarot/prefetch', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })

  await page.route('**/api/tarot', async (route) => {
    const spreadPayload = {
      id: spread.spreadId,
      title: `Mock ${spread.spreadId}`,
      titleKo: `모의 ${spread.spreadId}`,
      cardCount: spread.cardCount,
      positions: spread.positions.map((title, index) => ({
        title,
        titleKo: `위치 ${index + 1}`,
      })),
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        category: spread.categoryId,
        spread: spreadPayload,
        drawnCards: buildMockDrawnCards(spread.cardCount),
      }),
    })
  })

  await page.route('**/api/tarot/interpret', async (route) => {
    const requestBody = (route.request().postDataJSON() || {}) as Record<string, unknown>
    interpretBodies.push(requestBody)

    const cards = Array.isArray(requestBody.cards)
      ? (requestBody.cards as Array<Record<string, unknown>>)
      : []

    const cardInsights = cards.map((card, index) => ({
      position: (card.position as string) || spread.positions[index] || `Card ${index + 1}`,
      interpretation: `Mock interpretation ${index + 1} for ${spread.spreadId}`,
    }))

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        overall_message: `Mock overall for ${spread.spreadId}`,
        card_insights: cardInsights,
        guidance: 'Mock guidance',
        affirmation: 'Mock affirmation',
      }),
    })
  })

  await page.route('**/api/tarot/interpret-stream', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        overall_message: `Mock stream overall for ${spread.spreadId}`,
        card_insights: spread.positions.map((position, index) => ({
          position,
          interpretation: `Mock stream interpretation ${index + 1}`,
        })),
        guidance: 'Mock stream guidance',
      }),
    })
  })
}

async function completeLargeSpreadFlow(page: Page, spread: SpreadConfig) {
  await page.goto(`/tarot/${spread.categoryId}/${spread.spreadId}?question=e2e-test`, {
    waitUntil: 'domcontentloaded',
  })

  await expect(page.getByTestId('tarot-start-reading')).toBeVisible()
  await page.getByTestId('tarot-start-reading').click()

  for (let i = 0; i < spread.cardCount; i++) {
    await page.getByTestId(`tarot-card-${i}`).click({ force: true })
  }
}

test.describe('Tarot Large Spread E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('tarot_card_picking_tooltip_seen', 'true')
    })
  })

  test('celtic-cross 10 cards returns interpretations with personalization enabled', async ({
    page,
  }) => {
    const interpretBodies: Array<Record<string, unknown>> = []
    await setupMocks(page, CELTIC_CROSS, interpretBodies)

    await completeLargeSpreadFlow(page, CELTIC_CROSS)

    await expect(page.getByText('Mock overall for celtic-cross')).toBeVisible({ timeout: 15000 })
    expect(interpretBodies.length).toBeGreaterThan(0)

    const body = interpretBodies.at(-1) || {}
    expect(Array.isArray(body.cards)).toBe(true)
    expect((body.cards as unknown[]).length).toBe(10)
    expect(body.includeSaju).toBe(true)
    expect(body.includeAstrology).toBe(true)
    expect(typeof body.sajuContext).toBe('string')
    expect(body).toHaveProperty('birthdate')
  })

  test('weekly-forecast 7 cards respects toggles when personalization is disabled', async ({
    page,
  }) => {
    const interpretBodies: Array<Record<string, unknown>> = []
    await setupMocks(page, WEEKLY_FORECAST, interpretBodies)

    await page.goto('/tarot/daily-reading/weekly-forecast?question=e2e-test', {
      waitUntil: 'domcontentloaded',
    })

    const sajuToggle = page.getByTestId('tarot-toggle-saju')
    const astrologyToggle = page.getByTestId('tarot-toggle-astrology')
    await expect(sajuToggle).toBeChecked()
    await expect(astrologyToggle).toBeChecked()

    await sajuToggle.uncheck()
    await astrologyToggle.uncheck()
    await expect(sajuToggle).not.toBeChecked()
    await expect(astrologyToggle).not.toBeChecked()

    await page.getByTestId('tarot-start-reading').click()
    for (let i = 0; i < WEEKLY_FORECAST.cardCount; i++) {
      await page.getByTestId(`tarot-card-${i}`).click({ force: true })
    }

    await expect(page.getByText('Mock overall for weekly-forecast')).toBeVisible({ timeout: 15000 })
    expect(interpretBodies.length).toBeGreaterThan(0)

    const body = interpretBodies.at(-1) || {}
    expect(Array.isArray(body.cards)).toBe(true)
    expect((body.cards as unknown[]).length).toBe(7)
    expect(body.includeSaju).toBe(false)
    expect(body.includeAstrology).toBe(false)
    expect(body).not.toHaveProperty('birthdate')
    expect(body).not.toHaveProperty('sajuContext')
  })
})
