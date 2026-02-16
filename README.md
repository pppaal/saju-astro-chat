# DestinyPal

Last audited: 2026-02-15 (Asia/Seoul)

DestinyPal is a Next.js App Router application for saju, astrology, tarot, and counseling flows, with a Python backend for GraphRAG and cross-domain reasoning.

## Quick Start

1. Install dependencies.

```bash
npm ci
```

2. Create local env file.

```bash
cp .env.example .env.local
```

3. Run database migrations.

```bash
npm run db:migrate
```

4. Start web app.

```bash
npm run dev
```

5. Start Python backend.

```bash
cd backend_ai
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
python main.py
```

## Required Environment Variables

Minimum local setup:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_BASE_URL`
- `TOKEN_ENCRYPTION_KEY`
- `PUBLIC_API_TOKEN`
- `ADMIN_API_TOKEN`
- `CRON_SECRET`
- `AI_BACKEND_URL`

Production also needs Stripe, Redis, and webhook configuration. See `BUILD_INSTRUCTIONS.md` and `.env.example`.

## Demo Mode

Server-side demo access is enabled with env variables:

- `DEMO_ENABLED=1` (optional, default enabled when unset)
- `DEMO_TOKEN=<your-token>`

Usage:

- Open `/demo?demo_token=<your-token>`
- Or call demo APIs with header `x-demo-token: <your-token>`

Demo routes:

- `/demo/destiny-map`
- `/demo/destiny-matrix`
- `/demo/tarot`
- `/demo/calendar`
- `/demo/compatibility`
- `/demo/report`

## Repository Snapshot

Measured with `npm run docs:stats` on 2026-02-15 (Asia/Seoul):

- API routes: `145`
- App pages: `83`
- Component files: `594`
- Prisma models: `42`
- Test files (`*.test|*.spec`): `1073`
- Markdown docs: `154`
- `.env.example` variables: `79`

API route audit baseline from `npm run audit:api`:

- Total routes: `145`
- Uses middleware/guards: `136` (93.8%)
- Validation signals: `113` (77.9%)
- Rate limited: `129` (89.0%)

## Architecture

- Web/API: `src/app`, `src/lib`
- Database: `prisma/schema.prisma`
- AI backend: `backend_ai/main.py`
- Graph retrieval: `backend_ai/app/rag`
- Destiny Matrix engine: `src/lib/destiny-matrix`

See `OVERVIEW.md` for runtime flow details.

## Verification Commands

Primary checks:

```bash
npm run lint
npm run typecheck
npm run build
npm run test:e2e:smoke:public
npx vitest run tests/i18n/pricing-keys-required.test.ts
python scripts/self_check.py
```

Extended checks:

```bash
npm test
npm run test:e2e:browser
npm run test:backend
```

## Documentation

- `BUILD_INSTRUCTIONS.md`: setup, env, migrations, deployment, troubleshooting
- `SECURITY_AUDIT_REPORT.md`: current security posture and open items
- `OVERVIEW.md`: system architecture
- `docs/README.md`: docs hub
- `docs/DOCS_INDEX.md`: documentation index and audiences
- `docs/DOCS_AUDIT_REPORT_2026-02-15.md`: this audit summary

Historical reports (`FINAL_*`, `*_REPORT.md`, `docs/archive/*`) are retained for traceability and are not normative for current operations.
