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
    try {
      // context.userId는 이미 검증됨 (middleware에서 requireAuth: true)
      const userId = context.userId!

      const searchParams = req.nextUrl.searchParams
      const limit = parseInt(searchParams.get('limit') || '20')
      const offset = parseInt(searchParams.get('offset') || '0')
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

      // 매칭 대상 검색 조건
      const whereCondition: Record<string, unknown> = {
        isActive: true,
        isVisible: true,
        id: {
          notIn: [myProfile.id, ...swipedIds],
        },
      }

      // 성별 필터 (내 선호도 기반)
      if (myProfile.genderPreference !== 'all') {
        whereCondition.user = {
          gender: myProfile.genderPreference,
        }
      }

      // 도시 필터 제거 - 대신 나중에 case-insensitive로 필터링

      // 프로필 검색 (양방향 필터링을 위해 추가 정보 포함)
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
        take: limit * 3, // 양방향 필터링으로 인해 더 많이 가져옴
        skip: offset,
      })

      // 내 나이 계산
      const myAge = calculateAge(myProfile.user.birthDate)

      // 1단계: 기본 필터링 (DB 레벨 + 메모리 레벨)
      const filteredProfiles = profiles.filter((profile) => {
        // 나이 필터 (양방향)
        const age = calculateAge(profile.user.birthDate)
        if (age !== null) {
          if (age < myProfile.ageMin || age > myProfile.ageMax) {
            return false
          }
          if (myAge !== null) {
            if (myAge < profile.ageMin || myAge > profile.ageMax) {
              return false
            }
          }
        }

        // 성별 필터 (양방향)
        if (profile.genderPreference !== 'all') {
          if (profile.genderPreference !== myProfile.user.gender) {
            return false
          }
        }

        // 도시 필터 (case-insensitive)
        if (myProfile.city && profile.city) {
          const myCity = myProfile.city.toLowerCase().trim()
          const theirCity = profile.city.toLowerCase().trim()
          if (myCity !== theirCity) {
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

        // 사주/별자리 기반 궁합
        if (myProfile.user.birthDate && profile.user.birthDate) {
          try {
            const summary = await getCompatibilitySummary(
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
    } catch (error) {
      logger.error('[destiny-match/discover] GET error:', { error: error })
      return NextResponse.json(
        { error: 'Failed to discover profiles' },
        { status: HTTP_STATUS.SERVER_ERROR }
      )
    }
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
