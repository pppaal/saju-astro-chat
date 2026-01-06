/**
 * Destiny Match Profile API
 * 매칭 프로필 CRUD
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/authOptions';
import { prisma } from '@/lib/db/prisma';
import { logger } from '@/lib/logger';

// GET - 내 프로필 조회
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.matchProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            birthDate: true,
            birthTime: true,
            birthCity: true,
            gender: true,
            image: true,
          },
        },
      },
    });

    if (!profile) {
      return NextResponse.json({ profile: null, needsSetup: true });
    }

    return NextResponse.json({ profile, needsSetup: false });
  } catch (error) {
    logger.error('[destiny-match/profile] GET error:', { error: error });
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// POST - 프로필 생성/업데이트
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      displayName,
      bio,
      occupation,
      photos,
      city,
      latitude,
      longitude,
      interests,
      ageMin,
      ageMax,
      maxDistance,
      genderPreference,
      isActive,
      isVisible,
    } = body;

    // 필수 필드 검증
    if (!displayName || displayName.trim().length < 2) {
      return NextResponse.json(
        { error: '표시 이름은 2자 이상이어야 합니다' },
        { status: 400 }
      );
    }

    // 기존 프로필 확인
    const existingProfile = await prisma.matchProfile.findUnique({
      where: { userId: session.user.id },
    });

    // 성격 테스트 결과 조회 (자동 연동)
    const personalityResult = await prisma.personalityResult.findUnique({
      where: { userId: session.user.id },
      select: {
        typeCode: true,
        personaName: true,
        energyScore: true,
        cognitionScore: true,
        decisionScore: true,
        rhythmScore: true,
      },
    });

    const profileData = {
      displayName: displayName.trim(),
      bio: bio?.trim() || null,
      occupation: occupation?.trim() || null,
      photos: photos || [],
      city: city?.trim() || null,
      latitude: latitude || null,
      longitude: longitude || null,
      interests: interests || [],
      ageMin: ageMin ?? 18,
      ageMax: ageMax ?? 99,
      maxDistance: maxDistance ?? 50,
      genderPreference: genderPreference || 'all',
      isActive: isActive ?? true,
      isVisible: isVisible ?? true,
      lastActiveAt: new Date(),
      // 성격 테스트 결과 자동 연동
      ...(personalityResult && {
        personalityType: personalityResult.typeCode,
        personalityName: personalityResult.personaName,
        personalityScores: {
          energy: personalityResult.energyScore,
          cognition: personalityResult.cognitionScore,
          decision: personalityResult.decisionScore,
          rhythm: personalityResult.rhythmScore,
        },
      }),
    };

    let profile;
    if (existingProfile) {
      // 업데이트
      profile = await prisma.matchProfile.update({
        where: { userId: session.user.id },
        data: profileData,
      });
    } else {
      // 생성
      profile = await prisma.matchProfile.create({
        data: {
          userId: session.user.id,
          ...profileData,
        },
      });
    }

    return NextResponse.json({ profile, success: true });
  } catch (error) {
    logger.error('[destiny-match/profile] POST error:', { error: error });
    return NextResponse.json(
      { error: 'Failed to save profile' },
      { status: 500 }
    );
  }
}

// DELETE - 프로필 비활성화 (완전 삭제 아님)
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.matchProfile.update({
      where: { userId: session.user.id },
      data: {
        isActive: false,
        isVisible: false,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[destiny-match/profile] DELETE error:', { error: error });
    return NextResponse.json(
      { error: 'Failed to deactivate profile' },
      { status: 500 }
    );
  }
}
