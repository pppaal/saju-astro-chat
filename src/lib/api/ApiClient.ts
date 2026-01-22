// src/lib/api/ApiClient.ts
// Unified API client for backend calls with timeout and error handling

import { getBackendUrl } from "@/lib/backend-url";
import { logger } from "@/lib/logger";

// ==========================================
// Simple fetch wrapper for internal API calls
// ==========================================

export interface ApiFetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
}

/**
 * Wrapper around fetch that automatically includes the X-API-Token header
 * for authenticated API requests to Next.js internal routes
 */
export async function apiFetch(url: string, options?: ApiFetchOptions): Promise<Response> {
  const headers: Record<string, string> = {
    ...options?.headers,
  };

  // Add X-API-Token header for internal API calls
  if (url.startsWith('/api/')) {
    const token = process.env.NEXT_PUBLIC_API_TOKEN;
    if (token) {
      headers['X-API-Token'] = token;
    }
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

// ==========================================
// Backend API Client
// ==========================================

export interface ApiClientOptions {
  /** Request timeout in milliseconds (default: 60000) */
  timeout?: number;
  /** Custom headers */
  headers?: Record<string, string>;
  /** Include API token from env */
  includeApiToken?: boolean;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  headers?: Headers;
}

/**
 * Unified API client for backend requests
 * Handles: timeout, AbortController, auth headers, error handling
 */
export class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private apiToken?: string;

  constructor(baseUrl?: string, defaultTimeout = 60000) {
    this.baseUrl = baseUrl || getBackendUrl();
    this.defaultTimeout = defaultTimeout;
    this.apiToken = process.env.ADMIN_API_TOKEN;
  }

  /**
   * Build headers with optional API token
   */
  private buildHeaders(
    options: ApiClientOptions = {},
    contentType = "application/json"
  ): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      ...options.headers,
    };

    // Add Authorization header (preferred) or X-API-KEY fallback
    if (options.includeApiToken !== false && this.apiToken) {
      headers["Authorization"] = `Bearer ${this.apiToken}`;
      headers["X-API-KEY"] = this.apiToken; // Fallback for legacy endpoints
    }

    return headers;
  }

  /**
   * POST request with automatic timeout and error handling
   */
  async post<T = unknown>(
    path: string,
    body: unknown,
    options: ApiClientOptions = {}
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeout = options.timeout ?? this.defaultTimeout;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: this.buildHeaders(options),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          error: `HTTP ${response.status}`,
          headers: response.headers,
        };
      }

      const data = await response.json();
      return {
        ok: true,
        status: response.status,
        data: data as T,
        headers: response.headers,
      };
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === "AbortError") {
        return {
          ok: false,
          status: 408,
          error: "Request timeout",
        };
      }

      return {
        ok: false,
        status: 500,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * GET request with automatic timeout
   */
  async get<T = unknown>(
    path: string,
    options: ApiClientOptions = {}
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeout = options.timeout ?? this.defaultTimeout;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "GET",
        headers: this.buildHeaders(options),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          error: `HTTP ${response.status}`,
          headers: response.headers,
        };
      }

      const data = await response.json();
      return {
        ok: true,
        status: response.status,
        data: data as T,
        headers: response.headers,
      };
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof Error && err.name === "AbortError") {
        return {
          ok: false,
          status: 408,
          error: "Request timeout",
        };
      }

      return {
        ok: false,
        status: 500,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }

  /**
   * POST request returning raw Response for streaming
   * Use this for SSE streams or other streaming responses
   */
  async postStream(
    path: string,
    body: unknown,
    options: ApiClientOptions = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = options.timeout ?? this.defaultTimeout;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "POST",
        headers: this.buildHeaders(options),
        body: JSON.stringify(body),
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      logger.error("[ApiClient] Stream request failed:", err);
      throw err; // Throw instead of returning null for better error handling
    }
  }

  /**
   * POST request for SSE streaming with validation
   * Automatically checks if response is SSE and handles errors
   */
  async postSSEStream(
    path: string,
    body: unknown,
    options: ApiClientOptions = {}
  ): Promise<{ ok: true; response: Response } | { ok: false; error: string; status: number }> {
    try {
      const response = await this.postStream(path, body, options);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        return {
          ok: false,
          error: errorText,
          status: response.status,
        };
      }

      // Validate SSE response
      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("text/event-stream")) {
        return {
          ok: false,
          error: "Response is not SSE stream",
          status: response.status,
        };
      }

      return { ok: true, response };
    } catch (err) {
      logger.error("[ApiClient] SSE stream error:", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Stream request failed",
        status: 500,
      };
    }
  }
}

// Singleton instance for convenience
export const apiClient = new ApiClient();

// Factory function for custom instances
export function createApiClient(baseUrl?: string, timeout?: number): ApiClient {
  return new ApiClient(baseUrl, timeout);
}
