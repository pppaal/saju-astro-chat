const API_BASE = process.env.API_BASE_URL || "http://localhost:3000";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithTimeout = async (
  url: string,
  init?: RequestInit,
  timeoutMs = 8000
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const fetchOrThrow = async (
  url: string,
  init?: RequestInit,
  timeoutMs = 8000
) => {
  try {
    return await fetchWithTimeout(url, init, timeoutMs);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `API_BASE_URL not reachable (${API_BASE}). Start the server before running E2E tests. Error: ${message}`
    );
  }
};

const waitForServer = async () => {
  const start = Date.now();
  const timeoutMs = 20000;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetchWithTimeout(`${API_BASE}/api/auth/session`, undefined, 2000);
      if (res.status < 500) return;
    } catch {
      // ignore until timeout
    }
    await sleep(500);
  }
  throw new Error(
    `API_BASE_URL not ready (${API_BASE}). Wait for the dev server to finish compiling.`
  );
};

export { API_BASE, fetchOrThrow, waitForServer };
