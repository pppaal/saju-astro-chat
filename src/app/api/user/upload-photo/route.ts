import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { put, del } from '@vercel/blob'

export const runtime = 'nodejs'

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024

// Allowed image types
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export const POST = withApiMiddleware(
  async (req: NextRequest, context) => {
    try {
      const formData = await req.formData()
      const file = formData.get('photo') as File | null

      if (!file) {
        return apiError(ErrorCodes.VALIDATION_ERROR, 'No photo file provided')
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}`
        )
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return apiError(
          ErrorCodes.VALIDATION_ERROR,
          `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`
        )
      }

      // Generate unique filename
      const timestamp = Date.now()
      const extension = file.name.split('.').pop() || 'jpg'
      const filename = `profiles/${context.userId}_${timestamp}.${extension}`

      // Upload to Vercel Blob Storage
      const blob = await put(filename, file, {
        access: 'public',
        addRandomSuffix: false,
      })

      // Get public URL from Blob
      const photoUrl = blob.url

      // Update user profile (rollback blob on failure)
      let userProfile
      try {
        userProfile = await prisma.userProfile.upsert({
          where: { userId: context.userId! },
          create: { userId: context.userId!, profilePhoto: photoUrl },
          update: { profilePhoto: photoUrl },
          select: {
            userId: true,
            profilePhoto: true,
          },
        })
      } catch (dbError) {
        // DB update failed - clean up orphaned blob
        try {
          await del(blob.url)
        } catch (delError) {
          logger.error('[upload-photo] Failed to clean up orphaned blob', {
            url: blob.url,
            error: delError instanceof Error ? delError.message : 'Unknown',
          })
        }
        throw dbError
      }

      // Sync with MatchProfile if exists
      const matchProfile = await prisma.matchProfile.findUnique({
        where: { userId: context.userId! },
        select: { id: true, photos: true },
      })

      if (matchProfile) {
        const currentPhotos = Array.isArray(matchProfile.photos)
          ? matchProfile.photos
          : []

        // Add the new photo to MatchProfile photos if not already present
        if (!currentPhotos.includes(photoUrl)) {
          await prisma.matchProfile.update({
            where: { userId: context.userId! },
            data: {
              photos: [photoUrl, ...currentPhotos].slice(0, 6), // Keep max 6 photos
            },
          })
          logger.info(`[upload-photo] Synced photo to MatchProfile for user ${context.userId}`)
        }
      }

      logger.info(`[upload-photo] User ${context.userId} uploaded profile photo: ${photoUrl}`)

      // Fetch user for response
      const user = await prisma.user.findUnique({
        where: { id: context.userId! },
        select: { id: true, name: true, image: true },
      })

      return apiSuccess({
        ok: true,
        photoUrl: userProfile.profilePhoto,
        user: {
          ...user,
          profilePhoto: userProfile.profilePhoto,
        },
      })
    } catch (error) {
      logger.error('[upload-photo] Error uploading photo:', error)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to upload photo. Please try again.')
    }
  },
  createAuthenticatedGuard({ route: 'user/upload-photo', limit: 10 })
)
