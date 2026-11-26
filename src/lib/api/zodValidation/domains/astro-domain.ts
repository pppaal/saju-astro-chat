/**
 * Astrology Domain Zod Schemas
 * Type-safe validation for all Astrology-related data structures
 */

import { z } from 'zod'
import { latitudeSchema, longitudeSchema, timezoneSchema } from '../common'

// ============ Core Enums ============

export const zodiacSignSchema = z.enum([
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
])

export const zodiacSignKoreanSchema = z.enum([
  '양자리',
  '황소자리',
  '쌍둥이자리',
  '게자리',
  '사자자리',
  '처녀자리',
  '천칭자리',
  '전갈자리',
  '사수자리',
  '염소자리',
  '물병자리',
  '물고기자리',
])

export const houseSystemSchema = z.enum(['Placidus', 'WholeSign', 'Koch', 'Equal', 'Campanus'])

export const aspectTypeSchema = z.enum([
  'conjunction',
  'sextile',
  'square',
  'trine',
  'opposition',
  'semisextile',
  'quincunx',
  'quintile',
  'biquintile',
  'sesquiquadrate',
])

export const planetNameSchema = z.enum([
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
  'Chiron',
  'Lilith',
  'NorthNode',
  'SouthNode',
  'Ascendant',
  'Midheaven',
  'IC',
  'Descendant',
])

export const astroElementSchema = z.enum(['fire', 'earth', 'air', 'water'])

export const modalitySchema = z.enum(['cardinal', 'fixed', 'mutable'])

// ============ Core Data Structures ============

export const planetBaseSchema = z.object({
  name: z.string().min(1).max(50),
  longitude: z.number().min(0).max(360),
  sign: zodiacSignSchema,
  degree: z.number().int().min(0).max(29),
  minute: z.number().int().min(0).max(59),
  formatted: z.string().max(50),
  house: z.number().int().min(1).max(12),
  speed: z.number().optional(),
  retrograde: z.boolean().optional(),
  graphId: z.string().max(40).optional(),
})

export const houseSchema = z.object({
  index: z.number().int().min(1).max(12),
  cusp: z.number().min(0).max(360),
  sign: zodiacSignSchema,
  formatted: z.string().max(50),
  graphId: z.string().max(40).optional(),
})

export const chartMetaSchema = z.object({
  jdUT: z.number(),
  isoUTC: z.string().max(50),
  timeZone: z.string().max(64),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  houseSystem: houseSystemSchema,
})

// ============ Aspect Structures ============

export const aspectEndSchema = z.object({
  name: z.string().min(1).max(50),
  kind: z.enum(['natal', 'transit', 'progressed', 'angle']),
  house: z.number().int().min(1).max(12).optional(),
  sign: zodiacSignSchema.optional(),
  longitude: z.number().min(0).max(360),
})

export const aspectHitSchema = z.object({
  from: aspectEndSchema,
  to: aspectEndSchema,
  type: aspectTypeSchema,
  orb: z.number().min(0).max(15),
  applying: z.boolean().optional(),
  score: z.number().min(0).max(100).optional(),
})

// ============ Extra Points ============

export const extraPointSchema = z.object({
  name: z.string().min(1).max(50),
  longitude: z.number().min(0).max(360),
  sign: zodiacSignSchema,
  degree: z.number().int().min(0).max(29),
  minute: z.number().int().min(0).max(59),
  formatted: z.string().max(50),
  house: z.number().int().min(1).max(12),
  description: z.string().max(500).optional(),
  graphId: z.string().max(40).optional(),
})

// ============ Chart Structures ============

export const chartSchema = z.object({
  planets: z.array(planetBaseSchema),
  ascendant: planetBaseSchema,
  mc: planetBaseSchema,
  houses: z.array(houseSchema),
  meta: chartMetaSchema.optional(),
})

export const extendedChartSchema = chartSchema.extend({
  chiron: extraPointSchema.optional(),
  lilith: extraPointSchema.optional(),
  trueNode: extraPointSchema.optional(),
  partOfFortune: extraPointSchema.optional(),
  vertex: extraPointSchema.optional(),
})

export const progressedChartSchema = chartSchema.extend({
  progressionType: z.enum(['secondary', 'solarArc']),
  yearsProgressed: z.number().min(0).max(150),
  progressedDate: z.string().max(50),
})

export const returnChartSchema = chartSchema.extend({
  returnType: z.enum(['solar', 'lunar']),
  returnYear: z.number().int().min(1900).max(2200),
  returnMonth: z.number().int().min(1).max(12).optional(),
  exactReturnTime: z.string().max(50),
})

// ============ Natal Input ============

export const natalInputSchema = z.object({
  year: z.number().int().min(1900).max(2200),
  month: z.number().int().min(1).max(12),
  date: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  // IANA 검증 — 예전엔 z.string().min(1) 이라 'garbage' 같은 가짜 시간대도 통과했다.
  // birth-input 검증 경계를 saju 와 공유하는 canonical primitive 로 통일.
  timeZone: timezoneSchema,
})

// ============ Planet Position Records ============

export const planetHousesSchema = z.record(z.string().max(30), z.number().int().min(1).max(12))

export const planetSignsSchema = z.record(z.string().max(30), zodiacSignSchema)

export const planetLongitudesSchema = z.record(z.string().max(30), z.number().min(0).max(360))

// ============ Element Ratios ============

export const astroElementRatiosSchema = z.object({
  fire: z.number().min(0).max(100),
  earth: z.number().min(0).max(100),
  air: z.number().min(0).max(100),
  water: z.number().min(0).max(100),
})

export const modalityRatiosSchema = z.object({
  cardinal: z.number().min(0).max(100),
  fixed: z.number().min(0).max(100),
  mutable: z.number().min(0).max(100),
})

// ============ Transit Aspects ============

export const transitAspectSchema = z.object({
  transitPlanet: z.string().max(30),
  natalPlanet: z.string().max(30),
  aspectType: aspectTypeSchema,
  orb: z.number().min(0).max(15),
  applying: z.boolean().optional(),
  exactDate: z.string().max(30).optional(),
  significance: z.enum(['major', 'minor', 'background']).optional(),
})

// ============ Astrology Facts (Summary) ============

export const astrologyChartFactsSchema = z.object({
  sun: planetBaseSchema,
  moon: planetBaseSchema,
  mercury: planetBaseSchema.optional(),
  venus: planetBaseSchema.optional(),
  mars: planetBaseSchema.optional(),
  jupiter: planetBaseSchema.optional(),
  saturn: planetBaseSchema.optional(),
  uranus: planetBaseSchema.optional(),
  neptune: planetBaseSchema.optional(),
  pluto: planetBaseSchema.optional(),
  asc: planetBaseSchema.optional(),
  chiron: extraPointSchema.optional(),
  lilith: extraPointSchema.optional(),
  partOfFortune: extraPointSchema.optional(),
  vertex: extraPointSchema.optional(),
  aspects: z.record(z.string(), aspectHitSchema).optional(),
  elementRatios: astroElementRatiosSchema.optional(),
})

// ============ Full Astrology Data Schema ============

export const astrologyDataSchema = z.object({
  facts: astrologyChartFactsSchema.optional(),
  planets: z.array(planetBaseSchema),
  houses: z.array(houseSchema),
  ascendant: planetBaseSchema,
  mc: planetBaseSchema,
  aspects: z.array(aspectHitSchema),
  meta: chartMetaSchema.optional(),
  transits: z.array(transitAspectSchema).optional(),
})

// ============ Chat Context Schema ============

export const astroChatContextSchema = z
  .object({
    sunSign: zodiacSignSchema.optional(),
    moonSign: zodiacSignSchema.optional(),
    ascendant: zodiacSignSchema.optional(),
    sunLongitude: z.number().min(0).max(360).optional(),
    moonLongitude: z.number().min(0).max(360).optional(),
    dominantElement: astroElementSchema.optional(),
    planetHouses: planetHousesSchema.optional(),
    planetSigns: planetSignsSchema.optional(),
    activeTransits: z.array(transitAspectSchema).optional(),
  })
  .passthrough()

// ============ Synastry (Compatibility) Schemas ============

export const synastryAspectSchema = z.object({
  person1Planet: z.string().max(30),
  person2Planet: z.string().max(30),
  aspectType: aspectTypeSchema,
  orb: z.number().min(0).max(15),
  influence: z.enum(['harmonious', 'challenging', 'neutral']),
  description: z.string().max(1000).optional(),
})

export const synastryResultSchema = z.object({
  aspects: z.array(synastryAspectSchema),
  overallScore: z.number().min(0).max(100),
  strengths: z.array(z.string().max(500)),
  challenges: z.array(z.string().max(500)),
  summary: z.string().max(3000),
})

// ============ Composite Chart Schema ============

export const compositeChartSchema = z.object({
  compositePlanets: z.array(planetBaseSchema),
  compositeHouses: z.array(houseSchema),
  compositeAscendant: planetBaseSchema.optional(),
  compositeMC: planetBaseSchema.optional(),
  relationshipThemes: z.array(z.string().max(200)).optional(),
})
