/**
 * Centralized API client for frontend-to-backend communication
 * Provides consistent error handling, retries, and type safety
 */

import type { ApiResponse, BackendHealthResponse } from "@/types";

// ==========================================
// Configuration
// ==========================================

const BACKEND_URL =
  process.env.NEXT_PUBLIC_AI_BACKEND || "http://localhost:5000";
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

// ==========================================
// Case Conversion Utilities
// ==========================================

type CaseConverter = (obj: unknown) => unknown;

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const snakeToCamel = (str: string): string =>
  str.replace(/_([a-z])/g, (_, char) => char.toUpperCase());

const camelToSnake = (str: string): string =>
  str.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`);

const convertKeys = (obj: unknown, converter: (key: string) => string): unknown => {
  if (Array.isArray(obj)) {
    return obj.map((item) => convertKeys(item, converter));
  }
  if (isObject(obj)) {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        converter(key),
        convertKeys(value, converter),
      ])
    );
  }
  return obj;
};

export const toSnakeCase: CaseConverter = (obj) => convertKeys(obj, camelToSnake);
export const toCamelCase: CaseConverter = (obj) => convertKeys(obj, snakeToCamel);

// ==========================================
// Error Classes
// ==========================================

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export class NetworkError extends ApiClientError {
  constructor(message: string, cause?: Error) {
    super(message, "NETWORK_ERROR", 0, { cause: cause?.message });
    this.name = "NetworkError";
  }
}

export class TimeoutError extends ApiClientError {
  constructor(timeout: number) {
    super(`Request timed out after ${timeout}ms`, "TIMEOUT", 0);
    this.name = "TimeoutError";
  }
}

// ==========================================
// Request Options
// ==========================================

interface RequestOptions {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  convertCase?: boolean;
}

// ==========================================
// API Client Class
// ==========================================

class BackendClient {
  private baseUrl: string;

  constructor(baseUrl: string = BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make a GET request to the backend
   */
  async get<T>(
    path: string,
    params?: Record<string, string>,
    options?: RequestOptions
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    return this.request<T>("GET", url.toString(), undefined, options);
  }

  /**
   * Make a POST request to the backend
   */
  async post<T>(
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const url = new URL(path, this.baseUrl).toString();
    return this.request<T>("POST", url, body, options);
  }

  /**
   * Internal request method with retries and error handling
   */
  private async request<T>(
    method: string,
    url: string,
    body?: unknown,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      timeout = DEFAULT_TIMEOUT,
      retries = MAX_RETRIES,
      headers = {},
      convertCase = true,
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const requestBody = body
          ? JSON.stringify(convertCase ? toSnakeCase(body) : body)
          : undefined;

        const response = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...headers,
          },
          body: requestBody,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new ApiClientError(
            errorBody.message || `HTTP ${response.status}`,
            errorBody.code || "HTTP_ERROR",
            response.status,
            errorBody
          );
        }

        const data = await response.json();
        return (convertCase ? toCamelCase(data) : data) as T;
      } catch (error) {
        if (error instanceof ApiClientError) {
          throw error;
        }

        if (error instanceof Error) {
          if (error.name === "AbortError") {
            throw new TimeoutError(timeout);
          }
          lastError = error;
        }

        // Retry on network errors
        if (attempt < retries) {
          await this.delay(RETRY_DELAY * (attempt + 1));
          continue;
        }
      }
    }

    throw new NetworkError(
      lastError?.message || "Network request failed",
      lastError ?? undefined
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ==========================================
  // Typed API Methods
  // ==========================================

  /**
   * Check backend health status
   */
  async checkHealth(): Promise<BackendHealthResponse> {
    return this.get<BackendHealthResponse>("/");
  }

  /**
   * Get backend capabilities
   */
  async getCapabilities(): Promise<BackendHealthResponse> {
    return this.get<BackendHealthResponse>("/capabilities");
  }

  /**
   * Interpret destiny/fusion data
   */
  async interpretDestiny(data: {
    saju?: Record<string, unknown>;
    astro?: Record<string, unknown>;
    tarot?: Record<string, unknown>;
    theme?: string;
    locale?: string;
    prompt?: string;
  }): Promise<ApiResponse> {
    return this.post<ApiResponse>("/ask", data);
  }

  /**
   * Calculate Saju data
   */
  async calculateSaju(data: {
    birthDate: string;
    birthTime: string;
    gender?: string;
  }): Promise<ApiResponse> {
    return this.post<ApiResponse>("/calc_saju", {
      birth_date: data.birthDate,
      birth_time: data.birthTime,
      gender: data.gender || "male",
    });
  }

  /**
   * Calculate astrology data
   */
  async calculateAstrology(data: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    latitude: number;
    longitude: number;
  }): Promise<ApiResponse> {
    return this.post<ApiResponse>("/calc_astro", data);
  }

  /**
   * Interpret a dream
   */
  async interpretDream(data: {
    dream: string;
    symbols?: string[];
    emotions?: string[];
    themes?: string[];
    locale?: string;
    birth?: Record<string, unknown>;
  }): Promise<ApiResponse> {
    return this.post<ApiResponse>("/dream", data);
  }

  /**
   * Interpret tarot cards
   */
  async interpretTarot(data: {
    category?: string;
    spreadId?: string;
    spreadTitle?: string;
    cards: Array<{ name: string; isReversed: boolean; position?: string }>;
    userQuestion?: string;
    language?: string;
    birthdate?: string;
    sajuContext?: Record<string, unknown>;
    astroContext?: Record<string, unknown>;
  }): Promise<ApiResponse> {
    return this.post<ApiResponse>("/api/tarot/interpret", {
      category: data.category || "general",
      spread_id: data.spreadId || "three_card",
      spread_title: data.spreadTitle,
      cards: data.cards.map((c) => ({
        name: c.name,
        is_reversed: c.isReversed,
        position: c.position,
      })),
      user_question: data.userQuestion,
      language: data.language || "ko",
      birthdate: data.birthdate,
      saju_context: data.sajuContext,
      astro_context: data.astroContext,
    });
  }

  /**
   * Perform I Ching reading
   */
  async performIChingReading(data: {
    question?: string;
    theme?: string;
    locale?: string;
    sajuElement?: string;
    birth?: Record<string, unknown>;
  }): Promise<ApiResponse> {
    return this.post<ApiResponse>("/iching/reading", data);
  }

  /**
   * Get current transits
   */
  async getCurrentTransits(locale?: string): Promise<ApiResponse> {
    return this.get<ApiResponse>("/transits", locale ? { locale } : undefined);
  }

  /**
   * Get performance stats
   */
  async getPerformanceStats(): Promise<ApiResponse> {
    return this.get<ApiResponse>("/performance/stats");
  }

  /**
   * Record RLHF feedback
   */
  async recordFeedback(data: {
    recordId: string;
    userId?: string;
    rating: number;
    feedback?: string;
    theme?: string;
    locale?: string;
  }): Promise<ApiResponse> {
    return this.post<ApiResponse>("/rlhf/feedback", {
      record_id: data.recordId,
      user_id: data.userId,
      rating: data.rating,
      feedback: data.feedback,
      theme: data.theme,
      locale: data.locale || "ko",
    });
  }
}

// ==========================================
// Singleton Export
// ==========================================

export const backendClient = new BackendClient();

// Export class for custom instances
export { BackendClient };
