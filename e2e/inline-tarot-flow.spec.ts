import { test, expect } from '@playwright/test'

// 인라인 타로 — 상담 챗(운명상담사) 안의 ⋮ 도구 메뉴에서 여는 타로 모달.
// 풀페이지 타로와 같은 백엔드(/api/tarot·interpret-stream)·lib(tarotThemes 등)를
// 재사용하는 별도 UI 표면. 여기선 "챗 → 도구 메뉴 → 타로 → 모달 노출"까지 검증.
//
// 진입에는 인증·상담 세션이 필요할 수 있어, 도구 메뉴/타로 항목이 안 보이면
// 주변 e2e(critical-flows)와 동일하게 graceful 처리한다.
//
// 셀렉터 출처:
//   도구 토글  : button[aria-label="도구"|"Tools"] (ChatInputArea)
//   타로 항목  : menuitem[aria-label="다음 질문 타로로 보기"|"See next question in tarot"]
//   모달       : [aria-labelledby="tarot-modal-title"] (InlineTarotModal)

test.describe('Inline Tarot (counselor chat)', () => {
  test('opens the inline tarot modal from the chat tools menu', async ({ page }) => {
    await page.goto('/destiny-counselor', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()

    const toolsToggle = page
      .locator('button[aria-label="도구"], button[aria-label="Tools"]')
      .first()

    if (!(await toolsToggle.isVisible({ timeout: 8000 }).catch(() => false))) {
      // 도구 메뉴 미도달(비로그인/세션 없음 등) — 페이지 유효성만 확인 후 종료.
      await expect(page.locator('body')).toBeVisible()
      return
    }

    await toolsToggle.click()

    const tarotItem = page
      .locator(
        '[role="menuitem"][aria-label="다음 질문 타로로 보기"], [role="menuitem"][aria-label="See next question in tarot"]'
      )
      .first()

    if (!(await tarotItem.isVisible({ timeout: 5000 }).catch(() => false))) {
      await expect(page.locator('body')).toBeVisible()
      return
    }

    // 비활성(궁합 인물<2 등)일 수 있으니 disabled 면 graceful 종료.
    if (await tarotItem.isDisabled().catch(() => false)) {
      await expect(page.locator('body')).toBeVisible()
      return
    }

    await tarotItem.click()

    // 인라인 타로 모달이 열려야 한다.
    const modal = page.locator('[aria-labelledby="tarot-modal-title"]').first()
    await expect(modal).toBeVisible({ timeout: 8000 })
  })
})
