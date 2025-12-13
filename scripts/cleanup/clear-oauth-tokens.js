#!/usr/bin/env node
/**
 * One-time helper to clear stored OAuth tokens from the Account table.
 * Requires CONFIRM_CLEAR_OAUTH=1 and DATABASE_URL set.
 */
const { PrismaClient } = require("@prisma/client");

async function main() {
  if (process.env.CONFIRM_CLEAR_OAUTH !== "1") {
    console.error("Set CONFIRM_CLEAR_OAUTH=1 to run this script.");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const result = await prisma.account.updateMany({
      data: {
        access_token: null,
        refresh_token: null,
        id_token: null,
        scope: null,
        token_type: null,
        expires_at: null,
        session_state: null,
      },
    });
    console.log(`[cleanup] Cleared tokens on ${result.count} accounts`);
  } catch (err) {
    console.error("[cleanup] Failed to clear tokens:", err);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
