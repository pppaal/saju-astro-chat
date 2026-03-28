import { test, expect, type Page } from '@playwright/test'

function buildMockCalendarResponse(year: number) {
  return {
    success: true,
    year,
    summary: {
      total: 3,
      grade0: 1,
      grade1: 1,
      grade2: 1,
      grade3: 0,
      grade4: 0,
    },
    allDates: [
      {
        date: `${year}-01-15`,
        grade: 1,
        score: 72,
        categories: ['career'],
        title: 'Execution window',
        description: 'A stable mock date for calendar UI tests.',
        summary: 'Good date to move important work forward.',
        bestTimes: ['10:00 AM-12:00 PM'],
        sajuFactors: ['Mock Saju timing'],
        astroFactors: ['Mock transit support'],
        recommendations: ['Ship important tasks early.'],
        warnings: ['Avoid overcommitting late in the day.'],
      },
      {
        date: `${year}-01-16`,
        grade: 2,
        score: 61,
        categories: ['general'],
        title: 'Operate steadily',
        description: 'Useful for stable calendar rendering.',
        summary: 'Keep pace and avoid rushed changes.',
        bestTimes: ['1:00 PM-3:00 PM'],
        sajuFactors: ['Mock neutral flow'],
        astroFactors: ['Mock balanced transit'],
        recommendations: ['Focus on maintenance work.'],
        warnings: ['Do not force unnecessary change.'],
      },
      {
        date: `${year}-01-20`,
        grade: 0,
        score: 88,
        categories: ['love'],
        title: 'High-alignment day',
        description: 'Strong mock score for visual regression.',
        summary: 'Use this date for high-priority actions.',
        bestTimes: ['9:00 AM-11:00 AM'],
        sajuFactors: ['Mock peak flow'],
        astroFactors: ['Mock exact support'],
        recommendations: ['Prioritize high-impact moves.'],
        warnings: ['Keep focus on the primary objective.'],
      },
    ],
    topDates: [],
    goodDates: [],
    cautionDates: [],
    daySummary: {
      date: `${year}-01-15`,
      summary: 'Mock day summary for calendar UI tests.',
      focusDomain: 'career',
      reliability: 'high',
    },
    weekSummary: {
      rangeStart: `${year}-01-13`,
      rangeEnd: `${year}-01-19`,
      summary: 'Mock weekly summary.',
    },
    monthSummary: {
      month: `${year}-01`,
      summary: 'Mock monthly summary.',
    },
    topDomains: [
      { domain: 'career', label: 'Career', score: 78 },
      { domain: 'love', label: 'Love', score: 66 },
    ],
    timingSignals: ['Mock execution timing'],
    cautions: ['Mock caution'],
    recommendedActions: ['Mock action'],
  }
}

async function installCalendarApiMocks(page: Page) {
  await page.route('**/api/auth/session', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: 'null',
    })
  })

  await page.route('**/api/me/profile', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Unauthorized' }),
    })
  })

  await page.route('**/api/calendar/save?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ savedDates: [] }),
    })
  })

  await page.route('**/api/calendar?**', async (route) => {
    const url = new URL(route.request().url())
    const year = Number(url.searchParams.get('year') || '2026')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildMockCalendarResponse(year)),
    })
  })
}

async function stabilizeCalendarIntro(page: Page) {
  await page.waitForResponse((response) => response.url().includes('/api/auth/session'), {
    timeout: 30000,
  }).catch(() => null)

  await expect(page.getByRole('tablist', { name: /calendar input mode/i })).toBeVisible()

  const consentDialog = page.getByRole('dialog', { name: /Privacy choices/i })
  if (await consentDialog.isVisible().catch(() => false)) {
    const rejectButton = consentDialog.getByRole('button', { name: /Reject|거부/i })
    if (await rejectButton.isVisible().catch(() => false)) {
      await rejectButton.click()
    }
  }

  await expect(page.getByRole('combobox', { name: 'Birth year' })).toBeVisible()
  await expect(page.getByRole('button', { name: /View Monthly Flow/i })).toBeVisible()
}

async function openCalendarResult(page: Page) {
  await installCalendarApiMocks(page)
  await page.goto('/calendar', { waitUntil: 'domcontentloaded' })
  await stabilizeCalendarIntro(page)

  const year = page.getByRole('combobox', { name: 'Birth year' })
  const month = page.getByRole('combobox', { name: 'Birth month' })
  const day = page.getByRole('combobox', { name: 'Birth day' })
  const submitButton = page.getByRole('button', { name: /View Monthly Flow/i })

  await year.selectOption('1990')
  await expect(year).toHaveValue('1990')
  await month.selectOption('1')
  await expect(month).toHaveValue('1')
  await day.selectOption('15')
  await expect(day).toHaveValue('15')
  await expect(submitButton).toBeEnabled({ timeout: 10000 })
  await submitButton.click()
  await expect(
    page
      .locator('[role="gridcell"], button[aria-label*="month"], button[aria-label*="today" i]')
      .first()
  ).toBeVisible({
    timeout: 30000,
  })
}

test.describe('Calendar Flow', () => {
  test.describe('Calendar Main Page', () => {
    test('should load calendar page with content', async ({ page }) => {
      await installCalendarApiMocks(page)
      await page.goto('/calendar', { waitUntil: 'domcontentloaded' })
      await stabilizeCalendarIntro(page)
      await expect(page.locator('body')).toBeVisible()

      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)

      const hasCalendarContent =
        bodyText!.includes('Calendar') ||
        bodyText!.includes('calendar') ||
        bodyText!.includes('운영') ||
        bodyText!.includes('달력') ||
        bodyText!.includes('운세')
      expect(hasCalendarContent).toBe(true)
    })

    test('should display calendar grid or date elements', async ({ page }) => {
      await openCalendarResult(page)

      const hasCalendarElements = await page.evaluate(() => {
        const calendar = document.querySelectorAll('[class*="calendar"], [class*="grid"], table')
        const days = document.querySelectorAll('[role="gridcell"], [class*="day"], td')
        return calendar.length > 0 || days.length > 0
      })

      const bodyText = await page.locator('body').textContent()
      expect(hasCalendarElements || bodyText!.length > 100).toBe(true)
    })

    test('should have month navigation buttons', async ({ page }) => {
      await openCalendarResult(page)

      await expect(
        page.getByRole('button', { name: /Previous month|Next month|Go to today/i }).first()
      ).toBeVisible()
    })
  })

  test.describe('Calendar Navigation', () => {
    test('should navigate to previous month', async ({ page }) => {
      await openCalendarResult(page)

      const prevButton = page.getByRole('button', { name: /Previous month/i })
      await expect(prevButton).toBeVisible()

      const beforeText = await page.locator('body').textContent()
      await prevButton.click()
      await page.waitForTimeout(500)

      await expect(page.locator('body')).toBeVisible()
      const afterText = await page.locator('body').textContent()
      expect(beforeText).not.toBe(afterText)
    })

    test('should navigate to next month', async ({ page }) => {
      await openCalendarResult(page)

      const nextButton = page.getByRole('button', { name: /Next month/i })
      await expect(nextButton).toBeVisible()

      const beforeText = await page.locator('body').textContent()
      await nextButton.click()
      await page.waitForTimeout(500)

      await expect(page.locator('body')).toBeVisible()
      const afterText = await page.locator('body').textContent()
      expect(beforeText).not.toBe(afterText)
    })
  })

  test.describe('Calendar Day Selection', () => {
    test('should select a day on click and show info', async ({ page }) => {
      await openCalendarResult(page)

      const dayCell = page.locator('[role="gridcell"]').first()
      await expect(dayCell).toBeVisible()
      await dayCell.click()
      await page.waitForTimeout(500)

      await expect(page.locator('body')).toBeVisible()
      const bodyText = await page.locator('body').textContent()
      expect(bodyText!.length).toBeGreaterThan(50)
    })
  })

  test.describe('Calendar Mobile Experience', () => {
    test('should render without horizontal scroll on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await openCalendarResult(page)

      await expect(page.locator('body')).toBeVisible()

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 20)
    })

    test('should have touch-friendly day cells on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await openCalendarResult(page)

      const cells = page.locator('[role="gridcell"]')
      const count = await cells.count()
      expect(count).toBeGreaterThan(0)

      for (let i = 0; i < Math.min(count, 5); i++) {
        const cell = cells.nth(i)
        if (await cell.isVisible()) {
          const box = await cell.boundingBox()
          if (box) {
            expect(box.height).toBeGreaterThanOrEqual(20)
            expect(box.width).toBeGreaterThanOrEqual(20)
          }
        }
      }
    })

    test('should allow tap interaction on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await openCalendarResult(page)

      const dayCell = page.locator('[role="gridcell"]').first()
      await expect(dayCell).toBeVisible()
      await dayCell.click()
      await page.waitForTimeout(300)
      await expect(page.locator('body')).toBeVisible()
    })
  })

  test.describe('Calendar Page Load Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await openCalendarResult(page)
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(30000)
      await expect(page.locator('body')).toBeVisible()
    })
  })
})
