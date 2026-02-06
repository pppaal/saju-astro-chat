/**
 * Astrology Domain Zod Schemas
 * Type-safe validation for all Astrology-related data structures
 */

import { z } from 'zod'

// ============ Core Enums ============

export const zodiacSignSchema = z.enum([
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
])
export type ZodiacSignValidated = z.infer<typeof zodiacSignSchema>

export const zodiacSignKoreanSchema = z.enum([
  '양자리', '황소자리', '쌍둥이자리', '게자리', '사자자리', '처녀자리',
  '천칭자리', '전갈자리', '사수자리', '염소자리', '물병자리', '물고기자리',
])
export type ZodiacSignKoreanValidated = z.infer<typeof zodiacSignKoreanSchema>

export const houseSystemSchema = z.enum(['Placidus', 'WholeSign', 'Koch', 'Equal', 'Campanus'])
export type HouseSystemValidated = z.infer<typeof houseSystemSchema>

export const aspectTypeSchema = z.enum([
  'conjunction', 'sextile', 'square', 'trine', 'opposition',
  'semisextile', 'quincunx', 'quintile', 'biquintile',
])
export type AspectTypeValidated = z.infer<typeof aspectTypeSchema>

export const planetNameSchema = z.enum([
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'Chiron', 'Lilith', 'NorthNode', 'SouthNode',
  'Ascendant', 'Midheaven', 'IC', 'Descendant',
])
export type PlanetNameValidated = z.infer<typeof planetNameSchema>

export const astroElementSchema = z.enum(['fire', 'earth', 'air', 'water'])
export type AstroElementValidated = z.infer<typeof astroElementSchema>

export const modalitySchema = z.enum(['cardinal', 'fixed', 'mutable'])
export type ModalityValidated = z.infer<typeof modalitySchema>

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
})
export type PlanetBaseValidated = z.infer<typeof planetBaseSchema>

export const houseSchema = z.object({
  index: z.number().int().min(1).max(12),
  cusp: z.number().min(0).max(360),
  sign: zodiacSignSchema,
  formatted: z.string().max(50),
})
export type HouseValidated = z.infer<typeof houseSchema>

export const chartMetaSchema = z.object({
  jdUT: z.number(),
  isoUTC: z.string().max(50),
  timeZone: z.string().max(64),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  houseSystem: houseSystemSchema,
})
export type ChartMetaValidated = z.infer<typeof chartMetaSchema>

// ============ Aspect Structures ============

export const aspectEndSchema = z.object({
  name: z.string().min(1).max(50),
  kind: z.enum(['natal', 'transit', 'progressed', 'angle']),
  house: z.number().int().min(1).max(12).optional(),
  sign: zodiacSignSchema.optional(),
  longitude: z.number().min(0).max(360),
})
export type AspectEndValidated = z.infer<typeof aspectEndSchema>

export const aspectHitSchema = z.object({
  from: aspectEndSchema,
  to: aspectEndSchema,
  type: aspectTypeSchema,
  orb: z.number().min(0).max(15),
  applying: z.boolean().optional(),
  score: z.number().min(0).max(100).optional(),
})
export type AspectHitValidated = z.infer<typeof aspectHitSchema>

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
})
export type ExtraPointValidated = z.infer<typeof extraPointSchema>

// ============ Chart Structures ============

export const chartSchema = z.object({
  planets: z.array(planetBaseSchema),
  ascendant: planetBaseSchema,
  mc: planetBaseSchema,
  houses: z.array(houseSchema),
  meta: chartMetaSchema.optional(),
})
export type ChartValidated = z.infer<typeof chartSchema>

export const extendedChartSchema = chartSchema.extend({
  chiron: extraPointSchema.optional(),
  lilith: extraPointSchema.optional(),
  trueNode: extraPointSchema.optional(),
  partOfFortune: extraPointSchema.optional(),
  vertex: extraPointSchema.optional(),
})
export type ExtendedChartValidated = z.infer<typeof extendedChartSchema>

export const progressedChartSchema = chartSchema.extend({
  progressionType: z.enum(['secondary', 'solarArc']),
  yearsProgressed: z.number().min(0).max(150),
  progressedDate: z.string().max(50),
})
export type ProgressedChartValidated = z.infer<typeof progressedChartSchema>

export const returnChartSchema = chartSchema.extend({
  returnType: z.enum(['solar', 'lunar']),
  returnYear: z.number().int().min(1900).max(2200),
  returnMonth: z.number().int().min(1).max(12).optional(),
  exactReturnTime: z.string().max(50),
})
export type ReturnChartValidated = z.infer<typeof returnChartSchema>

// ============ Natal Input ============

export const natalInputSchema = z.object({
  year: z.number().int().min(1900).max(2200),
  month: z.number().int().min(1).max(12),
  date: z.number().int().min(1).max(31),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timeZone: z.string().min(1).max(64),
})
export type NatalInputValidated = z.infer<typeof natalInputSchema>

// ============ Planet Position Records ============

export const planetHousesSchema = z.record(
  z.string().max(30),
  z.number().int().min(1).max(12)
)
export type PlanetHousesValidated = z.infer<typeof planetHousesSchema>

export const planetSignsSchema = z.record(
  z.string().max(30),
  zodiacSignSchema
)
export type PlanetSignsValidated = z.infer<typeof planetSignsSchema>

export const planetLongitudesSchema = z.record(
  z.string().max(30),
  z.number().min(0).max(360)
)
export type PlanetLongitudesValidated = z.infer<typeof planetLongitudesSchema>

// ============ Element Ratios ============

export const astroElementRatiosSchema = z.object({
  fire: z.number().min(0).max(100),
  earth: z.number().min(0).max(100),
  air: z.number().min(0).max(100),
  water: z.number().min(0).max(100),
})
export type AstroElementRatiosValidated = z.infer<typeof astroElementRatiosSchema>

export const modalityRatiosSchema = z.object({
  cardinal: z.number().min(0).max(100),
  fixed: z.number().min(0).max(100),
  mutable: z.number().min(0).max(100),
})
export type ModalityRatiosValidated = z.infer<typeof modalityRatiosSchema>

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
export type TransitAspectValidated = z.infer<typeof transitAspectSchema>

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
export type AstrologyChartFactsValidated = z.infer<typeof astrologyChartFactsSchema>

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
export type AstrologyDataValidated = z.infer<typeof astrologyDataSchema>

// ============ Chat Context Schema ============

export const astroChatContextSchema = z.object({
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
export type AstroChatContextValidated = z.infer<typeof astroChatContextSchema>

// ============ Synastry (Compatibility) Schemas ============

export const synastryAspectSchema = z.object({
  person1Planet: z.string().max(30),
  person2Planet: z.string().max(30),
  aspectType: aspectTypeSchema,
  orb: z.number().min(0).max(15),
  influence: z.enum(['harmonious', 'challenging', 'neutral']),
  description: z.string().max(1000).optional(),
})
export type SynastryAspectValidated = z.infer<typeof synastryAspectSchema>

export const synastryResultSchema = z.object({
  aspects: z.array(synastryAspectSchema),
  overallScore: z.number().min(0).max(100),
  strengths: z.array(z.string().max(500)),
  challenges: z.array(z.string().max(500)),
  summary: z.string().max(3000),
})
export type SynastryResultValidated = z.infer<typeof synastryResultSchema>

// ============ Composite Chart Schema ============

export const compositeChartSchema = z.object({
  compositePlanets: z.array(planetBaseSchema),
  compositeHouses: z.array(houseSchema),
  compositeAscendant: planetBaseSchema.optional(),
  compositeMC: planetBaseSchema.optional(),
  relationshipThemes: z.array(z.string().max(200)).optional(),
})
export type CompositeChartValidated = z.infer<typeof compositeChartSchema>
