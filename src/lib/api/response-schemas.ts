/**
 * API Response Schemas with Zod
 * Defines strict schema validation for all API responses
 * This ensures any changes to response structures are immediately caught at compile and runtime
 */

import { z } from "zod";

// ==========================================
// Core Response Schemas
// ==========================================

/**
 * Standard success response schema
 * All successful API responses MUST follow this structure
 */
export const SuccessResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: z
      .object({
        timestamp: z.string().datetime().optional(),
        requestId: z.string().optional(),
      })
      .passthrough()
      .optional(),
  });

/**
 * Standard error response schema
 * All error responses MUST follow this structure
 */
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    status: z.number().int().min(400).max(599),
    details: z.unknown().optional(), // Only included in development
  }),
});

/**
 * Generic API response that can be success or error
 */
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.union([SuccessResponseSchema(dataSchema), ErrorResponseSchema]);

// ==========================================
// Credit & Premium Response Schemas
// ==========================================

/**
 * Credit information included in responses
 */
export const CreditInfoSchema = z.object({
  remaining: z.number().int().min(0),
  type: z.enum(["reading", "compatibility", "followUp"]).optional(),
  consumed: z.number().int().min(0).optional(),
  limit: z.number().int().min(0).optional(),
  resetDate: z.string().datetime().optional(),
});

export type CreditInfo = z.infer<typeof CreditInfoSchema>;

/**
 * Credit error response (402 Payment Required)
 * Used when user runs out of credits
 */
export const CreditErrorResponseSchema = z.object({
  error: z.string(),
  code: z.enum([
    "no_credits",
    "compatibility_limit",
    "followup_limit",
    "not_authenticated",
  ]),
  remaining: z.number().int().min(0),
  upgradeUrl: z.string().default("/pricing"),
});

export type CreditErrorResponse = z.infer<typeof CreditErrorResponseSchema>;

/**
 * Premium tier information
 */
export const PremiumTierSchema = z.enum([
  "free",
  "basic",
  "premium",
  "enterprise",
]);

export type PremiumTier = z.infer<typeof PremiumTierSchema>;

/**
 * User plan information included in context-aware responses
 */
export const UserPlanInfoSchema = z.object({
  tier: PremiumTierSchema,
  isPremium: z.boolean(),
  credits: CreditInfoSchema.optional(),
  features: z.array(z.string()).optional(),
  trialEndsAt: z.string().datetime().optional(),
});

export type UserPlanInfo = z.infer<typeof UserPlanInfoSchema>;

// ==========================================
// Rate Limit Response Schemas
// ==========================================

/**
 * Rate limit error response (429 Too Many Requests)
 */
export const RateLimitErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.literal("RATE_LIMITED"),
    message: z.string(),
    status: z.literal(429),
  }),
});

/**
 * Rate limit headers that MUST be included in 429 responses
 */
export const RateLimitHeadersSchema = z.object({
  "Retry-After": z.string(),
  "X-RateLimit-Limit": z.string(),
  "X-RateLimit-Remaining": z.literal("0"),
});

export type RateLimitHeaders = z.infer<typeof RateLimitHeadersSchema>;

// ==========================================
// Service-Specific Response Schemas
// ==========================================

/**
 * Dream analysis response schema
 */
export const DreamAnalysisResponseSchema = SuccessResponseSchema(
  z.object({
    analysis: z.string(),
    symbols: z.array(
      z.object({
        symbol: z.string(),
        meaning: z.string(),
        significance: z.enum(["high", "medium", "low"]),
      })
    ),
    emotions: z.array(z.string()),
    recommendations: z.array(z.string()),
    saved: z.boolean().optional(),
    fromFallback: z.boolean().optional(),
  })
);

export type DreamAnalysisResponse = z.infer<typeof DreamAnalysisResponseSchema>;

/**
 * Tarot reading response schema
 */
export const TarotReadingResponseSchema = SuccessResponseSchema(
  z.object({
    interpretation: z.string(),
    cards: z.array(
      z.object({
        name: z.string(),
        position: z.string().optional(),
        isReversed: z.boolean(),
        meaning: z.string(),
      })
    ),
    overall: z.string(),
    advice: z.string().optional(),
    saved: z.boolean().optional(),
  })
);

export type TarotReadingResponse = z.infer<typeof TarotReadingResponseSchema>;

/**
 * Destiny map response schema
 */
export const DestinyMapResponseSchema = SuccessResponseSchema(
  z.object({
    analysis: z.string(),
    theme: z.string(),
    birthData: z.object({
      date: z.string(),
      time: z.string(),
      location: z.object({
        latitude: z.number(),
        longitude: z.number(),
      }),
    }),
    insights: z.array(
      z.object({
        category: z.string(),
        content: z.string(),
        strength: z.enum(["strong", "moderate", "weak"]).optional(),
      })
    ),
    saved: z.boolean().optional(),
  })
);

export type DestinyMapResponse = z.infer<typeof DestinyMapResponseSchema>;

/**
 * Compatibility analysis response schema
 */
export const CompatibilityResponseSchema = SuccessResponseSchema(
  z.object({
    score: z.number().min(0).max(100),
    analysis: z.string(),
    strengths: z.array(z.string()),
    challenges: z.array(z.string()),
    advice: z.string(),
    categories: z
      .array(
        z.object({
          name: z.string(),
          score: z.number().min(0).max(100),
          description: z.string(),
        })
      )
      .optional(),
    saved: z.boolean().optional(),
  })
);

export type CompatibilityResponse = z.infer<typeof CompatibilityResponseSchema>;

// ==========================================
// Stream Response Schemas
// ==========================================

/**
 * Server-Sent Events (SSE) data schema
 * For streaming responses
 */
export const SSEDataSchema = z.object({
  event: z.enum(["message", "error", "done", "chunk"]).default("message"),
  data: z.string(),
  id: z.string().optional(),
  retry: z.number().optional(),
});

export type SSEData = z.infer<typeof SSEDataSchema>;

/**
 * Streaming error in SSE format
 */
export const SSEErrorSchema = z.object({
  event: z.literal("error"),
  data: z.string(), // JSON stringified error
});

// ==========================================
// Validation Response Schemas
// ==========================================

/**
 * Validation error response (422 Unprocessable Entity)
 */
export const ValidationErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.literal("VALIDATION_ERROR"),
    message: z.string(),
    status: z.literal(422),
    details: z
      .object({
        field: z.string(),
        issue: z.string(),
        expected: z.string().optional(),
        received: z.string().optional(),
      })
      .optional(),
  }),
});

export type ValidationErrorResponse = z.infer<typeof ValidationErrorResponseSchema>;

// ==========================================
// Authentication Response Schemas
// ==========================================

/**
 * Unauthorized response (401)
 */
export const UnauthorizedResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.literal("UNAUTHORIZED"),
    message: z.string(),
    status: z.literal(401),
  }),
});

/**
 * Forbidden response (403)
 */
export const ForbiddenResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.literal("FORBIDDEN"),
    message: z.string(),
    status: z.literal(403),
  }),
});

// ==========================================
// Helper Functions
// ==========================================

/**
 * Validate and parse a success response
 * Throws if response doesn't match schema
 */
export function validateSuccessResponse<T extends z.ZodType>(
  dataSchema: T,
  response: unknown
): z.infer<ReturnType<typeof SuccessResponseSchema<T>>> {
  return SuccessResponseSchema(dataSchema).parse(response);
}

/**
 * Validate and parse an error response
 * Throws if response doesn't match schema
 */
export function validateErrorResponse(response: unknown): z.infer<typeof ErrorResponseSchema> {
  return ErrorResponseSchema.parse(response);
}

/**
 * Safe validation that returns null on failure
 */
export function safeValidateResponse<T extends z.ZodType>(
  schema: T,
  response: unknown
): z.infer<T> | null {
  const result = schema.safeParse(response);
  return result.success ? result.data : null;
}

/**
 * Create a type-safe success response
 * Guarantees response matches schema at runtime
 */
export function createValidatedSuccessResponse<T>(
  dataSchema: z.ZodType<T>,
  data: T,
  meta?: Record<string, unknown>
) {
  const response = {
    success: true as const,
    data,
    meta,
  };

  // Validate before returning
  return SuccessResponseSchema(dataSchema).parse(response);
}

/**
 * Create a type-safe error response
 * Guarantees response matches schema at runtime
 */
export function createValidatedErrorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown
) {
  const response = {
    success: false as const,
    error: {
      code,
      message,
      status,
      details: process.env.NODE_ENV === "development" ? details : undefined,
    },
  };

  // Validate before returning
  return ErrorResponseSchema.parse(response);
}

// ==========================================
// Response Type Guards
// ==========================================

/**
 * Type guard to check if response is successful
 */
export function isSuccessResponse(response: unknown): response is { success: true; data: unknown } {
  return (
    typeof response === "object" &&
    response !== null &&
    "success" in response &&
    response.success === true &&
    "data" in response
  );
}

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse(response: unknown): response is { success: false; error: object } {
  return (
    typeof response === "object" &&
    response !== null &&
    "success" in response &&
    response.success === false &&
    "error" in response
  );
}

/**
 * Type guard for credit error response
 */
export function isCreditError(response: unknown): response is CreditErrorResponse {
  const result = CreditErrorResponseSchema.safeParse(response);
  return result.success;
}

// ==========================================
// Export All Schemas
// ==========================================

export const ResponseSchemas = {
  Success: SuccessResponseSchema,
  Error: ErrorResponseSchema,
  ApiResponse: ApiResponseSchema,
  CreditError: CreditErrorResponseSchema,
  RateLimitError: RateLimitErrorResponseSchema,
  ValidationError: ValidationErrorResponseSchema,
  Unauthorized: UnauthorizedResponseSchema,
  Forbidden: ForbiddenResponseSchema,
  DreamAnalysis: DreamAnalysisResponseSchema,
  TarotReading: TarotReadingResponseSchema,
  DestinyMap: DestinyMapResponseSchema,
  Compatibility: CompatibilityResponseSchema,
} as const;
