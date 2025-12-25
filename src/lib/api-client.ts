/**
 * API Client utility with automatic X-API-Token header injection
 */

export interface ApiFetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
}

/**
 * Wrapper around fetch that automatically includes the X-API-Token header
 * for authenticated API requests
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
