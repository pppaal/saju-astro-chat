#!/usr/bin/env node
/**
 * Environment validator for CI/deploy.
 * Fails the process if critical secrets are missing or placeholder values are present.
 */

const REQUIRED_ALWAYS = [
  "NEXTAUTH_SECRET",
  "NEXT_PUBLIC_BASE_URL",
  "ADMIN_API_TOKEN",
  "CRON_SECRET",
  "METRICS_TOKEN",
  "DATABASE_URL",
  "TOKEN_ENCRYPTION_KEY",
  "PUBLIC_API_TOKEN",
];

// Required for rate limiting in production
const REQUIRED_RATE_LIMIT = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
];

// Required for payments
const REQUIRED_PAYMENTS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
];

// Required for AI services
const REQUIRED_AI = [
  "OPENAI_API_KEY",
];

// Recommended for production monitoring
const RECOMMENDED_PRODUCTION = [
  "SENTRY_DSN",
  "NEXT_PUBLIC_AI_BACKEND",
];

const REQUIRED_PUSH = ["NEXT_PUBLIC_VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"];

function isMissing(name) {
  const val = process.env[name];
  if (!val) return true;
  const trimmed = String(val).trim();
  if (!trimmed) return true;
  if (trimmed.toLowerCase() === "replace_me") return true;
  return false;
}

function checkEmailProvider() {
  const provider = (process.env.EMAIL_PROVIDER || "none").toLowerCase();
  if (provider === "none") return null; // email disabled
  if (provider === "resend") {
    return isMissing("RESEND_API_KEY") ? "RESEND_API_KEY" : null;
  }
  if (provider === "sendgrid") {
    return isMissing("SENDGRID_API_KEY") ? "SENDGRID_API_KEY" : null;
  }
  if (provider === "nodemailer") {
    const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
    const missing = required.filter(isMissing);
    return missing.length ? missing.join(", ") : null;
  }
  return `Unknown EMAIL_PROVIDER: ${provider}`;
}

function main() {
  const isProduction = process.env.NODE_ENV === "production";

  const missing = REQUIRED_ALWAYS.filter(isMissing);
  const missingPush = REQUIRED_PUSH.filter(isMissing);
  const emailError = checkEmailProvider();

  // Production-specific checks
  const missingRateLimit = isProduction ? REQUIRED_RATE_LIMIT.filter(isMissing) : [];
  const missingPayments = isProduction ? REQUIRED_PAYMENTS.filter(isMissing) : [];
  const missingAI = isProduction ? REQUIRED_AI.filter(isMissing) : [];
  const missingRecommended = isProduction ? RECOMMENDED_PRODUCTION.filter(isMissing) : [];

  const problems = [];
  const warnings = [];

  if (missing.length) problems.push(`Missing required: ${missing.join(", ")}`);
  if (missingPush.length) problems.push(`Push keys missing: ${missingPush.join(", ")}`);
  if (emailError) problems.push(`Email config: ${emailError}`);

  // Production-only errors
  if (missingRateLimit.length) problems.push(`Rate limit config missing: ${missingRateLimit.join(", ")}`);
  if (missingPayments.length) problems.push(`Payment config missing: ${missingPayments.join(", ")}`);
  if (missingAI.length) problems.push(`AI service config missing: ${missingAI.join(", ")}`);

  // Warnings (non-blocking)
  if (missingRecommended.length) {
    warnings.push(`Recommended for production: ${missingRecommended.join(", ")}`);
  }

  // Validate NEXTAUTH_SECRET length
  const authSecret = process.env.NEXTAUTH_SECRET;
  if (authSecret && authSecret.length < 32) {
    problems.push("NEXTAUTH_SECRET must be at least 32 characters");
  }

  // Validate TOKEN_ENCRYPTION_KEY length (32 bytes min; accept base64 or utf-8)
  const tokenKey = process.env.TOKEN_ENCRYPTION_KEY || "";
  if (tokenKey && tokenKey.length < 32) {
    problems.push("TOKEN_ENCRYPTION_KEY must be at least 32 characters or a 32-byte base64 string");
  }

  // Validate Stripe key format
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey && !stripeKey.startsWith("sk_")) {
    problems.push("STRIPE_SECRET_KEY must start with 'sk_'");
  }

  // Print warnings
  if (warnings.length) {
    console.warn("[env:check] WARNINGS");
    for (const w of warnings) console.warn(" ⚠", w);
  }

  if (problems.length) {
    console.error("[env:check] FAILED");
    for (const p of problems) console.error(" ✗", p);
    process.exit(1);
  }

  console.log("[env:check] OK");
  process.exit(0);
}

main();
