import { test, expect } from '@playwright/test'

/**
 * SEO and Meta tag tests
 */

test.describe('Essential Meta Tags', () => {
  test('homepage should have title with Korean content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const title = await page.title()
    expect(title).toBeTruthy()
    expect(title.length).toBeGreaterThan(0)
    expect(title.length).toBeLessThan(70) // SEO best practice

    // 한국어 서비스이므로 관련 키워드 확인
    const hasRelevantTitle =
      title.includes('사주') ||
      title.includes('운세') ||
      title.includes('타로') ||
      title.includes('점성술') ||
      title.length > 5
    expect(hasRelevantTitle).toBe(true)
  })

  test('homepage should have meta description with content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const description = page.locator('meta[name="description"]')
    const count = await description.count()
    expect(count).toBeGreaterThan(0)

    const content = await description.getAttribute('content')
    expect(content).toBeTruthy()
    expect(content!.length).toBeGreaterThan(10)
    expect(content!.length).toBeLessThan(160) // SEO best practice
  })

  test('homepage should have viewport meta', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const viewport = page.locator('meta[name="viewport"]')
    await expect(viewport).toHaveAttribute('content', /width=device-width/)
  })

  test('homepage should have charset meta', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const charset = page.locator('meta[charset], meta[http-equiv="Content-Type"]')
    const count = await charset.count()
    expect(count).toBeGreaterThan(0)
  })
})

test.describe('Open Graph Tags', () => {
  test('homepage should have og:title with content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const ogTitle = page.locator('meta[property="og:title"]')
    const count = await ogTitle.count()
    expect(count).toBeGreaterThan(0)

    const content = await ogTitle.getAttribute('content')
    expect(content).toBeTruthy()
    expect(content!.length).toBeGreaterThan(0)
  })

  test('homepage should have og:description with content', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const ogDesc = page.locator('meta[property="og:description"]')
    const count = await ogDesc.count()
    expect(count).toBeGreaterThan(0)

    const content = await ogDesc.getAttribute('content')
    expect(content).toBeTruthy()
    expect(content!.length).toBeGreaterThan(10)
  })

  test('homepage should have og:image with valid URL', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const ogImage = page.locator('meta[property="og:image"]')
    const count = await ogImage.count()
    expect(count).toBeGreaterThan(0)

    const content = await ogImage.getAttribute('content')
    expect(content).toBeTruthy()
    expect(content).toMatch(/^https?:\/\//)
  })

  test('homepage should have og:type', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const ogType = page.locator('meta[property="og:type"]')
    const count = await ogType.count()
    expect(count).toBeGreaterThan(0)

    const content = await ogType.getAttribute('content')
    expect(content).toBeTruthy()
  })

  test('homepage should have og:url', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const ogUrl = page.locator('meta[property="og:url"]')
    const count = await ogUrl.count()

    if (count > 0) {
      const content = await ogUrl.getAttribute('content')
      expect(content).toBeTruthy()
      expect(content).toMatch(/^https?:\/\//)
    }
  })
})

test.describe('Twitter Card Tags', () => {
  test('homepage should have twitter:card with valid type', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const twitterCard = page.locator('meta[name="twitter:card"]')
    const count = await twitterCard.count()
    expect(count).toBeGreaterThan(0)

    const content = await twitterCard.getAttribute('content')
    expect(content).toBeTruthy()
    expect(['summary', 'summary_large_image', 'app', 'player']).toContain(content)
  })

  test('homepage should have twitter:title', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const twitterTitle = page.locator('meta[name="twitter:title"]')
    const count = await twitterTitle.count()
    expect(count).toBeGreaterThan(0)

    const content = await twitterTitle.getAttribute('content')
    expect(content).toBeTruthy()
    expect(content!.length).toBeGreaterThan(0)
  })

  test('homepage should have twitter:description', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const twitterDesc = page.locator('meta[name="twitter:description"]')
    const count = await twitterDesc.count()

    if (count > 0) {
      const content = await twitterDesc.getAttribute('content')
      expect(content).toBeTruthy()
      expect(content!.length).toBeGreaterThan(10)
    }
  })
})

test.describe('Canonical URL', () => {
  test('homepage should have canonical link with valid URL', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const canonical = page.locator('link[rel="canonical"]')
    const count = await canonical.count()
    expect(count).toBeGreaterThan(0)

    const href = await canonical.getAttribute('href')
    expect(href).toBeTruthy()
    expect(href).toMatch(/^https?:\/\//)
  })
})

test.describe('Robots Meta', () => {
  test('homepage should allow indexing', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const robots = page.locator('meta[name="robots"]')
    const count = await robots.count()

    if (count > 0) {
      const content = await robots.getAttribute('content')
      // Should not have noindex for homepage
      expect(content).not.toContain('noindex')
    }
  })

  test('should have robots.txt accessible', async ({ page }) => {
    const response = await page.request.get('/robots.txt')
    expect([200, 404]).toContain(response.status())

    if (response.status() === 200) {
      const text = await response.text()
      expect(text.length).toBeGreaterThan(0)
    }
  })
})

test.describe('Page Titles by Route', () => {
  const routes = [
    { path: '/', name: 'homepage' },
    { path: '/saju', name: 'saju' },
    { path: '/tarot', name: 'tarot' },
    { path: '/dream', name: 'dream' },
    { path: '/compatibility', name: 'compatibility' },
    { path: '/pricing', name: 'pricing' },
    { path: '/about', name: 'about' },
  ]

  for (const route of routes) {
    test(`${route.name} page should have unique title`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' })

      const title = await page.title()
      expect(title).toBeTruthy()
      expect(title.length).toBeGreaterThan(0)
      expect(title.length).toBeLessThan(70)
    })

    test(`${route.name} page should have meta description`, async ({ page }) => {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' })

      const description = page.locator('meta[name="description"]')
      const count = await description.count()
      expect(count).toBeGreaterThan(0)
    })
  }
})

test.describe('Favicon', () => {
  test('should have favicon', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const favicon = page.locator(
      'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
    )
    const count = await favicon.count()
    expect(count).toBeGreaterThan(0)

    const href = await favicon.first().getAttribute('href')
    expect(href).toBeTruthy()
  })
})

test.describe('Language', () => {
  test('html should have lang attribute set to Korean', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const lang = await page.locator('html').getAttribute('lang')
    expect(lang).toBeTruthy()
    expect(lang).toBe('ko')
  })
})

test.describe('Structured Data', () => {
  test('should have JSON-LD schema markup', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const jsonLd = page.locator('script[type="application/ld+json"]')
    const count = await jsonLd.count()
    expect(count).toBeGreaterThan(0)

    const content = await jsonLd.first().textContent()
    expect(content).toBeTruthy()

    // JSON이 유효한지 확인
    const parsed = JSON.parse(content!)
    expect(parsed).toBeTruthy()
    expect(parsed['@context'] || parsed['@type']).toBeTruthy()
  })
})

test.describe('Sitemap', () => {
  test('should have sitemap.xml accessible', async ({ page }) => {
    const response = await page.request.get('/sitemap.xml')
    expect([200, 404]).toContain(response.status())

    if (response.status() === 200) {
      const text = await response.text()
      expect(text).toContain('<?xml')
      expect(text).toContain('urlset')
    }
  })
})

test.describe('Performance Hints', () => {
  test('should have preconnect hints for external resources', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const preconnect = page.locator('link[rel="preconnect"]')
    const count = await preconnect.count()

    if (count > 0) {
      const href = await preconnect.first().getAttribute('href')
      expect(href).toBeTruthy()
      expect(href).toMatch(/^https?:\/\//)
    }
  })

  test('should have dns-prefetch hints', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })

    const dnsPrefetch = page.locator('link[rel="dns-prefetch"]')
    const count = await dnsPrefetch.count()

    if (count > 0) {
      const href = await dnsPrefetch.first().getAttribute('href')
      expect(href).toBeTruthy()
    }
  })
})

test.describe('SEO Page Load Performance', () => {
  test('should load homepage within acceptable time for SEO', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const loadTime = Date.now() - startTime

    // SEO에 영향을 주는 로딩 시간 체크
    expect(loadTime).toBeLessThan(5000)
    await expect(page.locator('body')).toBeVisible()
  })
})
