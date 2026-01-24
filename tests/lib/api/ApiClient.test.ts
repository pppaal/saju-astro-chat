/**
 * ApiClient Tests
 * Tests for unified API client with timeout and error handling
 */

import { vi } from "vitest";
import { ApiClient, apiFetch, createApiClient } from "@/lib/api/ApiClient";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock backend-url
vi.mock("@/lib/backend-url", () => ({
  getBackendUrl: vi.fn(() => "http://test-backend.com"),
}));

describe("ApiClient", () => {
  let client: ApiClient;
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    process.env.ADMIN_API_TOKEN = "test-admin-token";
    client = new ApiClient("http://test-api.com", 5000);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("constructor", () => {
    it("creates client with custom base URL", () => {
      const customClient = new ApiClient("http://custom.com");
      expect(customClient).toBeInstanceOf(ApiClient);
    });

    it("creates client with default timeout", () => {
      const defaultClient = new ApiClient("http://test.com");
      expect(defaultClient).toBeInstanceOf(ApiClient);
    });
  });

  describe("post", () => {
    it("makes POST request with correct headers", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
        headers: new Headers(),
      });

      const result = await client.post("/test", { data: "test" });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://test-api.com/test",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-API-KEY": "test-admin-token",
          }),
          body: JSON.stringify({ data: "test" }),
        })
      );
      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ success: true });
    });

    it("returns error response for non-ok status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers(),
      });

      const result = await client.post("/test", {});

      expect(result.ok).toBe(false);
      expect(result.status).toBe(404);
      expect(result.error).toBe("HTTP 404");
    });

    it("handles network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await client.post("/test", {});

      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error).toBe("Network error");
    });

    it("handles timeout (AbortError)", async () => {
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValueOnce(abortError);

      const result = await client.post("/test", {});

      expect(result.ok).toBe(false);
      expect(result.status).toBe(408);
      expect(result.error).toBe("Request timeout");
    });

    it("uses custom timeout from options", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
        headers: new Headers(),
      });

      await client.post("/test", {}, { timeout: 1000 });

      expect(mockFetch).toHaveBeenCalled();
    });

    it("excludes API token when includeApiToken is false", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
        headers: new Headers(),
      });

      await client.post("/test", {}, { includeApiToken: false });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            "X-API-KEY": expect.any(String),
          }),
        })
      );
    });

    it("includes custom headers", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
        headers: new Headers(),
      });

      await client.post("/test", {}, { headers: { "Custom-Header": "value" } });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Custom-Header": "value",
          }),
        })
      );
    });
  });

  describe("get", () => {
    it("makes GET request with correct headers", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: "result" }),
        headers: new Headers(),
      });

      const result = await client.get("/test");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://test-api.com/test",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
      expect(result.ok).toBe(true);
      expect(result.data).toEqual({ data: "result" });
    });

    it("returns error response for non-ok status", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        headers: new Headers(),
      });

      const result = await client.get("/test");

      expect(result.ok).toBe(false);
      expect(result.status).toBe(500);
    });

    it("handles timeout", async () => {
      const abortError = new Error("Aborted");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValueOnce(abortError);

      const result = await client.get("/test");

      expect(result.ok).toBe(false);
      expect(result.status).toBe(408);
    });
  });

  describe("postStream", () => {
    it("returns Response for streaming", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        body: new ReadableStream(),
      };
      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await client.postStream("/stream", { query: "test" });

      expect(result).toBe(mockResponse);
    });

    it("throws error on failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Stream error"));

      await expect(client.postStream("/stream", {})).rejects.toThrow("Stream error");
    });
  });
});

describe("apiFetch", () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("adds X-API-Token for internal API calls", async () => {
    process.env.NEXT_PUBLIC_API_TOKEN = "public-token";
    mockFetch.mockResolvedValueOnce({ ok: true });

    await apiFetch("/api/test", {});

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-API-Token": "public-token",
        }),
      })
    );
  });

  it("does not add token for external URLs", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await apiFetch("https://external.com/api", {});

    expect(mockFetch).toHaveBeenCalledWith(
      "https://external.com/api",
      expect.objectContaining({
        headers: expect.not.objectContaining({
          "X-API-Token": expect.any(String),
        }),
      })
    );
  });

  it("preserves custom headers", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await apiFetch("/api/test", {
      headers: { "Custom-Header": "custom-value" },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Custom-Header": "custom-value",
        }),
      })
    );
  });
});

describe("createApiClient", () => {
  it("creates new ApiClient instance", () => {
    const client = createApiClient("http://custom.com", 10000);
    expect(client).toBeInstanceOf(ApiClient);
  });

  it("creates client with defaults", () => {
    const client = createApiClient();
    expect(client).toBeInstanceOf(ApiClient);
  });
});

describe("ApiResponse types", () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
    process.env.ADMIN_API_TOKEN = "test-token";
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns typed data", async () => {
    interface TestResponse {
      id: number;
      name: string;
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 1, name: "test" }),
      headers: new Headers(),
    });

    const client = new ApiClient("http://test.com");
    const result = await client.get<TestResponse>("/test");

    expect(result.ok).toBe(true);
    expect(result.data?.id).toBe(1);
    expect(result.data?.name).toBe("test");
  });
});
