// src/app/api/me/saju/route.ts
// 사용자의 사주 기본 정보 조회 API (dayMasterElement 포함)

import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { calculateSajuData } from '@/lib/Saju'
import { logger } from '@/lib/logger'

// 오행 한글 매핑
const ELEMENT_KOREAN: Record<string, string> = {
  Wood: '목',
  Fire: '화',
  Earth: '토',
  Metal: '금',
  Water: '수',
  목: '목',
  화: '화',
  토: '토',
  금: '금',
  수: '수',
}

export const GET = withApiMiddleware<Record<string, unknown>>(
  async (_req: NextRequest, context: ApiContext) => {
    try {
      // 사용자 프로필 조회
      const user = await prisma.user.findUnique({
        where: { id: context.userId! },
        select: {
          birthDate: true,
          birthTime: true,
          gender: true,
          tzId: true,
          personaMemory: {
            select: {
              sajuProfile: true,
            },
          },
        },
      })

      if (!user) {
        return apiError(ErrorCodes.NOT_FOUND, '사용자를 찾을 수 없습니다.')
      }

      // 생년월일이 없으면 사주 계산 불가
      if (!user.birthDate) {
        return apiSuccess({
          hasSaju: false,
          message: '생년월일 정보가 없습니다.',
        } as Record<string, unknown>)
      }

      // 캐싱된 사주 프로필이 있으면 사용
      if (user.personaMemory?.sajuProfile) {
        const cached = user.personaMemory.sajuProfile as Record<string, unknown>
        if (cached.dayMasterElement) {
          return apiSuccess({
            hasSaju: true,
            saju: {
              dayMasterElement:
                ELEMENT_KOREAN[cached.dayMasterElement as string] || cached.dayMasterElement,
              dayMaster: cached.dayMaster,
              birthDate: user.birthDate,
              birthTime: user.birthTime,
            },
          } as Record<string, unknown>)
        }
      }

      // 사주 계산
      const gender = user.gender === 'M' ? 'male' : user.gender === 'F' ? 'female' : 'male'
      const timezone = user.tzId || 'Asia/Seoul'
      const birthTime = user.birthTime || '12:00'

      const sajuResult = calculateSajuData(user.birthDate, birthTime, gender, 'solar', timezone)

      if (!sajuResult || !sajuResult.dayMaster) {
        return apiSuccess({
          hasSaju: false,
          message: '사주 계산에 실패했습니다.',
        } as Record<string, unknown>)
      }

      const dayMasterElement =
        ELEMENT_KOREAN[sajuResult.dayMaster.element] || sajuResult.dayMaster.element

      // PersonaMemory에 캐싱
      const sajuProfileData = {
        dayMaster: sajuResult.dayMaster.name,
        dayMasterElement: dayMasterElement,
        yinYang: sajuResult.dayMaster.yin_yang as string,
        updatedAt: new Date().toISOString(),
      }

      await prisma.personaMemory.upsert({
        where: { userId: context.userId! },
        update: {
          sajuProfile: sajuProfileData,
          updatedAt: new Date(),
        },
        create: {
          userId: context.userId!,
          sajuProfile: sajuProfileData,
        },
      })

      return apiSuccess({
        hasSaju: true,
        saju: {
          dayMasterElement,
          dayMaster: sajuResult.dayMaster.name,
          dayMasterYinYang: sajuResult.dayMaster.yin_yang,
          birthDate: user.birthDate,
          birthTime: user.birthTime,
          pillars: {
            year: {
              stem: sajuResult.yearPillar?.heavenlyStem?.name,
              branch: sajuResult.yearPillar?.earthlyBranch?.name,
            },
            month: {
              stem: sajuResult.monthPillar?.heavenlyStem?.name,
              branch: sajuResult.monthPillar?.earthlyBranch?.name,
            },
            day: {
              stem: sajuResult.dayPillar?.heavenlyStem?.name,
              branch: sajuResult.dayPillar?.earthlyBranch?.name,
            },
            time: {
              stem: sajuResult.timePillar?.heavenlyStem?.name,
              branch: sajuResult.timePillar?.earthlyBranch?.name,
            },
          },
        },
      } as Record<string, unknown>)
    } catch (err) {
      logger.error('Saju Profile Error:', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, '사주 정보 조회 중 오류가 발생했습니다.')
    }
  },
  createAuthenticatedGuard({
    route: '/api/me/saju',
    limit: 30,
    windowSeconds: 60,
  })
)
