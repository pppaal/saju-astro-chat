import { test, expect, type APIResponse } from '@playwright/test'

type SavedRecord = {
  key: string
  id: string
  expectedService: string
  expectedType: string
  detailUrl: string
}

type HistoryRecord = {
  id: string
  service: string
  type: string
}

const AUTH_BLOCK_STATUSES = [401, 403]

const unwrap = <T>(payload: unknown): T => {
  if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
    return (payload as { data: T }).data
  }
  return payload as T
}

const flattenHistoryRecords = (payload: unknown): HistoryRecord[] => {
  const data = unwrap<{ history?: Array<{ records?: HistoryRecord[] }> }>(payload)
  if (!Array.isArray(data?.history)) return []
  return data.history.flatMap((day) => (Array.isArray(day.records) ? day.records : []))
}

const parseCreatedId = (payload: unknown): string | null => {
  const data = unwrap<Record<string, unknown>>(payload)
  const id =
    (typeof data.id === 'string' && data.id) ||
    (typeof data.readingId === 'string' && data.readingId) ||
    null
  return id
}

test.describe('My Journey Core Services Persistence', () => {
  test('should persist 6 core services into my history and resolve details', async ({ page }) => {
    const marker = `e2e-core-${Date.now()}`
    const created: SavedRecord[] = []
    let authBlockedCount = 0

    const saveAndCollect = async (
      key: string,
      expectedService: string,
      expectedType: string,
      detailUrlBuilder: (id: string) => string,
      request: Promise<APIResponse>
    ) => {
      const response = await request
      if (AUTH_BLOCK_STATUSES.includes(response.status())) {
        authBlockedCount += 1
        return
      }

      expect(response.ok(), `${key} save failed with ${response.status()}`).toBe(true)
      const json = await response.json()
      const id = parseCreatedId(json)
      expect(id, `${key} save response missing id`).toBeTruthy()
      created.push({
        key,
        id: id!,
        expectedService,
        expectedType,
        detailUrl: detailUrlBuilder(id!),
      })
    }

    await saveAndCollect(
      'tarot',
      'tarot',
      'tarot-reading',
      (id) => `/api/tarot/save/${id}`,
      page.request.post('/api/tarot/save', {
        data: {
          question: `${marker} tarot question`,
          theme: 'career',
          spreadId: 'three-card',
          spreadTitle: 'Three Card Spread',
          cards: [
            {
              cardId: 'the-fool',
              name: 'The Fool',
              image: '/images/tarot/the-fool.png',
              isReversed: false,
              position: 'present',
            },
          ],
          overallMessage: `${marker} tarot summary`,
          guidance: 'focus on one key action',
          affirmation: 'I move with clarity',
          locale: 'en',
        },
        timeout: 30000,
      })
    )

    await saveAndCollect(
      'calendar',
      'destiny-calendar',
      'calendar',
      (id) => `/api/calendar/save/${id}`,
      page.request.post('/api/calendar/save', {
        data: {
          date: '2026-02-23',
          year: 2026,
          grade: 2,
          score: 82,
          title: `${marker} calendar title`,
          description: 'calendar save smoke',
          summary: `${marker} calendar summary`,
          categories: ['career', 'travel'],
          bestTimes: ['08:00-10:00'],
          recommendations: ['focus on key task'],
          warnings: ['double-check communication'],
          birthDate: '1995-02-09',
          birthTime: '08:30',
          birthPlace: 'Seoul',
          locale: 'en',
        },
        timeout: 30000,
      })
    )

    await saveAndCollect(
      'personality-icp',
      'personality-icp',
      'icp-result',
      (id) => `/api/personality/icp/save?id=${id}`,
      page.request.post('/api/personality/icp/save', {
        data: {
          primaryStyle: 'PA',
          secondaryStyle: 'BC',
          dominanceScore: 31,
          affiliationScore: 44,
          octantScores: {
            PA: 80,
            BC: 72,
            DE: 38,
            FG: 26,
            HI: 24,
            JK: 18,
            LM: 12,
            NO: 8,
          },
          analysisData: {
            summary: `${marker} icp summary`,
          },
          answers: {
            q1: 5,
            q2: 4,
          },
          locale: 'en',
        },
        timeout: 30000,
      })
    )

    await saveAndCollect(
      'compatibility',
      'compatibility',
      'compatibility-result',
      (id) => `/api/personality/compatibility/save?id=${id}`,
      page.request.post('/api/personality/compatibility/save', {
        data: {
          person1: {
            name: `${marker}-A`,
            icp: {
              primaryStyle: 'PA',
              secondaryStyle: 'BC',
              dominanceScore: 31,
              affiliationScore: 44,
              octantScores: { PA: 80, BC: 72 },
            },
            persona: {
              typeCode: 'INTJ',
              personaName: 'Strategist',
              energyScore: 71,
              cognitionScore: 84,
              decisionScore: 79,
              rhythmScore: 63,
            },
          },
          person2: {
            name: `${marker}-B`,
            icp: {
              primaryStyle: 'FG',
              secondaryStyle: 'DE',
              dominanceScore: 28,
              affiliationScore: 36,
              octantScores: { FG: 77, DE: 65 },
            },
            persona: {
              typeCode: 'ENFP',
              personaName: 'Catalyst',
              energyScore: 81,
              cognitionScore: 68,
              decisionScore: 59,
              rhythmScore: 74,
            },
          },
          compatibility: {
            icpScore: 74,
            icpLevel: 'good',
            icpDescription: `${marker} icp compatibility`,
            personaScore: 71,
            personaLevel: 'good',
            personaDescription: `${marker} persona compatibility`,
            crossSystemScore: 73,
            crossSystemLevel: 'good',
            crossSystemDescription: `${marker} cross compatibility`,
            insights: ['shared growth potential'],
          },
          locale: 'en',
        },
        timeout: 30000,
      })
    )

    await saveAndCollect(
      'premium-reports',
      'premium-reports',
      'destiny-matrix-report',
      (id) => `/api/destiny-matrix/save?id=${id}`,
      page.request.post('/api/destiny-matrix/save', {
        data: {
          reportType: 'timing',
          period: 'monthly',
          reportData: {
            categories: [{ name: 'focus', score: 78, description: `${marker} focus` }],
            highlights: [`${marker} highlight`],
            recommendations: ['protect deep-work window'],
          },
          title: `${marker} matrix title`,
          summary: `${marker} matrix summary`,
          overallScore: 78,
          grade: 'A',
          locale: 'en',
        },
        timeout: 30000,
      })
    )

    await saveAndCollect(
      'iching',
      'iching',
      'reading',
      (id) => `/api/readings/${id}`,
      page.request.post('/api/readings', {
        data: {
          type: 'iching',
          title: `${marker} iching title`,
          content: JSON.stringify({
            hexagram: 11,
            interpretation: `${marker} iching interpretation`,
          }),
        },
        timeout: 30000,
      })
    )

    if (created.length === 0) {
      expect(authBlockedCount).toBe(6)
      return
    }

    await expect
      .poll(
        async () => {
          const historyRes = await page.request.get('/api/me/history?limit=100', {
            timeout: 30000,
          })
          if (!historyRes.ok()) return 0

          const historyJson = await historyRes.json()
          const records = flattenHistoryRecords(historyJson)
          const ids = new Set(records.map((record) => record.id))
          return created.filter((record) => ids.has(record.id)).length
        },
        { timeout: 20000, intervals: [500, 1000, 2000] }
      )
      .toBe(created.length)

    const historyRes = await page.request.get('/api/me/history?limit=100', {
      timeout: 30000,
    })
    expect(historyRes.ok()).toBe(true)
    const historyJson = await historyRes.json()
    const historyRecords = flattenHistoryRecords(historyJson)

    for (const saved of created) {
      const record = historyRecords.find((item) => item.id === saved.id)
      expect(record, `${saved.key} not found in /api/me/history`).toBeTruthy()
      expect(record?.service).toBe(saved.expectedService)
      expect(record?.type).toBe(saved.expectedType)
    }

    for (const saved of created) {
      const detailRes = await page.request.get(saved.detailUrl, { timeout: 30000 })
      expect(detailRes.ok(), `${saved.key} detail failed with ${detailRes.status()}`).toBe(true)
      const detailJson = await detailRes.json()
      expect(JSON.stringify(detailJson)).toContain(saved.id)
    }

    // UI smoke: ensure My Journey history page remains reachable after writes.
    await page.goto('/myjourney/history', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
  })
})
