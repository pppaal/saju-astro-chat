#!/usr/bin/env node
/**
 * Minimal env validator for CI/deploy.
 * Fails the process if critical secrets are missing or placeholder values are present.
 */

const REQUIRED_ALWAYS = [
  "NEXTAUTH_SECRET",
  "NEXT_PUBLIC_BASE_URL",
  "ADMIN_API_TOKEN",
  "CRON_SECRET",
  "METRICS_TOKEN",
  "DATABASE_URL",
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
  const provider = (process.env.EMAIL_PROVIDER || "resend").toLowerCase();
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
  const missing = REQUIRED_ALWAYS.filter(isMissing);
  const missingPush = REQUIRED_PUSH.filter(isMissing);
  const emailError = checkEmailProvider();

  const problems = [];
  if (missing.length) problems.push(`Missing: ${missing.join(", ")}`);
  if (missingPush.length) problems.push(`Push keys missing: ${missingPush.join(", ")}`);
  if (emailError) problems.push(`Email config: ${emailError}`);

  if (problems.length) {
    console.error("[env:check] FAILED");
    for (const p of problems) console.error(" -", p);
    process.exit(1);
  }

  console.log("[env:check] OK");
  process.exit(0);
}

main();
