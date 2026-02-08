/**
 * User Device Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 사용자 기기 등록
 * - 기기 관리 및 인증
 * - 다중 기기 지원
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

describe('Integration: User Device', () => {
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

  describe('Device Registration', () => {
    it('registers new device', async () => {
      const user = await createTestUserInDb()

      const device = await testPrisma.userDevice.create({
        data: {
          userId: user.id,
          deviceId: `device_${Date.now()}`,
          deviceType: 'mobile',
          platform: 'ios',
          osVersion: '17.0',
          appVersion: '1.0.0',
          isActive: true,
        },
      })

      expect(device.deviceType).toBe('mobile')
      expect(device.platform).toBe('ios')
    })

    it('registers device with push token', async () => {
      const user = await createTestUserInDb()

      const device = await testPrisma.userDevice.create({
        data: {
          userId: user.id,
          deviceId: `device_${Date.now()}`,
          deviceType: 'mobile',
          platform: 'android',
          osVersion: '14',
          appVersion: '1.0.0',
          pushToken: 'fcm_token_abc123',
          isActive: true,
        },
      })

      expect(device.pushToken).toBe('fcm_token_abc123')
    })

    it('registers desktop device', async () => {
      const user = await createTestUserInDb()

      const device = await testPrisma.userDevice.create({
        data: {
          userId: user.id,
          deviceId: `device_${Date.now()}`,
          deviceType: 'desktop',
          platform: 'windows',
          osVersion: '11',
          browserName: 'Chrome',
          browserVersion: '120.0',
          isActive: true,
        },
      })

      expect(device.deviceType).toBe('desktop')
      expect(device.browserName).toBe('Chrome')
    })

    it('registers tablet device', async () => {
      const user = await createTestUserInDb()

      const device = await testPrisma.userDevice.create({
        data: {
          userId: user.id,
          deviceId: `device_${Date.now()}`,
          deviceType: 'tablet',
          platform: 'ios',
          osVersion: '17.0',
          deviceModel: 'iPad Pro',
          isActive: true,
        },
      })

      expect(device.deviceType).toBe('tablet')
      expect(device.deviceModel).toBe('iPad Pro')
    })

    it('registers multiple devices for user', async () => {
      const user = await createTestUserInDb()

      const devices = [
        { type: 'mobile', platform: 'ios' },
        { type: 'mobile', platform: 'android' },
        { type: 'desktop', platform: 'macos' },
      ]

      for (let i = 0; i < devices.length; i++) {
        await testPrisma.userDevice.create({
          data: {
            userId: user.id,
            deviceId: `device_${Date.now()}_${i}`,
            deviceType: devices[i].type,
            platform: devices[i].platform,
            isActive: true,
          },
        })
      }

      const userDevices = await testPrisma.userDevice.findMany({
        where: { userId: user.id },
      })

      expect(userDevices).toHaveLength(3)
    })
  })

  describe('Device Retrieval', () => {
    it('retrieves devices by user', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 3; i++) {
        await testPrisma.userDevice.create({
          data: {
            userId: user.id,
            deviceId: `device_${Date.now()}_${i}`,
            deviceType: 'mobile',
            platform: 'ios',
            isActive: true,
          },
        })
      }

      const devices = await testPrisma.userDevice.findMany({
        where: { userId: user.id },
      })

      expect(devices).toHaveLength(3)
    })

    it('retrieves active devices only', async () => {
      const user = await createTestUserInDb()

      const states = [true, false, true, false, true]

      for (let i = 0; i < states.length; i++) {
        await testPrisma.userDevice.create({
          data: {
            userId: user.id,
            deviceId: `device_${Date.now()}_${i}`,
            deviceType: 'mobile',
            platform: 'ios',
            isActive: states[i],
          },
        })
      }

      const activeDevices = await testPrisma.userDevice.findMany({
        where: { userId: user.id, isActive: true },
      })

      expect(activeDevices).toHaveLength(3)
    })

    it('retrieves devices by platform', async () => {
      const user = await createTestUserInDb()

      const platforms = ['ios', 'android', 'ios', 'windows', 'ios']

      for (let i = 0; i < platforms.length; i++) {
        await testPrisma.userDevice.create({
          data: {
            userId: user.id,
            deviceId: `device_${Date.now()}_${i}`,
            deviceType: platforms[i] === 'windows' ? 'desktop' : 'mobile',
            platform: platforms[i],
            isActive: true,
          },
        })
      }

      const iosDevices = await testPrisma.userDevice.findMany({
        where: { userId: user.id, platform: 'ios' },
      })

      expect(iosDevices).toHaveLength(3)
    })

    it('retrieves device by deviceId', async () => {
      const user = await createTestUserInDb()
      const deviceId = `device_${Date.now()}`

      await testPrisma.userDevice.create({
        data: {
          userId: user.id,
          deviceId,
          deviceType: 'mobile',
          platform: 'ios',
          isActive: true,
        },
      })

      const device = await testPrisma.userDevice.findFirst({
        where: { deviceId },
      })

      expect(device).not.toBeNull()
    })

    it('retrieves devices with push tokens', async () => {
      const user = await createTestUserInDb()

      const tokens = ['token_1', null, 'token_2', null, 'token_3']

      for (let i = 0; i < tokens.length; i++) {
        await testPrisma.userDevice.create({
          data: {
            userId: user.id,
            deviceId: `device_${Date.now()}_${i}`,
            deviceType: 'mobile',
            platform: 'ios',
            pushToken: tokens[i],
            isActive: true,
          },
        })
      }

      const devicesWithToken = await testPrisma.userDevice.findMany({
        where: { userId: user.id, pushToken: { not: null } },
      })

      expect(devicesWithToken).toHaveLength(3)
    })
  })

  describe('Device Statistics', () => {
    it('counts devices by platform', async () => {
      const users: string[] = []
      const platforms = ['ios', 'android', 'ios', 'ios', 'android', 'windows']

      for (let i = 0; i < platforms.length; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.userDevice.create({
          data: {
            userId: user.id,
            deviceId: `device_${Date.now()}_${i}`,
            deviceType: platforms[i] === 'windows' ? 'desktop' : 'mobile',
            platform: platforms[i],
            isActive: true,
          },
        })
      }

      const counts = await testPrisma.userDevice.groupBy({
        by: ['platform'],
        where: { userId: { in: users } },
        _count: { id: true },
      })

      const iosCount = counts.find((c) => c.platform === 'ios')?._count.id
      expect(iosCount).toBe(3)
    })

    it('counts devices by type', async () => {
      const users: string[] = []
      const types = ['mobile', 'mobile', 'desktop', 'mobile', 'tablet']

      for (let i = 0; i < types.length; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.userDevice.create({
          data: {
            userId: user.id,
            deviceId: `device_${Date.now()}_${i}`,
            deviceType: types[i],
            platform: 'ios',
            isActive: true,
          },
        })
      }

      const counts = await testPrisma.userDevice.groupBy({
        by: ['deviceType'],
        where: { userId: { in: users } },
        _count: { id: true },
      })

      const mobileCount = counts.find((c) => c.deviceType === 'mobile')?._count.id
      expect(mobileCount).toBe(3)
    })

    it('counts active vs inactive devices', async () => {
      const user = await createTestUserInDb()

      const states = [true, true, true, false, false]

      for (let i = 0; i < states.length; i++) {
        await testPrisma.userDevice.create({
          data: {
            userId: user.id,
            deviceId: `device_${Date.now()}_${i}`,
            deviceType: 'mobile',
            platform: 'ios',
            isActive: states[i],
          },
        })
      }

      const counts = await testPrisma.userDevice.groupBy({
        by: ['isActive'],
        where: { userId: user.id },
        _count: { id: true },
      })

      const activeCount = counts.find((c) => c.isActive === true)?._count.id
      expect(activeCount).toBe(3)
    })
  })

  describe('Device Updates', () => {
    it('updates push token', async () => {
      const user = await createTestUserInDb()

      const device = await testPrisma.userDevice.create({
        data: {
          userId: user.id,
          deviceId: `device_${Date.now()}`,
          deviceType: 'mobile',
          platform: 'ios',
          pushToken: 'old_token',
          isActive: true,
        },
      })

      const updated = await testPrisma.userDevice.update({
        where: { id: device.id },
        data: { pushToken: 'new_token' },
      })

      expect(updated.pushToken).toBe('new_token')
    })

    it('updates app version', async () => {
      const user = await createTestUserInDb()

      const device = await testPrisma.userDevice.create({
        data: {
          userId: user.id,
          deviceId: `device_${Date.now()}`,
          deviceType: 'mobile',
          platform: 'ios',
          appVersion: '1.0.0',
          isActive: true,
        },
      })

      const updated = await testPrisma.userDevice.update({
        where: { id: device.id },
        data: { appVersion: '1.1.0' },
      })

      expect(updated.appVersion).toBe('1.1.0')
    })

    it('updates last active time', async () => {
      const user = await createTestUserInDb()

      const device = await testPrisma.userDevice.create({
        data: {
          userId: user.id,
          deviceId: `device_${Date.now()}`,
          deviceType: 'mobile',
          platform: 'ios',
          isActive: true,
        },
      })

      const now = new Date()
      const updated = await testPrisma.userDevice.update({
        where: { id: device.id },
        data: { lastActiveAt: now },
      })

      expect(updated.lastActiveAt).toEqual(now)
    })

    it('deactivates device', async () => {
      const user = await createTestUserInDb()

      const device = await testPrisma.userDevice.create({
        data: {
          userId: user.id,
          deviceId: `device_${Date.now()}`,
          deviceType: 'mobile',
          platform: 'ios',
          isActive: true,
        },
      })

      const updated = await testPrisma.userDevice.update({
        where: { id: device.id },
        data: { isActive: false, deactivatedAt: new Date() },
      })

      expect(updated.isActive).toBe(false)
    })

    it('logs out device', async () => {
      const user = await createTestUserInDb()

      const device = await testPrisma.userDevice.create({
        data: {
          userId: user.id,
          deviceId: `device_${Date.now()}`,
          deviceType: 'mobile',
          platform: 'ios',
          isActive: true,
          isLoggedIn: true,
        },
      })

      const updated = await testPrisma.userDevice.update({
        where: { id: device.id },
        data: {
          isLoggedIn: false,
          loggedOutAt: new Date(),
          pushToken: null,
        },
      })

      expect(updated.isLoggedIn).toBe(false)
      expect(updated.pushToken).toBeNull()
    })
  })

  describe('Device Security', () => {
    it('tracks login attempts', async () => {
      const user = await createTestUserInDb()

      const device = await testPrisma.userDevice.create({
        data: {
          userId: user.id,
          deviceId: `device_${Date.now()}`,
          deviceType: 'mobile',
          platform: 'ios',
          isActive: true,
          loginAttempts: 0,
        },
      })

      // Simulate failed login attempts
      for (let i = 0; i < 3; i++) {
        await testPrisma.userDevice.update({
          where: { id: device.id },
          data: { loginAttempts: { increment: 1 } },
        })
      }

      const updated = await testPrisma.userDevice.findUnique({
        where: { id: device.id },
      })

      expect(updated?.loginAttempts).toBe(3)
    })

    it('marks device as trusted', async () => {
      const user = await createTestUserInDb()

      const device = await testPrisma.userDevice.create({
        data: {
          userId: user.id,
          deviceId: `device_${Date.now()}`,
          deviceType: 'mobile',
          platform: 'ios',
          isActive: true,
          isTrusted: false,
        },
      })

      const updated = await testPrisma.userDevice.update({
        where: { id: device.id },
        data: {
          isTrusted: true,
          trustedAt: new Date(),
        },
      })

      expect(updated.isTrusted).toBe(true)
    })

    it('stores device fingerprint', async () => {
      const user = await createTestUserInDb()

      const device = await testPrisma.userDevice.create({
        data: {
          userId: user.id,
          deviceId: `device_${Date.now()}`,
          deviceType: 'desktop',
          platform: 'windows',
          isActive: true,
          fingerprint: 'fp_abc123xyz',
        },
      })

      expect(device.fingerprint).toBe('fp_abc123xyz')
    })
  })

  describe('Device Deletion', () => {
    it('deletes device', async () => {
      const user = await createTestUserInDb()

      const device = await testPrisma.userDevice.create({
        data: {
          userId: user.id,
          deviceId: `device_${Date.now()}`,
          deviceType: 'mobile',
          platform: 'ios',
          isActive: true,
        },
      })

      await testPrisma.userDevice.delete({
        where: { id: device.id },
      })

      const found = await testPrisma.userDevice.findUnique({
        where: { id: device.id },
      })

      expect(found).toBeNull()
    })

    it('deletes inactive devices', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      // Old inactive devices
      for (let i = 0; i < 3; i++) {
        await testPrisma.userDevice.create({
          data: {
            userId: user.id,
            deviceId: `old_${Date.now()}_${i}`,
            deviceType: 'mobile',
            platform: 'ios',
            isActive: false,
            lastActiveAt: new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000),
          },
        })
      }

      // Active devices
      for (let i = 0; i < 2; i++) {
        await testPrisma.userDevice.create({
          data: {
            userId: user.id,
            deviceId: `active_${Date.now()}_${i}`,
            deviceType: 'mobile',
            platform: 'ios',
            isActive: true,
            lastActiveAt: now,
          },
        })
      }

      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      await testPrisma.userDevice.deleteMany({
        where: {
          userId: user.id,
          isActive: false,
          lastActiveAt: { lt: ninetyDaysAgo },
        },
      })

      const remaining = await testPrisma.userDevice.findMany({
        where: { userId: user.id },
      })

      expect(remaining).toHaveLength(2)
    })

    it('removes all devices for user', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.userDevice.create({
          data: {
            userId: user.id,
            deviceId: `device_${Date.now()}_${i}`,
            deviceType: 'mobile',
            platform: 'ios',
            isActive: true,
          },
        })
      }

      await testPrisma.userDevice.deleteMany({
        where: { userId: user.id },
      })

      const remaining = await testPrisma.userDevice.findMany({
        where: { userId: user.id },
      })

      expect(remaining).toHaveLength(0)
    })
  })
})
