/**
 * File Upload Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 파일 업로드 기록
 * - 파일 메타데이터 관리
 * - 저장소 사용량 추적
 *
 * 실행: npm run test:integration
 * 환경변수 필요: TEST_DATABASE_URL 또는 DATABASE_URL
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest'
import {
  testPrisma,
  createTestUserInDb,
  cleanupAllTestUsers,
  checkTestDbConnection,
  connectTestDb,
  disconnectTestDb,
} from './setup'

const hasTestDb = await checkTestDbConnection()

describe('Integration: File Upload', () => {
  if (!hasTestDb) {
    return
  }

  beforeAll(async () => {
    await connectTestDb()
  })

  afterAll(async () => {
    await cleanupAllTestUsers()
    await disconnectTestDb()
  })

  afterEach(async () => {
    await cleanupAllTestUsers()
  })

  describe('File Recording', () => {
    it('records image upload', async () => {
      const user = await createTestUserInDb()

      const file = await testPrisma.fileUpload.create({
        data: {
          userId: user.id,
          filename: 'profile.jpg',
          originalName: 'my_photo.jpg',
          mimeType: 'image/jpeg',
          size: 1024000,
          path: '/uploads/users/' + user.id + '/profile.jpg',
          bucket: 'user-uploads',
        },
      })

      expect(file.filename).toBe('profile.jpg')
      expect(file.mimeType).toBe('image/jpeg')
    })

    it('records document upload', async () => {
      const user = await createTestUserInDb()

      const file = await testPrisma.fileUpload.create({
        data: {
          userId: user.id,
          filename: 'birth_cert.pdf',
          originalName: '출생증명서.pdf',
          mimeType: 'application/pdf',
          size: 2048000,
          path: '/uploads/documents/' + user.id + '/birth_cert.pdf',
          bucket: 'documents',
        },
      })

      expect(file.mimeType).toBe('application/pdf')
    })

    it('records file with metadata', async () => {
      const user = await createTestUserInDb()

      const file = await testPrisma.fileUpload.create({
        data: {
          userId: user.id,
          filename: 'chart.png',
          originalName: 'natal_chart.png',
          mimeType: 'image/png',
          size: 512000,
          path: '/uploads/charts/' + user.id + '/chart.png',
          bucket: 'charts',
          metadata: {
            width: 1920,
            height: 1080,
            format: 'PNG',
            colorSpace: 'sRGB',
          },
        },
      })

      const meta = file.metadata as { width: number }
      expect(meta.width).toBe(1920)
    })

    it('records file with category', async () => {
      const user = await createTestUserInDb()

      const file = await testPrisma.fileUpload.create({
        data: {
          userId: user.id,
          filename: 'avatar.jpg',
          originalName: 'avatar.jpg',
          mimeType: 'image/jpeg',
          size: 256000,
          path: '/uploads/avatars/' + user.id + '/avatar.jpg',
          bucket: 'avatars',
          category: 'profile_picture',
        },
      })

      expect(file.category).toBe('profile_picture')
    })

    it('records file with processing status', async () => {
      const user = await createTestUserInDb()

      const file = await testPrisma.fileUpload.create({
        data: {
          userId: user.id,
          filename: 'video.mp4',
          originalName: 'reading_video.mp4',
          mimeType: 'video/mp4',
          size: 50000000,
          path: '/uploads/videos/' + user.id + '/video.mp4',
          bucket: 'videos',
          status: 'processing',
        },
      })

      expect(file.status).toBe('processing')
    })
  })

  describe('File Retrieval', () => {
    it('retrieves files by user', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.fileUpload.create({
          data: {
            userId: user.id,
            filename: `file_${i}.jpg`,
            originalName: `image_${i}.jpg`,
            mimeType: 'image/jpeg',
            size: 100000 * (i + 1),
            path: `/uploads/users/${user.id}/file_${i}.jpg`,
            bucket: 'user-uploads',
          },
        })
      }

      const files = await testPrisma.fileUpload.findMany({
        where: { userId: user.id },
      })

      expect(files).toHaveLength(5)
    })

    it('retrieves files by type', async () => {
      const user = await createTestUserInDb()

      const types = ['image/jpeg', 'image/png', 'application/pdf', 'image/jpeg', 'image/jpeg']

      for (let i = 0; i < types.length; i++) {
        await testPrisma.fileUpload.create({
          data: {
            userId: user.id,
            filename: `file_${i}`,
            originalName: `file_${i}`,
            mimeType: types[i],
            size: 100000,
            path: `/uploads/${user.id}/file_${i}`,
            bucket: 'uploads',
          },
        })
      }

      const images = await testPrisma.fileUpload.findMany({
        where: {
          userId: user.id,
          mimeType: { startsWith: 'image/' },
        },
      })

      expect(images).toHaveLength(4)
    })

    it('retrieves files by bucket', async () => {
      const user = await createTestUserInDb()

      const buckets = ['avatars', 'documents', 'avatars', 'charts', 'avatars']

      for (let i = 0; i < buckets.length; i++) {
        await testPrisma.fileUpload.create({
          data: {
            userId: user.id,
            filename: `file_${i}.jpg`,
            originalName: `file_${i}.jpg`,
            mimeType: 'image/jpeg',
            size: 100000,
            path: `/${buckets[i]}/${user.id}/file_${i}.jpg`,
            bucket: buckets[i],
          },
        })
      }

      const avatarFiles = await testPrisma.fileUpload.findMany({
        where: {
          userId: user.id,
          bucket: 'avatars',
        },
      })

      expect(avatarFiles).toHaveLength(3)
    })

    it('retrieves recent uploads', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      for (let i = 0; i < 10; i++) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)

        await testPrisma.fileUpload.create({
          data: {
            userId: user.id,
            filename: `file_${i}.jpg`,
            originalName: `file_${i}.jpg`,
            mimeType: 'image/jpeg',
            size: 100000,
            path: `/uploads/${user.id}/file_${i}.jpg`,
            bucket: 'uploads',
            createdAt: date,
          },
        })
      }

      const sevenDaysAgo = new Date(now)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const recentFiles = await testPrisma.fileUpload.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: sevenDaysAgo },
        },
      })

      expect(recentFiles).toHaveLength(8)
    })
  })

  describe('Storage Usage', () => {
    it('calculates user storage usage', async () => {
      const user = await createTestUserInDb()

      const sizes = [1000000, 2000000, 500000, 1500000, 3000000] // 8MB total

      for (let i = 0; i < sizes.length; i++) {
        await testPrisma.fileUpload.create({
          data: {
            userId: user.id,
            filename: `file_${i}.jpg`,
            originalName: `file_${i}.jpg`,
            mimeType: 'image/jpeg',
            size: sizes[i],
            path: `/uploads/${user.id}/file_${i}.jpg`,
            bucket: 'uploads',
          },
        })
      }

      const files = await testPrisma.fileUpload.findMany({
        where: { userId: user.id },
      })

      const totalSize = files.reduce((sum, f) => sum + f.size, 0)
      expect(totalSize).toBe(8000000)
    })

    it('calculates storage by bucket', async () => {
      const user = await createTestUserInDb()

      const uploads = [
        { bucket: 'avatars', size: 500000 },
        { bucket: 'documents', size: 2000000 },
        { bucket: 'avatars', size: 600000 },
        { bucket: 'charts', size: 1000000 },
        { bucket: 'avatars', size: 400000 },
      ]

      for (let i = 0; i < uploads.length; i++) {
        await testPrisma.fileUpload.create({
          data: {
            userId: user.id,
            filename: `file_${i}.jpg`,
            originalName: `file_${i}.jpg`,
            mimeType: 'image/jpeg',
            size: uploads[i].size,
            path: `/${uploads[i].bucket}/${user.id}/file_${i}.jpg`,
            bucket: uploads[i].bucket,
          },
        })
      }

      const avatarFiles = await testPrisma.fileUpload.findMany({
        where: { userId: user.id, bucket: 'avatars' },
      })

      const avatarSize = avatarFiles.reduce((sum, f) => sum + f.size, 0)
      expect(avatarSize).toBe(1500000)
    })

    it('counts files by type', async () => {
      const user = await createTestUserInDb()

      const types = [
        'image/jpeg',
        'image/png',
        'application/pdf',
        'image/jpeg',
        'video/mp4',
        'image/jpeg',
      ]

      for (let i = 0; i < types.length; i++) {
        await testPrisma.fileUpload.create({
          data: {
            userId: user.id,
            filename: `file_${i}`,
            originalName: `file_${i}`,
            mimeType: types[i],
            size: 100000,
            path: `/uploads/${user.id}/file_${i}`,
            bucket: 'uploads',
          },
        })
      }

      const counts = await testPrisma.fileUpload.groupBy({
        by: ['mimeType'],
        where: { userId: user.id },
        _count: { id: true },
      })

      const jpegCount = counts.find((c) => c.mimeType === 'image/jpeg')?._count.id
      expect(jpegCount).toBe(3)
    })
  })

  describe('File Processing', () => {
    it('updates processing status', async () => {
      const user = await createTestUserInDb()

      const file = await testPrisma.fileUpload.create({
        data: {
          userId: user.id,
          filename: 'video.mp4',
          originalName: 'video.mp4',
          mimeType: 'video/mp4',
          size: 50000000,
          path: `/uploads/${user.id}/video.mp4`,
          bucket: 'videos',
          status: 'processing',
        },
      })

      const updated = await testPrisma.fileUpload.update({
        where: { id: file.id },
        data: { status: 'completed' },
      })

      expect(updated.status).toBe('completed')
    })

    it('records thumbnail path', async () => {
      const user = await createTestUserInDb()

      const file = await testPrisma.fileUpload.create({
        data: {
          userId: user.id,
          filename: 'image.jpg',
          originalName: 'image.jpg',
          mimeType: 'image/jpeg',
          size: 5000000,
          path: `/uploads/${user.id}/image.jpg`,
          bucket: 'uploads',
        },
      })

      const updated = await testPrisma.fileUpload.update({
        where: { id: file.id },
        data: {
          thumbnailPath: `/uploads/${user.id}/thumbnails/image_thumb.jpg`,
        },
      })

      expect(updated.thumbnailPath).toContain('thumb')
    })

    it('records optimized versions', async () => {
      const user = await createTestUserInDb()

      const file = await testPrisma.fileUpload.create({
        data: {
          userId: user.id,
          filename: 'image.jpg',
          originalName: 'image.jpg',
          mimeType: 'image/jpeg',
          size: 5000000,
          path: `/uploads/${user.id}/image.jpg`,
          bucket: 'uploads',
          variants: {
            small: `/uploads/${user.id}/image_small.jpg`,
            medium: `/uploads/${user.id}/image_medium.jpg`,
            large: `/uploads/${user.id}/image_large.jpg`,
          },
        },
      })

      const variants = file.variants as { small: string; medium: string; large: string }
      expect(variants.medium).toContain('medium')
    })
  })

  describe('File Statistics', () => {
    it('counts total uploads per user', async () => {
      const users: string[] = []
      const uploadCounts = [3, 5, 2]

      for (let i = 0; i < uploadCounts.length; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        for (let j = 0; j < uploadCounts[i]; j++) {
          await testPrisma.fileUpload.create({
            data: {
              userId: user.id,
              filename: `file_${j}.jpg`,
              originalName: `file_${j}.jpg`,
              mimeType: 'image/jpeg',
              size: 100000,
              path: `/uploads/${user.id}/file_${j}.jpg`,
              bucket: 'uploads',
            },
          })
        }
      }

      const counts = await testPrisma.fileUpload.groupBy({
        by: ['userId'],
        where: { userId: { in: users } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      })

      expect(counts[0]._count.id).toBe(5)
    })

    it('calculates average file size', async () => {
      const user = await createTestUserInDb()

      const sizes = [100000, 200000, 300000, 400000, 500000] // avg = 300000

      for (let i = 0; i < sizes.length; i++) {
        await testPrisma.fileUpload.create({
          data: {
            userId: user.id,
            filename: `file_${i}.jpg`,
            originalName: `file_${i}.jpg`,
            mimeType: 'image/jpeg',
            size: sizes[i],
            path: `/uploads/${user.id}/file_${i}.jpg`,
            bucket: 'uploads',
          },
        })
      }

      const files = await testPrisma.fileUpload.findMany({
        where: { userId: user.id },
      })

      const avgSize = files.reduce((sum, f) => sum + f.size, 0) / files.length
      expect(avgSize).toBe(300000)
    })
  })

  describe('File Deletion', () => {
    it('deletes single file', async () => {
      const user = await createTestUserInDb()

      const file = await testPrisma.fileUpload.create({
        data: {
          userId: user.id,
          filename: 'delete_me.jpg',
          originalName: 'delete_me.jpg',
          mimeType: 'image/jpeg',
          size: 100000,
          path: `/uploads/${user.id}/delete_me.jpg`,
          bucket: 'uploads',
        },
      })

      await testPrisma.fileUpload.delete({
        where: { id: file.id },
      })

      const found = await testPrisma.fileUpload.findUnique({
        where: { id: file.id },
      })

      expect(found).toBeNull()
    })

    it('deletes all user files', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.fileUpload.create({
          data: {
            userId: user.id,
            filename: `file_${i}.jpg`,
            originalName: `file_${i}.jpg`,
            mimeType: 'image/jpeg',
            size: 100000,
            path: `/uploads/${user.id}/file_${i}.jpg`,
            bucket: 'uploads',
          },
        })
      }

      await testPrisma.fileUpload.deleteMany({
        where: { userId: user.id },
      })

      const remaining = await testPrisma.fileUpload.findMany({
        where: { userId: user.id },
      })

      expect(remaining).toHaveLength(0)
    })

    it('deletes old temporary files', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      // Old temp files
      for (let i = 0; i < 3; i++) {
        await testPrisma.fileUpload.create({
          data: {
            userId: user.id,
            filename: `temp_${i}.jpg`,
            originalName: `temp_${i}.jpg`,
            mimeType: 'image/jpeg',
            size: 100000,
            path: `/temp/${user.id}/temp_${i}.jpg`,
            bucket: 'temp',
            createdAt: new Date(now.getTime() - 48 * 60 * 60 * 1000),
          },
        })
      }

      // Recent temp files
      for (let i = 0; i < 2; i++) {
        await testPrisma.fileUpload.create({
          data: {
            userId: user.id,
            filename: `recent_${i}.jpg`,
            originalName: `recent_${i}.jpg`,
            mimeType: 'image/jpeg',
            size: 100000,
            path: `/temp/${user.id}/recent_${i}.jpg`,
            bucket: 'temp',
          },
        })
      }

      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      await testPrisma.fileUpload.deleteMany({
        where: {
          userId: user.id,
          bucket: 'temp',
          createdAt: { lt: oneDayAgo },
        },
      })

      const remaining = await testPrisma.fileUpload.findMany({
        where: { userId: user.id, bucket: 'temp' },
      })

      expect(remaining).toHaveLength(2)
    })
  })
})
