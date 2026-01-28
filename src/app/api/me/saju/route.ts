// src/app/api/me/saju/route.ts
// 사용자의 사주 기본 정보 조회 API (dayMasterElement 포함)

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { calculateSajuData } from '@/lib/Saju';
import { logger } from '@/lib/logger';
import { HTTP_STATUS } from '@/lib/constants/http';

// 오행 한글 매핑
const ELEMENT_KOREAN: Record<string, string> = {
  'Wood': '목',
  'Fire': '화',
  'Earth': '토',
  'Metal': '금',
  'Water': '수',
  '목': '목',
  '화': '화',
  '토': '토',
  '금': '금',
  '수': '수',
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message: '로그인이 필요합니다.' } },
        { status: HTTP_STATUS.UNAUTHORIZED }
      );
    }

    // 사용자 프로필 조회
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
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
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '사용자를 찾을 수 없습니다.' } },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }

    // 생년월일이 없으면 사주 계산 불가
    if (!user.birthDate) {
      return NextResponse.json({
        success: true,
        hasSaju: false,
        message: '생년월일 정보가 없습니다.',
      });
    }

    // 캐싱된 사주 프로필이 있으면 사용
    if (user.personaMemory?.sajuProfile) {
      const cached = user.personaMemory.sajuProfile as Record<string, unknown>;
      if (cached.dayMasterElement) {
        return NextResponse.json({
          success: true,
          hasSaju: true,
          saju: {
            dayMasterElement: ELEMENT_KOREAN[cached.dayMasterElement as string] || cached.dayMasterElement,
            dayMaster: cached.dayMaster,
            birthDate: user.birthDate,
            birthTime: user.birthTime,
          },
        });
      }
    }

    // 사주 계산
    const gender = user.gender === 'M' ? 'male' : user.gender === 'F' ? 'female' : 'male';
    const timezone = user.tzId || 'Asia/Seoul';
    const birthTime = user.birthTime || '12:00'; // 시간 모르면 정오로 가정

    const sajuResult = calculateSajuData(
      user.birthDate,
      birthTime,
      gender,
      'solar',
      timezone
    );

    if (!sajuResult || !sajuResult.dayMaster) {
      return NextResponse.json({
        success: true,
        hasSaju: false,
        message: '사주 계산에 실패했습니다.',
      });
    }

    const dayMasterElement = ELEMENT_KOREAN[sajuResult.dayMaster.element] || sajuResult.dayMaster.element;

    // PersonaMemory에 캐싱 (있으면 업데이트, 없으면 생성)
    const sajuProfileData = {
      dayMaster: sajuResult.dayMaster.name,
      dayMasterElement: dayMasterElement,
      yinYang: sajuResult.dayMaster.yin_yang as string,
      updatedAt: new Date().toISOString(),
    } as any;

    await prisma.personaMemory.upsert({
      where: { userId: session.user.id },
      update: {
        sajuProfile: sajuProfileData,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        sajuProfile: sajuProfileData,
      },
    });

    return NextResponse.json({
      success: true,
      hasSaju: true,
      saju: {
        dayMasterElement,
        dayMaster: sajuResult.dayMaster.name,
        dayMasterYinYang: sajuResult.dayMaster.yin_yang,
        birthDate: user.birthDate,
        birthTime: user.birthTime,
        pillars: {
          year: {
            stem: (sajuResult.yearPillar as any)?.heavenlyStem?.name,
            branch: (sajuResult.yearPillar as any)?.earthlyBranch?.name,
          },
          month: {
            stem: (sajuResult.monthPillar as any)?.heavenlyStem?.name,
            branch: (sajuResult.monthPillar as any)?.earthlyBranch?.name,
          },
          day: {
            stem: (sajuResult.dayPillar as any)?.heavenlyStem?.name,
            branch: (sajuResult.dayPillar as any)?.earthlyBranch?.name,
          },
          time: {
            stem: (sajuResult.timePillar as any)?.heavenlyStem?.name,
            branch: (sajuResult.timePillar as any)?.earthlyBranch?.name,
          },
        },
      },
    });

  } catch (error) {
    logger.error('Saju Profile Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '사주 정보 조회 중 오류가 발생했습니다.',
        },
      },
      { status: HTTP_STATUS.SERVER_ERROR }
    );
  }
}
