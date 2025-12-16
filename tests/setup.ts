/// <reference types="vitest/globals" />
/**
 * Vitest setup file
 * This file is automatically loaded before all tests
 */

import { vi } from "vitest";

// Mock environment variables for testing
process.env.NODE_ENV = "test";
process.env.NEXTAUTH_SECRET = "test-secret-at-least-32-characters-long";
process.env.NEXT_PUBLIC_BASE_URL = "http://localhost:3000";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.ADMIN_API_TOKEN = "test-admin-token";
process.env.CRON_SECRET = "test-cron-secret";
process.env.METRICS_TOKEN = "test-metrics-token";
process.env.NEXT_PUBLIC_AI_BACKEND = "http://localhost:5000";

// Mock fetch globally
global.fetch = vi.fn();

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
  vi.restoreAllMocks();
});

// Global test utilities
export const mockFetch = (response: unknown, status = 200) => {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => response,
    text: async () => JSON.stringify(response),
  });
};

export const mockFetchError = (error: Error) => {
  (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);
};

// Console spy helpers
export const suppressConsoleErrors = () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
};

// Date mock helper
export const mockDate = (date: Date | string) => {
  const mockDate = new Date(date);
  vi.setSystemTime(mockDate);
  return mockDate;
};

// Wait helper for async operations
export const waitFor = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
