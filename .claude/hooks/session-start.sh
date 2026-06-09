#!/bin/bash
# SessionStart hook for Claude Code on the web.
# Ensures dependencies + the generated Prisma client are present so that
# tests, typecheck and linters behave the same as in CI. Without the
# generated client, large swaths of the unit suite fail with
# "Cannot find module '.prisma/client'" — noise that only appears in
# fresh remote sandboxes.
set -euo pipefail

# Only run in the remote (web) environment; local sessions manage their own deps.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}"

# prisma.config.ts throws if DATABASE_URL is unset, and `prisma generate`
# runs from npm's postinstall. Generation never connects to a database, so a
# throwaway URL is enough to satisfy the config and let the client build.
# Scoped to this hook only — NOT persisted to the session env — so it can't
# mask the real DATABASE_URL the app/tests expect.
export DATABASE_URL="${DATABASE_URL:-postgresql://placeholder:placeholder@localhost:5432/placeholder}"

# Install dependencies. `npm install` (not `ci`) so the cached container layer
# can be reused on subsequent runs. postinstall already runs `prisma generate`,
# but we run it explicitly below to stay idempotent even if install is skipped.
npm install --no-audit --no-fund

# Generate the Prisma client explicitly (idempotent; safe to re-run).
npx prisma generate --config prisma.config.ts

echo "session-start: dependencies installed and Prisma client generated."
