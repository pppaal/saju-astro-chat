# Deployment

This document is a lightweight placeholder for deployment guidance.

## References
- `.github/workflows/README.md`
- `.github/workflows/deploy-preview.yml`
- `.github/workflows/deploy-production.yml`
- `next.config.ts`

## Typical flow
1. Run `npm run build` locally.
2. Configure environment variables in the hosting provider.
3. Use CI workflows for preview/production deployments.

## TODO
- Add provider-specific steps (Vercel/Fly/Docker).
