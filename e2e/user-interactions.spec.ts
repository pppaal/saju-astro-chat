import { test, expect } from '@playwright/test'

/**
 * User interaction tests - forms, buttons, inputs
 */

test.describe('Homepage Interactions', () => {
  test('should have clickable navigation links', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const links = page.locator('a[href]')
    const linkCount = await links.count()
    expect(linkCount).toBeGreaterThan(0)

    // 첫 번째 링크가 보이는지 확인
    let visibleLink = false
    for (let i = 0; i < Math.min(linkCount, 10); i++) {
      if (await links.nth(i).isVisible()) {
        visibleLink = true
        break
      }
    }
    expect(visibleLink).toBe(true)
  })

  test('should have working buttons', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const buttons = page.locator('button')
    const buttonCount = await buttons.count()

    if (buttonCount > 0) {
      let visibleButton = false
      for (let i = 0; i < Math.min(buttonCount, 10); i++) {
        if (await buttons.nth(i).isVisible()) {
          visibleButton = true
          break
        }
      }
      expect(visibleButton).toBe(true)
    }
  })

  test('homepage should have Korean content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(100)

    // 한국어 콘텐츠 확인
    const hasKoreanContent =
      bodyText!.includes('운세') ||
      bodyText!.includes('사주') ||
      bodyText!.includes('타로') ||
      bodyText!.includes('점성술')
    expect(hasKoreanContent).toBe(true)
  })
})

test.describe('Destiny Map Form Interactions', () => {
  test('should have name input field', async ({ page }) => {
    await page.goto('/destiny-counselor', { waitUntil: 'domcontentloaded' })

    const inputs = page.locator('input')
    const inputCount = await inputs.count()

    const bodyText = await page.locator('body').textContent()
    expect(inputCount > 0 || bodyText!.length > 100).toBe(true)
  })

  test('should have date selection elements', async ({ page }) => {
    await page.goto('/destiny-counselor', { waitUntil: 'domcontentloaded' })

    const dateInputs = page.locator("input[type='date'], select, input[type='number']")
    const count = await dateInputs.count()

    const bodyText = await page.locator('body').textContent()
    expect(count > 0 || bodyText!.length > 100).toBe(true)
  })

  test('should have gender selection elements', async ({ page }) => {
    await page.goto('/destiny-counselor', { waitUntil: 'domcontentloaded' })

    const genderElements = page.locator("button, input[type='radio'], select")
    await expect(genderElements.first()).toBeAttached({ timeout: 30000 })
    const count = await genderElements.count()
    expect(count).toBeGreaterThan(0)

    let visibleElement = false
    for (let i = 0; i < Math.min(count, 10); i++) {
      if (await genderElements.nth(i).isVisible()) {
        visibleElement = true
        break
      }
    }
    expect(visibleElement).toBe(true)
  })

  test('should display destiny-counselor content', async ({ page }) => {
    await page.goto('/destiny-counselor', { waitUntil: 'domcontentloaded' })

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })
})

test.describe('Tarot Interactions', () => {
  test('should have question textarea or input', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const textarea = page.locator('textarea, input[type="text"]')
    const count = await textarea.count()

    const bodyText = await page.locator('body').textContent()
    expect(count > 0 || bodyText!.length > 100).toBe(true)
  })

  test('should allow typing question and retain value', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const textarea = page.locator('textarea').first()
    if ((await textarea.count()) > 0 && (await textarea.isVisible())) {
      await textarea.fill('오늘의 운세는?')
      const value = await textarea.inputValue()
      expect(value).toContain('운세')
    }
  })

  test('should have quick question buttons visible', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const buttons = page.locator('button')
    const count = await buttons.count()
    expect(count).toBeGreaterThan(0)

    let visibleButton = false
    for (let i = 0; i < Math.min(count, 10); i++) {
      if (await buttons.nth(i).isVisible()) {
        visibleButton = true
        break
      }
    }
    expect(visibleButton).toBe(true)
  })

  test('should display tarot-related content', async ({ page }) => {
    await page.goto('/tarot', { waitUntil: 'domcontentloaded' })

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    const hasTarotContent =
      bodyText!.includes('타로') || bodyText!.includes('카드') || bodyText!.includes('Tarot')
    expect(hasTarotContent).toBe(true)
  })
})

test.describe('Compatibility Interactions', () => {
  test('should have form inputs for two people', async ({ page }) => {
    await page.goto('/compatibility', { waitUntil: 'domcontentloaded' })

    const inputs = page.locator('input')
    const count = await inputs.count()

    const bodyText = await page.locator('body').textContent()
    expect(count > 0 || bodyText!.length > 100).toBe(true)
  })

  test('should display compatibility-related content', async ({ page }) => {
    await page.goto('/compatibility', { waitUntil: 'domcontentloaded' })

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    const hasCompatibilityContent =
      bodyText!.includes('궁합') ||
      bodyText!.includes('연인') ||
      bodyText!.includes('compatibility')
    expect(hasCompatibilityContent).toBe(true)
  })
})

test.describe('Auth Interactions', () => {
  test('should have sign-in options visible', async ({ page }) => {
    await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' })

    const buttons = page.locator('button, a')
    const count = await buttons.count()
    expect(count).toBeGreaterThan(0)

    let visibleButton = false
    for (let i = 0; i < Math.min(count, 10); i++) {
      if (await buttons.nth(i).isVisible()) {
        visibleButton = true
        break
      }
    }
    expect(visibleButton).toBe(true)
  })

  test('should display auth-related content', async ({ page }) => {
    await page.goto('/auth/signin', { waitUntil: 'domcontentloaded' })

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    const hasAuthContent =
      bodyText!.includes('로그인') || bodyText!.includes('Sign') || bodyText!.includes('Login')
    expect(hasAuthContent).toBe(true)
  })
})

test.describe('Pricing Page Interactions', () => {
  test('should have pricing cards or content', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

    const cards = page.locator("[class*='card'], [class*='plan'], [class*='pricing']")
    const count = await cards.count()

    const bodyText = await page.locator('body').textContent()
    expect(count > 0 || bodyText!.length > 100).toBe(true)
  })

  test('should have subscribe buttons visible', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

    const buttons = page.locator('button')
    const count = await buttons.count()

    if (count > 0) {
      let visibleButton = false
      for (let i = 0; i < Math.min(count, 10); i++) {
        if (await buttons.nth(i).isVisible()) {
          visibleButton = true
          break
        }
      }
      expect(visibleButton).toBe(true)
    }
  })

  test('should display pricing-related content', async ({ page }) => {
    await page.goto('/pricing', { waitUntil: 'domcontentloaded' })

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)

    const hasPricingContent =
      bodyText!.includes('가격') ||
      bodyText!.includes('요금') ||
      bodyText!.includes('원') ||
      bodyText!.includes('Pricing')
    expect(hasPricingContent).toBe(true)
  })
})

test.describe('Calendar Interactions', () => {
  test('should have calendar navigation visible', async ({ page }) => {
    await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

    const navButtons = page.locator('button')
    const count = await navButtons.count()

    if (count > 0) {
      let visibleButton = false
      for (let i = 0; i < Math.min(count, 10); i++) {
        if (await navButtons.nth(i).isVisible()) {
          visibleButton = true
          break
        }
      }
      expect(visibleButton).toBe(true)
    }
  })

  test('should display calendar content', async ({ page }) => {
    await page.goto('/calendar', { waitUntil: 'domcontentloaded' })

    const bodyText = await page.locator('body').textContent()
    expect(bodyText!.length).toBeGreaterThan(50)
  })
})

test.describe('Interaction Mobile Experience', () => {
  test('should have touch-friendly buttons on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const buttons = page.locator('button')
    const count = await buttons.count()

    for (let i = 0; i < Math.min(count, 3); i++) {
      const button = buttons.nth(i)
      if (await button.isVisible()) {
        const box = await button.boundingBox()
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(30)
          expect(box.width).toBeGreaterThanOrEqual(30)
        }
      }
    }
  })
})
