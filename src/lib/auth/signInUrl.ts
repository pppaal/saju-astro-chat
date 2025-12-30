export const DEFAULT_SIGNIN_PATH = "/auth/signin";
const AUTH_REFRESH_PARAM = "authRefresh";

function appendAuthRefresh(callbackUrl: string) {
  const isAbsolute = /^https?:\/\//i.test(callbackUrl);
  try {
    const parsed = new URL(callbackUrl, isAbsolute ? undefined : "http://localhost");
    if (!parsed.searchParams.has(AUTH_REFRESH_PARAM)) {
      parsed.searchParams.set(AUTH_REFRESH_PARAM, "1");
    }
    if (isAbsolute) return parsed.toString();
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return callbackUrl;
  }
}

export function buildSignInUrl(callbackUrl?: string) {
  let target = callbackUrl;
  if (!target && typeof window !== "undefined") {
    target = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }
  if (!target) return DEFAULT_SIGNIN_PATH;
  const normalized = appendAuthRefresh(target);
  return `${DEFAULT_SIGNIN_PATH}?callbackUrl=${encodeURIComponent(normalized)}`;
}
