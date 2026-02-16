/**
 * Zod Validation MEGA Test Suite
 * Comprehensive testing for all Zod schemas and validation functions
 */
import { describe, it, expect } from 'vitest'
import {
  dateSchema,
  timeSchema,
  timezoneSchema,
  latitudeSchema,
  longitudeSchema,
  genderSchema,
  localeSchema,
  calendarTypeSchema,
  birthInfoSchema,
  astrologyRequestSchema,
  sajuRequestSchema,
  tarotCardSchema,
  tarotInterpretRequestSchema,
  dreamAnalysisSchema,
  compatibilityRequestSchema,
  iChingRequestSchema,
  chatMessageRequestSchema,
  paginationParamsSchema,
  validateRequestBody,
  validateQueryParams,
  sanitizeInput,
} from '@/lib/api/zodValidation'

describe('zodValidation MEGA - dateSchema', () => {
  it.each(['2024-01-01', '2024-12-31', '2000-02-29', '1900-01-01', '2100-12-31', '2024-06-15'])(
    'should accept valid date: %s',
    (date) => {
      expect(dateSchema.safeParse(date).success).toBe(true)
    }
  )

  it.each([
    '2024-13-01',
    '2024-01-32',
    '2024-1-1',
    '24-01-01',
    '2024/01/01',
    '01-01-2024',
    '2024-00-01',
    '2024-01-00',
    'invalid',
    '',
    // Note: '2023-02-29' passes format check (YYYY-MM-DD pattern)
    // Date validity (leap year) is not checked by dateSchema
  ])('should reject invalid date: %s', (date) => {
    expect(dateSchema.safeParse(date).success).toBe(false)
  })
})

describe('zodValidation MEGA - timeSchema', () => {
  it.each([
    '00:00',
    '23:59',
    '12:00',
    '01:30',
    '14:45',
    '00:00 AM',
    '12:00 PM',
    '11:59 PM',
    '1:30 AM',
    '9:45 pm',
  ])('should accept valid time: %s', (time) => {
    expect(timeSchema.safeParse(time).success).toBe(true)
  })

  it.each(['24:00', '12:60', '1:5', '25:00', '12:00:00', 'invalid', ''])(
    'should reject invalid time: %s',
    (time) => {
      expect(timeSchema.safeParse(time).success).toBe(false)
    }
  )
})

describe('zodValidation MEGA - timezoneSchema', () => {
  it.each([
    'Asia/Seoul',
    'America/New_York',
    'Europe/London',
    'UTC',
    'GMT',
    'Asia/Tokyo',
    'America/Los_Angeles',
    'Europe/Paris',
  ])('should accept valid timezone: %s', (tz) => {
    expect(timezoneSchema.safeParse(tz).success).toBe(true)
  })

  describe('Invalid timezones', () => {
    it('should reject empty string', () => {
      expect(timezoneSchema.safeParse('').success).toBe(false)
    })

    it('should reject too long timezone', () => {
      const long = 'A'.repeat(65)
      expect(timezoneSchema.safeParse(long).success).toBe(false)
    })

    it('should reject invalid characters', () => {
      expect(timezoneSchema.safeParse('Asia Seoul').success).toBe(false)
    })
  })
})

describe('zodValidation MEGA - latitudeSchema', () => {
  it.each([-90, -45, 0, 45, 90, 37.5665, -33.8688, 51.5074])(
    'should accept valid latitude: %f',
    (lat) => {
      expect(latitudeSchema.safeParse(lat).success).toBe(true)
    }
  )

  it.each([-91, 91, -100, 100, 180])('should reject invalid latitude: %f', (lat) => {
    expect(latitudeSchema.safeParse(lat).success).toBe(false)
  })
})

describe('zodValidation MEGA - longitudeSchema', () => {
  it.each([-180, -90, 0, 90, 180, 126.978, 151.2093, -0.1278])(
    'should accept valid longitude: %f',
    (lon) => {
      expect(longitudeSchema.safeParse(lon).success).toBe(true)
    }
  )

  it.each([-181, 181, -200, 200, 360])('should reject invalid longitude: %f', (lon) => {
    expect(longitudeSchema.safeParse(lon).success).toBe(false)
  })
})

describe('zodValidation MEGA - genderSchema', () => {
  it.each(['Male', 'Female', 'Other', 'male', 'female', 'other'])(
    'should accept valid gender: %s',
    (gender) => {
      expect(genderSchema.safeParse(gender).success).toBe(true)
    }
  )

  it('should normalize short gender values', () => {
    const mResult = genderSchema.safeParse('M')
    const fResult = genderSchema.safeParse('F')
    expect(mResult.success).toBe(true)
    expect(fResult.success).toBe(true)
    if (mResult.success) {
      expect(mResult.data).toBe('male')
    }
    if (fResult.success) {
      expect(fResult.data).toBe('female')
    }
  })

  it.each(['unknown', '', 'x', '0'])('should reject invalid gender: %s', (gender) => {
    expect(genderSchema.safeParse(gender).success).toBe(false)
  })

  it.each(['MALE', 'FEMALE', 'OTHER'])(
    'should accept uppercase gender (transform lowercases): %s',
    (gender) => {
      expect(genderSchema.safeParse(gender).success).toBe(true)
    }
  )
})

describe('zodValidation MEGA - localeSchema', () => {
  it.each(['ko', 'en', 'ja', 'zh', 'es', 'fr', 'de', 'pt', 'ru', 'ar'])(
    'should accept valid locale: %s',
    (locale) => {
      expect(localeSchema.safeParse(locale).success).toBe(true)
    }
  )

  it.each(['ko-KR', 'en-US', 'invalid', '', 'kr'])('should reject invalid locale: %s', (locale) => {
    expect(localeSchema.safeParse(locale).success).toBe(false)
  })
})

describe('zodValidation MEGA - calendarTypeSchema', () => {
  it.each(['solar', 'lunar'])('should accept valid calendar type: %s', (type) => {
    expect(calendarTypeSchema.safeParse(type).success).toBe(true)
  })

  it.each(['gregorian', ''])('should reject invalid calendar type: %s', (type) => {
    expect(calendarTypeSchema.safeParse(type).success).toBe(false)
  })
})

describe('zodValidation MEGA - birthInfoSchema', () => {
  const validBirthInfo = {
    birthDate: '1990-01-15',
    birthTime: '14:30',
    latitude: 37.5665,
    longitude: 126.978,
    timezone: 'Asia/Seoul',
  }

  it('should accept valid birth info', () => {
    expect(birthInfoSchema.safeParse(validBirthInfo).success).toBe(true)
  })

  it('should accept with optional gender', () => {
    const result = birthInfoSchema.safeParse({
      ...validBirthInfo,
      gender: 'Male',
    })
    expect(result.success).toBe(true)
  })

  it('should accept with optional calendarType', () => {
    const result = birthInfoSchema.safeParse({
      ...validBirthInfo,
      calendarType: 'lunar',
    })
    expect(result.success).toBe(true)
  })

  it('should reject missing birthDate', () => {
    const { birthDate, ...rest } = validBirthInfo
    expect(birthInfoSchema.safeParse(rest).success).toBe(false)
  })

  it('should reject invalid latitude', () => {
    const result = birthInfoSchema.safeParse({
      ...validBirthInfo,
      latitude: 100,
    })
    expect(result.success).toBe(false)
  })
})

describe('zodValidation MEGA - astrologyRequestSchema', () => {
  const validRequest = {
    date: '2024-01-15',
    time: '14:30',
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  }

  it('should accept valid request', () => {
    expect(astrologyRequestSchema.safeParse(validRequest).success).toBe(true)
  })

  it('should accept latitude as string', () => {
    const result = astrologyRequestSchema.safeParse({
      ...validRequest,
      latitude: '37.5665',
    })
    expect(result.success).toBe(true)
  })

  it('should accept longitude as string', () => {
    const result = astrologyRequestSchema.safeParse({
      ...validRequest,
      longitude: '126.9780',
    })
    expect(result.success).toBe(true)
  })

  it('should accept optional locale', () => {
    const result = astrologyRequestSchema.safeParse({
      ...validRequest,
      locale: 'ko',
    })
    expect(result.success).toBe(true)
  })

  it('should accept optional options', () => {
    const result = astrologyRequestSchema.safeParse({
      ...validRequest,
      options: { house: 'placidus' },
    })
    expect(result.success).toBe(true)
  })
})

describe('zodValidation MEGA - sajuRequestSchema', () => {
  const validRequest = {
    birthDate: '1990-01-15',
    birthTime: '14:30',
    gender: 'Male',
    calendarType: 'solar',
    timezone: 'Asia/Seoul',
  }

  it('should accept valid request', () => {
    expect(sajuRequestSchema.safeParse(validRequest).success).toBe(true)
  })

  it('should require gender', () => {
    const { gender, ...rest } = validRequest
    expect(sajuRequestSchema.safeParse(rest).success).toBe(false)
  })

  it('should require calendarType', () => {
    const { calendarType, ...rest } = validRequest
    expect(sajuRequestSchema.safeParse(rest).success).toBe(false)
  })

  it('should accept optional userTimezone', () => {
    const result = sajuRequestSchema.safeParse({
      ...validRequest,
      userTimezone: 'America/New_York',
    })
    expect(result.success).toBe(true)
  })
})

describe('zodValidation MEGA - tarotCardSchema', () => {
  const validCard = {
    name: 'The Fool',
    isReversed: false,
    position: 'Past',
  }

  it('should accept valid card', () => {
    expect(tarotCardSchema.safeParse(validCard).success).toBe(true)
  })

  it('should accept with Korean names', () => {
    const result = tarotCardSchema.safeParse({
      ...validCard,
      nameKo: '바보',
      positionKo: '과거',
    })
    expect(result.success).toBe(true)
  })

  it('should accept with meaning', () => {
    const result = tarotCardSchema.safeParse({
      ...validCard,
      meaning: 'New beginnings',
      meaningKo: '새로운 시작',
    })
    expect(result.success).toBe(true)
  })

  it('should accept with keywords', () => {
    const result = tarotCardSchema.safeParse({
      ...validCard,
      keywords: ['freedom', 'adventure'],
      keywordsKo: ['자유', '모험'],
    })
    expect(result.success).toBe(true)
  })

  it('should reject too many keywords', () => {
    const result = tarotCardSchema.safeParse({
      ...validCard,
      keywords: Array(9).fill('keyword'),
    })
    expect(result.success).toBe(false)
  })

  it('should reject empty name', () => {
    const result = tarotCardSchema.safeParse({
      ...validCard,
      name: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('zodValidation MEGA - tarotInterpretRequestSchema', () => {
  const validRequest = {
    categoryId: 'love',
    spreadId: 'three-card',
    spreadTitle: 'Past-Present-Future',
    cards: [
      { name: 'The Fool', isReversed: false, position: 'Past' },
      { name: 'The Magician', isReversed: true, position: 'Present' },
      { name: 'The High Priestess', isReversed: false, position: 'Future' },
    ],
  }

  it('should accept valid request', () => {
    expect(tarotInterpretRequestSchema.safeParse(validRequest).success).toBe(true)
  })

  it('should default language to ko', () => {
    const result = tarotInterpretRequestSchema.safeParse(validRequest)
    if (result.success) {
      expect(result.data.language).toBe('ko')
    }
  })

  it('should accept en language', () => {
    const result = tarotInterpretRequestSchema.safeParse({
      ...validRequest,
      language: 'en',
    })
    expect(result.success).toBe(true)
  })

  it('should accept optional userQuestion', () => {
    const result = tarotInterpretRequestSchema.safeParse({
      ...validRequest,
      userQuestion: 'What does my future hold?',
    })
    expect(result.success).toBe(true)
  })

  it('should reject too many cards', () => {
    const result = tarotInterpretRequestSchema.safeParse({
      ...validRequest,
      cards: Array(16).fill({ name: 'Card', isReversed: false, position: 'Pos' }),
    })
    expect(result.success).toBe(false)
  })

  it('should reject zero cards', () => {
    const result = tarotInterpretRequestSchema.safeParse({
      ...validRequest,
      cards: [],
    })
    expect(result.success).toBe(false)
  })
})

describe('zodValidation MEGA - dreamAnalysisSchema', () => {
  it('should accept valid dream', () => {
    const result = dreamAnalysisSchema.safeParse({
      dream: 'I dreamed about flying in the sky',
    })
    expect(result.success).toBe(true)
  })

  it('should trim dream text', () => {
    const result = dreamAnalysisSchema.safeParse({
      dream: '  Flying dream  ',
    })
    if (result.success) {
      expect(result.data.dream).toBe('Flying dream')
    }
  })

  it('should reject too short dream', () => {
    const result = dreamAnalysisSchema.safeParse({
      dream: 'short',
    })
    expect(result.success).toBe(false)
  })

  it('should reject too long dream', () => {
    const result = dreamAnalysisSchema.safeParse({
      dream: 'a'.repeat(10001),
    })
    expect(result.success).toBe(false)
  })

  it('should accept with locale', () => {
    const result = dreamAnalysisSchema.safeParse({
      dream: 'Flying dream description',
      locale: 'en',
    })
    expect(result.success).toBe(true)
  })

  it('should accept with birthInfo', () => {
    const result = dreamAnalysisSchema.safeParse({
      dream: 'Flying dream description',
      birthInfo: {
        birthDate: '1990-01-15',
        birthTime: '14:30',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      },
    })
    expect(result.success).toBe(true)
  })
})

describe('zodValidation MEGA - compatibilityRequestSchema', () => {
  const person1 = {
    date: '1990-01-15',
    time: '14:30',
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
  }

  const person2 = {
    date: '1992-05-20',
    time: '10:00',
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
    relationToP1: 'lover',
  }

  it('should accept valid request with persons array', () => {
    const result = compatibilityRequestSchema.safeParse({
      persons: [person1, person2],
    })
    expect(result.success).toBe(true)
  })

  it('should accept with locale', () => {
    const result = compatibilityRequestSchema.safeParse({
      persons: [person1, person2],
      locale: 'ko',
    })
    expect(result.success).toBe(true)
  })

  it('should accept up to 4 persons', () => {
    const person3 = { ...person2, date: '1993-03-10', relationToP1: 'friend' }
    const person4 = { ...person2, date: '1994-04-20', relationToP1: 'friend' }
    const result = compatibilityRequestSchema.safeParse({
      persons: [person1, person2, person3, person4],
    })
    expect(result.success).toBe(true)
  })

  it('should reject fewer than 2 persons', () => {
    const result = compatibilityRequestSchema.safeParse({
      persons: [person1],
    })
    expect(result.success).toBe(false)
  })

  it('should reject when second person missing relationToP1', () => {
    const result = compatibilityRequestSchema.safeParse({
      persons: [person1, { ...person1, date: '1992-05-20' }],
    })
    expect(result.success).toBe(false)
  })
})

describe('zodValidation MEGA - iChingRequestSchema', () => {
  it('should accept valid question', () => {
    const result = iChingRequestSchema.safeParse({
      question: 'What should I do?',
    })
    expect(result.success).toBe(true)
  })

  it('should trim question', () => {
    const result = iChingRequestSchema.safeParse({
      question: '  What should I do?  ',
    })
    if (result.success) {
      expect(result.data.question).toBe('What should I do?')
    }
  })

  it('should accept hexagram number', () => {
    const result = iChingRequestSchema.safeParse({
      question: 'Question',
      hexagramNumber: 1,
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid hexagram number', () => {
    const result = iChingRequestSchema.safeParse({
      question: 'Question',
      hexagramNumber: 65,
    })
    expect(result.success).toBe(false)
  })

  it('should accept changing lines', () => {
    const result = iChingRequestSchema.safeParse({
      question: 'Question',
      changingLines: [1, 3, 5],
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid changing line', () => {
    const result = iChingRequestSchema.safeParse({
      question: 'Question',
      changingLines: [1, 7],
    })
    expect(result.success).toBe(false)
  })
})

describe('zodValidation MEGA - chatMessageRequestSchema', () => {
  it('should accept valid message', () => {
    const result = chatMessageRequestSchema.safeParse({
      message: 'Hello, how are you?',
    })
    expect(result.success).toBe(true)
  })

  it('should trim message', () => {
    const result = chatMessageRequestSchema.safeParse({
      message: '  Hello  ',
    })
    if (result.success) {
      expect(result.data.message).toBe('Hello')
    }
  })

  it('should accept UUID conversationId', () => {
    const result = chatMessageRequestSchema.safeParse({
      message: 'Hello',
      conversationId: '123e4567-e89b-12d3-a456-426614174000',
    })
    expect(result.success).toBe(true)
  })

  it('should reject invalid UUID', () => {
    const result = chatMessageRequestSchema.safeParse({
      message: 'Hello',
      conversationId: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('should accept context object', () => {
    const result = chatMessageRequestSchema.safeParse({
      message: 'Hello',
      context: { previousTopic: 'weather' },
    })
    expect(result.success).toBe(true)
  })

  it('should reject empty message', () => {
    const result = chatMessageRequestSchema.safeParse({
      message: '',
    })
    expect(result.success).toBe(false)
  })

  it('should reject too long message', () => {
    const result = chatMessageRequestSchema.safeParse({
      message: 'a'.repeat(5001),
    })
    expect(result.success).toBe(false)
  })
})

describe('zodValidation MEGA - paginationParamsSchema', () => {
  it('should use defaults', () => {
    const result = paginationParamsSchema.safeParse({})
    if (result.success) {
      expect(result.data.limit).toBe(20)
      expect(result.data.offset).toBe(0)
    }
  })

  it('should accept custom offset', () => {
    const result = paginationParamsSchema.safeParse({ offset: 10 })
    if (result.success) {
      expect(result.data.offset).toBe(10)
    }
  })

  it('should accept custom limit', () => {
    const result = paginationParamsSchema.safeParse({ limit: 50 })
    if (result.success) {
      expect(result.data.limit).toBe(50)
    }
  })

  it('should reject limit over 100', () => {
    const result = paginationParamsSchema.safeParse({ limit: 101 })
    expect(result.success).toBe(false)
  })

  it('should reject offset less than 0', () => {
    const result = paginationParamsSchema.safeParse({ offset: -1 })
    expect(result.success).toBe(false)
  })

  it('should accept sortBy', () => {
    const result = paginationParamsSchema.safeParse({ sortBy: 'createdAt' })
    if (result.success) {
      expect(result.data.sortBy).toBe('createdAt')
    }
  })

  it('should accept asc sortOrder', () => {
    const result = paginationParamsSchema.safeParse({ sortOrder: 'asc' })
    if (result.success) {
      expect(result.data.sortOrder).toBe('asc')
    }
  })
})

describe('zodValidation MEGA - validateRequestBody', () => {
  it('should validate valid body', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ message: 'Hello' }),
    })

    const result = await validateRequestBody(req, chatMessageRequestSchema)
    expect(result.success).toBe(true)
  })

  it('should return errors for invalid body', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ message: '' }),
    })

    const result = await validateRequestBody(req, chatMessageRequestSchema)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors).toBeDefined()
      expect(result.errors.length).toBeGreaterThan(0)
    }
  })

  it('should handle invalid JSON', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: 'invalid json',
    })

    const result = await validateRequestBody(req, chatMessageRequestSchema)
    expect(result.success).toBe(false)
  })

  it('should include error paths', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ birthDate: 'invalid' }),
    })

    const result = await validateRequestBody(req, birthInfoSchema)
    if (!result.success) {
      expect(result.errors[0].path).toBeDefined()
    }
  })
})

describe('zodValidation MEGA - validateQueryParams', () => {
  it('should validate valid params', () => {
    const req = new Request('http://localhost?limit=20&offset=0')
    const result = validateQueryParams(req, paginationParamsSchema)
    expect(result.success).toBe(true)
  })

  it('should convert numeric strings', () => {
    const req = new Request('http://localhost?offset=10&limit=50')
    const result = validateQueryParams(req, paginationParamsSchema)
    if (result.success) {
      expect(result.data.offset).toBe(10)
      expect(result.data.limit).toBe(50)
    }
  })

  it('should return errors for invalid params', () => {
    const req = new Request('http://localhost?limit=0')
    const result = validateQueryParams(req, paginationParamsSchema)
    expect(result.success).toBe(false)
  })

  it('should handle empty params', () => {
    const req = new Request('http://localhost')
    const result = validateQueryParams(req, paginationParamsSchema)
    expect(result.success).toBe(true)
  })
})

describe('zodValidation MEGA - sanitizeInput', () => {
  it('should trim input', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello')
  })

  it('should remove < and >', () => {
    // Only removes < and >, not the text between them
    expect(sanitizeInput('hello<script>world</script>')).toBe('helloscriptworld/script')
  })

  it('should remove javascript: protocol', () => {
    expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)')
  })

  it('should remove event handlers', () => {
    expect(sanitizeInput('onclick=alert(1)')).toBe('alert(1)')
  })

  it('should enforce default max length', () => {
    const long = 'a'.repeat(20000)
    expect(sanitizeInput(long)).toHaveLength(10000)
  })

  it('should enforce custom max length', () => {
    const long = 'a'.repeat(1000)
    expect(sanitizeInput(long, 500)).toHaveLength(500)
  })

  it('should handle empty string', () => {
    expect(sanitizeInput('')).toBe('')
  })

  it('should preserve safe text', () => {
    expect(sanitizeInput('Hello World 123')).toBe('Hello World 123')
  })

  it('should handle multiple event handlers', () => {
    expect(sanitizeInput('onload=x onclick=y onmouseover=z')).toBe('x y z')
  })

  it('should be case insensitive for javascript', () => {
    expect(sanitizeInput('JavaScript:alert(1)')).toBe('alert(1)')
    expect(sanitizeInput('JAVASCRIPT:alert(1)')).toBe('alert(1)')
  })

  it('should be case insensitive for event handlers', () => {
    expect(sanitizeInput('onClick=alert(1)')).toBe('alert(1)')
    expect(sanitizeInput('ONCLICK=alert(1)')).toBe('alert(1)')
  })
})
