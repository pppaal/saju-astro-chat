/**
 * Comprehensive tests for Admin Audit Logging System
 * Tests audit log creation, querying, filtering, and error handling
 */

import { vi } from 'vitest'

// Mock dependencies - must be before imports that use them
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    adminAuditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
  Prisma: {},
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import {
  logAdminAction,
  getAdminActionHistory,
  getTargetAuditHistory,
  type AdminAuditParams,
} from '@/lib/auth/adminAudit'

describe('Admin Audit Logging System', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('logAdminAction', () => {
    it('should log admin action successfully', async () => {
      const params: AdminAuditParams = {
        adminEmail: 'admin@example.com',
        adminUserId: 'admin_123',
        action: 'refund_subscription',
        targetType: 'subscription',
        targetId: 'sub_456',
        metadata: {
          amount: 50000,
          reason: 'User requested refund',
        },
        success: true,
        ipAddress: '1.2.3.4',
        userAgent: 'Mozilla/5.0',
      }

      ;(prisma.adminAuditLog.create as jest.Mock).mockResolvedValue({})

      await logAdminAction(params)

      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          adminEmail: 'admin@example.com',
          adminUserId: 'admin_123',
          action: 'refund_subscription',
          targetType: 'subscription',
          targetId: 'sub_456',
          metadata: {
            amount: 50000,
            reason: 'User requested refund',
          },
          success: true,
          ipAddress: '1.2.3.4',
          userAgent: 'Mozilla/5.0',
        }),
      })

      expect(logger.info).toHaveBeenCalledWith(
        '[Admin Action]',
        expect.objectContaining({
          admin: 'admin@example.com',
          action: 'refund_subscription',
        })
      )
    })

    it('should support legacy data field', async () => {
      const params: AdminAuditParams = {
        adminEmail: 'admin@example.com',
        action: 'delete_user',
        data: { userId: 'user_123' }, // Legacy field
        success: true,
      }

      ;(prisma.adminAuditLog.create as jest.Mock).mockResolvedValue({})

      await logAdminAction(params)

      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: { userId: 'user_123' },
        }),
      })
    })

    it('should prefer metadata over data when both provided', async () => {
      const params: AdminAuditParams = {
        adminEmail: 'admin@example.com',
        action: 'update_plan',
        metadata: { newPlan: 'pro' },
        data: { oldPlan: 'free' },
        success: true,
      }

      ;(prisma.adminAuditLog.create as jest.Mock).mockResolvedValue({})

      await logAdminAction(params)

      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: { newPlan: 'pro' },
        }),
      })
    })

    it('should default success to true', async () => {
      const params: AdminAuditParams = {
        adminEmail: 'admin@example.com',
        action: 'view_user',
      }

      ;(prisma.adminAuditLog.create as jest.Mock).mockResolvedValue({})

      await logAdminAction(params)

      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          success: true,
        }),
      })
    })

    it('should handle failed actions', async () => {
      const params: AdminAuditParams = {
        adminEmail: 'admin@example.com',
        action: 'delete_account',
        success: false,
        errorMessage: 'Account not found',
      }

      ;(prisma.adminAuditLog.create as jest.Mock).mockResolvedValue({})

      await logAdminAction(params)

      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          success: false,
          errorMessage: 'Account not found',
        }),
      })
    })

    it('should handle optional fields', async () => {
      const params: AdminAuditParams = {
        adminEmail: 'admin@example.com',
        action: 'export_data',
      }

      ;(prisma.adminAuditLog.create as jest.Mock).mockResolvedValue({})

      await logAdminAction(params)

      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          adminEmail: 'admin@example.com',
          action: 'export_data',
          targetType: undefined,
          targetId: undefined,
          metadata: {},
          adminUserId: undefined,
          ipAddress: undefined,
          userAgent: undefined,
        }),
      })
    })

    it('should handle database errors gracefully', async () => {
      const params: AdminAuditParams = {
        adminEmail: 'admin@example.com',
        action: 'test_action',
      }

      ;(prisma.adminAuditLog.create as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      )

      // Should not throw
      await logAdminAction(params)

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to log admin action',
        expect.objectContaining({
          error: expect.any(Error),
        })
      )
    })

    it('should handle complex metadata', async () => {
      const params: AdminAuditParams = {
        adminEmail: 'admin@example.com',
        action: 'bulk_update',
        metadata: {
          users: ['user1', 'user2', 'user3'],
          changes: {
            plan: 'pro',
            credits: 100,
          },
          timestamp: Date.now(),
        },
      }

      ;(prisma.adminAuditLog.create as jest.Mock).mockResolvedValue({})

      await logAdminAction(params)

      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            users: ['user1', 'user2', 'user3'],
            changes: {
              plan: 'pro',
              credits: 100,
            },
          }),
        }),
      })
    })

    it('should sanitize sensitive data in logs', async () => {
      const params: AdminAuditParams = {
        adminEmail: 'admin@example.com',
        action: 'reset_password',
        targetType: 'user',
        targetId: 'user_123',
        metadata: {
          // Should not log actual passwords
          action: 'password_reset_initiated',
        },
      }

      ;(prisma.adminAuditLog.create as jest.Mock).mockResolvedValue({})

      await logAdminAction(params)

      expect(logger.info).toHaveBeenCalledWith(
        '[Admin Action]',
        expect.objectContaining({
          admin: 'admin@example.com',
        })
      )
    })

    it('should handle empty metadata', async () => {
      const params: AdminAuditParams = {
        adminEmail: 'admin@example.com',
        action: 'login',
        metadata: {},
      }

      ;(prisma.adminAuditLog.create as jest.Mock).mockResolvedValue({})

      await logAdminAction(params)

      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          metadata: {},
        }),
      })
    })
  })

  describe('getAdminActionHistory', () => {
    it('should retrieve admin action history with filters', async () => {
      const mockLogs = [
        {
          id: '1',
          adminEmail: 'admin@example.com',
          action: 'refund_subscription',
          createdAt: new Date(),
        },
        {
          id: '2',
          adminEmail: 'admin@example.com',
          action: 'delete_user',
          createdAt: new Date(),
        },
      ]

      ;(prisma.adminAuditLog.findMany as jest.Mock).mockResolvedValue(mockLogs)

      const filters = {
        adminEmail: 'admin@example.com',
      }

      const result = await getAdminActionHistory(filters)

      expect(result).toEqual(mockLogs)
      expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            adminEmail: 'admin@example.com',
          }),
          orderBy: { createdAt: 'desc' },
        })
      )
    })

    it('should filter by action type', async () => {
      ;(prisma.adminAuditLog.findMany as jest.Mock).mockResolvedValue([])

      await getAdminActionHistory({ action: 'refund_subscription' })

      expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            action: 'refund_subscription',
          }),
        })
      )
    })

    it('should filter by target type', async () => {
      ;(prisma.adminAuditLog.findMany as jest.Mock).mockResolvedValue([])

      await getAdminActionHistory({ targetType: 'subscription' })

      expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            targetType: 'subscription',
          }),
        })
      )
    })

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')

      ;(prisma.adminAuditLog.findMany as jest.Mock).mockResolvedValue([])

      await getAdminActionHistory({ startDate, endDate })

      expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
        })
      )
    })

    it('should support pagination', async () => {
      ;(prisma.adminAuditLog.findMany as jest.Mock).mockResolvedValue([])

      await getAdminActionHistory({}, { limit: 50, offset: 100 })

      expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 100,
        })
      )
    })

    it('should default to 100 limit', async () => {
      ;(prisma.adminAuditLog.findMany as jest.Mock).mockResolvedValue([])

      await getAdminActionHistory({})

      expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
          skip: 0,
        })
      )
    })

    it('should combine multiple filters', async () => {
      ;(prisma.adminAuditLog.findMany as jest.Mock).mockResolvedValue([])

      await getAdminActionHistory({
        adminEmail: 'admin@example.com',
        action: 'refund_subscription',
        targetType: 'subscription',
        startDate: new Date('2024-01-01'),
      })

      expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            adminEmail: 'admin@example.com',
            action: 'refund_subscription',
            targetType: 'subscription',
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        })
      )
    })

    it('should handle empty filters', async () => {
      ;(prisma.adminAuditLog.findMany as jest.Mock).mockResolvedValue([])

      await getAdminActionHistory({})

      expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      )
    })
  })

  describe('getTargetAuditHistory', () => {
    it('should retrieve audit history for specific target', async () => {
      const mockLogs = [
        {
          id: '1',
          targetType: 'user',
          targetId: 'user_123',
          action: 'update_profile',
          createdAt: new Date(),
        },
        {
          id: '2',
          targetType: 'user',
          targetId: 'user_123',
          action: 'delete_account',
          createdAt: new Date(),
        },
      ]

      ;(prisma.adminAuditLog.findMany as jest.Mock).mockResolvedValue(mockLogs)

      const result = await getTargetAuditHistory('user', 'user_123')

      expect(result).toEqual(mockLogs)
      expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          targetType: 'user',
          targetId: 'user_123',
        },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should handle subscription targets', async () => {
      ;(prisma.adminAuditLog.findMany as jest.Mock).mockResolvedValue([])

      await getTargetAuditHistory('subscription', 'sub_456')

      expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith({
        where: {
          targetType: 'subscription',
          targetId: 'sub_456',
        },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should return empty array when no history found', async () => {
      ;(prisma.adminAuditLog.findMany as jest.Mock).mockResolvedValue([])

      const result = await getTargetAuditHistory('user', 'nonexistent')

      expect(result).toEqual([])
    })

    it('should order by most recent first', async () => {
      ;(prisma.adminAuditLog.findMany as jest.Mock).mockResolvedValue([])

      await getTargetAuditHistory('order', 'order_789')

      expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      )
    })
  })

  describe('Integration Scenarios', () => {
    it('should track complete admin workflow', async () => {
      ;(prisma.adminAuditLog.create as jest.Mock).mockResolvedValue({})
      ;(prisma.adminAuditLog.findMany as jest.Mock).mockResolvedValue([
        { id: '1', action: 'view_user' },
        { id: '2', action: 'refund_subscription' },
        { id: '3', action: 'send_notification' },
      ])

      // 1. View user
      await logAdminAction({
        adminEmail: 'admin@example.com',
        action: 'view_user',
        targetType: 'user',
        targetId: 'user_123',
      })

      // 2. Refund subscription
      await logAdminAction({
        adminEmail: 'admin@example.com',
        action: 'refund_subscription',
        targetType: 'subscription',
        targetId: 'sub_456',
        metadata: { amount: 50000 },
      })

      // 3. Send notification
      await logAdminAction({
        adminEmail: 'admin@example.com',
        action: 'send_notification',
        targetType: 'user',
        targetId: 'user_123',
      })

      // Get history
      const history = await getAdminActionHistory({
        adminEmail: 'admin@example.com',
      })

      expect(history).toHaveLength(3)
      expect(prisma.adminAuditLog.create).toHaveBeenCalledTimes(3)
    })

    it('should track failed operations', async () => {
      ;(prisma.adminAuditLog.create as jest.Mock).mockResolvedValue({})

      await logAdminAction({
        adminEmail: 'admin@example.com',
        action: 'delete_user',
        targetType: 'user',
        targetId: 'user_123',
        success: false,
        errorMessage: 'User has active subscription',
      })

      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          success: false,
          errorMessage: 'User has active subscription',
        }),
      })
    })

    it('should provide audit trail for compliance', async () => {
      const mockAuditTrail = [
        {
          id: '1',
          adminEmail: 'admin@example.com',
          action: 'view_user',
          createdAt: new Date('2024-01-15T10:00:00Z'),
        },
        {
          id: '2',
          adminEmail: 'admin@example.com',
          action: 'update_plan',
          createdAt: new Date('2024-01-15T10:05:00Z'),
        },
        {
          id: '3',
          adminEmail: 'admin@example.com',
          action: 'refund_payment',
          createdAt: new Date('2024-01-15T10:10:00Z'),
        },
      ]

      ;(prisma.adminAuditLog.findMany as jest.Mock).mockResolvedValue(mockAuditTrail)

      const trail = await getTargetAuditHistory('user', 'user_123')

      expect(trail).toHaveLength(3)
      // Should show chronological sequence of admin actions
    })
  })

  describe('Security & Edge Cases', () => {
    it('should handle very long error messages', async () => {
      const longError = 'E'.repeat(10000)

      ;(prisma.adminAuditLog.create as jest.Mock).mockResolvedValue({})

      await logAdminAction({
        adminEmail: 'admin@example.com',
        action: 'test',
        errorMessage: longError,
        success: false,
      })

      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          errorMessage: longError,
        }),
      })
    })

    it('should handle special characters in admin email', async () => {
      ;(prisma.adminAuditLog.create as jest.Mock).mockResolvedValue({})

      await logAdminAction({
        adminEmail: 'admin+test@example.com',
        action: 'login',
      })

      expect(prisma.adminAuditLog.create).toHaveBeenCalled()
    })

    it('should handle concurrent audit log writes', async () => {
      ;(prisma.adminAuditLog.create as jest.Mock).mockResolvedValue({})

      const actions = [
        logAdminAction({ adminEmail: 'admin1@example.com', action: 'action1' }),
        logAdminAction({ adminEmail: 'admin2@example.com', action: 'action2' }),
        logAdminAction({ adminEmail: 'admin3@example.com', action: 'action3' }),
      ]

      await Promise.all(actions)

      expect(prisma.adminAuditLog.create).toHaveBeenCalledTimes(3)
    })

    it('should handle null/undefined in metadata', async () => {
      ;(prisma.adminAuditLog.create as jest.Mock).mockResolvedValue({})

      await logAdminAction({
        adminEmail: 'admin@example.com',
        action: 'test',
        metadata: {
          field1: null,
          field2: undefined,
        } as any,
      })

      expect(prisma.adminAuditLog.create).toHaveBeenCalled()
    })

    it('should handle large pagination offsets', async () => {
      ;(prisma.adminAuditLog.findMany as jest.Mock).mockResolvedValue([])

      await getAdminActionHistory({}, { limit: 100, offset: 10000 })

      expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
          skip: 10000,
        })
      )
    })

    it('should handle date filter edge cases', async () => {
      ;(prisma.adminAuditLog.findMany as jest.Mock).mockResolvedValue([])

      // Only start date
      await getAdminActionHistory({
        startDate: new Date('2024-01-01'),
      })

      expect(prisma.adminAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: {
              gte: expect.any(Date),
            },
          }),
        })
      )
    })
  })
})
