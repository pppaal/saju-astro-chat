import { test, expect } from '@playwright/test'

/**
 * prefers-reduced-motion: reduce regressions.
 *
 * iOS users with "Reduce Motion" in Accessibility settings (auto-enabled
 * by Low Power Mode on some versions) and some Android skins emit this
 * media query. Any UI that hides itself via `opacity: 0` + a forwards
 * animation will stay permanently invisible if the animation is killed
 * but the base style isn't pinned to the final visible state.
 *
 * We hit this exact bug on the tarot results page: result cards and the
 * 3D-flipped card faces never appeared. These tests assert the CSS
 * contract by inspecting the loaded stylesheets directly — much faster
 * and more reliable than driving the full deck-pick-reveal flow.
 *
 * Runs under the `reduced-motion` Playwright project, which sets
 * `reducedMotion: 'reduce'` on the browser context.
 */

const TAROT_ROUTE = '/tarot/general-insight/quick-reading?question=test'
// /compatibility 는 2026-05 부터 counselor 로 redirect 하는 껍데기 —
// personCard(피커 모달)의 CSS 는 counselor 페이지 번들에 실린다.
// 리다이렉트를 거치지 않고 실제 페이지를 직접 검사한다.
const COMPATIBILITY_ROUTE = '/compatibility/counselor'

/**
 * Walk every loaded stylesheet on the page, find every rule block that
 * lives inside an `@media (prefers-reduced-motion: reduce)` block, and
 * return the combined cssText. Used to assert that the reduced-motion
 * branch pins animated-in elements to their visible end state.
 */
async function getReducedMotionRules(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const collected: string[] = []
    const visit = (rules: CSSRuleList | undefined) => {
      if (!rules) return
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSMediaRule) {
          if (
            rule.conditionText.includes('prefers-reduced-motion') &&
            rule.conditionText.includes('reduce')
          ) {
            for (const child of Array.from(rule.cssRules)) {
              collected.push(child.cssText)
            }
          } else {
            // Could be a nested @media — keep walking.
            visit(rule.cssRules)
          }
        }
      }
    }
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        visit(sheet.cssRules)
      } catch {
        // Cross-origin sheets throw on cssRules access — ignore.
      }
    }
    return collected.join('\n')
  })
}

test.describe('Tarot — reduced-motion CSS contract', () => {
  test('result card classes are pinned to a visible end state', async ({ page }) => {
    await page.goto(TAROT_ROUTE, { waitUntil: 'domcontentloaded' })

    const reducedMotionCss = await getReducedMotionRules(page)
    expect(reducedMotionCss.length).toBeGreaterThan(0)

    // The fix: when motion is suppressed, the card grid must NOT stay
    // invisible. The CSS should both reference the affected classes and
    // force their opacity to 1 inside the reduced-motion branch.
    expect(reducedMotionCss).toMatch(/resultCardHorizontal/)
    expect(reducedMotionCss).toMatch(/opacity:\s*1/)

    // The 3D flip wrapper has to land at rotateY(180deg) so the front
    // face is the one showing. Without this, only the card back is
    // visible forever.
    expect(reducedMotionCss).toMatch(/cardFlipInnerSlow/)
    expect(reducedMotionCss).toMatch(/rotateY\(180deg\)/)
  })

  test('animations are suppressed under reduced motion', async ({ page }) => {
    await page.goto(TAROT_ROUTE, { waitUntil: 'domcontentloaded' })
    const reducedMotionCss = await getReducedMotionRules(page)
    // Sanity check — the reduced-motion branch must actually disable
    // animations (otherwise the keyframe still runs and the !important
    // pins above lose to specificity at certain points in time).
    // CSSOM serializes `animation: none` into its longhand
    // (`animation: auto ease 0s 1 normal none running none`), so match the
    // animation-name `none` inside the shorthand rather than the literal
    // source string.
    expect(reducedMotionCss).toMatch(/animation:[^;]*\bnone\b/)
  })
})

test.describe('Compatibility — reduced-motion CSS contract', () => {
  test('person cards are pinned to a visible end state', async ({ page }) => {
    // domcontentloaded 시점엔 클라 청크의 CSS 가 아직 안 실려 있을 수 있어
    // (모달 컴포넌트의 CSS 모듈) 플레이키했다 — 전체 load 를 기다린다.
    await page.goto(COMPATIBILITY_ROUTE, { waitUntil: 'load' })

    const reducedMotionCss = await getReducedMotionRules(page)
    // .personCard starts at opacity:0 and only becomes visible via the
    // slideInUp animation; without an explicit reduced-motion fallback
    // the entire compatibility card stays invisible.
    expect(reducedMotionCss).toMatch(/personCard/)
    expect(reducedMotionCss).toMatch(/opacity:\s*1/)
  })
})
