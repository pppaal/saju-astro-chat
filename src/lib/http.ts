import { NextResponse } from "next/server";

/**
 * Enforce a maximum request body size based on the Content-Length header.
 * Returns a 413 response when the declared length exceeds the limit.
 * Note: if Content-Length is absent, the check is skipped.
 */
export function enforceBodySize(
  req: Request,
  maxBytes = 256 * 1024,
  passthroughHeaders?: HeadersInit
) {
  const lenHeader = req.headers.get("content-length");
  if (!lenHeader) return null;

  const len = Number(lenHeader);
  if (!Number.isFinite(len)) return null;
  if (len < 0) return null; // Negative values should be ignored
  if (len <= maxBytes) return null;

  const res = NextResponse.json(
    { error: "payload_too_large", limit: maxBytes },
    { status: 413 }
  );

  if (passthroughHeaders) {
    new Headers(passthroughHeaders).forEach((v, k) => res.headers.set(k, v));
  }
  return res;
}
