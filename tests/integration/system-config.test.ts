/**
 * System Config Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 시스템 설정 관리
 * - 설정 버전 관리
 * - 동적 설정 변경
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

describe('Integration: System Config', () => {
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

  describe('Config Creation', () => {
    it('creates string config', async () => {
      const config = await testPrisma.systemConfig.create({
        data: {
          key: `site_name_${Date.now()}`,
          value: '사주 포춘',
          type: 'string',
          category: 'general',
          description: '사이트 이름',
        },
      })

      expect(config.type).toBe('string')
      expect(config.value).toBe('사주 포춘')
    })

    it('creates number config', async () => {
      const config = await testPrisma.systemConfig.create({
        data: {
          key: `max_daily_readings_${Date.now()}`,
          value: '10',
          type: 'number',
          category: 'limits',
          description: '일일 최대 리딩 횟수',
        },
      })

      expect(config.type).toBe('number')
      expect(parseInt(config.value)).toBe(10)
    })

    it('creates boolean config', async () => {
      const config = await testPrisma.systemConfig.create({
        data: {
          key: `maintenance_mode_${Date.now()}`,
          value: 'false',
          type: 'boolean',
          category: 'system',
          description: '유지보수 모드',
        },
      })

      expect(config.type).toBe('boolean')
      expect(config.value).toBe('false')
    })

    it('creates JSON config', async () => {
      const config = await testPrisma.systemConfig.create({
        data: {
          key: `api_limits_${Date.now()}`,
          value: JSON.stringify({
            rateLimit: 100,
            burstLimit: 20,
            windowSeconds: 60,
          }),
          type: 'json',
          category: 'api',
          description: 'API 제한 설정',
        },
      })

      const parsed = JSON.parse(config.value)
      expect(parsed.rateLimit).toBe(100)
    })

    it('creates config with validation', async () => {
      const config = await testPrisma.systemConfig.create({
        data: {
          key: `credit_price_${Date.now()}`,
          value: '100',
          type: 'number',
          category: 'pricing',
          description: '크레딧 가격',
          validation: {
            min: 1,
            max: 10000,
            required: true,
          },
        },
      })

      const validation = config.validation as { min: number; max: number }
      expect(validation.min).toBe(1)
    })
  })

  describe('Config Retrieval', () => {
    it('retrieves config by key', async () => {
      const key = `unique_config_${Date.now()}`

      await testPrisma.systemConfig.create({
        data: {
          key,
          value: 'test_value',
          type: 'string',
          category: 'test',
        },
      })

      const found = await testPrisma.systemConfig.findUnique({
        where: { key },
      })

      expect(found?.value).toBe('test_value')
    })

    it('retrieves configs by category', async () => {
      const category = `category_${Date.now()}`

      for (let i = 0; i < 5; i++) {
        await testPrisma.systemConfig.create({
          data: {
            key: `cat_config_${Date.now()}_${i}`,
            value: `value_${i}`,
            type: 'string',
            category,
          },
        })
      }

      const configs = await testPrisma.systemConfig.findMany({
        where: { category },
      })

      expect(configs).toHaveLength(5)
    })

    it('retrieves configs by type', async () => {
      const types = ['string', 'number', 'string', 'boolean', 'string']

      for (let i = 0; i < types.length; i++) {
        await testPrisma.systemConfig.create({
          data: {
            key: `type_config_${Date.now()}_${i}`,
            value: types[i] === 'number' ? '123' : types[i] === 'boolean' ? 'true' : 'text',
            type: types[i],
            category: 'type_test',
          },
        })
      }

      const stringConfigs = await testPrisma.systemConfig.findMany({
        where: { type: 'string', category: 'type_test' },
      })

      expect(stringConfigs).toHaveLength(3)
    })

    it('retrieves active configs', async () => {
      const states = [true, false, true, false, true]

      for (let i = 0; i < states.length; i++) {
        await testPrisma.systemConfig.create({
          data: {
            key: `active_config_${Date.now()}_${i}`,
            value: 'value',
            type: 'string',
            category: 'active_test',
            isActive: states[i],
          },
        })
      }

      const activeConfigs = await testPrisma.systemConfig.findMany({
        where: { category: 'active_test', isActive: true },
      })

      expect(activeConfigs).toHaveLength(3)
    })
  })

  describe('Config Updates', () => {
    it('updates config value', async () => {
      const config = await testPrisma.systemConfig.create({
        data: {
          key: `update_value_${Date.now()}`,
          value: 'old_value',
          type: 'string',
          category: 'update_test',
        },
      })

      const updated = await testPrisma.systemConfig.update({
        where: { id: config.id },
        data: { value: 'new_value' },
      })

      expect(updated.value).toBe('new_value')
    })

    it('tracks config history', async () => {
      const config = await testPrisma.systemConfig.create({
        data: {
          key: `history_config_${Date.now()}`,
          value: 'initial',
          type: 'string',
          category: 'history_test',
          version: 1,
        },
      })

      // Record history
      await testPrisma.systemConfigHistory.create({
        data: {
          configId: config.id,
          key: config.key,
          oldValue: config.value,
          newValue: 'updated',
          changedBy: 'admin',
          version: 1,
        },
      })

      // Update config
      await testPrisma.systemConfig.update({
        where: { id: config.id },
        data: { value: 'updated', version: 2 },
      })

      const history = await testPrisma.systemConfigHistory.findMany({
        where: { configId: config.id },
      })

      expect(history).toHaveLength(1)
      expect(history[0].oldValue).toBe('initial')
    })

    it('toggles config active state', async () => {
      const config = await testPrisma.systemConfig.create({
        data: {
          key: `toggle_config_${Date.now()}`,
          value: 'value',
          type: 'string',
          category: 'toggle_test',
          isActive: true,
        },
      })

      const updated = await testPrisma.systemConfig.update({
        where: { id: config.id },
        data: { isActive: false },
      })

      expect(updated.isActive).toBe(false)
    })

    it('updates JSON config', async () => {
      const config = await testPrisma.systemConfig.create({
        data: {
          key: `json_update_${Date.now()}`,
          value: JSON.stringify({ limit: 10 }),
          type: 'json',
          category: 'json_test',
        },
      })

      const updated = await testPrisma.systemConfig.update({
        where: { id: config.id },
        data: { value: JSON.stringify({ limit: 20, timeout: 30 }) },
      })

      const parsed = JSON.parse(updated.value)
      expect(parsed.limit).toBe(20)
      expect(parsed.timeout).toBe(30)
    })
  })

  describe('Config Categories', () => {
    it('groups configs by category', async () => {
      const categories = ['general', 'api', 'general', 'pricing', 'general']

      for (let i = 0; i < categories.length; i++) {
        await testPrisma.systemConfig.create({
          data: {
            key: `grouped_config_${Date.now()}_${i}`,
            value: 'value',
            type: 'string',
            category: categories[i],
          },
        })
      }

      const counts = await testPrisma.systemConfig.groupBy({
        by: ['category'],
        _count: { id: true },
      })

      expect(counts.length).toBeGreaterThan(0)
    })

    it('retrieves all categories', async () => {
      const categories = ['cat_a', 'cat_b', 'cat_a', 'cat_c', 'cat_b']

      for (let i = 0; i < categories.length; i++) {
        await testPrisma.systemConfig.create({
          data: {
            key: `category_list_${Date.now()}_${i}`,
            value: 'value',
            type: 'string',
            category: categories[i],
          },
        })
      }

      const uniqueCategories = await testPrisma.systemConfig.findMany({
        distinct: ['category'],
        select: { category: true },
      })

      expect(uniqueCategories.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Config Validation', () => {
    it('validates number range', async () => {
      const config = await testPrisma.systemConfig.create({
        data: {
          key: `validated_number_${Date.now()}`,
          value: '50',
          type: 'number',
          category: 'validation_test',
          validation: { min: 0, max: 100 },
        },
      })

      const validation = config.validation as { min: number; max: number }
      const value = parseInt(config.value)
      const isValid = value >= validation.min && value <= validation.max

      expect(isValid).toBe(true)
    })

    it('validates required field', async () => {
      const config = await testPrisma.systemConfig.create({
        data: {
          key: `required_config_${Date.now()}`,
          value: 'must_have_value',
          type: 'string',
          category: 'validation_test',
          validation: { required: true },
        },
      })

      const validation = config.validation as { required: boolean }
      const isValid = validation.required ? config.value.length > 0 : true

      expect(isValid).toBe(true)
    })

    it('validates enum values', async () => {
      const config = await testPrisma.systemConfig.create({
        data: {
          key: `enum_config_${Date.now()}`,
          value: 'medium',
          type: 'string',
          category: 'validation_test',
          validation: { enum: ['low', 'medium', 'high'] },
        },
      })

      const validation = config.validation as { enum: string[] }
      const isValid = validation.enum.includes(config.value)

      expect(isValid).toBe(true)
    })
  })

  describe('Config Environment', () => {
    it('stores environment-specific config', async () => {
      const config = await testPrisma.systemConfig.create({
        data: {
          key: `env_config_${Date.now()}`,
          value: 'production_value',
          type: 'string',
          category: 'environment',
          environment: 'production',
        },
      })

      expect(config.environment).toBe('production')
    })

    it('retrieves configs by environment', async () => {
      const environments = ['development', 'production', 'development', 'staging', 'development']

      for (let i = 0; i < environments.length; i++) {
        await testPrisma.systemConfig.create({
          data: {
            key: `env_specific_${Date.now()}_${i}`,
            value: 'value',
            type: 'string',
            category: 'env_test',
            environment: environments[i],
          },
        })
      }

      const devConfigs = await testPrisma.systemConfig.findMany({
        where: { category: 'env_test', environment: 'development' },
      })

      expect(devConfigs).toHaveLength(3)
    })
  })

  describe('Config Statistics', () => {
    it('counts configs by category', async () => {
      const categories = ['stats_a', 'stats_b', 'stats_a', 'stats_a', 'stats_b']

      for (let i = 0; i < categories.length; i++) {
        await testPrisma.systemConfig.create({
          data: {
            key: `stats_config_${Date.now()}_${i}`,
            value: 'value',
            type: 'string',
            category: categories[i],
          },
        })
      }

      const counts = await testPrisma.systemConfig.groupBy({
        by: ['category'],
        where: { category: { in: ['stats_a', 'stats_b'] } },
        _count: { id: true },
      })

      const statsACount = counts.find((c) => c.category === 'stats_a')?._count.id
      expect(statsACount).toBe(3)
    })

    it('counts configs by type', async () => {
      const types = ['string', 'number', 'string', 'json', 'string']

      for (let i = 0; i < types.length; i++) {
        await testPrisma.systemConfig.create({
          data: {
            key: `type_stats_${Date.now()}_${i}`,
            value: 'value',
            type: types[i],
            category: 'type_stats',
          },
        })
      }

      const counts = await testPrisma.systemConfig.groupBy({
        by: ['type'],
        where: { category: 'type_stats' },
        _count: { id: true },
      })

      const stringCount = counts.find((c) => c.type === 'string')?._count.id
      expect(stringCount).toBe(3)
    })
  })

  describe('Config Deletion', () => {
    it('deletes config', async () => {
      const config = await testPrisma.systemConfig.create({
        data: {
          key: `delete_config_${Date.now()}`,
          value: 'value',
          type: 'string',
          category: 'delete_test',
        },
      })

      await testPrisma.systemConfig.delete({
        where: { id: config.id },
      })

      const found = await testPrisma.systemConfig.findUnique({
        where: { id: config.id },
      })

      expect(found).toBeNull()
    })

    it('deletes configs by category', async () => {
      const categoryToDelete = `delete_category_${Date.now()}`

      for (let i = 0; i < 5; i++) {
        await testPrisma.systemConfig.create({
          data: {
            key: `bulk_delete_${Date.now()}_${i}`,
            value: 'value',
            type: 'string',
            category: categoryToDelete,
          },
        })
      }

      await testPrisma.systemConfig.deleteMany({
        where: { category: categoryToDelete },
      })

      const remaining = await testPrisma.systemConfig.findMany({
        where: { category: categoryToDelete },
      })

      expect(remaining).toHaveLength(0)
    })
  })
})
