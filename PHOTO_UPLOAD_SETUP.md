# Photo Upload Setup

Last audited: 2026-02-15 (Asia/Seoul)

This file documents setup for profile photo upload using Vercel Blob.

## Required Steps

1. Enable Vercel Blob storage for this project.
2. Set `BLOB_READ_WRITE_TOKEN` in deployment environment.
3. Apply database migrations (`npm run db:migrate`) so user profile fields are available.

## Verification

- Open profile flow and upload a supported image format.
- Confirm file URL is persisted and rendered in UI.

## Troubleshooting

- `BLOB_READ_WRITE_TOKEN` missing -> upload API will fail.
- Migration not applied -> profile update persistence may fail.
- URL not rendering -> check Next.js image/domain configuration and API response payload.

## Related Docs

- `BUILD_INSTRUCTIONS.md`
- `docs/archive/DEPLOYMENT_PHOTO_UPLOAD.md` (historical deep-dive)
