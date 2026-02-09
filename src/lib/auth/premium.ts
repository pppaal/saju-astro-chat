import { prisma } from '@/lib/db/prisma'

const ACTIVE_SUB_STATUSES: string[] = ['active', 'trialing', 'past_due']

export async function isDbPremiumUser(userId?: string | null): Promise<boolean> {
  if (!userId) return false

  const credits = await prisma.userCredits.findUnique({
    where: { userId },
    select: { plan: true },
  })

  if (credits?.plan && credits.plan !== 'free') {
    return true
  }

  const subscription = await prisma.subscription.findFirst({
    where: { userId, status: { in: ACTIVE_SUB_STATUSES } },
    orderBy: { updatedAt: 'desc' },
    select: { currentPeriodEnd: true },
  })

  if (!subscription) return false
  if (!subscription.currentPeriodEnd) return true

  return subscription.currentPeriodEnd > new Date()
}
