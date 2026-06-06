import { test, expect, type Page } from '@playwright/test'
import { tarotThemes } from '../src/lib/tarot/tarot-spreads-data'

type SpreadConfig = {
  categoryId: string
  spreadId: string
  cardCount: number
  positions: string[]
}

// 스프레드 설정을 정식 데이터(tarotThemes = SSOT)에서 도출 — 카드 장수가 실제
// 앱과 어긋나지 않도록. (이전엔 celtic-cross 를 10장으로, 존재하지도 않는
// daily-reading/weekly-forecast 를 하드코딩해 실제 데이터와 드리프트했음.
// 실제 celtic-cross 는 7장이고 weekly-forecast 스프레드는 없음.)
// 실제 positions 는 빈 배열(LLM 이 질문 맥락에 맞춰 자리명 부여)이라 모킹용으로
// cardCount 만큼 placeholder 자리명을 생성한다.
function spreadConfigFromData(categoryId: string, spreadId: string): SpreadConfig {
  const theme = tarotThemes.find((t) => t.id === categoryId)
  const spread = theme?.spreads.find((s) => s.id === spreadId)
  if (!spread) {
    throw new Error(`Spread not found in tarotThemes (SSOT): ${categoryId}/${spreadId}`)
  }
  const positions = Array.from({ length: spread.cardCount }, (_, i) => `Position ${i + 1}`)
  return { categoryId, spreadId, cardCount: spread.cardCount, positions }
}

// 실제 데이터의 두 큰 스프레드(5장·7장) — general-insight 테마의 general-cross/celtic-cross.
const CELTIC_CROSS = spreadConfigFromData('general-insight', 'celtic-cross') // 7장
const GENERAL_CROSS = spreadConfigFromData('general-insight', 'general-cross') // 5장

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

  test('celtic-cross (7 cards) returns interpretations with personalization enabled', async ({
    page,
  }) => {
    const interpretBodies: Array<Record<string, unknown>> = []
    await setupMocks(page, CELTIC_CROSS, interpretBodies)

    await completeLargeSpreadFlow(page, CELTIC_CROSS)

    await expect(page.getByText('Mock overall for celtic-cross')).toBeVisible({ timeout: 15000 })
    expect(interpretBodies.length).toBeGreaterThan(0)

    const body = interpretBodies.at(-1) || {}
    expect(Array.isArray(body.cards)).toBe(true)
    expect((body.cards as unknown[]).length).toBe(CELTIC_CROSS.cardCount)
    expect(body.includeSaju).toBe(true)
    expect(body.includeAstrology).toBe(true)
    expect(typeof body.sajuContext).toBe('string')
    expect(body).toHaveProperty('birthdate')
  })

  test('general-cross (5 cards) respects toggles when personalization is disabled', async ({
    page,
  }) => {
    const interpretBodies: Array<Record<string, unknown>> = []
    await setupMocks(page, GENERAL_CROSS, interpretBodies)

    await page.goto(`/tarot/${GENERAL_CROSS.categoryId}/${GENERAL_CROSS.spreadId}?question=e2e-test`, {
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
    for (let i = 0; i < GENERAL_CROSS.cardCount; i++) {
      await page.getByTestId(`tarot-card-${i}`).click({ force: true })
    }

    await expect(page.getByText('Mock overall for general-cross')).toBeVisible({ timeout: 15000 })
    expect(interpretBodies.length).toBeGreaterThan(0)

    const body = interpretBodies.at(-1) || {}
    expect(Array.isArray(body.cards)).toBe(true)
    expect((body.cards as unknown[]).length).toBe(GENERAL_CROSS.cardCount)
    expect(body.includeSaju).toBe(false)
    expect(body.includeAstrology).toBe(false)
    expect(body).not.toHaveProperty('birthdate')
    expect(body).not.toHaveProperty('sajuContext')
  })
})
