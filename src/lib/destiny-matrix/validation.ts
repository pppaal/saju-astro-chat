// src/lib/destiny-matrix/validation.ts
// Destiny Fusion Matrix™ - Input Validation with Zod
// 견고한 입력 검증 시스템

import { z } from 'zod';

// ===========================
// 기본 타입 스키마
// ===========================

export const FiveElementSchema = z.enum(['목', '화', '토', '금', '수']);

export const SibsinKindSchema = z.enum([
  '비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'
]);

export const TwelveStageSchema = z.enum([
  '장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'
]);

export const PlanetNameSchema = z.enum([
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'
]);

export const HouseNumberSchema = z.union([
  z.literal(1), z.literal(2), z.literal(3), z.literal(4),
  z.literal(5), z.literal(6), z.literal(7), z.literal(8),
  z.literal(9), z.literal(10), z.literal(11), z.literal(12)
]);

export const WesternElementSchema = z.enum(['fire', 'earth', 'air', 'water']);

export const GeokgukTypeSchema = z.enum([
  // 정격
  'jeonggwan', 'pyeongwan', 'jeongin', 'pyeongin',
  'siksin', 'sanggwan', 'jeongjae', 'pyeonjae',
  // 특수격
  'geonrok', 'yangin',
  // 종격
  'jonga', 'jongjae', 'jongsal', 'jonggang',
  // 외격
  'gokjik', 'yeomsang', 'gasaek', 'jonghyeok', 'yunha'
]);

export const TransitCycleSchema = z.enum([
  'saturnReturn', 'jupiterReturn', 'uranusSquare',
  'neptuneSquare', 'plutoTransit', 'nodeReturn', 'eclipse',
  'mercuryRetrograde', 'venusRetrograde', 'marsRetrograde',
  'jupiterRetrograde', 'saturnRetrograde'
]);

export const ShinsalKindSchema = z.enum([
  // 길신
  '천을귀인', '태극귀인', '천덕귀인', '월덕귀인', '문창귀인', '학당귀인',
  '금여록', '천주귀인', '암록', '건록', '제왕',
  // 흉신
  '도화', '홍염살', '양인', '백호', '겁살', '재살', '천살', '지살', '년살',
  '월살', '망신', '고신', '괴강', '현침', '귀문관',
  // 특수
  '역마', '화개', '장성', '반안', '천라지망', '공망', '삼재', '원진'
]);

export const AsteroidNameSchema = z.enum(['Ceres', 'Pallas', 'Juno', 'Vesta']);

export const ExtraPointNameSchema = z.enum([
  'Chiron', 'Lilith', 'PartOfFortune', 'Vertex', 'NorthNode', 'SouthNode'
]);

export const ZodiacSignSchema = z.enum([
  '양자리', '황소자리', '쌍둥이자리', '게자리', '사자자리', '처녀자리',
  '천칭자리', '전갈자리', '사수자리', '염소자리', '물병자리', '물고기자리'
]);

export const AspectTypeSchema = z.enum([
  'conjunction', 'opposition', 'trine', 'square', 'sextile',
  'quincunx', 'semisextile', 'semisquare', 'sesquiquadrate'
]);

export const InsightDomainSchema = z.enum([
  'personality', 'career', 'relationship', 'wealth', 'health', 'spirituality', 'timing'
]);

export const LangSchema = z.enum(['ko', 'en']);

// ===========================
// 복합 타입 스키마
// ===========================

export const RelationHitSchema = z.object({
  kind: z.enum([
    '천간합', '천간충',
    '지지육합', '지지삼합', '지지방합',
    '지지충', '지지형', '지지파', '지지해', '원진',
    '공망'
  ]),
  pillars: z.array(z.string()).optional().default([]),
  detail: z.string().optional(),
  note: z.string().optional(),
});

export const AspectSchema = z.object({
  planet1: PlanetNameSchema,
  planet2: PlanetNameSchema,
  type: AspectTypeSchema,
});

// ===========================
// 메인 입력 스키마
// ===========================

export const MatrixCalculationInputSchema = z.object({
  // 필수: 일간 오행
  dayMasterElement: FiveElementSchema,

  // 사주 데이터 (선택)
  pillarElements: z.array(FiveElementSchema).optional().default([]),
  sibsinDistribution: z.record(SibsinKindSchema, z.number()).optional().default({}),
  twelveStages: z.record(TwelveStageSchema, z.number()).optional().default({}),
  relations: z.array(RelationHitSchema).optional().default([]),
  geokguk: GeokgukTypeSchema.optional(),
  yongsin: FiveElementSchema.optional(),
  currentDaeunElement: FiveElementSchema.optional(),
  currentSaeunElement: FiveElementSchema.optional(),

  // 신살 데이터
  shinsalList: z.array(ShinsalKindSchema).optional().default([]),

  // 점성 데이터
  dominantWesternElement: WesternElementSchema.optional(),
  planetHouses: z.record(PlanetNameSchema, HouseNumberSchema).optional().default({}),
  planetSigns: z.record(PlanetNameSchema, ZodiacSignSchema).optional().default({}),
  aspects: z.array(AspectSchema).optional().default([]),
  activeTransits: z.array(TransitCycleSchema).optional().default([]),

  // 소행성/엑스트라포인트
  asteroidHouses: z.record(AsteroidNameSchema, HouseNumberSchema).optional().default({}),
  extraPointSigns: z.record(ExtraPointNameSchema, ZodiacSignSchema).optional().default({}),

  // 옵션
  lang: LangSchema.optional().default('ko'),
});

// ===========================
// 리포트 API 입력 스키마
// ===========================

export const ReportRequestSchema = MatrixCalculationInputSchema.extend({
  queryDomain: InsightDomainSchema.optional(),
  maxInsights: z.number().min(1).max(20).optional().default(5),
  includeVisualizations: z.boolean().optional().default(true),
  includeDetailedData: z.boolean().optional().default(false),
});

// ===========================
// 타입 추출
// ===========================

export type ValidatedMatrixInput = z.infer<typeof MatrixCalculationInputSchema>;
export type ValidatedReportRequest = z.infer<typeof ReportRequestSchema>;

// ===========================
// 검증 함수
// ===========================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * 매트릭스 입력 검증
 */
export function validateMatrixInput(input: unknown): ValidationResult<ValidatedMatrixInput> {
  try {
    const result = MatrixCalculationInputSchema.safeParse(input);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errors: ValidationError[] = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));

    return { success: false, errors };
  } catch (error) {
    return {
      success: false,
      errors: [{ field: 'unknown', message: (error as Error).message, code: 'VALIDATION_ERROR' }],
    };
  }
}

/**
 * 리포트 요청 검증
 */
export function validateReportRequest(input: unknown): ValidationResult<ValidatedReportRequest> {
  try {
    const result = ReportRequestSchema.safeParse(input);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errors: ValidationError[] = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));

    return { success: false, errors };
  } catch (error) {
    return {
      success: false,
      errors: [{ field: 'unknown', message: (error as Error).message, code: 'VALIDATION_ERROR' }],
    };
  }
}

/**
 * 빠른 필수 필드 검증
 */
export function quickValidate(input: unknown): { valid: boolean; message?: string } {
  if (!input || typeof input !== 'object') {
    return { valid: false, message: '입력 데이터가 객체 형식이어야 합니다.' };
  }

  const obj = input as Record<string, unknown>;

  if (!obj.dayMasterElement) {
    return { valid: false, message: 'dayMasterElement (일간 오행)은 필수입니다.' };
  }

  const validElements = ['목', '화', '토', '금', '수'];
  if (!validElements.includes(obj.dayMasterElement as string)) {
    return { valid: false, message: `dayMasterElement는 ${validElements.join(', ')} 중 하나여야 합니다.` };
  }

  return { valid: true };
}
