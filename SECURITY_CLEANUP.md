# Security Cleanup Checklist

1. Rotate all leaked secrets

- Issue new keys for: OpenAI, Together, Stripe, Google/Kakao OAuth, DB/Redis, email provider, push VAPID keys.
- Revoke old keys immediately.

2. Rewrite Git history to remove leaked files  
   Run in a clean shell (Git Bash recommended). Install git-filter-repo if needed:

```bash
pip install git-filter-repo
git filter-repo --invert-paths --path .env --path .env.local --path backend_ai/.env --path final_data.db
git push --force
```

Team members should reclone after the rewrite.

3. Clear stored OAuth tokens in DB

- Quick SQL: `scripts/sql/clear_oauth_tokens.sql` (psql or any SQL client).
- Or use Prisma helper: `CONFIRM_CLEAR_OAUTH=1 node scripts/cleanup/clear-oauth-tokens.js`

4. Enforce env validation in CI/CD

- Run `npm run check:env` before build/deploy to ensure required secrets are present.

5. Re-enable monitoring/alerts

- Configure Sentry/Logging after secrets are rotated to catch anomalies.

6. Remove sensitive local artifacts

- Ensure `.env*`, `backend_ai/.env`, `final_data.db` stay out of git.
- Verify `.gitignore` contains these entries (already configured).
