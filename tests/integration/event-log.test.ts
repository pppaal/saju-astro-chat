/**
 * Event Log Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 이벤트 로깅
 * - 사용자 활동 추적
 * - 분석 데이터 수집
 *
 * 실행: npm run test:integration
 * 환경변수 필요: TEST_DATABASE_URL 또는 DATABASE_URL
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest'
import {
  testPrisma,
  createTestUserInDb,
  cleanupAllTestUsers,
  checkTestDbConnection,
  connectTestDb,
  disconnectTestDb,
} from './setup'

const hasTestDb = await checkTestDbConnection()

describe('Integration: Event Log', () => {
  if (!hasTestDb) {
    return
  }

  beforeAll(async () => {
    await connectTestDb()
  })

  afterAll(async () => {
    await cleanupAllTestUsers()
    await disconnectTestDb()
  })

  afterEach(async () => {
    await cleanupAllTestUsers()
  })

  describe('Event Creation', () => {
    it('logs page view event', async () => {
      const user = await createTestUserInDb()

      const event = await testPrisma.eventLog.create({
        data: {
          userId: user.id,
          eventType: 'page_view',
          eventName: 'home_page_viewed',
          timestamp: new Date(),
          properties: {
            path: '/',
            referrer: 'https://google.com',
          },
        },
      })

      expect(event.eventType).toBe('page_view')
      expect(event.eventName).toBe('home_page_viewed')
    })

    it('logs user action event', async () => {
      const user = await createTestUserInDb()

      const event = await testPrisma.eventLog.create({
        data: {
          userId: user.id,
          eventType: 'user_action',
          eventName: 'button_clicked',
          timestamp: new Date(),
          properties: {
            buttonId: 'cta_subscribe',
            location: 'header',
          },
        },
      })

      expect(event.eventType).toBe('user_action')
    })

    it('logs feature usage event', async () => {
      const user = await createTestUserInDb()

      const event = await testPrisma.eventLog.create({
        data: {
          userId: user.id,
          eventType: 'feature_usage',
          eventName: 'saju_analysis_started',
          timestamp: new Date(),
          properties: {
            featureId: 'saju_basic',
            inputData: {
              birthDate: '1990-05-15',
              birthTime: '14:30',
            },
          },
        },
      })

      expect(event.eventName).toBe('saju_analysis_started')
    })

    it('logs error event', async () => {
      const user = await createTestUserInDb()

      const event = await testPrisma.eventLog.create({
        data: {
          userId: user.id,
          eventType: 'error',
          eventName: 'api_error',
          timestamp: new Date(),
          properties: {
            errorCode: 'NETWORK_ERROR',
            errorMessage: 'Failed to fetch data',
            endpoint: '/api/saju',
            statusCode: 500,
          },
        },
      })

      const props = event.properties as { errorCode: string }
      expect(props.errorCode).toBe('NETWORK_ERROR')
    })

    it('logs anonymous event', async () => {
      const event = await testPrisma.eventLog.create({
        data: {
          eventType: 'page_view',
          eventName: 'landing_page_viewed',
          timestamp: new Date(),
          sessionId: 'session-anonymous-123',
          properties: {
            path: '/landing',
          },
        },
      })

      expect(event.userId).toBeNull()
      expect(event.sessionId).toBe('session-anonymous-123')
    })

    it('logs event with device info', async () => {
      const user = await createTestUserInDb()

      const event = await testPrisma.eventLog.create({
        data: {
          userId: user.id,
          eventType: 'app_event',
          eventName: 'app_opened',
          timestamp: new Date(),
          deviceInfo: {
            platform: 'ios',
            osVersion: '17.0',
            appVersion: '2.5.0',
            deviceModel: 'iPhone 15',
            screenResolution: '1179x2556',
          },
        },
      })

      const device = event.deviceInfo as { platform: string }
      expect(device.platform).toBe('ios')
    })

    it('logs event with location data', async () => {
      const user = await createTestUserInDb()

      const event = await testPrisma.eventLog.create({
        data: {
          userId: user.id,
          eventType: 'user_action',
          eventName: 'location_shared',
          timestamp: new Date(),
          locationData: {
            country: 'KR',
            city: 'Seoul',
            timezone: 'Asia/Seoul',
          },
        },
      })

      const location = event.locationData as { country: string }
      expect(location.country).toBe('KR')
    })
  })

  describe('Event Querying', () => {
    it('retrieves user events', async () => {
      const user = await createTestUserInDb()

      const eventNames = ['page_view', 'button_click', 'form_submit', 'purchase']

      for (const name of eventNames) {
        await testPrisma.eventLog.create({
          data: {
            userId: user.id,
            eventType: 'user_action',
            eventName: name,
            timestamp: new Date(),
          },
        })
      }

      const events = await testPrisma.eventLog.findMany({
        where: { userId: user.id },
      })

      expect(events).toHaveLength(4)
    })

    it('retrieves events by type', async () => {
      const user = await createTestUserInDb()

      const types = ['page_view', 'user_action', 'page_view', 'error', 'page_view']

      for (let i = 0; i < types.length; i++) {
        await testPrisma.eventLog.create({
          data: {
            userId: user.id,
            eventType: types[i],
            eventName: `event_${i}`,
            timestamp: new Date(),
          },
        })
      }

      const pageViews = await testPrisma.eventLog.findMany({
        where: { userId: user.id, eventType: 'page_view' },
      })

      expect(pageViews).toHaveLength(3)
    })

    it('retrieves events by date range', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      for (let i = 0; i < 10; i++) {
        const timestamp = new Date(now)
        timestamp.setDate(timestamp.getDate() - i)

        await testPrisma.eventLog.create({
          data: {
            userId: user.id,
            eventType: 'page_view',
            eventName: `view_${i}`,
            timestamp,
          },
        })
      }

      const sevenDaysAgo = new Date(now)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const recentEvents = await testPrisma.eventLog.findMany({
        where: {
          userId: user.id,
          timestamp: { gte: sevenDaysAgo },
        },
      })

      expect(recentEvents).toHaveLength(8)
    })

    it('retrieves events ordered by time', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      for (let i = 0; i < 5; i++) {
        const timestamp = new Date(now)
        timestamp.setMinutes(timestamp.getMinutes() - i * 10)

        await testPrisma.eventLog.create({
          data: {
            userId: user.id,
            eventType: 'user_action',
            eventName: `action_${i}`,
            timestamp,
          },
        })
      }

      const events = await testPrisma.eventLog.findMany({
        where: { userId: user.id },
        orderBy: { timestamp: 'desc' },
      })

      expect(events[0].eventName).toBe('action_0')
    })
  })

  describe('Event Statistics', () => {
    it('counts events by type', async () => {
      const types = ['page_view', 'user_action', 'page_view', 'error', 'page_view', 'user_action']

      for (let i = 0; i < types.length; i++) {
        const user = await createTestUserInDb()
        await testPrisma.eventLog.create({
          data: {
            userId: user.id,
            eventType: types[i],
            eventName: `event_${i}`,
            timestamp: new Date(),
          },
        })
      }

      const counts = await testPrisma.eventLog.groupBy({
        by: ['eventType'],
        _count: { id: true },
      })

      const pageViewCount = counts.find((c) => c.eventType === 'page_view')?._count.id
      expect(pageViewCount).toBe(3)
    })

    it('counts events by name', async () => {
      const names = [
        'saju_started',
        'tarot_started',
        'saju_started',
        'saju_started',
        'compatibility_started',
      ]

      for (let i = 0; i < names.length; i++) {
        const user = await createTestUserInDb()
        await testPrisma.eventLog.create({
          data: {
            userId: user.id,
            eventType: 'feature_usage',
            eventName: names[i],
            timestamp: new Date(),
          },
        })
      }

      const counts = await testPrisma.eventLog.groupBy({
        by: ['eventName'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      })

      expect(counts[0].eventName).toBe('saju_started')
      expect(counts[0]._count.id).toBe(3)
    })

    it('counts unique users per event', async () => {
      const users = []
      for (let i = 0; i < 5; i++) {
        users.push(await createTestUserInDb())
      }

      // Multiple events from same users
      const userIndices = [0, 0, 1, 1, 1, 2, 3, 4]
      for (const idx of userIndices) {
        await testPrisma.eventLog.create({
          data: {
            userId: users[idx].id,
            eventType: 'feature_usage',
            eventName: 'premium_feature_used',
            timestamp: new Date(),
          },
        })
      }

      const uniqueUsers = await testPrisma.eventLog.groupBy({
        by: ['userId'],
        where: { eventName: 'premium_feature_used' },
      })

      expect(uniqueUsers).toHaveLength(5)
    })

    it('calculates events per day', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      // 3 days of events
      const eventCounts = [5, 3, 7]
      for (let day = 0; day < eventCounts.length; day++) {
        for (let i = 0; i < eventCounts[day]; i++) {
          const timestamp = new Date(now)
          timestamp.setDate(timestamp.getDate() - day)
          timestamp.setHours(10 + i)

          await testPrisma.eventLog.create({
            data: {
              userId: user.id,
              eventType: 'page_view',
              eventName: 'daily_view',
              timestamp,
            },
          })
        }
      }

      const today = new Date(now)
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const todayEvents = await testPrisma.eventLog.count({
        where: {
          userId: user.id,
          timestamp: { gte: today, lt: tomorrow },
        },
      })

      expect(todayEvents).toBe(5)
    })
  })

  describe('Session Tracking', () => {
    it('tracks events by session', async () => {
      const user = await createTestUserInDb()
      const sessionId = `session-${Date.now()}`

      const events = ['session_start', 'page_view', 'button_click', 'session_end']

      for (const eventName of events) {
        await testPrisma.eventLog.create({
          data: {
            userId: user.id,
            sessionId,
            eventType: 'session_event',
            eventName,
            timestamp: new Date(),
          },
        })
      }

      const sessionEvents = await testPrisma.eventLog.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'asc' },
      })

      expect(sessionEvents).toHaveLength(4)
      expect(sessionEvents[0].eventName).toBe('session_start')
    })

    it('calculates session duration', async () => {
      const user = await createTestUserInDb()
      const sessionId = `session-duration-${Date.now()}`
      const startTime = new Date(Date.now() - 15 * 60 * 1000)
      const endTime = new Date()

      await testPrisma.eventLog.create({
        data: {
          userId: user.id,
          sessionId,
          eventType: 'session_event',
          eventName: 'session_start',
          timestamp: startTime,
        },
      })

      await testPrisma.eventLog.create({
        data: {
          userId: user.id,
          sessionId,
          eventType: 'session_event',
          eventName: 'session_end',
          timestamp: endTime,
        },
      })

      const sessionEvents = await testPrisma.eventLog.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'asc' },
      })

      const duration =
        (sessionEvents[1].timestamp.getTime() - sessionEvents[0].timestamp.getTime()) / 1000 / 60
      expect(Math.round(duration)).toBe(15)
    })
  })

  describe('Funnel Analysis', () => {
    it('tracks conversion funnel', async () => {
      const funnelSteps = [
        'landing_page_viewed',
        'signup_started',
        'signup_completed',
        'first_feature_used',
        'subscription_purchased',
      ]

      // 10 users start, fewer complete each step
      const completionRates = [10, 8, 6, 4, 2]

      for (let step = 0; step < funnelSteps.length; step++) {
        for (let i = 0; i < completionRates[step]; i++) {
          const user = await createTestUserInDb()
          await testPrisma.eventLog.create({
            data: {
              userId: user.id,
              eventType: 'funnel_event',
              eventName: funnelSteps[step],
              timestamp: new Date(),
              properties: { funnelStep: step + 1 },
            },
          })
        }
      }

      const stepCounts = await testPrisma.eventLog.groupBy({
        by: ['eventName'],
        where: { eventType: 'funnel_event' },
        _count: { id: true },
      })

      const landingCount = stepCounts.find((c) => c.eventName === 'landing_page_viewed')?._count.id
      const purchaseCount = stepCounts.find((c) => c.eventName === 'subscription_purchased')?._count
        .id

      expect(landingCount).toBe(10)
      expect(purchaseCount).toBe(2)
    })
  })

  describe('Event Cleanup', () => {
    it('deletes old events', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      // Create old and new events
      for (let i = 0; i < 5; i++) {
        const oldTimestamp = new Date(now)
        oldTimestamp.setDate(oldTimestamp.getDate() - 100)

        await testPrisma.eventLog.create({
          data: {
            userId: user.id,
            eventType: 'page_view',
            eventName: `old_event_${i}`,
            timestamp: oldTimestamp,
          },
        })
      }

      for (let i = 0; i < 3; i++) {
        await testPrisma.eventLog.create({
          data: {
            userId: user.id,
            eventType: 'page_view',
            eventName: `new_event_${i}`,
            timestamp: now,
          },
        })
      }

      const ninetyDaysAgo = new Date(now)
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

      const deleted = await testPrisma.eventLog.deleteMany({
        where: { timestamp: { lt: ninetyDaysAgo } },
      })

      expect(deleted.count).toBe(5)

      const remaining = await testPrisma.eventLog.count({
        where: { userId: user.id },
      })

      expect(remaining).toBe(3)
    })
  })
})
