/**
 * AI Backend URL 선택 유틸리티
 * 35개 이상의 API route에서 중복되어 있던 로직을 통합
 */

export function getBackendUrl(): string {
  const url =
    process.env.AI_BACKEND_URL ||
    process.env.BACKEND_AI_URL ||
    process.env.NEXT_PUBLIC_AI_BACKEND ||
    "http://localhost:5000";

  // Production 환경에서 HTTP 사용 경고
  if (!url.startsWith("https://") && process.env.NODE_ENV === "production") {
    console.warn("[Backend] Using non-HTTPS AI backend in production");
  }

  // NEXT_PUBLIC_* 환경 변수는 클라이언트에 노출되므로 보안 경고
  if (process.env.BACKEND_AI_URL && !process.env.AI_BACKEND_URL) {
    console.warn("[Backend] BACKEND_AI_URL is deprecated; use AI_BACKEND_URL");
  }
  if (
    process.env.NEXT_PUBLIC_AI_BACKEND &&
    !process.env.AI_BACKEND_URL &&
    !process.env.BACKEND_AI_URL
  ) {
    console.warn(
      "[Backend] NEXT_PUBLIC_AI_BACKEND is public; prefer AI_BACKEND_URL for security"
    );
  }

  return url;
}

/**
 * Legacy alias for backward compatibility
 * @deprecated Use getBackendUrl() instead
 */
export const pickBackendUrl = getBackendUrl;

export function getPublicBackendUrl(): string {
  return process.env.NEXT_PUBLIC_AI_BACKEND || "http://localhost:5000";
}
