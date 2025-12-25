// src/lib/security/DataRedactor.ts
// Unified data masking and privacy utilities

import crypto from "crypto";

/**
 * DataRedactor - Centralized data masking for privacy
 *
 * Consolidates: maskDisplayName, maskTextWithName, maskPayload, hashName
 */
export class DataRedactor {
  /**
   * Escape special regex characters
   */
  private static escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Hash name for cache keys (privacy-preserving)
   * @example hashName("홍길동") → "a1b2c3d4e5f6"
   */
  static hashName(name?: string): string {
    if (!name) return "anon";
    return crypto.createHash("sha256").update(name).digest("hex").slice(0, 12);
  }

  /**
   * Mask display name for privacy
   * @example maskDisplayName("홍길동") → "홍***"
   */
  static maskDisplayName(name?: string): string | undefined {
    if (!name) return undefined;
    const first = name.trim().slice(0, 1) || "";
    return `${first}***`;
  }

  /**
   * Mask all occurrences of name in text
   * @example maskTextWithName("홍길동님 안녕", "홍길동") → "***님 안녕"
   */
  static maskTextWithName(text: string, name?: string): string {
    if (!text || !name) return text;
    try {
      return text.replace(new RegExp(this.escapeRegExp(name), "g"), "***");
    } catch {
      return text;
    }
  }

  /**
   * Mask email address for logs
   * @example maskEmail("user@example.com") → "us***@***"
   */
  static maskEmail(email?: string): string {
    if (!email) return "***@***";
    const [local] = email.split("@");
    return `${local?.slice(0, 2) ?? "**"}***@***`;
  }

  /**
   * Mask sensitive payload fields for logging
   */
  static maskPayload(body: unknown): Record<string, unknown> {
    if (!body || typeof body !== "object") {
      return { _masked: true };
    }

    const payload = body as Record<string, unknown>;
    const result: Record<string, unknown> = { ...payload };

    // Mask name
    if (typeof payload.name === "string") {
      result.name = this.maskDisplayName(payload.name);
    }

    // Mask birthDate
    if (typeof payload.birthDate === "string") {
      result.birthDate = "****-**-**";
    }

    // Mask birthTime
    if (typeof payload.birthTime === "string") {
      result.birthTime = "**:**";
    }

    // Mask email
    if (typeof payload.email === "string") {
      result.email = this.maskEmail(payload.email);
    }

    // Truncate coordinates to 3 decimal places (privacy)
    if (typeof payload.latitude === "number" || typeof payload.latitude === "string") {
      const lat = Number(payload.latitude);
      result.latitude = Number.isFinite(lat) ? lat.toFixed(3) : undefined;
    }
    if (typeof payload.longitude === "number" || typeof payload.longitude === "string") {
      const lon = Number(payload.longitude);
      result.longitude = Number.isFinite(lon) ? lon.toFixed(3) : undefined;
    }

    return result;
  }

  /**
   * Mask input object for astrology engine logging
   */
  static maskAstrologyInput(input: {
    name?: string;
    birthDate?: string;
    birthTime?: string;
    latitude?: number;
    longitude?: number;
    [key: string]: unknown;
  }): Record<string, unknown> {
    return {
      name: input.name ? `${input.name[0] ?? ""}***` : undefined,
      birthDate: input.birthDate ? "****-**-**" : undefined,
      birthTime: input.birthTime ? "**:**" : undefined,
      latitude: input.latitude?.toFixed(2),
      longitude: input.longitude?.toFixed(2),
    };
  }
}

// Convenience function exports (wrapper to avoid `this` binding issues)
export function hashName(name?: string): string {
  return DataRedactor.hashName(name);
}

export function maskDisplayName(name?: string): string | undefined {
  return DataRedactor.maskDisplayName(name);
}

export function maskTextWithName(text: string, name?: string): string {
  return DataRedactor.maskTextWithName(text, name);
}

export function maskEmail(email?: string): string {
  return DataRedactor.maskEmail(email);
}

export function maskPayload(body: unknown): Record<string, unknown> {
  return DataRedactor.maskPayload(body);
}

export function maskAstrologyInput(input: {
  name?: string;
  birthDate?: string;
  birthTime?: string;
  latitude?: number;
  longitude?: number;
  [key: string]: unknown;
}): Record<string, unknown> {
  return DataRedactor.maskAstrologyInput(input);
}
