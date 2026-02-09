import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _opts: any) => {
    return async (req: any) => {
      const ctx = {
        userId: 'user-1',
        session: { user: { id: 'user-1' } },
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: true,
      }
      const result = await handler(req, ctx)
      if (result instanceof Response) return result
      if (result?.error) {
        const sm: Record<string, number> = {
          BAD_REQUEST: 400,
          NOT_FOUND: 404,
          FORBIDDEN: 403,
          VALIDATION_ERROR: 422,
          DATABASE_ERROR: 500,
        }
        return NextResponse.json(
          { success: false, error: result.error },
          { status: sm[result.error.code] || 500 },
        )
      }
      return NextResponse.json({ success: true, data: result.data }, { status: 200 })
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
  apiSuccess: vi.fn((data: any) => ({ data })),
  apiError: vi.fn((code: string, msg?: string) => ({ error: { code, message: msg } })),
  ErrorCodes: {
    BAD_REQUEST: 'BAD_REQUEST',
    NOT_FOUND: 'NOT_FOUND',
    FORBIDDEN: 'FORBIDDEN',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    matchProfile: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    matchConnection: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((arr: any[]) => Promise.all(arr)),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/api/zodValidation', () => ({
  destinyMatchMatchesQuerySchema: {
    safeParse: vi.fn((d: any) => ({
      success: true,
      data: { status: d.status || 'active', connectionId: d.connectionId },
    })),
  },
  destinyMatchUnmatchSchema: {
    safeParse: vi.fn((d: any) => {
      if (!d?.connectionId) {
        return {
          success: false,
          error: { issues: [{ message: 'Missing connectionId' }] },
        }
      }
      return { success: true, data: d }
    }),
  },
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { GET, DELETE } from '@/app/api/destiny-match/matches/route'
import { prisma } from '@/lib/db/prisma'
import { destinyMatchMatchesQuerySchema } from '@/lib/api/zodValidation'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MY_USER_ID = 'user-1'
const MY_PROFILE_ID = 'profile-1'
const PARTNER_PROFILE_ID = 'profile-2'
const PARTNER_USER_ID = 'user-2'
const CONNECTION_ID = 'conn-1'

function makeMyProfile(overrides: Record<string, any> = {}) {
  return {
    id: MY_PROFILE_ID,
    userId: MY_USER_ID,
    matchCount: 5,
    ...overrides,
  }
}

function makePartnerSubProfile(overrides: Record<string, any> = {}) {
  const baseProfile = {
    id: PARTNER_PROFILE_ID,
    userId: PARTNER_USER_ID,
    displayName: 'Partner',
    bio: 'Hello',
    occupation: 'Engineer',
    photos: ['photo1.jpg'],
    city: 'Seoul',
    interests: ['music'],
    verified: true,
    lastActiveAt: new Date('2025-01-10'),
    personalityType: 'INTJ',
    personalityName: 'Architect',
    user: {
      image: 'avatar.jpg',
      profile: {
        birthDate: new Date('1995-06-15'),
        gender: 'FEMALE',
      },
    },
  }
  const userOverrides = overrides.user ?? {}
  const profileOverrides = userOverrides.profile ?? {}
  const normalizedProfileOverrides = {
    ...profileOverrides,
    ...(userOverrides.birthDate !== undefined ? { birthDate: userOverrides.birthDate } : {}),
    ...(userOverrides.gender !== undefined ? { gender: userOverrides.gender } : {}),
  }

  return {
    ...baseProfile,
    ...overrides,
    user: {
      ...baseProfile.user,
      ...userOverrides,
      profile: {
        ...baseProfile.user.profile,
        ...normalizedProfileOverrides,
      },
    },
  }
}

function makeConnection(overrides: Record<string, any> = {}) {
  return {
    id: CONNECTION_ID,
    createdAt: new Date('2025-01-01'),
    isSuperLikeMatch: false,
    compatibilityScore: 85,
    compatibilityData: {
      grade: 'A',
      strengths: ['communication'],
      challenges: ['time'],
      advice: 'Be patient',
      dayMasterRelation: 'harmonious',
      elementHarmony: ['wood', 'water'],
      recommendations: ['travel together'],
    },
    chatStarted: false,
    lastInteractionAt: null,
    user1Id: MY_PROFILE_ID,
    user2Id: PARTNER_PROFILE_ID,
    user1Profile: makePartnerSubProfile({
      id: MY_PROFILE_ID,
      userId: MY_USER_ID,
      displayName: 'Me',
    }),
    user2Profile: makePartnerSubProfile(),
    ...overrides,
  }
}

function buildGetRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/destiny-match/matches')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new NextRequest(url.toString(), { method: 'GET' })
}

function buildDeleteRequest(body: Record<string, any>) {
  return new NextRequest('http://localhost/api/destiny-match/matches', {
    method: 'DELETE',
    body: JSON.stringify(body),
  })
}

// ---------------------------------------------------------------------------
// Tests – GET
// ---------------------------------------------------------------------------

describe('Matches API - GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return matches list with transformed partner data', async () => {
    vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(makeMyProfile() as any)
    vi.mocked(prisma.matchConnection.findMany).mockResolvedValue([makeConnection()] as any)

    const response = await GET(buildGetRequest())
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.matches).toHaveLength(1)
    expect(json.data.total).toBe(1)

    const match = json.data.matches[0]
    expect(match.connectionId).toBe(CONNECTION_ID)
    expect(match.partner.profileId).toBe(PARTNER_PROFILE_ID)
    expect(match.partner.displayName).toBe('Partner')
    expect(match.compatibilityScore).toBe(85)
  })

  it('should return error when user has no profile', async () => {
    vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(null)

    const response = await GET(buildGetRequest())
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('BAD_REQUEST')
    expect(json.error.message).toContain('매칭 프로필을 설정해주세요')
  })

  it('should return empty matches when no connections exist', async () => {
    vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(makeMyProfile() as any)
    vi.mocked(prisma.matchConnection.findMany).mockResolvedValue([])

    const response = await GET(buildGetRequest())
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.matches).toHaveLength(0)
    expect(json.data.total).toBe(0)
  })

  it('should correctly transform partner data with age calculation and compatibility details', async () => {
    const now = new Date()
    // Use a birthdate that guarantees a deterministic age regardless of when
    // the test is executed.  Choosing a date earlier in the year than any
    // possible execution date means the birthday has always passed.
    const birthDate = new Date(now.getFullYear() - 30, 0, 1) // Jan 1, 30 years ago
    const connection = makeConnection({
      user2Profile: makePartnerSubProfile({
        user: { birthDate, gender: 'FEMALE', image: 'avatar.jpg' },
      }),
    })

    vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(makeMyProfile() as any)
    vi.mocked(prisma.matchConnection.findMany).mockResolvedValue([connection] as any)

    const response = await GET(buildGetRequest())
    const json = await response.json()
    const match = json.data.matches[0]

    // Age should be 30 (birthday already passed this year)
    expect(match.partner.age).toBe(30)

    // Compatibility details should be parsed from compatibilityData
    expect(match.compatibilityDetails).toEqual({
      grade: 'A',
      strengths: ['communication'],
      challenges: ['time'],
      advice: 'Be patient',
      dayMasterRelation: 'harmonious',
      elementHarmony: ['wood', 'water'],
      recommendations: ['travel together'],
    })
  })

  it('should set partner age to null when birthDate is missing', async () => {
    const connection = makeConnection({
      user2Profile: makePartnerSubProfile({
        user: { birthDate: null, gender: 'FEMALE', image: null },
      }),
    })

    vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(makeMyProfile() as any)
    vi.mocked(prisma.matchConnection.findMany).mockResolvedValue([connection] as any)

    const response = await GET(buildGetRequest())
    const json = await response.json()

    expect(json.data.matches[0].partner.age).toBeNull()
  })

  it('should set compatibilityDetails to null when compatibilityData is null', async () => {
    const connection = makeConnection({ compatibilityData: null })

    vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(makeMyProfile() as any)
    vi.mocked(prisma.matchConnection.findMany).mockResolvedValue([connection] as any)

    const response = await GET(buildGetRequest())
    const json = await response.json()

    expect(json.data.matches[0].compatibilityDetails).toBeNull()
  })

  it('should pick the correct partner when user is user2 in the connection', async () => {
    // Swap: current user is user2, partner is user1
    const connection = makeConnection({
      user1Id: PARTNER_PROFILE_ID,
      user2Id: MY_PROFILE_ID,
      user1Profile: makePartnerSubProfile({ displayName: 'PartnerAsUser1' }),
      user2Profile: makePartnerSubProfile({
        id: MY_PROFILE_ID,
        userId: MY_USER_ID,
        displayName: 'Me',
      }),
    })

    vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(makeMyProfile() as any)
    vi.mocked(prisma.matchConnection.findMany).mockResolvedValue([connection] as any)

    const response = await GET(buildGetRequest())
    const json = await response.json()

    // The partner should be user1Profile, not the current user
    expect(json.data.matches[0].partner.displayName).toBe('PartnerAsUser1')
  })

  it('should return VALIDATION_ERROR when query validation fails', async () => {
    vi.mocked(destinyMatchMatchesQuerySchema.safeParse).mockReturnValueOnce({
      success: false,
      error: { issues: [{ message: 'invalid status value' }] },
    } as any)

    const response = await GET(buildGetRequest({ status: 'bad' }))
    const json = await response.json()

    expect(response.status).toBe(422)
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('should return DATABASE_ERROR when prisma throws', async () => {
    vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(makeMyProfile() as any)
    vi.mocked(prisma.matchConnection.findMany).mockRejectedValue(new Error('DB down'))

    const response = await GET(buildGetRequest())
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error.code).toBe('DATABASE_ERROR')
  })
})

// ---------------------------------------------------------------------------
// Tests – DELETE
// ---------------------------------------------------------------------------

describe('Matches API - DELETE (unmatch)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should unmatch successfully', async () => {
    const myProfile = makeMyProfile()
    const connection = {
      id: CONNECTION_ID,
      user1Id: MY_PROFILE_ID,
      user2Id: PARTNER_PROFILE_ID,
      status: 'active',
    }

    vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(myProfile as any)
    vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(connection as any)
    vi.mocked(prisma.matchConnection.update).mockResolvedValue({ ...connection, status: 'unmatched' } as any)
    vi.mocked(prisma.matchProfile.updateMany).mockResolvedValue({ count: 1 } as any)

    const response = await DELETE(buildDeleteRequest({ connectionId: CONNECTION_ID }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.unmatched).toBe(true)

    // Connection status updated to 'unmatched'
    expect(prisma.matchConnection.update).toHaveBeenCalledWith({
      where: { id: CONNECTION_ID },
      data: { status: 'unmatched' },
    })

    // Both profiles' matchCount decremented via $transaction
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('should return NOT_FOUND when connection does not exist', async () => {
    vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(makeMyProfile() as any)
    vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(null)

    const response = await DELETE(buildDeleteRequest({ connectionId: 'nonexistent' }))
    const json = await response.json()

    expect(response.status).toBe(404)
    expect(json.error.code).toBe('NOT_FOUND')
    expect(json.error.message).toContain('매치를 찾을 수 없습니다')
  })

  it('should return BAD_REQUEST when user has no profile', async () => {
    vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(null)

    const response = await DELETE(buildDeleteRequest({ connectionId: CONNECTION_ID }))
    const json = await response.json()

    expect(response.status).toBe(400)
    expect(json.error.code).toBe('BAD_REQUEST')
    expect(json.error.message).toContain('매칭 프로필을 설정해주세요')
  })

  it('should return FORBIDDEN when connection belongs to other users', async () => {
    const myProfile = makeMyProfile()
    const otherConnection = {
      id: CONNECTION_ID,
      user1Id: 'profile-other-a',
      user2Id: 'profile-other-b',
      status: 'active',
    }

    vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(myProfile as any)
    vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(otherConnection as any)

    const response = await DELETE(buildDeleteRequest({ connectionId: CONNECTION_ID }))
    const json = await response.json()

    expect(response.status).toBe(403)
    expect(json.error.code).toBe('FORBIDDEN')
    expect(json.error.message).toContain('권한이 없습니다')
  })

  it('should return VALIDATION_ERROR when connectionId is missing', async () => {
    const response = await DELETE(buildDeleteRequest({}))
    const json = await response.json()

    expect(response.status).toBe(422)
    expect(json.error.code).toBe('VALIDATION_ERROR')
  })

  it('should allow unmatch when user is user2 in the connection', async () => {
    const myProfile = makeMyProfile()
    const connection = {
      id: CONNECTION_ID,
      user1Id: PARTNER_PROFILE_ID,
      user2Id: MY_PROFILE_ID,
      status: 'active',
    }

    vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(myProfile as any)
    vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(connection as any)
    vi.mocked(prisma.matchConnection.update).mockResolvedValue({ ...connection, status: 'unmatched' } as any)
    vi.mocked(prisma.matchProfile.updateMany).mockResolvedValue({ count: 1 } as any)

    const response = await DELETE(buildDeleteRequest({ connectionId: CONNECTION_ID }))
    const json = await response.json()

    expect(response.status).toBe(200)
    expect(json.data.unmatched).toBe(true)
  })

  it('should return DATABASE_ERROR when prisma throws during unmatch', async () => {
    vi.mocked(prisma.matchProfile.findUnique).mockResolvedValue(makeMyProfile() as any)
    vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue({
      id: CONNECTION_ID,
      user1Id: MY_PROFILE_ID,
      user2Id: PARTNER_PROFILE_ID,
    } as any)
    vi.mocked(prisma.matchConnection.update).mockRejectedValue(new Error('DB write fail'))

    const response = await DELETE(buildDeleteRequest({ connectionId: CONNECTION_ID }))
    const json = await response.json()

    expect(response.status).toBe(500)
    expect(json.error.code).toBe('DATABASE_ERROR')
  })
})
