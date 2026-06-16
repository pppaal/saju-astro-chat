# Contributing to DestinyPal

Thanks for working on DestinyPal. This guide covers the day-to-day workflow.
For architecture and conventions, read **`CLAUDE.md`** first; for the full doc
map, see **`docs/DOCS_INDEX.md`**.

## Prerequisites

- **Node 20** (`nvm use` reads `.nvmrc`; `engines` pins `>=20 <21`)
- **npm** (use `npm ci`, not `npm install`, for reproducible installs)
- A **Postgres** database (local or a Neon branch) for anything touching data
- Optional per-feature: Google OAuth, Stripe, Anthropic, Upstash keys

## First-time setup

```bash
nvm use
npm ci                  # also runs `prisma generate`
cp .env.example .env    # fill in secrets (annotated in the file)
npm run check:env       # fails loudly on missing/placeholder vars
npm run db:migrate      # apply migrations
npm run dev             # http://localhost:3000
```

If a feature needs a key you don't have, the app degrades or returns a clear
error rather than crashing — you can develop most engine/UI work without Stripe
or Anthropic configured. `BUILD_INSTRUCTIONS.md` has deeper troubleshooting.

## Branch & PR workflow

1. Branch off `main`: `feat/…`, `fix/…`, `refactor/…`, `docs/…`, `chore/…`.
2. Make focused commits.
3. **Run `npm run check:all`** (lint + mojibake + typecheck + test) before pushing.
4. Push and open a PR against `main`; fill in the PR template (`.github/PULL_REQUEST_TEMPLATE.md`).
5. CI must be green — see Required checks below.

Keep PRs scoped. A money-path or engine change with no test is unlikely to be
accepted.

## Commit messages

Conventional-commit style prefixes (`feat:`, `fix:`, `refactor:`, `docs:`,
`chore:`, `test:`). Write the body to explain **why**, not just what — the
hardest knowledge in this repo is domain rules, so capture the reasoning.

## Pre-commit hooks (Husky + lint-staged)

On `git commit`, staged files run through:

- `eslint --fix` + `prettier --write` (`*.ts/tsx`), `prettier --write` (`*.json/md/css`)
- `docs:sync` when certain config files change (keeps generated docs in step)
- **gitleaks** secret scan (install it locally; otherwise it warns and skips)
- **mojibake / console / Korean-comment** checks

Notes:

- Korean comments in code only **warn** (the product is Korean; it's allowed).
- `console.*` is rejected — use `@/lib/logger`.
- Don't `--no-verify` to dodge the secret scan.

## Required checks (CI gates)

A PR must pass:

- `lint`, `lint:mojibake`, `typecheck` (kept at **0 errors**)
- `ops:typecheck:gate` — no new type errors vs the baseline
- `test` (Vitest) — keep coverage above the floors in `vitest.config.ts`
- the **destiny quality / release gates** (determinism goldens)

Full details: `docs/TESTING_AND_GUARDRAILS.md`.

## Code style & house rules

- **TypeScript strict**; avoid `any` (the codebase has ~1 — keep it that way).
- **Determinism**: never read the clock inside engine math. Thread an injectable
  `now: Date = new Date()` so production is unchanged but tests can pin time.
- **Money paths** (`src/lib/credits`, `payments`, `stripe`, webhook): charge once
  via the atomic create-as-lock idempotency; refund-on-failure must be idempotent;
  never swallow a transient DB error into a "success". Add tests.
- **Security**: route handlers go through `withApiMiddleware`; admin via
  `createAdminGuard`. Don't add a plaintext fallback to token crypto.
- **i18n**: user-facing strings and prompts come in ko/en pairs.
- **pricing.ts** is the single source of truth for credit packs — read from it.
- Prefer extending existing modules over adding new top-level structure; respect
  `docs/REPO_STRUCTURE.md` (source vs generated output).

## Tests

- Unit/integration: `npm test` (Vitest). Co-locate under `tests/`.
- Determinism goldens live alongside the Saju/astrology suites — if you change a
  calculation, update or add a golden and explain the diff.
- E2E: `npm run test:e2e:browser` (Playwright); the `e2e/critical-flows/` specs
  cover auth, tarot, saju, compatibility, credits, and the Stripe paths.

## Questions

Open a draft PR or an issue. When in doubt about a domain rule, check
`docs/doctrine/` and `docs/CALCULATION_SPEC.md` before changing engine output.
