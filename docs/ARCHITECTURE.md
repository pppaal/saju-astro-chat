# Architecture

## Overview
```
[Browser]
   |
   v
[Next.js App Router] ---> [Prisma/Postgres]
   |        |
   |        +--> [Redis (optional)]
   |
   +--> [API routes] ---> [Backend AI (Flask)] ---> [AI providers]
   |
   +--> [Third-party services: OAuth, Stripe, Email, Analytics, Sentry]
```

## Core components
### Web app (Next.js)
- UI and routing live under `src/app` and `src/components`.
- Server APIs live under `src/app/api`.
- Prisma models live in `prisma/schema.prisma`.

### Backend AI (Flask)
- Entry point: `backend_ai/main.py` loads `backend_ai/app/app.py`.
- AI logic and RAG pipelines live under `backend_ai/app`.
- Corpus and rules live under `backend_ai/data`.

### Data stores
- Postgres via Prisma for users, sessions, content, and usage data.
- Redis is optional for caching and rate limiting.
- Large corpuses are stored on disk under `backend_ai/data`.

### External services
- AI providers: OpenAI (primary), optional others.
- Payments: Stripe.
- Auth: NextAuth OAuth providers.
- Email: Resend/SendGrid/Nodemailer.
- Analytics/monitoring: GA, Clarity, Sentry.
- Firebase (optional) for public visitor stats.

## Key request flows
### AI counseling flow
1. Browser calls a Next.js API route.
2. Next.js forwards to the Flask backend (`AI_BACKEND_URL`).
3. Backend AI resolves RAG context and calls the LLM provider.
4. Response streams back to Next.js and the browser.

### Auth and user data
1. NextAuth handles sign-in.
2. Prisma stores session/user data in Postgres.

### Payments
1. Client initiates Stripe checkout.
2. Webhooks confirm payment and update subscription records.

## Deployment boundaries
- Next.js app runs as the web tier.
- Backend AI runs as a separate service.
- Database and Redis run as managed services.
