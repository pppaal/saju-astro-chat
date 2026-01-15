/**
 * 인증 관련 테스트
 * - 세션 검증 로직
 * - 토큰 검증
 * - 권한 체크
 * - API 보호 로직
 */

import { vi } from "vitest";

describe("Authentication: Session Validation", () => {
  interface Session {
    user?: {
      id: string;
      email?: string;
      name?: string;
    };
    expires: string;
  }

  const isValidSession = (session: Session | null): boolean => {
    if (!session) return false;
    if (!session.user?.id) return false;

    // Check if session is expired
    const expiresAt = new Date(session.expires);
    if (isNaN(expiresAt.getTime())) return false;
    if (new Date() > expiresAt) return false;

    return true;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("validates valid session", () => {
    const session: Session = {
      user: { id: "user_123", email: "user@example.com" },
      expires: "2024-07-15T12:00:00Z",
    };
    expect(isValidSession(session)).toBe(true);
  });

  it("rejects null session", () => {
    expect(isValidSession(null)).toBe(false);
  });

  it("rejects session without user", () => {
    const session: Session = {
      expires: "2024-07-15T12:00:00Z",
    };
    expect(isValidSession(session)).toBe(false);
  });

  it("rejects session without user ID", () => {
    const session: Session = {
      user: { id: "", email: "user@example.com" },
      expires: "2024-07-15T12:00:00Z",
    };
    expect(isValidSession(session)).toBe(false);
  });

  it("rejects expired session", () => {
    const session: Session = {
      user: { id: "user_123" },
      expires: "2024-06-01T12:00:00Z", // Past date
    };
    expect(isValidSession(session)).toBe(false);
  });

  it("rejects session with invalid expires date", () => {
    const session: Session = {
      user: { id: "user_123" },
      expires: "invalid-date",
    };
    expect(isValidSession(session)).toBe(false);
  });
});

describe("Authentication: Token Validation", () => {
  const validateToken = (
    expected: string | undefined,
    received: string | null,
    isProduction: boolean
  ): { valid: boolean; error?: string } => {
    // Production requires token to be set
    if (!expected) {
      if (isProduction) {
        return { valid: false, error: "token_not_configured" };
      }
      // Dev mode: allow all if token not configured
      return { valid: true };
    }

    if (!received) {
      return { valid: false, error: "missing_token" };
    }

    // Constant-time comparison (simplified for test)
    if (received !== expected) {
      return { valid: false, error: "invalid_token" };
    }

    return { valid: true };
  };

  it("validates correct token", () => {
    const result = validateToken("secret-123", "secret-123", true);
    expect(result.valid).toBe(true);
  });

  it("rejects incorrect token", () => {
    const result = validateToken("secret-123", "wrong-token", true);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("invalid_token");
  });

  it("rejects missing token when expected", () => {
    const result = validateToken("secret-123", null, true);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("missing_token");
  });

  it("allows missing token in dev when not configured", () => {
    const result = validateToken(undefined, null, false);
    expect(result.valid).toBe(true);
  });

  it("blocks in production when token not configured", () => {
    const result = validateToken(undefined, null, true);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("token_not_configured");
  });
});

describe("Authentication: API Key Extraction", () => {
  const extractApiKey = (authHeader: string | null): string | null => {
    if (!authHeader) return null;

    // Bearer token
    if (authHeader.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }

    // Basic auth (extract password as API key)
    if (authHeader.startsWith("Basic ")) {
      try {
        const decoded = Buffer.from(authHeader.slice(6), "base64").toString();
        const [, password] = decoded.split(":");
        return password || null;
      } catch {
        return null;
      }
    }

    return null;
  };

  it("extracts Bearer token", () => {
    const key = extractApiKey("Bearer sk-1234567890");
    expect(key).toBe("sk-1234567890");
  });

  it("extracts API key from Basic auth", () => {
    // user:api_key in base64
    const encoded = Buffer.from("user:api_key_123").toString("base64");
    const key = extractApiKey(`Basic ${encoded}`);
    expect(key).toBe("api_key_123");
  });

  it("returns null for missing header", () => {
    expect(extractApiKey(null)).toBeNull();
  });

  it("returns null for invalid format", () => {
    expect(extractApiKey("InvalidFormat")).toBeNull();
    expect(extractApiKey("Token abc123")).toBeNull();
  });

  it("handles empty Bearer token", () => {
    expect(extractApiKey("Bearer ")).toBe("");
  });
});

describe("Authentication: Role-Based Access", () => {
  type Role = "admin" | "premium" | "user" | "guest";

  interface User {
    id: string;
    role: Role;
  }

  const ROLE_HIERARCHY: Record<Role, number> = {
    admin: 100,
    premium: 50,
    user: 10,
    guest: 0,
  };

  const hasRequiredRole = (user: User | null, requiredRole: Role): boolean => {
    if (!user) return false;
    const userLevel = ROLE_HIERARCHY[user.role] ?? 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 0;
    return userLevel >= requiredLevel;
  };

  const canAccessResource = (
    user: User | null,
    resourceOwnerId: string,
    minRole: Role = "user"
  ): boolean => {
    if (!user) return false;

    // Admin can access anything
    if (user.role === "admin") return true;

    // Owner can access their own resources
    if (user.id === resourceOwnerId) return true;

    // Check minimum role requirement
    return hasRequiredRole(user, minRole);
  };

  it("admin has access to all roles", () => {
    const admin: User = { id: "1", role: "admin" };
    expect(hasRequiredRole(admin, "admin")).toBe(true);
    expect(hasRequiredRole(admin, "premium")).toBe(true);
    expect(hasRequiredRole(admin, "user")).toBe(true);
    expect(hasRequiredRole(admin, "guest")).toBe(true);
  });

  it("premium user has access to premium and below", () => {
    const premium: User = { id: "2", role: "premium" };
    expect(hasRequiredRole(premium, "admin")).toBe(false);
    expect(hasRequiredRole(premium, "premium")).toBe(true);
    expect(hasRequiredRole(premium, "user")).toBe(true);
  });

  it("guest has minimal access", () => {
    const guest: User = { id: "3", role: "guest" };
    expect(hasRequiredRole(guest, "user")).toBe(false);
    expect(hasRequiredRole(guest, "guest")).toBe(true);
  });

  it("null user has no access", () => {
    expect(hasRequiredRole(null, "guest")).toBe(false);
  });

  it("admin can access any resource", () => {
    const admin: User = { id: "admin_1", role: "admin" };
    expect(canAccessResource(admin, "other_user")).toBe(true);
  });

  it("user can access their own resources", () => {
    const user: User = { id: "user_123", role: "user" };
    expect(canAccessResource(user, "user_123")).toBe(true);
    // User without admin role and not resource owner should be checked against minRole
    // Default minRole is "user", and user role meets "user" requirement
    expect(canAccessResource(user, "other_user", "user")).toBe(true);
    // But if premium is required, user cannot access
    expect(canAccessResource(user, "other_user", "premium")).toBe(false);
  });
});

describe("Authentication: Password Validation", () => {
  interface PasswordValidation {
    valid: boolean;
    errors: string[];
  }

  const validatePassword = (password: string): PasswordValidation => {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("min_length");
    }

    if (password.length > 128) {
      errors.push("max_length");
    }

    if (!/[a-z]/.test(password)) {
      errors.push("lowercase_required");
    }

    if (!/[A-Z]/.test(password)) {
      errors.push("uppercase_required");
    }

    if (!/[0-9]/.test(password)) {
      errors.push("number_required");
    }

    // Check for common passwords
    const commonPasswords = [
      "password",
      "12345678",
      "qwerty123",
      "abc12345",
    ];
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push("too_common");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  };

  it("validates strong password", () => {
    const result = validatePassword("SecurePass123!");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects short password", () => {
    const result = validatePassword("Ab1");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("min_length");
  });

  it("requires lowercase letter", () => {
    const result = validatePassword("UPPERCASE123");
    expect(result.errors).toContain("lowercase_required");
  });

  it("requires uppercase letter", () => {
    const result = validatePassword("lowercase123");
    expect(result.errors).toContain("uppercase_required");
  });

  it("requires number", () => {
    const result = validatePassword("NoNumbersHere");
    expect(result.errors).toContain("number_required");
  });

  it("rejects common passwords", () => {
    const result = validatePassword("Password");
    expect(result.errors).toContain("too_common");
  });

  it("rejects very long passwords", () => {
    const result = validatePassword("A".repeat(129) + "a1");
    expect(result.errors).toContain("max_length");
  });
});

describe("Authentication: Email Validation", () => {
  const validateEmail = (email: string): { valid: boolean; error?: string } => {
    if (!email) {
      return { valid: false, error: "empty" };
    }

    // Basic email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: "invalid_format" };
    }

    // Check for disposable email domains
    const disposableDomains = [
      "tempmail.com",
      "throwaway.com",
      "guerrillamail.com",
    ];
    const domain = email.split("@")[1]?.toLowerCase();
    if (domain && disposableDomains.includes(domain)) {
      return { valid: false, error: "disposable_email" };
    }

    return { valid: true };
  };

  it("validates correct email", () => {
    expect(validateEmail("user@example.com").valid).toBe(true);
  });

  it("validates email with subdomain", () => {
    expect(validateEmail("user@mail.example.com").valid).toBe(true);
  });

  it("rejects empty email", () => {
    const result = validateEmail("");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("empty");
  });

  it("rejects invalid format", () => {
    expect(validateEmail("notanemail").error).toBe("invalid_format");
    expect(validateEmail("user@").error).toBe("invalid_format");
    expect(validateEmail("@example.com").error).toBe("invalid_format");
  });

  it("rejects disposable emails", () => {
    const result = validateEmail("user@tempmail.com");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("disposable_email");
  });
});

describe("Authentication: Rate Limiting for Auth", () => {
  interface AuthAttempt {
    ip: string;
    email: string;
    timestamp: number;
    success: boolean;
  }

  const shouldBlockAttempt = (
    attempts: AuthAttempt[],
    newAttemptIp: string,
    newAttemptEmail: string,
    windowMs: number = 15 * 60 * 1000, // 15 minutes
    maxFailedAttempts: number = 5
  ): { blocked: boolean; reason?: string; retryAfter?: number } => {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Filter to recent attempts
    const recentAttempts = attempts.filter((a) => a.timestamp > windowStart);

    // Check IP-based blocking
    const ipAttempts = recentAttempts.filter(
      (a) => a.ip === newAttemptIp && !a.success
    );
    if (ipAttempts.length >= maxFailedAttempts) {
      const oldestAttempt = Math.min(...ipAttempts.map((a) => a.timestamp));
      const retryAfter = Math.ceil((oldestAttempt + windowMs - now) / 1000);
      return { blocked: true, reason: "ip_blocked", retryAfter };
    }

    // Check email-based blocking
    const emailAttempts = recentAttempts.filter(
      (a) => a.email === newAttemptEmail && !a.success
    );
    if (emailAttempts.length >= maxFailedAttempts) {
      const oldestAttempt = Math.min(...emailAttempts.map((a) => a.timestamp));
      const retryAfter = Math.ceil((oldestAttempt + windowMs - now) / 1000);
      return { blocked: true, reason: "email_blocked", retryAfter };
    }

    return { blocked: false };
  };

  it("allows first attempt", () => {
    const result = shouldBlockAttempt([], "192.168.1.1", "user@example.com");
    expect(result.blocked).toBe(false);
  });

  it("allows attempts under threshold", () => {
    const attempts: AuthAttempt[] = Array(4)
      .fill(null)
      .map((_, i) => ({
        ip: "192.168.1.1",
        email: "user@example.com",
        timestamp: Date.now() - i * 1000,
        success: false,
      }));

    const result = shouldBlockAttempt(attempts, "192.168.1.1", "user@example.com");
    expect(result.blocked).toBe(false);
  });

  it("blocks after too many failed IP attempts", () => {
    const attempts: AuthAttempt[] = Array(5)
      .fill(null)
      .map((_, i) => ({
        ip: "192.168.1.1",
        email: `user${i}@example.com`,
        timestamp: Date.now() - i * 1000,
        success: false,
      }));

    const result = shouldBlockAttempt(attempts, "192.168.1.1", "new@example.com");
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe("ip_blocked");
  });

  it("blocks after too many failed email attempts", () => {
    const attempts: AuthAttempt[] = Array(5)
      .fill(null)
      .map((_, i) => ({
        ip: `192.168.1.${i}`,
        email: "target@example.com",
        timestamp: Date.now() - i * 1000,
        success: false,
      }));

    const result = shouldBlockAttempt(attempts, "10.0.0.1", "target@example.com");
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe("email_blocked");
  });

  it("allows successful attempts to not count", () => {
    const attempts: AuthAttempt[] = Array(5)
      .fill(null)
      .map((_, i) => ({
        ip: "192.168.1.1",
        email: "user@example.com",
        timestamp: Date.now() - i * 1000,
        success: true, // All successful
      }));

    const result = shouldBlockAttempt(attempts, "192.168.1.1", "user@example.com");
    expect(result.blocked).toBe(false);
  });
});

describe("Authentication: CSRF Token Validation", () => {
  const validateCsrfToken = (
    cookieToken: string | undefined,
    headerToken: string | undefined
  ): boolean => {
    if (!cookieToken || !headerToken) return false;
    if (cookieToken.length < 32) return false;
    return cookieToken === headerToken;
  };

  it("validates matching tokens", () => {
    const token = "a".repeat(32);
    expect(validateCsrfToken(token, token)).toBe(true);
  });

  it("rejects mismatched tokens", () => {
    expect(validateCsrfToken("a".repeat(32), "b".repeat(32))).toBe(false);
  });

  it("rejects missing cookie token", () => {
    expect(validateCsrfToken(undefined, "a".repeat(32))).toBe(false);
  });

  it("rejects missing header token", () => {
    expect(validateCsrfToken("a".repeat(32), undefined)).toBe(false);
  });

  it("rejects short tokens", () => {
    const shortToken = "a".repeat(31);
    expect(validateCsrfToken(shortToken, shortToken)).toBe(false);
  });
});

describe("Authentication: OAuth State Validation", () => {
  interface OAuthState {
    nonce: string;
    timestamp: number;
    returnTo?: string;
  }

  const validateOAuthState = (
    stateParam: string | null,
    storedNonce: string | null,
    maxAgeMs: number = 10 * 60 * 1000 // 10 minutes
  ): { valid: boolean; error?: string; returnTo?: string } => {
    if (!stateParam) {
      return { valid: false, error: "missing_state" };
    }

    let state: OAuthState;
    try {
      state = JSON.parse(Buffer.from(stateParam, "base64").toString());
    } catch {
      return { valid: false, error: "invalid_state_format" };
    }

    if (!state.nonce || !state.timestamp) {
      return { valid: false, error: "invalid_state_content" };
    }

    if (state.nonce !== storedNonce) {
      return { valid: false, error: "nonce_mismatch" };
    }

    if (Date.now() - state.timestamp > maxAgeMs) {
      return { valid: false, error: "state_expired" };
    }

    return { valid: true, returnTo: state.returnTo };
  };

  it("validates correct state", () => {
    const state: OAuthState = {
      nonce: "secure-nonce-123",
      timestamp: Date.now(),
      returnTo: "/dashboard",
    };
    const encoded = Buffer.from(JSON.stringify(state)).toString("base64");

    const result = validateOAuthState(encoded, "secure-nonce-123");
    expect(result.valid).toBe(true);
    expect(result.returnTo).toBe("/dashboard");
  });

  it("rejects missing state", () => {
    const result = validateOAuthState(null, "nonce");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("missing_state");
  });

  it("rejects invalid state format", () => {
    const result = validateOAuthState("not-base64-json", "nonce");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("invalid_state_format");
  });

  it("rejects nonce mismatch", () => {
    const state: OAuthState = {
      nonce: "original-nonce",
      timestamp: Date.now(),
    };
    const encoded = Buffer.from(JSON.stringify(state)).toString("base64");

    const result = validateOAuthState(encoded, "different-nonce");
    expect(result.valid).toBe(false);
    expect(result.error).toBe("nonce_mismatch");
  });

  it("rejects expired state", () => {
    const state: OAuthState = {
      nonce: "nonce",
      timestamp: Date.now() - 15 * 60 * 1000, // 15 minutes ago
    };
    const encoded = Buffer.from(JSON.stringify(state)).toString("base64");

    const result = validateOAuthState(encoded, "nonce", 10 * 60 * 1000);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("state_expired");
  });
});
