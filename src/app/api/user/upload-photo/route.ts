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
import { put } from '@vercel/blob'

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

      // Update user profile
      const user = await prisma.user.update({
        where: { id: context.userId! },
        data: { profilePhoto: photoUrl },
        select: {
          id: true,
          name: true,
          image: true,
          profilePhoto: true,
          matchProfile: {
            select: {
              id: true,
              photos: true,
            },
          },
        },
      })

      // Sync with MatchProfile if exists
      if (user.matchProfile) {
        const currentPhotos = Array.isArray(user.matchProfile.photos)
          ? user.matchProfile.photos
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

      return apiSuccess({
        ok: true,
        photoUrl: user.profilePhoto,
        user,
      })
    } catch (error) {
      logger.error('[upload-photo] Error uploading photo:', error)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to upload photo. Please try again.')
    }
  },
  createAuthenticatedGuard({ route: 'user/upload-photo', limit: 10 })
)
