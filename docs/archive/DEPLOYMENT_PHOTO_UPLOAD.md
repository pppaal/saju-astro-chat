# Photo Upload Feature - Vercel Deployment Guide

## Overview

The photo upload feature uses **Vercel Blob Storage** for cloud storage, which works seamlessly on Vercel's serverless platform.

## 🚀 Vercel Deployment Steps

### 1. Enable Vercel Blob Storage

1. Go to your Vercel project dashboard
2. Navigate to **Storage** tab
3. Click **Create Blob Store**
4. Choose a name (e.g., "profile-photos")
5. Click **Create**

Vercel will automatically set the `BLOB_READ_WRITE_TOKEN` environment variable.

### 2. Run Database Migration

Before deploying, ensure the database schema includes the `profilePhoto` field:

```bash
npx prisma migrate deploy
```

Or create a new migration:

```bash
npx prisma migrate dev --name add_profile_photo_field
```

### 3. Deploy to Vercel

```bash
vercel --prod
```

Or push to your main branch if you have automatic deployments enabled.

## 🔧 Environment Variables

Required environment variable (automatically set by Vercel when Blob Storage is enabled):

```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxxx
```

## 📋 Features

### Photo Upload

- **Max file size**: 5MB
- **Allowed formats**: JPG, PNG, WebP
- **Storage**: Vercel Blob Storage (global CDN)
- **Path structure**: `profiles/{userId}_{timestamp}.{ext}`

### Destiny Match Integration

- Uploaded photos automatically sync to `MatchProfile.photos`
- Maximum 6 photos per user
- New photos added to the beginning of the array

### Display Logic

- Priority: `profilePhoto` → OAuth `image` → Initial placeholder
- Supports both custom uploads and OAuth profile pictures

## 🎯 Usage

1. Navigate to `/myjourney`
2. Click on profile avatar
3. Select image file (JPG, PNG, or WebP)
4. Upload automatically starts
5. Photo appears immediately after upload

## 🧪 Testing

### Local Development

```bash
# Install dependencies
npm install

# Set up Blob Storage token (get from Vercel)
# Add to .env.local:
BLOB_READ_WRITE_TOKEN=your_token_here

# Run dev server
npm run dev
```

### Production Testing

1. Deploy to Vercel
2. Log in to your app
3. Go to MyJourney page
4. Test photo upload
5. Verify photo appears correctly
6. Check MatchProfile sync (if applicable)

## 📁 File Structure

```
src/
├── app/
│   ├── api/
│   │   └── user/
│   │       └── upload-photo/
│   │           └── route.ts          # Photo upload API
│   └── myjourney/
│       ├── components/
│       │   └── ProfileCard.tsx       # Upload UI
│       └── types.ts                  # TypeScript types
├── prisma/
│   └── schema.prisma                 # Database schema
```

## 🔐 Security

- Authentication required (via `createAuthenticatedGuard`)
- Rate limiting: 10 requests per window
- File type validation
- File size validation
- Secure token-based blob access

## 💰 Costs

### Vercel Blob Storage Pricing

- **Hobby (Free)**: 500MB storage, 1GB bandwidth/month
- **Pro**: $0.15/GB storage, $0.30/GB bandwidth
- **Enterprise**: Custom pricing

For most applications, the free tier is sufficient initially.

## 🐛 Troubleshooting

### Upload fails with "BLOB_READ_WRITE_TOKEN not found"

- Enable Blob Storage in Vercel dashboard
- Redeploy after enabling

### Photos not showing

- Check browser console for errors
- Verify blob URL is accessible
- Check Next.js Image component configuration

### MatchProfile not syncing

- Verify user has a MatchProfile record
- Check server logs for sync messages
- Ensure MatchProfile relation exists in schema

## 📚 References

- [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)
- [@vercel/blob npm package](https://www.npmjs.com/package/@vercel/blob)
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
