// 🔒 Admin Audit Log - 관리자 작업 감사 로그
import { prisma } from "@/lib/db/prisma";

export interface AdminAuditParams {
  adminEmail: string;
  adminUserId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  data?: Record<string, unknown>; // Legacy field alias for metadata
  success?: boolean;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * 관리자 작업을 감사 로그에 기록
 *
 * @example
 * ```ts
 * await logAdminAction({
 *   adminEmail: 'admin@example.com',
 *   adminUserId: 'user_123',
 *   action: 'refund_subscription',
 *   targetType: 'subscription',
 *   targetId: 'sub_456',
 *   metadata: {
 *     amount: 50000,
 *     reason: 'User requested refund',
 *     originalAmount: 100000,
 *     deduction: 50000,
 *   },
 *   success: true,
 *   ipAddress: req.ip,
 *   userAgent: req.headers['user-agent'],
 * });
 * ```
 */
export async function logAdminAction(params: AdminAuditParams): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminEmail: params.adminEmail,
        adminUserId: params.adminUserId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: params.metadata || params.data || {}, // Support both fields
        success: params.success !== false, // default true
        errorMessage: params.errorMessage,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });

    // 콘솔에도 로그 (개발/디버깅용)
    console.log('[Admin Action]', {
      admin: params.adminEmail,
      action: params.action,
      target: `${params.targetType}:${params.targetId}`,
      success: params.success !== false,
    });
  } catch (error) {
    // 감사 로그 실패는 치명적이지 않으므로 에러만 기록
    console.error('Failed to log admin action:', error);
  }
}

/**
 * 관리자 작업 히스토리 조회
 */
export async function getAdminActionHistory(
  filters: {
    adminEmail?: string;
    action?: string;
    targetType?: string;
    startDate?: Date;
    endDate?: Date;
  },
  options: {
    limit?: number;
    offset?: number;
  } = {}
): Promise<unknown[]> {
  const where: Record<string, unknown> = {};

  if (filters.adminEmail) {
    where.adminEmail = filters.adminEmail;
  }

  if (filters.action) {
    where.action = filters.action;
  }

  if (filters.targetType) {
    where.targetType = filters.targetType;
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      (where.createdAt as Record<string, unknown>).gte = filters.startDate;
    }
    if (filters.endDate) {
      (where.createdAt as Record<string, unknown>).lte = filters.endDate;
    }
  }

  return prisma.adminAuditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: options.limit || 100,
    skip: options.offset || 0,
  });
}

/**
 * 특정 대상에 대한 관리자 작업 히스토리 조회
 */
export async function getTargetAuditHistory(
  targetType: string,
  targetId: string
): Promise<unknown[]> {
  return prisma.adminAuditLog.findMany({
    where: {
      targetType,
      targetId,
    },
    orderBy: { createdAt: 'desc' },
  });
}
