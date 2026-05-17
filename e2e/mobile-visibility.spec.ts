import { test, expect } from '@playwright/test'

/**
 * Small-phone viewport visibility regressions.
 *
 * The default `mobile.spec.ts` only checks that `body` renders — it
 * passes even when the chat bar is positioned off-screen. These tests
 * assert that specific UI controls actually fit inside the visible
 * viewport on the smallest realistic phones.
 *
 * Runs under TWO Playwright projects:
 *  - `mobile-visibility`: iPhone SE (375x667), smallest mainstream iOS
 *  - `narrow-viewport`:   Galaxy Z Fold outer screen (280x653)
 * Both projects exercise the same assertions, so a regression that
 * only shows up on the narrowest screens is also caught.
 */

test.describe('Main page — controls reachable on small phones', () => {
  test('top bar and chat bar are both inside the viewport', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const viewport = page.viewportSize()!

    // The hamburger button in the top bar must be tappable at the top.
    const hamburger = page.getByRole('button', { name: /메뉴 열기|Open menu/i })
    await expect(hamburger).toBeVisible()
    const topBox = await hamburger.boundingBox()
    expect(topBox).not.toBeNull()
    expect(topBox!.y).toBeGreaterThanOrEqual(0)
    expect(topBox!.y + topBox!.height).toBeLessThanOrEqual(viewport.height)

    // The chat textarea — the main CTA — must be inside the viewport,
    // not clipped at the bottom. This is the regression we hit on
    // smaller phones when the home was hard-locked to 100dvh.
    const textarea = page.locator('textarea').first()
    await expect(textarea).toBeVisible()
    const chatBox = await textarea.boundingBox()
    expect(chatBox).not.toBeNull()
    expect(chatBox!.y + chatBox!.height).toBeLessThanOrEqual(viewport.height + 1)
  })

  test('service chips and send button are reachable', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const viewport = page.viewportSize()!

    // The send button (round arrow) lives in the bottom-right of the
    // chat bar. If the chat bar is clipped, this gets cut off entirely.
    const send = page.getByRole('button', { name: /보내기|Send/i })
    await expect(send).toBeVisible()
    const sendBox = await send.boundingBox()
    expect(sendBox).not.toBeNull()
    expect(sendBox!.y + sendBox!.height).toBeLessThanOrEqual(viewport.height + 1)
    expect(sendBox!.x + sendBox!.width).toBeLessThanOrEqual(viewport.width + 1)
  })

  test('no horizontal overflow at iPhone SE width', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1)
  })
})

test.describe('Main page — landscape short viewport', () => {
  test('chat bar still reachable in landscape (scroll allowed)', async ({ page }) => {
    // Force landscape — short height triggers the CSS branch that
    // releases the no-scroll lock so the user can scroll to the chat
    // bar. Verify the chat bar is actually reachable (visible after a
    // scroll-into-view, not permanently clipped).
    await page.setViewportSize({ width: 667, height: 375 })
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const textarea = page.locator('textarea').first()
    await textarea.scrollIntoViewIfNeeded()
    await expect(textarea).toBeVisible()
  })
})
