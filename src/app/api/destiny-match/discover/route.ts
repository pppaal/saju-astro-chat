/**
 * Destiny Match Discover API
 * 매칭 대상 프로필 검색
 */
import { NextRequest, NextResponse } from 'next/server'
import { withApiMiddleware, createAuthenticatedGuard, type ApiContext } from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { getCompatibilitySummary } from '@/lib/destiny-match/quickCompatibility'
import { quickPersonalityScore } from '@/lib/destiny-match/personalityCompatibility'
import { logger } from '@/lib/logger'
import { HTTP_STATUS } from '@/lib/constants/http'
import { cacheGet, cacheSet, CACHE_TTL } from '@/lib/cache/redis-cache'
import { destinyMatchDiscoverQuerySchema } from '@/lib/api/zodValidation'

// Haversine 공식으로 거리 계산 (km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // 지구 반지름 (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// 나이 계산
function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) {
    return null
  }
  const birth = new Date(birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

// GET - 매칭 대상 검색
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    // context.userId는 이미 검증됨 (middleware에서 requireAuth: true)
    const userId = context.userId!

    const searchParams = req.nextUrl.searchParams
    const queryValidation = destinyMatchDiscoverQuerySchema.safeParse({
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
      gender: searchParams.get('gender') ?? undefined,
      ageMin: searchParams.get('ageMin') ?? undefined,
      ageMax: searchParams.get('ageMax') ?? undefined,
      city: searchParams.get('city') ?? undefined,
    })
    if (!queryValidation.success) {
      return NextResponse.json(
        { error: 'validation_failed', details: queryValidation.error.issues },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }
    const { limit, offset, gender, ageMin, ageMax, city } = queryValidation.data
    const zodiacFilter = searchParams.get('zodiac')
    const elementFilter = searchParams.get('element')

    // 내 프로필 조회
    const myProfile = await prisma.matchProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            birthDate: true,
            birthTime: true,
            birthCity: true,
            gender: true,
          },
        },
      },
    })

    if (!myProfile) {
      return NextResponse.json(
        { error: '먼저 매칭 프로필을 설정해주세요' },
        { status: HTTP_STATUS.BAD_REQUEST }
      )
    }

    // 이미 스와이프한 프로필 ID 목록
    const swipedProfiles = await prisma.matchSwipe.findMany({
      where: { swiperId: myProfile.id },
      select: { targetId: true },
    })
    const swipedIds = swipedProfiles.map((s) => s.targetId)

    // 차단된 유저 목록 (양방향 - 내가 차단한 사람 + 나를 차단한 사람)
    const blocks = await prisma.userBlock.findMany({
      where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
      select: { blockerId: true, blockedId: true },
    })
    const blockedUserIds = blocks.map((b) => (b.blockerId === userId ? b.blockedId : b.blockerId))

    // 차단된 유저의 매칭 프로필 ID 조회
    const blockedProfiles =
      blockedUserIds.length > 0
        ? await prisma.matchProfile.findMany({
            where: { userId: { in: blockedUserIds } },
            select: { id: true },
          })
        : []
    const blockedProfileIds = blockedProfiles.map((p) => p.id)

    // 매칭 대상 검색 조건
    const whereCondition: Record<string, unknown> = {
      isActive: true,
      isVisible: true,
      id: {
        notIn: [myProfile.id, ...swipedIds, ...blockedProfileIds],
      },
    }

    // 성별 필터 (쿼리 파라미터 우선, 없으면 프로필 선호도)
    const effectiveGenderPref = gender ?? myProfile.genderPreference
    if (effectiveGenderPref !== 'all') {
      whereCondition.user = {
        gender: effectiveGenderPref,
      }
    }

    // 나이 필터를 DB 레벨에서 적용 (쿼리 파라미터 우선, 없으면 프로필 선호도)
    const effectiveAgeMin = ageMin ?? myProfile.ageMin
    const effectiveAgeMax = ageMax ?? myProfile.ageMax
    const now = new Date()
    const maxBirthDate = new Date(
      now.getFullYear() - effectiveAgeMin,
      now.getMonth(),
      now.getDate()
    )
    const minBirthDate = new Date(
      now.getFullYear() - effectiveAgeMax - 1,
      now.getMonth(),
      now.getDate()
    )

    // Merge user filter with age range
    const existingUserFilter = (whereCondition.user as Record<string, unknown>) || {}
    whereCondition.user = {
      ...existingUserFilter,
      birthDate: {
        gte: minBirthDate.toISOString().split('T')[0],
        lte: maxBirthDate.toISOString().split('T')[0],
      },
    }

    // 도시 필터를 DB 레벨에서 적용 (쿼리 파라미터 우선, 없으면 프로필 도시)
    const effectiveCity = city ?? myProfile.city
    if (effectiveCity) {
      whereCondition.city = {
        equals: effectiveCity,
        mode: 'insensitive',
      }
    }

    // 프로필 검색 (DB 레벨 필터링 적용으로 over-fetch 감소)
    const profiles = await prisma.matchProfile.findMany({
      where: whereCondition,
      select: {
        id: true,
        userId: true,
        displayName: true,
        bio: true,
        occupation: true,
        photos: true,
        city: true,
        interests: true,
        verified: true,
        personalityType: true,
        personalityName: true,
        personalityScores: true,
        latitude: true,
        longitude: true,
        ageMin: true,
        ageMax: true,
        genderPreference: true,
        lastActiveAt: true,
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
      orderBy: { lastActiveAt: 'desc' },
      take: limit * 2, // Reduced from 3x - DB-level filtering handles most cases
      skip: offset,
    })

    // 내 나이 계산
    const myAge = calculateAge(myProfile.user.birthDate)

    // 1단계: 추가 필터링 (양방향 체크 - DB 레벨에서 처리 불가능한 부분)
    const filteredProfiles = profiles.filter((profile) => {
      // 양방향 나이 필터: 상대가 내 나이를 수용하는지 확인
      if (myAge !== null) {
        if (myAge < profile.ageMin || myAge > profile.ageMax) {
          return false
        }
      }

      // 명시적 나이 필터가 있는데 상대의 생년월일이 없으면 제외
      const profileAge = calculateAge(profile.user.birthDate)
      if (profileAge === null && (ageMin !== undefined || ageMax !== undefined)) {
        return false
      }

      // 양방향 성별 필터: 상대가 내 성별을 수용하는지 확인
      if (profile.genderPreference !== 'all') {
        if (profile.genderPreference !== myProfile.user.gender) {
          return false
        }
      }

      // 거리 필터
      if (myProfile.latitude && myProfile.longitude && profile.latitude && profile.longitude) {
        const distance = calculateDistance(
          myProfile.latitude,
          myProfile.longitude,
          profile.latitude,
          profile.longitude
        )
        if (distance > myProfile.maxDistance) {
          return false
        }
      }

      return true
    })

    // 2단계: 배치로 궁합 점수 계산 (N+1 방지)
    const compatibilityPromises = filteredProfiles.slice(0, limit * 2).map(async (profile) => {
      let compatibilityScore = 75
      let compatibilityGrade = 'B'
      let compatibilityEmoji = '✨'
      let compatibilityTagline = '좋은 궁합'
      let sajuScore = 75

      // 사주/별자리 기반 궁합 (Redis 캐싱)
      if (myProfile.user.birthDate && profile.user.birthDate) {
        try {
          // 캐시 키: 두 사람의 생년월일+시간 조합 (순서 정규화)
          const person1Key = `${myProfile.user.birthDate}:${myProfile.user.birthTime || 'unknown'}:${myProfile.user.gender || 'unknown'}`
          const person2Key = `${profile.user.birthDate}:${profile.user.birthTime || 'unknown'}:${profile.user.gender || 'unknown'}`
          const sortedKeys = [person1Key, person2Key].sort()
          const compatCacheKey = `compatibility:v1:${sortedKeys[0]}:${sortedKeys[1]}`

          const cachedSummary = await cacheGet<{
            score: number
            grade: string
            emoji: string
            tagline: string
          }>(compatCacheKey)

          let summary
          if (cachedSummary) {
            summary = cachedSummary
          } else {
            summary = await getCompatibilitySummary(
              {
                birthDate: myProfile.user.birthDate,
                birthTime: myProfile.user.birthTime || undefined,
                gender: myProfile.user.gender || undefined,
              },
              {
                birthDate: profile.user.birthDate,
                birthTime: profile.user.birthTime || undefined,
                gender: profile.user.gender || undefined,
              }
            )
            // 7일간 캐싱 (사주는 불변)
            await cacheSet(compatCacheKey, summary, CACHE_TTL.COMPATIBILITY)
          }

          sajuScore = summary.score
          compatibilityGrade = summary.grade
          compatibilityEmoji = summary.emoji
          compatibilityTagline = summary.tagline
        } catch (e) {
          logger.warn('[discover] Compatibility calc failed:', { e })
        }
      }

      // 성격 테스트 기반 궁합
      let personalityScore: number | null = null
      if (myProfile.personalityScores && profile.personalityScores) {
        try {
          const myScores = myProfile.personalityScores as {
            energy: number
            cognition: number
            decision: number
            rhythm: number
          }
          const theirScores = profile.personalityScores as {
            energy: number
            cognition: number
            decision: number
            rhythm: number
          }
          personalityScore = quickPersonalityScore(myScores, theirScores)
        } catch (e) {
          logger.warn('[discover] Personality compatibility calc failed:', { e })
        }
      }

      // 최종 궁합 점수 (사주 60% + 성격 40%)
      if (personalityScore !== null) {
        compatibilityScore = Math.round(sajuScore * 0.6 + personalityScore * 0.4)
      } else {
        compatibilityScore = sajuScore
      }

      return {
        profile,
        compatibilityScore,
        compatibilityGrade,
        compatibilityEmoji,
        compatibilityTagline,
      }
    })

    // 병렬로 모든 궁합 계산 실행
    const compatibilityResults = await Promise.all(compatibilityPromises)

    // 3단계: 최종 결과 빌드
    const results = []

    for (const {
      profile,
      compatibilityScore,
      compatibilityGrade,
      compatibilityEmoji,
      compatibilityTagline,
    } of compatibilityResults) {
      const age = calculateAge(profile.user.birthDate)

      // 거리 계산
      let distance: number | null = null
      if (myProfile.latitude && myProfile.longitude && profile.latitude && profile.longitude) {
        distance = Math.round(
          calculateDistance(
            myProfile.latitude,
            myProfile.longitude,
            profile.latitude,
            profile.longitude
          )
        )
      }

      // 별자리 계산 (간단)
      const zodiacSign = getZodiacSign(profile.user.birthDate)
      const sajuElement = getSajuElement(profile.user.birthDate)

      // 필터 적용
      if (zodiacFilter && zodiacSign !== zodiacFilter) {
        continue
      }
      if (elementFilter && sajuElement !== elementFilter) {
        continue
      }

      results.push({
        id: profile.id,
        userId: profile.userId,
        displayName: profile.displayName,
        bio: profile.bio,
        occupation: profile.occupation,
        photos: profile.photos,
        city: profile.city,
        interests: profile.interests,
        verified: profile.verified,
        age,
        distance,
        zodiacSign,
        sajuElement,
        // 성격 테스트 결과
        personalityType: profile.personalityType,
        personalityName: profile.personalityName,
        compatibilityScore,
        compatibilityGrade,
        compatibilityEmoji,
        compatibilityTagline,
        lastActiveAt: profile.lastActiveAt,
      })

      if (results.length >= limit) {
        break
      }
    }

    // 궁합 점수 기준 정렬
    results.sort((a, b) => b.compatibilityScore - a.compatibilityScore)

    return NextResponse.json({
      profiles: results,
      hasMore: profiles.length >= limit * 2,
    })
  },
  createAuthenticatedGuard({
    route: '/api/destiny-match/discover',
    limit: 30,
    windowSeconds: 60,
  })
)

// 간단한 별자리 계산
function getZodiacSign(birthDate: string | null): string | null {
  if (!birthDate) {
    return null
  }

  const date = new Date(birthDate)
  const month = date.getMonth() + 1
  const day = date.getDate()

  const signs = [
    { sign: 'Capricorn', start: [1, 1], end: [1, 19] },
    { sign: 'Aquarius', start: [1, 20], end: [2, 18] },
    { sign: 'Pisces', start: [2, 19], end: [3, 20] },
    { sign: 'Aries', start: [3, 21], end: [4, 19] },
    { sign: 'Taurus', start: [4, 20], end: [5, 20] },
    { sign: 'Gemini', start: [5, 21], end: [6, 20] },
    { sign: 'Cancer', start: [6, 21], end: [7, 22] },
    { sign: 'Leo', start: [7, 23], end: [8, 22] },
    { sign: 'Virgo', start: [8, 23], end: [9, 22] },
    { sign: 'Libra', start: [9, 23], end: [10, 22] },
    { sign: 'Scorpio', start: [10, 23], end: [11, 21] },
    { sign: 'Sagittarius', start: [11, 22], end: [12, 21] },
    { sign: 'Capricorn', start: [12, 22], end: [12, 31] },
  ]

  for (const { sign, start, end } of signs) {
    const afterStart = month > start[0] || (month === start[0] && day >= start[1])
    const beforeEnd = month < end[0] || (month === end[0] && day <= end[1])

    if (afterStart && beforeEnd) {
      return sign
    }
  }

  return 'Capricorn'
}

// 간단한 사주 오행 (년도 기반)
function getSajuElement(birthDate: string | null): string | null {
  if (!birthDate) {
    return null
  }

  const year = new Date(birthDate).getFullYear()
  const stemIndex = (year - 4) % 10

  const elements = [
    'Wood',
    'Wood',
    'Fire',
    'Fire',
    'Earth',
    'Earth',
    'Metal',
    'Metal',
    'Water',
    'Water',
  ]
  return elements[stemIndex]
}
