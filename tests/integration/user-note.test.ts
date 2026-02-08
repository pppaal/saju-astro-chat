/**
 * User Note Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 사용자 노트 저장
 * - 노트 분류 및 검색
 * - 노트 공유
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

describe('Integration: User Note', () => {
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

  describe('Note Creation', () => {
    it('creates a simple note', async () => {
      const user = await createTestUserInDb()

      const note = await testPrisma.userNote.create({
        data: {
          userId: user.id,
          title: '오늘의 운세 메모',
          content: '오늘은 좋은 일이 있을 것 같다. 금전운이 좋다.',
          createdAt: new Date(),
        },
      })

      expect(note.title).toBe('오늘의 운세 메모')
    })

    it('creates note with category', async () => {
      const user = await createTestUserInDb()

      const note = await testPrisma.userNote.create({
        data: {
          userId: user.id,
          title: '사주 분석 결과',
          content: '일간이 갑목이고...',
          category: 'saju_analysis',
          createdAt: new Date(),
        },
      })

      expect(note.category).toBe('saju_analysis')
    })

    it('creates note with tags', async () => {
      const user = await createTestUserInDb()

      const note = await testPrisma.userNote.create({
        data: {
          userId: user.id,
          title: '타로 리딩 기록',
          content: '연애운 3장 스프레드...',
          tags: ['타로', '연애운', '3카드'],
          createdAt: new Date(),
        },
      })

      const tags = note.tags as string[]
      expect(tags).toContain('타로')
    })

    it('creates note with reference', async () => {
      const user = await createTestUserInDb()

      const note = await testPrisma.userNote.create({
        data: {
          userId: user.id,
          title: '궁합 분석 메모',
          content: '상대방과의 궁합이 좋다',
          referenceType: 'compatibility_result',
          referenceId: 'compat-123',
          createdAt: new Date(),
        },
      })

      expect(note.referenceType).toBe('compatibility_result')
    })

    it('creates pinned note', async () => {
      const user = await createTestUserInDb()

      const note = await testPrisma.userNote.create({
        data: {
          userId: user.id,
          title: '중요한 메모',
          content: '절대 잊지 말 것',
          isPinned: true,
          createdAt: new Date(),
        },
      })

      expect(note.isPinned).toBe(true)
    })

    it('creates note with color', async () => {
      const user = await createTestUserInDb()

      const note = await testPrisma.userNote.create({
        data: {
          userId: user.id,
          title: '색상 있는 메모',
          content: '내용...',
          color: '#FF6B6B',
          createdAt: new Date(),
        },
      })

      expect(note.color).toBe('#FF6B6B')
    })
  })

  describe('Note Updates', () => {
    it('updates note content', async () => {
      const user = await createTestUserInDb()

      const note = await testPrisma.userNote.create({
        data: {
          userId: user.id,
          title: '수정할 메모',
          content: '원래 내용',
          createdAt: new Date(),
        },
      })

      const updated = await testPrisma.userNote.update({
        where: { id: note.id },
        data: {
          content: '수정된 내용',
          updatedAt: new Date(),
        },
      })

      expect(updated.content).toBe('수정된 내용')
    })

    it('pins and unpins note', async () => {
      const user = await createTestUserInDb()

      const note = await testPrisma.userNote.create({
        data: {
          userId: user.id,
          title: '핀 토글 메모',
          content: '내용',
          isPinned: false,
          createdAt: new Date(),
        },
      })

      const pinned = await testPrisma.userNote.update({
        where: { id: note.id },
        data: { isPinned: true },
      })

      expect(pinned.isPinned).toBe(true)

      const unpinned = await testPrisma.userNote.update({
        where: { id: note.id },
        data: { isPinned: false },
      })

      expect(unpinned.isPinned).toBe(false)
    })

    it('updates note tags', async () => {
      const user = await createTestUserInDb()

      const note = await testPrisma.userNote.create({
        data: {
          userId: user.id,
          title: '태그 수정 메모',
          content: '내용',
          tags: ['원래태그'],
          createdAt: new Date(),
        },
      })

      const updated = await testPrisma.userNote.update({
        where: { id: note.id },
        data: { tags: ['새태그1', '새태그2'] },
      })

      const tags = updated.tags as string[]
      expect(tags).toHaveLength(2)
    })

    it('archives note', async () => {
      const user = await createTestUserInDb()

      const note = await testPrisma.userNote.create({
        data: {
          userId: user.id,
          title: '보관할 메모',
          content: '내용',
          isArchived: false,
          createdAt: new Date(),
        },
      })

      const archived = await testPrisma.userNote.update({
        where: { id: note.id },
        data: {
          isArchived: true,
          archivedAt: new Date(),
        },
      })

      expect(archived.isArchived).toBe(true)
    })
  })

  describe('Note Retrieval', () => {
    it('retrieves user notes', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.userNote.create({
          data: {
            userId: user.id,
            title: `메모 ${i}`,
            content: `내용 ${i}`,
            createdAt: new Date(),
          },
        })
      }

      const notes = await testPrisma.userNote.findMany({
        where: { userId: user.id },
      })

      expect(notes).toHaveLength(5)
    })

    it('retrieves notes by category', async () => {
      const user = await createTestUserInDb()

      const categories = ['saju', 'tarot', 'saju', 'compatibility', 'saju']

      for (let i = 0; i < categories.length; i++) {
        await testPrisma.userNote.create({
          data: {
            userId: user.id,
            title: `메모 ${i}`,
            content: `내용 ${i}`,
            category: categories[i],
            createdAt: new Date(),
          },
        })
      }

      const sajuNotes = await testPrisma.userNote.findMany({
        where: { userId: user.id, category: 'saju' },
      })

      expect(sajuNotes).toHaveLength(3)
    })

    it('retrieves pinned notes first', async () => {
      const user = await createTestUserInDb()

      const pinnedStatus = [false, true, false, true, false]

      for (let i = 0; i < pinnedStatus.length; i++) {
        await testPrisma.userNote.create({
          data: {
            userId: user.id,
            title: `메모 ${i}`,
            content: `내용 ${i}`,
            isPinned: pinnedStatus[i],
            createdAt: new Date(),
          },
        })
      }

      const notes = await testPrisma.userNote.findMany({
        where: { userId: user.id },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      })

      expect(notes[0].isPinned).toBe(true)
      expect(notes[1].isPinned).toBe(true)
    })

    it('retrieves recent notes', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      for (let i = 0; i < 10; i++) {
        const createdAt = new Date(now)
        createdAt.setDate(createdAt.getDate() - i)

        await testPrisma.userNote.create({
          data: {
            userId: user.id,
            title: `메모 ${i}`,
            content: `내용 ${i}`,
            createdAt,
          },
        })
      }

      const recentNotes = await testPrisma.userNote.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      })

      expect(recentNotes).toHaveLength(5)
      expect(recentNotes[0].title).toBe('메모 0')
    })

    it('excludes archived notes', async () => {
      const user = await createTestUserInDb()

      const archived = [false, true, false, true, false]

      for (let i = 0; i < archived.length; i++) {
        await testPrisma.userNote.create({
          data: {
            userId: user.id,
            title: `메모 ${i}`,
            content: `내용 ${i}`,
            isArchived: archived[i],
            createdAt: new Date(),
          },
        })
      }

      const activeNotes = await testPrisma.userNote.findMany({
        where: { userId: user.id, isArchived: false },
      })

      expect(activeNotes).toHaveLength(3)
    })
  })

  describe('Note Search', () => {
    it('searches notes by title', async () => {
      const user = await createTestUserInDb()

      await testPrisma.userNote.create({
        data: {
          userId: user.id,
          title: '오늘의 타로 리딩',
          content: '내용',
          createdAt: new Date(),
        },
      })

      await testPrisma.userNote.create({
        data: {
          userId: user.id,
          title: '사주 분석 결과',
          content: '내용',
          createdAt: new Date(),
        },
      })

      await testPrisma.userNote.create({
        data: {
          userId: user.id,
          title: '타로 연습',
          content: '내용',
          createdAt: new Date(),
        },
      })

      const tarotNotes = await testPrisma.userNote.findMany({
        where: {
          userId: user.id,
          title: { contains: '타로' },
        },
      })

      expect(tarotNotes).toHaveLength(2)
    })

    it('searches notes by content', async () => {
      const user = await createTestUserInDb()

      await testPrisma.userNote.create({
        data: {
          userId: user.id,
          title: '메모 1',
          content: '금전운이 좋다',
          createdAt: new Date(),
        },
      })

      await testPrisma.userNote.create({
        data: {
          userId: user.id,
          title: '메모 2',
          content: '연애운 상승',
          createdAt: new Date(),
        },
      })

      await testPrisma.userNote.create({
        data: {
          userId: user.id,
          title: '메모 3',
          content: '금전 관련 조언',
          createdAt: new Date(),
        },
      })

      const moneyNotes = await testPrisma.userNote.findMany({
        where: {
          userId: user.id,
          content: { contains: '금전' },
        },
      })

      expect(moneyNotes).toHaveLength(2)
    })
  })

  describe('Note Statistics', () => {
    it('counts notes by category', async () => {
      const user = await createTestUserInDb()

      const categories = ['saju', 'tarot', 'saju', 'compatibility', 'tarot', 'saju']

      for (let i = 0; i < categories.length; i++) {
        await testPrisma.userNote.create({
          data: {
            userId: user.id,
            title: `메모 ${i}`,
            content: `내용 ${i}`,
            category: categories[i],
            createdAt: new Date(),
          },
        })
      }

      const counts = await testPrisma.userNote.groupBy({
        by: ['category'],
        where: { userId: user.id },
        _count: { id: true },
      })

      const sajuCount = counts.find((c) => c.category === 'saju')?._count.id
      expect(sajuCount).toBe(3)
    })

    it('counts total notes per user', async () => {
      const users = []
      const noteCounts = [3, 5, 2, 7, 4]

      for (let i = 0; i < noteCounts.length; i++) {
        const user = await createTestUserInDb()
        users.push(user)

        for (let j = 0; j < noteCounts[i]; j++) {
          await testPrisma.userNote.create({
            data: {
              userId: user.id,
              title: `메모 ${j}`,
              content: `내용 ${j}`,
              createdAt: new Date(),
            },
          })
        }
      }

      const counts = await testPrisma.userNote.groupBy({
        by: ['userId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      })

      expect(counts[0]._count.id).toBe(7)
    })
  })

  describe('Note Sharing', () => {
    it('creates shared note', async () => {
      const user = await createTestUserInDb()

      const note = await testPrisma.userNote.create({
        data: {
          userId: user.id,
          title: '공유할 메모',
          content: '공유 내용',
          isShared: true,
          shareToken: `share-${Date.now()}`,
          sharedAt: new Date(),
          createdAt: new Date(),
        },
      })

      expect(note.isShared).toBe(true)
      expect(note.shareToken).not.toBeNull()
    })

    it('retrieves note by share token', async () => {
      const user = await createTestUserInDb()
      const token = `token-${Date.now()}`

      await testPrisma.userNote.create({
        data: {
          userId: user.id,
          title: '토큰으로 찾을 메모',
          content: '내용',
          isShared: true,
          shareToken: token,
          sharedAt: new Date(),
          createdAt: new Date(),
        },
      })

      const sharedNote = await testPrisma.userNote.findFirst({
        where: { shareToken: token, isShared: true },
      })

      expect(sharedNote).not.toBeNull()
    })

    it('unshares note', async () => {
      const user = await createTestUserInDb()

      const note = await testPrisma.userNote.create({
        data: {
          userId: user.id,
          title: '공유 해제할 메모',
          content: '내용',
          isShared: true,
          shareToken: `unshare-${Date.now()}`,
          sharedAt: new Date(),
          createdAt: new Date(),
        },
      })

      const unshared = await testPrisma.userNote.update({
        where: { id: note.id },
        data: {
          isShared: false,
          shareToken: null,
        },
      })

      expect(unshared.isShared).toBe(false)
    })
  })

  describe('Note Deletion', () => {
    it('deletes note', async () => {
      const user = await createTestUserInDb()

      const note = await testPrisma.userNote.create({
        data: {
          userId: user.id,
          title: '삭제할 메모',
          content: '내용',
          createdAt: new Date(),
        },
      })

      await testPrisma.userNote.delete({
        where: { id: note.id },
      })

      const found = await testPrisma.userNote.findUnique({
        where: { id: note.id },
      })

      expect(found).toBeNull()
    })

    it('soft deletes note', async () => {
      const user = await createTestUserInDb()

      const note = await testPrisma.userNote.create({
        data: {
          userId: user.id,
          title: '소프트 삭제 메모',
          content: '내용',
          isDeleted: false,
          createdAt: new Date(),
        },
      })

      const deleted = await testPrisma.userNote.update({
        where: { id: note.id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      })

      expect(deleted.isDeleted).toBe(true)
    })
  })
})
